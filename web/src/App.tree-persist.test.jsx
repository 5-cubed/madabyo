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
  })
})
