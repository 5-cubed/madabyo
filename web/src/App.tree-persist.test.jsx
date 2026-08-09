import React from 'react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'

// Mock localStorage
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

describe('Sidebar tree persistence', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  it('saves and restores one open folder', async () => {
    const user = userEvent.setup({ delay: null })

    // Mock fetch for API calls
    let callCount = 0
    global.fetch = vi.fn((url) => {
      if (url.includes('/api/settings')) {
        return Promise.resolve({
          json: () => Promise.resolve({ workspacePath: '/ws' })
        })
      }
      if (url.includes('/api/list')) {
        const urlObj = new URL(url, 'http://localhost')
        const path = urlObj.searchParams.get('path')
        callCount++
        if (path === '/ws') {
          return Promise.resolve({
            json: () => Promise.resolve({
              entries: [{ name: 'docs', isDir: true }]
            })
          })
        }
        if (path === '/ws/docs') {
          return Promise.resolve({
            json: () => Promise.resolve({
              entries: [{ name: 'notes.md', isDir: false }]
            })
          })
        }
      }
      return Promise.reject(new Error('Unexpected fetch: ' + url))
    })

    // PART 1: First render and save
    const { unmount } = render(<App />)

    // Wait for root folder to appear
    await waitFor(() => {
      const wsElements = screen.queryAllByText('ws')
      expect(wsElements.length).toBeGreaterThan(0)
    }, { timeout: 2000 })

    // Click to expand root ws folder
    const wsElements = screen.queryAllByText('ws')
    const wsRow = wsElements[0].closest('.tree-row')
    expect(wsRow).toBeTruthy()
    await user.click(wsRow)

    // Wait for docs folder to appear
    await waitFor(() => {
      const docsFolders = screen.queryAllByText('docs')
      expect(docsFolders.length).toBeGreaterThan(0)
    }, { timeout: 2000 })

    // Click to expand docs folder
    const docsElements = screen.queryAllByText('docs')
    const docsRow = docsElements[0].closest('.tree-row')
    expect(docsRow).toBeTruthy()
    await user.click(docsRow)

    // Wait for notes.md to appear
    await waitFor(() => {
      expect(screen.getByText('notes.md')).toBeInTheDocument()
    }, { timeout: 2000 })

    // Verify folder was saved to localStorage
    const saved = localStorage.getItem('madabyo:sidebar:/ws')
    expect(saved).toBeDefined()
    const savedPaths = JSON.parse(saved)
    expect(savedPaths).toEqual(['/ws/docs'])

    // PART 2: Unmount and remount
    unmount()
    vi.clearAllMocks()
    callCount = 0

    // Second render: should restore expanded folder
    render(<App />)

    // Wait for notes.md to appear (should be auto-restored)
    await waitFor(() => {
      expect(screen.getByText('notes.md')).toBeInTheDocument()
    }, { timeout: 3000 })
  })

  it('saves and restores nested folders shallowest first', async () => {
    const user = userEvent.setup({ delay: null })

    global.fetch = vi.fn((url) => {
      if (url.includes('/api/settings')) {
        return Promise.resolve({
          json: () => Promise.resolve({ workspacePath: '/ws' })
        })
      }
      if (url.includes('/api/list')) {
        const urlObj = new URL(url, 'http://localhost')
        const path = urlObj.searchParams.get('path')
        if (path === '/ws') {
          return Promise.resolve({
            json: () => Promise.resolve({
              entries: [{ name: 'docs', isDir: true }]
            })
          })
        }
        if (path === '/ws/docs') {
          return Promise.resolve({
            json: () => Promise.resolve({
              entries: [{ name: 'drafts', isDir: true }, { name: 'api.md', isDir: false }]
            })
          })
        }
        if (path === '/ws/docs/drafts') {
          return Promise.resolve({
            json: () => Promise.resolve({
              entries: [{ name: 'wip.md', isDir: false }]
            })
          })
        }
      }
      return Promise.reject(new Error('Unexpected fetch: ' + url))
    })

    // PART 1: First render and save nested folders
    const { unmount } = render(<App />)

    // Wait for root folder and expand it
    await waitFor(() => {
      expect(screen.queryByText('docs')).toBeInTheDocument()
    }, { timeout: 2000 })

    // Expand docs
    const docsElements = screen.queryAllByText('docs')
    const docsRow = docsElements[0].closest('.tree-row')
    await user.click(docsRow)

    // Wait for drafts
    await waitFor(() => {
      expect(screen.queryByText('drafts')).toBeInTheDocument()
    }, { timeout: 2000 })

    // Expand drafts
    const draftsElements = screen.queryAllByText('drafts')
    const draftsRow = draftsElements[0].closest('.tree-row')
    await user.click(draftsRow)

    // Wait for wip.md
    await waitFor(() => {
      expect(screen.getByText('wip.md')).toBeInTheDocument()
    }, { timeout: 2000 })

    // Verify nested folders were saved
    const saved = localStorage.getItem('madabyo:sidebar:/ws')
    const savedPaths = JSON.parse(saved)
    expect(savedPaths).toEqual(['/ws/docs', '/ws/docs/drafts'])

    // PART 2: Unmount and remount
    unmount()
    vi.clearAllMocks()

    global.fetch = vi.fn((url) => {
      if (url.includes('/api/settings')) {
        return Promise.resolve({
          json: () => Promise.resolve({ workspacePath: '/ws' })
        })
      }
      if (url.includes('/api/list')) {
        const urlObj = new URL(url, 'http://localhost')
        const path = urlObj.searchParams.get('path')
        if (path === '/ws') {
          return Promise.resolve({
            json: () => Promise.resolve({
              entries: [{ name: 'docs', isDir: true }]
            })
          })
        }
        if (path === '/ws/docs') {
          return Promise.resolve({
            json: () => Promise.resolve({
              entries: [{ name: 'drafts', isDir: true }, { name: 'api.md', isDir: false }]
            })
          })
        }
        if (path === '/ws/docs/drafts') {
          return Promise.resolve({
            json: () => Promise.resolve({
              entries: [{ name: 'wip.md', isDir: false }]
            })
          })
        }
      }
      return Promise.reject(new Error('Unexpected fetch: ' + url))
    })

    // Second render should restore both folders
    render(<App />)

    // wip.md should appear without manual clicking
    await waitFor(() => {
      expect(screen.getByText('wip.md')).toBeInTheDocument()
    }, { timeout: 3000 })
  })

  it('restores ancestor folders before nested folders', async () => {
    const user = userEvent.setup({ delay: null })

    global.fetch = vi.fn((url) => {
      if (url.includes('/api/settings')) {
        return Promise.resolve({
          json: () => Promise.resolve({ workspacePath: '/ws' })
        })
      }
      if (url.includes('/api/list')) {
        const urlObj = new URL(url, 'http://localhost')
        const path = urlObj.searchParams.get('path')
        if (path === '/ws') {
          return Promise.resolve({
            json: () => Promise.resolve({
              entries: [{ name: 'docs', isDir: true }]
            })
          })
        }
        if (path === '/ws/docs') {
          return Promise.resolve({
            json: () => Promise.resolve({
              entries: [{ name: 'api', isDir: true }]
            })
          })
        }
        if (path === '/ws/docs/api') {
          return Promise.resolve({
            json: () => Promise.resolve({
              entries: [{ name: 'index.md', isDir: false }]
            })
          })
        }
      }
      return Promise.reject(new Error('Unexpected fetch: ' + url))
    })

    // Simulate localStorage having only the nested folder (not the parent)
    localStorage.setItem('madabyo:sidebar:/ws', JSON.stringify(['/ws/docs/api']))

    render(<App />)

    // Wait for index.md to appear (both parent and nested folder should open)
    await waitFor(() => {
      expect(screen.getByText('index.md')).toBeInTheDocument()
    }, { timeout: 3000 })
  })

  it('nested folder reopens when parent is re-expanded', async () => {
    const user = userEvent.setup({ delay: null })

    global.fetch = vi.fn((url) => {
      if (url.includes('/api/settings')) {
        return Promise.resolve({
          json: () => Promise.resolve({ workspacePath: '/ws' })
        })
      }
      if (url.includes('/api/list')) {
        const urlObj = new URL(url, 'http://localhost')
        const path = urlObj.searchParams.get('path')
        if (path === '/ws') {
          return Promise.resolve({
            json: () => Promise.resolve({
              entries: [{ name: 'docs', isDir: true }]
            })
          })
        }
        if (path === '/ws/docs') {
          return Promise.resolve({
            json: () => Promise.resolve({
              entries: [{ name: 'api', isDir: true }]
            })
          })
        }
        if (path === '/ws/docs/api') {
          return Promise.resolve({
            json: () => Promise.resolve({
              entries: [{ name: 'index.md', isDir: false }]
            })
          })
        }
      }
      return Promise.reject(new Error('Unexpected fetch: ' + url))
    })

    render(<App />)

    // Expand docs
    await waitFor(() => {
      expect(screen.queryByText('docs')).toBeInTheDocument()
    }, { timeout: 2000 })

    let docsElements = screen.queryAllByText('docs')
    let docsRow = docsElements[0].closest('.tree-row')
    await user.click(docsRow)

    // Expand api
    await waitFor(() => {
      expect(screen.queryByText('api')).toBeInTheDocument()
    }, { timeout: 2000 })

    docsElements = screen.queryAllByText('docs')
    const apiElements = screen.queryAllByText('api')
    const apiRow = apiElements[0].closest('.tree-row')
    await user.click(apiRow)

    // Wait for index.md
    await waitFor(() => {
      expect(screen.getByText('index.md')).toBeInTheDocument()
    }, { timeout: 2000 })

    // Close docs (first click on docs)
    docsElements = screen.queryAllByText('docs')
    docsRow = docsElements[0].closest('.tree-row')
    await user.click(docsRow)

    // Verify index.md disappeared
    await waitFor(() => {
      expect(screen.queryByText('index.md')).not.toBeInTheDocument()
    }, { timeout: 2000 })

    // Re-expand docs (second click)
    docsElements = screen.queryAllByText('docs')
    docsRow = docsElements[0].closest('.tree-row')
    await user.click(docsRow)

    // Verify index.md reappears (nested folder reopened)
    await waitFor(() => {
      expect(screen.getByText('index.md')).toBeInTheDocument()
    }, { timeout: 2000 })
  })

  it('collapses a folder when clicked when already open', async () => {
    const user = userEvent.setup({ delay: null })

    global.fetch = vi.fn((url) => {
      if (url.includes('/api/settings')) {
        return Promise.resolve({
          json: () => Promise.resolve({ workspacePath: '/ws' })
        })
      }
      if (url.includes('/api/list')) {
        const urlObj = new URL(url, 'http://localhost')
        const path = urlObj.searchParams.get('path')
        if (path === '/ws') {
          return Promise.resolve({
            json: () => Promise.resolve({
              entries: [{ name: 'docs', isDir: true }]
            })
          })
        }
        if (path === '/ws/docs') {
          return Promise.resolve({
            json: () => Promise.resolve({
              entries: [{ name: 'notes.md', isDir: false }]
            })
          })
        }
      }
      return Promise.reject(new Error('Unexpected fetch: ' + url))
    })

    render(<App />)

    // Wait for docs to appear
    await waitFor(() => {
      expect(screen.queryByText('docs')).toBeInTheDocument()
    }, { timeout: 2000 })

    // Expand docs folder
    const docsElements = screen.queryAllByText('docs')
    const docsRow = docsElements[0].closest('.tree-row')
    await user.click(docsRow)

    // Wait for notes.md to appear
    await waitFor(() => {
      expect(screen.getByText('notes.md')).toBeInTheDocument()
    }, { timeout: 2000 })

    // Verify folder was saved to localStorage
    let saved = localStorage.getItem('madabyo:sidebar:/ws')
    expect(saved).toBeDefined()
    let savedPaths = JSON.parse(saved)
    expect(savedPaths).toEqual(['/ws/docs'])

    // Click docs folder again to collapse it
    const docsElements2 = screen.queryAllByText('docs')
    const docsRow2 = docsElements2[0].closest('.tree-row')
    await user.click(docsRow2)

    // Wait for notes.md to disappear
    await waitFor(() => {
      expect(screen.queryByText('notes.md')).not.toBeInTheDocument()
    }, { timeout: 2000 })

    // Verify folder was removed from localStorage
    saved = localStorage.getItem('madabyo:sidebar:/ws')
    if (saved) {
      savedPaths = JSON.parse(saved)
      expect(savedPaths).not.toContain('/ws/docs')
    } else {
      expect(saved).toBeNull()
    }
  })

  it('posts to /api/log when a remembered folder cannot be listed during restore', async () => {
    const user = userEvent.setup({ delay: null })

    // Mock fetch for API calls
    let logCalls = []
    global.fetch = vi.fn((url, options) => {
      if (url.includes('/api/log')) {
        logCalls.push(options?.body)
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({})
        })
      }
      if (url.includes('/api/settings')) {
        return Promise.resolve({
          json: () => Promise.resolve({ workspacePath: '/ws' })
        })
      }
      if (url.includes('/api/list')) {
        const urlObj = new URL(url, 'http://localhost')
        const path = urlObj.searchParams.get('path')
        if (path === '/ws') {
          return Promise.resolve({
            json: () => Promise.resolve({
              entries: [{ name: 'docs', isDir: true }]
            })
          })
        }
        if (path === '/ws/docs') {
          return Promise.resolve({
            json: () => Promise.resolve({
              entries: [{ name: 'notes.md', isDir: false }]
            })
          })
        }
      }
      return Promise.reject(new Error('Unexpected fetch: ' + url))
    })

    // PART 1: First render, expand and save
    const { unmount } = render(<App />)

    await waitFor(() => {
      expect(screen.queryByText('docs')).toBeInTheDocument()
    }, { timeout: 2000 })

    const docsElements = screen.queryAllByText('docs')
    const docsRow = docsElements[0].closest('.tree-row')
    await user.click(docsRow)

    await waitFor(() => {
      expect(screen.getByText('notes.md')).toBeInTheDocument()
    }, { timeout: 2000 })

    // Verify folder was saved
    const saved = localStorage.getItem('madabyo:sidebar:/ws')
    expect(saved).toBeDefined()

    // PART 2: Unmount, then remount with docs folder returning error
    unmount()
    vi.clearAllMocks()
    logCalls = []

    global.fetch = vi.fn((url, options) => {
      if (url.includes('/api/log')) {
        logCalls.push(options?.body)
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({})
        })
      }
      if (url.includes('/api/settings')) {
        return Promise.resolve({
          json: () => Promise.resolve({ workspacePath: '/ws' })
        })
      }
      if (url.includes('/api/list')) {
        const urlObj = new URL(url, 'http://localhost')
        const path = urlObj.searchParams.get('path')
        if (path === '/ws') {
          return Promise.resolve({
            json: () => Promise.resolve({
              entries: [{ name: 'docs', isDir: true }]
            })
          })
        }
        // docs folder now returns error
        if (path === '/ws/docs') {
          return Promise.resolve({
            json: () => Promise.resolve({
              error: 'permission denied'
            })
          })
        }
      }
      return Promise.reject(new Error('Unexpected fetch: ' + url))
    })

    // Second render: should attempt to restore /ws/docs and fail
    render(<App />)

    // Wait for the restore attempt to complete
    await waitFor(() => {
      expect(logCalls.length).toBeGreaterThan(0)
    }, { timeout: 3000 })

    // Should have posted to /api/log with error level
    const logBody = JSON.parse(logCalls[0])
    expect(logBody.level).toBe('error')
    expect(logBody.message).toContain('/ws/docs')
  })

  it('root folder stays open when clicked', async () => {
    const user = userEvent.setup({ delay: null })

    global.fetch = vi.fn((url) => {
      if (url.includes('/api/settings')) {
        return Promise.resolve({
          json: () => Promise.resolve({ workspacePath: '/ws' })
        })
      }
      if (url.includes('/api/list')) {
        const urlObj = new URL(url, 'http://localhost')
        const path = urlObj.searchParams.get('path')
        if (path === '/ws') {
          return Promise.resolve({
            json: () => Promise.resolve({
              entries: [{ name: 'docs', isDir: true }]
            })
          })
        }
      }
      return Promise.reject(new Error('Unexpected fetch: ' + url))
    })

    render(<App />)

    // Wait for root (ws) to appear
    await waitFor(() => {
      const wsElements = screen.queryAllByText('ws')
      expect(wsElements.length).toBeGreaterThan(0)
    }, { timeout: 2000 })

    // Get initial docs visibility (should be visible)
    let docsElements = screen.queryAllByText('docs')
    expect(docsElements.length).toBeGreaterThan(0)

    // Click root folder (ws)
    const wsElements = screen.queryAllByText('ws')
    const wsRow = wsElements[0].closest('.tree-row')
    await user.click(wsRow)

    // Click root again
    docsElements = screen.queryAllByText('docs')
    const docsRow = docsElements[0]?.closest('.tree-row')
    if (docsRow) {
      // If docs is visible, root is still open
      expect(docsRow).toBeTruthy()
    }

    // Verify docs is still visible (root folder cannot close)
    await waitFor(() => {
      docsElements = screen.queryAllByText('docs')
      expect(docsElements.length).toBeGreaterThan(0)
    }, { timeout: 2000 })
  })

  it('saves one open folder to localStorage', async () => {
    const user = userEvent.setup({ delay: null })

    // Mock fetch for API calls
    global.fetch = vi.fn((url) => {
      if (url.includes('/api/settings')) {
        return Promise.resolve({
          json: () => Promise.resolve({ workspacePath: '/ws' })
        })
      }
      if (url.includes('/api/list')) {
        const urlObj = new URL(url, 'http://localhost')
        const path = urlObj.searchParams.get('path')
        if (path === '/ws') {
          return Promise.resolve({
            json: () => Promise.resolve({
              entries: [{ name: 'docs', isDir: true }]
            })
          })
        }
        if (path === '/ws/docs') {
          return Promise.resolve({
            json: () => Promise.resolve({
              entries: [{ name: 'notes.md', isDir: false }]
            })
          })
        }
      }
      return Promise.reject(new Error('Unexpected fetch: ' + url))
    })

    // Render the app
    render(<App />)

    // Wait for docs to appear
    await waitFor(() => {
      expect(screen.queryByText('docs')).toBeInTheDocument()
    }, { timeout: 2000 })

    // Expand docs folder
    const docsElements = screen.queryAllByText('docs')
    const docsRow = docsElements[0].closest('.tree-row')
    expect(docsRow).toBeTruthy()
    await user.click(docsRow)

    // Wait for notes.md to appear
    await waitFor(() => {
      expect(screen.getByText('notes.md')).toBeInTheDocument()
    }, { timeout: 2000 })

    // Verify folder was saved to localStorage
    const saved = localStorage.getItem('madabyo:sidebar:/ws')
    expect(saved).toBeDefined()
    const savedPaths = JSON.parse(saved)
    expect(savedPaths).toEqual(['/ws/docs'])
  })
})
