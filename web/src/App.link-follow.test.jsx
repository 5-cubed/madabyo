import React from 'react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'
import * as MarkdownRenderer from './workspace/markdownRenderer.js'

const localStorageMock = (() => {
  let store = {}
  return {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => { store[key] = value.toString() },
    removeItem: (key) => { delete store[key] },
    clear: () => { store = {} }
  }
})()

vi.stubGlobal('localStorage', localStorageMock)
vi.spyOn(MarkdownRenderer, 'renderFile')

describe('Follow markdown links', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  it('opens a sibling .md file when clicking its link', async () => {
    MarkdownRenderer.renderFile.mockImplementation(async (path) => {
      if (path === '/ws/main.md') {
        return { status: 'ok', html: '<p><a href="other.md">click me</a></p>' }
      }
      if (path === '/ws/other.md') {
        return { status: 'ok', html: '<h1>Other</h1><p>Other file content</p>' }
      }
      return { status: 'not-found' }
    })

    global.fetch = vi.fn((url) => {
      if (url.includes('/api/settings')) {
        return Promise.resolve({
          json: () => Promise.resolve({ workspacePath: '/ws' })
        })
      }
      if (url.includes('/api/list')) {
        return Promise.resolve({
          json: () => Promise.resolve({
            entries: [{ name: 'main.md', isDir: false }]
          })
        })
      }
      return Promise.reject(new Error('Unexpected fetch: ' + url))
    })

    render(<App />)

    await waitFor(() => {
      expect(screen.getByText('main.md')).toBeInTheDocument()
    }, { timeout: 2000 })
    await userEvent.click(screen.getByText('main.md'))

    await waitFor(() => {
      expect(screen.getByRole('link', { name: 'click me' })).toBeInTheDocument()
    }, { timeout: 2000 })

    fireEvent.click(screen.getByRole('link', { name: 'click me' }))

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: 'other.md' })).toBeInTheDocument()
    }, { timeout: 2000 })

    expect(screen.getByRole('tab', { name: 'other.md' })).toHaveAttribute('aria-selected', 'true')
  })

  it('focuses existing tab without duplicating when clicking the same link twice', async () => {
    MarkdownRenderer.renderFile.mockImplementation(async (path) => {
      if (path === '/ws/main.md') {
        return { status: 'ok', html: '<p><a href="other.md">click</a></p>' }
      }
      if (path === '/ws/other.md') {
        return { status: 'ok', html: '<p>other</p>' }
      }
      return { status: 'not-found' }
    })

    global.fetch = vi.fn((url) => {
      if (url.includes('/api/settings')) {
        return Promise.resolve({
          json: () => Promise.resolve({ workspacePath: '/ws' })
        })
      }
      if (url.includes('/api/list')) {
        return Promise.resolve({
          json: () => Promise.resolve({
            entries: [{ name: 'main.md', isDir: false }]
          })
        })
      }
      return Promise.reject(new Error('Unexpected fetch: ' + url))
    })

    render(<App />)

    await waitFor(() => {
      expect(screen.getByText('main.md')).toBeInTheDocument()
    }, { timeout: 2000 })
    await userEvent.click(screen.getByText('main.md'))

    await waitFor(() => {
      expect(screen.getByRole('link', { name: 'click' })).toBeInTheDocument()
    }, { timeout: 2000 })

    fireEvent.click(screen.getByRole('link', { name: 'click' }))

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: 'other.md' })).toBeInTheDocument()
    }, { timeout: 2000 })

    const firstTabsCount = screen.getAllByRole('tab', { name: 'other.md' }).length

    // Click back to main.md to see the link again
    await userEvent.click(screen.getByRole('tab', { name: 'main.md' }))

    await waitFor(() => {
      expect(screen.getByRole('link', { name: 'click' })).toBeInTheDocument()
    }, { timeout: 2000 })

    fireEvent.click(screen.getByRole('link', { name: 'click' }))

    const secondTabsCount = screen.getAllByRole('tab', { name: 'other.md' }).length
    expect(secondTabsCount).toEqual(firstTabsCount)
  })

  it('opens README and .markdown files via link', async () => {
    MarkdownRenderer.renderFile.mockImplementation(async (path) => {
      if (path === '/ws/main.md') {
        return { status: 'ok', html: '<p><a href="README">readme</a><a href="guide.markdown">guide</a></p>' }
      }
      if (path === '/ws/README') {
        return { status: 'ok', html: '<p>readme content</p>' }
      }
      if (path === '/ws/guide.markdown') {
        return { status: 'ok', html: '<p>guide content</p>' }
      }
      return { status: 'not-found' }
    })

    global.fetch = vi.fn((url) => {
      if (url.includes('/api/settings')) {
        return Promise.resolve({
          json: () => Promise.resolve({ workspacePath: '/ws' })
        })
      }
      if (url.includes('/api/list')) {
        return Promise.resolve({
          json: () => Promise.resolve({
            entries: [
              { name: 'main.md', isDir: false },
              { name: 'README', isDir: false },
              { name: 'guide.markdown', isDir: false }
            ]
          })
        })
      }
      return Promise.reject(new Error('Unexpected fetch: ' + url))
    })

    render(<App />)

    await waitFor(() => {
      expect(screen.getByText('main.md')).toBeInTheDocument()
    }, { timeout: 2000 })
    await userEvent.click(screen.getByText('main.md'))

    await waitFor(() => {
      expect(screen.getByRole('link', { name: 'readme' })).toBeInTheDocument()
    }, { timeout: 2000 })

    fireEvent.click(screen.getByRole('link', { name: 'readme' }))

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: 'README' })).toBeInTheDocument()
    }, { timeout: 2000 })

    // Click back to main.md to see the guide link
    await userEvent.click(screen.getByRole('tab', { name: 'main.md' }))

    await waitFor(() => {
      expect(screen.getByRole('link', { name: 'guide' })).toBeInTheDocument()
    }, { timeout: 2000 })

    fireEvent.click(screen.getByRole('link', { name: 'guide' }))

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: 'guide.markdown' })).toBeInTheDocument()
    }, { timeout: 2000 })
  })

  it('ignores fragment identifier when opening link', async () => {
    MarkdownRenderer.renderFile.mockImplementation(async (path) => {
      if (path === '/ws/main.md') {
        return { status: 'ok', html: '<p><a href="other.md#section">link</a></p>' }
      }
      if (path === '/ws/other.md') {
        return { status: 'ok', html: '<p>other</p>' }
      }
      return { status: 'not-found' }
    })

    global.fetch = vi.fn((url) => {
      if (url.includes('/api/settings')) {
        return Promise.resolve({
          json: () => Promise.resolve({ workspacePath: '/ws' })
        })
      }
      if (url.includes('/api/list')) {
        return Promise.resolve({
          json: () => Promise.resolve({
            entries: [{ name: 'main.md', isDir: false }]
          })
        })
      }
      return Promise.reject(new Error('Unexpected fetch: ' + url))
    })

    render(<App />)

    await waitFor(() => {
      expect(screen.getByText('main.md')).toBeInTheDocument()
    }, { timeout: 2000 })
    await userEvent.click(screen.getByText('main.md'))

    await waitFor(() => {
      expect(screen.getByRole('link', { name: 'link' })).toBeInTheDocument()
    }, { timeout: 2000 })

    fireEvent.click(screen.getByRole('link', { name: 'link' }))

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: 'other.md' })).toBeInTheDocument()
    }, { timeout: 2000 })

    expect(screen.getByRole('tab', { name: 'other.md' })).toBeInTheDocument()
    expect(screen.queryByRole('tab', { name: /other\.md#/ })).not.toBeInTheDocument()
  })

  it('shows blocked message when link points outside workspace', async () => {
    MarkdownRenderer.renderFile.mockImplementation(async (path) => {
      if (path === '/ws/main.md') {
        return { status: 'ok', html: '<p><a href="../../outside.md">outside</a></p>' }
      }
      return { status: 'not-found' }
    })

    global.fetch = vi.fn((url) => {
      if (url.includes('/api/settings')) {
        return Promise.resolve({
          json: () => Promise.resolve({ workspacePath: '/ws' })
        })
      }
      if (url.includes('/api/list')) {
        return Promise.resolve({
          json: () => Promise.resolve({
            entries: [{ name: 'main.md', isDir: false }]
          })
        })
      }
      return Promise.reject(new Error('Unexpected fetch: ' + url))
    })

    render(<App />)

    await waitFor(() => {
      expect(screen.getByText('main.md')).toBeInTheDocument()
    }, { timeout: 2000 })
    await userEvent.click(screen.getByText('main.md'))

    await waitFor(() => {
      expect(screen.getByRole('link', { name: 'outside' })).toBeInTheDocument()
    }, { timeout: 2000 })

    fireEvent.click(screen.getByRole('link', { name: 'outside' }))

    await waitFor(() => {
      expect(screen.getByText('This link points outside your workspace.')).toBeInTheDocument()
    }, { timeout: 2000 })
  })

  it('shows not-found message when file does not exist', async () => {
    MarkdownRenderer.renderFile.mockImplementation(async (path) => {
      if (path === '/ws/main.md') {
        return { status: 'ok', html: '<p><a href="gone.md">gone</a></p>' }
      }
      if (path === '/ws/gone.md') {
        return { status: 'not-found' }
      }
      return { status: 'not-found' }
    })

    global.fetch = vi.fn((url) => {
      if (url.includes('/api/settings')) {
        return Promise.resolve({
          json: () => Promise.resolve({ workspacePath: '/ws' })
        })
      }
      if (url.includes('/api/list')) {
        return Promise.resolve({
          json: () => Promise.resolve({
            entries: [{ name: 'main.md', isDir: false }]
          })
        })
      }
      return Promise.reject(new Error('Unexpected fetch: ' + url))
    })

    render(<App />)

    await waitFor(() => {
      expect(screen.getByText('main.md')).toBeInTheDocument()
    }, { timeout: 2000 })
    await userEvent.click(screen.getByText('main.md'))

    await waitFor(() => {
      expect(screen.getByRole('link', { name: 'gone' })).toBeInTheDocument()
    }, { timeout: 2000 })

    fireEvent.click(screen.getByRole('link', { name: 'gone' }))

    await waitFor(() => {
      expect(screen.getByText('This file could not be found.')).toBeInTheDocument()
    }, { timeout: 2000 })
  })

  it('does nothing when clicking non-markdown file link', async () => {
    MarkdownRenderer.renderFile.mockImplementation(async (path) => {
      if (path === '/ws/main.md') {
        return { status: 'ok', html: '<p><a href="photo.png">image</a></p>' }
      }
      return { status: 'not-found' }
    })

    global.fetch = vi.fn((url) => {
      if (url.includes('/api/settings')) {
        return Promise.resolve({
          json: () => Promise.resolve({ workspacePath: '/ws' })
        })
      }
      if (url.includes('/api/list')) {
        return Promise.resolve({
          json: () => Promise.resolve({
            entries: [{ name: 'main.md', isDir: false }]
          })
        })
      }
      return Promise.reject(new Error('Unexpected fetch: ' + url))
    })

    render(<App />)

    await waitFor(() => {
      expect(screen.getByText('main.md')).toBeInTheDocument()
    }, { timeout: 2000 })
    await userEvent.click(screen.getByText('main.md'))

    await waitFor(() => {
      expect(screen.getByRole('link', { name: 'image' })).toBeInTheDocument()
    }, { timeout: 2000 })

    fireEvent.click(screen.getByRole('link', { name: 'image' }))

    const tabs = screen.getAllByRole('tab')
    expect(tabs).toHaveLength(1)
    expect(tabs[0]).toHaveTextContent('main.md')
  })

  it('opens a Windows-style link inside the workspace', async () => {
    MarkdownRenderer.renderFile.mockImplementation(async (path) => {
      if (path === 'C:/ws/main.md') {
        return { status: 'ok', html: '<p><a href="other.md">click me</a></p>' }
      }
      if (path === 'C:/ws/other.md') {
        return { status: 'ok', html: '<h1>Other</h1>' }
      }
      return { status: 'not-found' }
    })

    global.fetch = vi.fn((url) => {
      if (url.includes('/api/settings')) {
        return Promise.resolve({
          json: () => Promise.resolve({ workspacePath: 'C:\\ws' })
        })
      }
      if (url.includes('/api/list')) {
        return Promise.resolve({
          json: () => Promise.resolve({
            entries: [{ name: 'main.md', isDir: false }]
          })
        })
      }
      return Promise.reject(new Error('Unexpected fetch: ' + url))
    })

    render(<App />)

    await waitFor(() => {
      expect(screen.getByText('main.md')).toBeInTheDocument()
    }, { timeout: 2000 })
    await userEvent.click(screen.getByText('main.md'))

    await waitFor(() => {
      expect(screen.getByRole('link', { name: 'click me' })).toBeInTheDocument()
    }, { timeout: 2000 })

    fireEvent.click(screen.getByRole('link', { name: 'click me' }))

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: 'other.md' })).toBeInTheDocument()
    }, { timeout: 2000 })

    expect(screen.getByRole('tab', { name: 'other.md' })).toHaveAttribute('aria-selected', 'true')
  })

  it('opens a Windows-style link with native path (no leading slash before drive)', async () => {
    const openedPaths = []
    MarkdownRenderer.renderFile.mockImplementation(async (path) => {
      openedPaths.push(path)
      if (path === 'C:/ws/main.md') {
        return { status: 'ok', html: '<p><a href="other.md">click me</a></p>' }
      }
      if (path === 'C:/ws/other.md') {
        return { status: 'ok', html: '<h1>Other</h1>' }
      }
      return { status: 'not-found' }
    })

    global.fetch = vi.fn((url) => {
      if (url.includes('/api/settings')) {
        return Promise.resolve({
          json: () => Promise.resolve({ workspacePath: 'C:\\ws' })
        })
      }
      if (url.includes('/api/list')) {
        return Promise.resolve({
          json: () => Promise.resolve({
            entries: [{ name: 'main.md', isDir: false }]
          })
        })
      }
      return Promise.reject(new Error('Unexpected fetch: ' + url))
    })

    render(<App />)

    await waitFor(() => {
      expect(screen.getByText('main.md')).toBeInTheDocument()
    }, { timeout: 2000 })
    await userEvent.click(screen.getByText('main.md'))

    await waitFor(() => {
      expect(screen.getByRole('link', { name: 'click me' })).toBeInTheDocument()
    }, { timeout: 2000 })

    fireEvent.click(screen.getByRole('link', { name: 'click me' }))

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: 'other.md' })).toBeInTheDocument()
    }, { timeout: 2000 })

    // Verify the path passed to renderFile does not have a leading / before drive letter
    expect(openedPaths).toContain('C:/ws/other.md')
    expect(openedPaths).not.toContain('/C:/ws/other.md')
  })

  it('still blocks Windows-style links that resolve outside the workspace', async () => {
    MarkdownRenderer.renderFile.mockImplementation(async (path) => {
      if (path === 'C:/ws/main.md') {
        return { status: 'ok', html: '<p><a href="../../outside.md">outside</a></p>' }
      }
      return { status: 'not-found' }
    })

    global.fetch = vi.fn((url) => {
      if (url.includes('/api/settings')) {
        return Promise.resolve({
          json: () => Promise.resolve({ workspacePath: 'C:\\ws' })
        })
      }
      if (url.includes('/api/list')) {
        return Promise.resolve({
          json: () => Promise.resolve({
            entries: [{ name: 'main.md', isDir: false }]
          })
        })
      }
      return Promise.reject(new Error('Unexpected fetch: ' + url))
    })

    render(<App />)

    await waitFor(() => {
      expect(screen.getByText('main.md')).toBeInTheDocument()
    }, { timeout: 2000 })
    await userEvent.click(screen.getByText('main.md'))

    await waitFor(() => {
      expect(screen.getByRole('link', { name: 'outside' })).toBeInTheDocument()
    }, { timeout: 2000 })

    fireEvent.click(screen.getByRole('link', { name: 'outside' }))

    await waitFor(() => {
      expect(screen.getByText('This link points outside your workspace.')).toBeInTheDocument()
    }, { timeout: 2000 })
  })
})
