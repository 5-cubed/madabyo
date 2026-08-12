import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import React from 'react'
import App from './App'

function waitForChevron(container) {
  return waitFor(() => {
    const el = container.querySelector('.chevron')
    if (!el) throw new Error('chevron not found yet')
    return el
  })
}

function mockFetchRoutes(routes) {
  return vi.fn((url) => {
    for (const [matcher, respond] of routes) {
      const matches = typeof matcher === 'string' ? url === matcher : matcher.test(url)
      if (matches) {
        return Promise.resolve({ json: async () => respond(url) })
      }
    }
    throw new Error(`Unmocked fetch: ${url}`)
  })
}

describe('App', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.useRealTimers()
  })

  it('renders the app shell with a settings button', () => {
    vi.stubGlobal('fetch', mockFetchRoutes([
      ['/api/settings', () => ({ workspacePath: '' })]
    ]))

    render(<App />)

    expect(screen.getByText('Markdown Viewer')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Settings' })).toBeInTheDocument()
  })

  it('shows a split control for the initial pane', () => {
    vi.stubGlobal('fetch', mockFetchRoutes([
      ['/api/settings', () => ({ workspacePath: '' })]
    ]))

    render(<App />)

    expect(screen.getByRole('button', { name: 'Split pane-1' })).toBeInTheDocument()
  })

  it('shows the empty-workspace sidebar message when no workspacePath is configured', async () => {
    vi.stubGlobal('fetch', mockFetchRoutes([
      ['/api/settings', () => ({ workspacePath: '' })]
    ]))

    render(<App />)

    expect(await screen.findByText('No markdown files found.')).toBeInTheDocument()
  })

  it('loads the root tree from /api/settings + /api/list on mount', async () => {
    const fetchMock = mockFetchRoutes([
      ['/api/settings', () => ({ workspacePath: '/repo' })],
      [/^\/api\/list/, () => ({ entries: [{ name: 'notes.md', isDir: false }] })]
    ])
    vi.stubGlobal('fetch', fetchMock)

    const { container } = render(<App />)

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/list?path=%2Frepo'))

    const chevron = await waitForChevron(container)
    fireEvent.click(chevron)

    expect(await screen.findByText('notes.md')).toBeInTheDocument()
  })

  it('sets tree status to error when the root /api/list call fails', async () => {
    vi.stubGlobal('fetch', mockFetchRoutes([
      ['/api/settings', () => ({ workspacePath: '/repo' })],
      [/^\/api\/list/, () => ({ error: 'not found' })]
    ]))

    render(<App />)

    expect(await screen.findByText('Failed to load workspace.')).toBeInTheDocument()
  })

  it('expanding an unexpanded directory calls /api/list for that path and renders its children', async () => {
    const fetchMock = mockFetchRoutes([
      ['/api/settings', () => ({ workspacePath: '/repo' })],
      ['/api/list?path=%2Frepo', () => ({ entries: [{ name: 'docs', isDir: true }] })],
      ['/api/list?path=%2Frepo%2Fdocs', () => ({ entries: [{ name: 'guide.md', isDir: false }] })]
    ])
    vi.stubGlobal('fetch', fetchMock)

    const { container } = render(<App />)

    const rootChevron = await waitForChevron(container)
    fireEvent.click(rootChevron)
    await screen.findByText('docs')

    const docsRow = screen.getByText('docs').closest('.tree-row')
    fireEvent.click(docsRow)

    expect(await screen.findByText('guide.md')).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledWith('/api/list?path=%2Frepo%2Fdocs')
  })

  it('clicking a .md file opens a pane tab with content fetched from /api/file', async () => {
    const fetchMock = mockFetchRoutes([
      ['/api/settings', () => ({ workspacePath: '/repo' })],
      ['/api/list?path=%2Frepo', () => ({ entries: [{ name: 'notes.md', isDir: false }] })],
      [/^\/api\/file/, () => ({ content: '# Hello' })]
    ])
    vi.stubGlobal('fetch', fetchMock)

    const { container } = render(<App />)

    const chevron = await waitForChevron(container)
    fireEvent.click(chevron)
    const fileRow = await screen.findByText('notes.md')
    fireEvent.click(fileRow)

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/file?path=%2Frepo%2Fnotes.md'))
    expect(await screen.findByRole('tab', { name: /notes\.md/ })).toBeInTheDocument()
  })

  it('polls every 5s: re-lists expanded dirs and refreshes only the active pane\'s active tab', async () => {
    let listCalls = 0
    let fileCalls = 0
    let metaCalls = 0
    const fetchMock = vi.fn((url) => {
      if (url === '/api/settings') return Promise.resolve({ json: async () => ({ workspacePath: '/repo' }) })
      if (url.startsWith('/api/list')) {
        listCalls += 1
        return Promise.resolve({ json: async () => ({ entries: [{ name: 'notes.md', isDir: false }] }) })
      }
      if (url.startsWith('/api/file/meta')) {
        metaCalls += 1
        return Promise.resolve({ json: async () => ({ mtime: 1700000000000 + metaCalls }) })
      }
      if (url.startsWith('/api/file')) {
        fileCalls += 1
        return Promise.resolve({ json: async () => ({ content: `# v${fileCalls}` }) })
      }
      throw new Error(`Unmocked fetch: ${url}`)
    })
    vi.stubGlobal('fetch', fetchMock)
    vi.useFakeTimers({ shouldAdvanceTime: true })

    const { container } = render(<App />)

    const chevron = await waitForChevron(container)
    fireEvent.click(chevron)
    const fileRow = await screen.findByText('notes.md')
    fireEvent.click(fileRow)
    await waitFor(() => expect(fileCalls).toBe(1))

    const listCallsBeforePoll = listCalls

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000)
    })

    await waitFor(() => expect(listCalls).toBeGreaterThan(listCallsBeforePoll))
    await waitFor(() => expect(fileCalls).toBe(2))
  })

  it('switching tabs triggers exactly one refresh of the newly-focused tab', async () => {
    let fileCalls = 0
    let metaCalls = 0
    const fetchMock = vi.fn((url) => {
      if (url === '/api/settings') return Promise.resolve({ json: async () => ({ workspacePath: '/repo' }) })
      if (url.startsWith('/api/list')) {
        return Promise.resolve({ json: async () => ({ entries: [
          { name: 'a.md', isDir: false },
          { name: 'b.md', isDir: false }
        ] }) })
      }
      if (url.startsWith('/api/file/meta')) {
        metaCalls += 1
        return Promise.resolve({ json: async () => ({ mtime: 1700000000000 + metaCalls }) })
      }
      if (url.startsWith('/api/file')) {
        fileCalls += 1
        return Promise.resolve({ json: async () => ({ content: `# ${url}` }) })
      }
      throw new Error(`Unmocked fetch: ${url}`)
    })
    vi.stubGlobal('fetch', fetchMock)

    const { container } = render(<App />)

    const chevron = await waitForChevron(container)
    fireEvent.click(chevron)

    fireEvent.click(await screen.findByText('a.md'))
    await waitFor(() => expect(fileCalls).toBe(1))
    fireEvent.click(await screen.findByText('b.md'))
    await waitFor(() => expect(fileCalls).toBe(2))

    const callsBeforeSwitch = fileCalls
    const tabA = await screen.findByRole('tab', { name: /a\.md/ })
    fireEvent.click(tabA)

    await waitFor(() => expect(fileCalls).toBe(callsBeforeSwitch + 1))
  })
})
