import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
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

describe('App tree ancestor merge', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.useRealTimers()
  })

  it('expanding a nested directory should not collapse/overwrite parent directories and siblings', async () => {
    // Setup: root has a dir "docs" and a sibling file "other.md"
    // docs has a child file "guide.md" and a sibling file "notes.md" inside docs
    const fetchMock = mockFetchRoutes([
      ['/api/settings', () => ({ workspacePath: '/repo' })],
      // Root initial list: has "docs" (dir) and "other.md" (file)
      ['/api/list?path=%2Frepo', () => ({
        entries: [
          { name: 'docs', isDir: true },
          { name: 'other.md', isDir: false }
        ]
      })],
      // Expanding docs: list the docs directory contents
      ['/api/list?path=%2Frepo%2Fdocs', () => ({
        entries: [
          { name: 'guide.md', isDir: false },
          { name: 'notes.md', isDir: false }
        ]
      })]
    ])
    vi.stubGlobal('fetch', fetchMock)

    const { container } = render(<App />)

    // Wait for root chevron and expand the root
    const rootChevron = await waitForChevron(container)
    fireEvent.click(rootChevron)

    // Wait for root's initial children to appear
    await screen.findByText('docs')
    await screen.findByText('other.md')

    // At this point, both "docs" and "other.md" should be visible
    expect(screen.getByText('docs')).toBeInTheDocument()
    expect(screen.getByText('other.md')).toBeInTheDocument()

    // Now expand docs by clicking on the docs row
    const docsRow = screen.getByText('docs').closest('.tree-row')
    fireEvent.click(docsRow)

    // Wait for docs's children to appear
    await screen.findByText('guide.md')
    await screen.findByText('notes.md')

    // CRITICAL ASSERTIONS: This is where the bug manifests
    // After expanding docs, all these should still be visible:
    // 1. guide.md and notes.md (children of docs)
    // 2. docs itself (should still exist as a directory entry, not deleted)
    // 3. other.md (the root's sibling that should NOT be overwritten)

    expect(screen.getByText('guide.md')).toBeInTheDocument()
    expect(screen.getByText('notes.md')).toBeInTheDocument()
    expect(screen.getByText('docs')).toBeInTheDocument()
    expect(screen.getByText('other.md')).toBeInTheDocument()

    // Verify fetch was called correctly
    expect(fetchMock).toHaveBeenCalledWith('/api/list?path=%2Frepo%2Fdocs')
  })
})
