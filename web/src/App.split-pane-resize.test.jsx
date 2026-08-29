import React from 'react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
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

describe('Split pane resize', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  // Test 1: renders two freshly-split panes at 50/50 width
  it('renders two freshly-split panes at 50/50 width', async () => {
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

    // Wait for the app to render with the split pane controls
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /split/i })).toBeInTheDocument()
    }, { timeout: 2000 })

    // Click the split button to create a second pane
    const splitButton = screen.getByRole('button', { name: /split/i })
    fireEvent.click(splitButton)

    // Wait for both pane-content-wrapper elements to render with 50% width
    await waitFor(() => {
      const wrappers = document.querySelectorAll('.pane-content-wrapper')
      expect(wrappers).toHaveLength(2)
      expect(wrappers[0].getAttribute('style')).toContain('width: 50%')
      expect(wrappers[1].getAttribute('style')).toContain('width: 50%')
    }, { timeout: 1000 })
  })

  // Test 2: resizes a pane on divider drag
  it('resizes a pane on divider drag', async () => {
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

    // Wait for the app to render with the split pane controls
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /split/i })).toBeInTheDocument()
    }, { timeout: 2000 })

    // Click the split button to create a second pane
    const splitButton = screen.getByRole('button', { name: /split/i })
    fireEvent.click(splitButton)

    // Wait for both panes to render
    await waitFor(() => {
      const wrappers = document.querySelectorAll('.pane-content-wrapper')
      expect(wrappers).toHaveLength(2)
    }, { timeout: 1000 })

    // Get the content-area divider and drag it to create 70/30 split
    // There are multiple separators (top strip + content area), so get all and pick the one in panes-content
    const allDividers = screen.getAllByRole('separator', { name: /resize pane-1/i })
    const divider = allDividers.find((d) => d.classList.contains('divider-content'))
    expect(divider).toBeTruthy()
    fireEvent.mouseDown(divider)

    // In jsdom, container width is ~0, so we use 1200px fallback.
    // To get 20% delta: (deltaPx / 1200) * 100 = 20, so deltaPx = 240
    const moveEvent = new MouseEvent('mousemove', { bubbles: true })
    Object.defineProperty(moveEvent, 'movementX', { value: 240, configurable: true })
    window.dispatchEvent(moveEvent)

    fireEvent.mouseUp(window)

    // Wait for pane widths to update (should be ~70% / ~30%)
    await waitFor(() => {
      const wrappers = document.querySelectorAll('.pane-content-wrapper')
      expect(wrappers[0].getAttribute('style')).toContain('width: 70%')
      expect(wrappers[1].getAttribute('style')).toContain('width: 30%')
    }, { timeout: 1000 })
  })
})
