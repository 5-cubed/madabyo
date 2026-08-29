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

describe('Sidebar fold/unfold', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  it('hides sidebar on fold click and shows it again on unfold click', async () => {
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
      }
      return Promise.reject(new Error('Unexpected fetch: ' + url))
    })

    render(<App />)

    // Wait for sidebar to appear
    await waitFor(() => {
      const sidebar = document.querySelector('.app-sidebar')
      expect(sidebar).toBeInTheDocument()
    }, { timeout: 2000 })

    // Sidebar should be visible initially
    let sidebar = document.querySelector('.app-sidebar')
    expect(sidebar).toBeInTheDocument()

    // Find and click the fold button - use data-testid for more reliability
    const foldButton = screen.getByTestId('fold-button')
    expect(foldButton).toBeInTheDocument()
    await user.click(foldButton)

    // Sidebar should now be hidden
    await waitFor(() => {
      sidebar = document.querySelector('.app-sidebar')
      expect(sidebar).not.toBeInTheDocument()
    }, { timeout: 1000 })

    // Click unfold button again
    const unfoldButton = screen.getByTestId('fold-button')
    await user.click(unfoldButton)

    // Sidebar should reappear
    await waitFor(() => {
      sidebar = document.querySelector('.app-sidebar')
      expect(sidebar).toBeInTheDocument()
    }, { timeout: 1000 })
  })

  it('defaults to unfolded when no saved layout exists for the workspace', async () => {
    global.fetch = vi.fn((url) => {
      if (url.includes('/api/settings')) {
        return Promise.resolve({
          json: () => Promise.resolve({ workspacePath: '/ws' })
        })
      }
      if (url.includes('/api/list')) {
        return Promise.resolve({
          json: () => Promise.resolve({ entries: [] })
        })
      }
      return Promise.reject(new Error('Unexpected fetch: ' + url))
    })

    render(<App />)

    // Sidebar should be visible by default
    await waitFor(() => {
      const sidebar = document.querySelector('.app-sidebar')
      expect(sidebar).toBeInTheDocument()
    }, { timeout: 2000 })
  })

  it('treats a corrupt saved folded value as unfolded', async () => {
    // Seed localStorage with a corrupt value
    localStorage.setItem('madabyo:sidebar:layout:/ws', JSON.stringify({ folded: 'yes' }))

    global.fetch = vi.fn((url) => {
      if (url.includes('/api/settings')) {
        return Promise.resolve({
          json: () => Promise.resolve({ workspacePath: '/ws' })
        })
      }
      if (url.includes('/api/list')) {
        return Promise.resolve({
          json: () => Promise.resolve({ entries: [] })
        })
      }
      return Promise.reject(new Error('Unexpected fetch: ' + url))
    })

    render(<App />)

    // Sidebar should be visible (corrupt value treated as unfolded)
    await waitFor(() => {
      const sidebar = document.querySelector('.app-sidebar')
      expect(sidebar).toBeInTheDocument()
    }, { timeout: 2000 })
  })

  it('persists folded state to localStorage', async () => {
    const user = userEvent.setup({ delay: null })

    global.fetch = vi.fn((url) => {
      if (url.includes('/api/settings')) {
        return Promise.resolve({
          json: () => Promise.resolve({ workspacePath: '/ws' })
        })
      }
      if (url.includes('/api/list')) {
        return Promise.resolve({
          json: () => Promise.resolve({ entries: [] })
        })
      }
      return Promise.reject(new Error('Unexpected fetch: ' + url))
    })

    render(<App />)

    // Wait for sidebar to appear
    await waitFor(() => {
      const sidebar = document.querySelector('.app-sidebar')
      expect(sidebar).toBeInTheDocument()
    }, { timeout: 2000 })

    // Click fold button
    const foldButton = screen.getByTestId('fold-button')
    await user.click(foldButton)

    // Check localStorage was updated
    await waitFor(() => {
      const saved = localStorage.getItem('madabyo:sidebar:layout:/ws')
      expect(saved).toBeDefined()
      const layout = JSON.parse(saved)
      expect(layout.folded).toBe(true)
    }, { timeout: 1000 })
  })

  it('restores folded state from localStorage', async () => {
    // Pre-populate localStorage with folded state
    localStorage.setItem('madabyo:sidebar:layout:/ws', JSON.stringify({ folded: true }))

    global.fetch = vi.fn((url) => {
      if (url.includes('/api/settings')) {
        return Promise.resolve({
          json: () => Promise.resolve({ workspacePath: '/ws' })
        })
      }
      if (url.includes('/api/list')) {
        return Promise.resolve({
          json: () => Promise.resolve({ entries: [] })
        })
      }
      return Promise.reject(new Error('Unexpected fetch: ' + url))
    })

    render(<App />)

    // Sidebar should be hidden since we saved it as folded
    await waitFor(() => {
      const sidebar = document.querySelector('.app-sidebar')
      expect(sidebar).not.toBeInTheDocument()
    }, { timeout: 2000 })
  })
})
