import React from 'react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
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

describe('Sidebar resize', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  it('resizes the sidebar on drag and clamps at MIN/MAX width', async () => {
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

    // Wait for sidebar to render
    await waitFor(() => {
      expect(screen.getByRole('separator', { name: /resize sidebar/i })).toBeInTheDocument()
    }, { timeout: 2000 })

    const sidebar = document.querySelector('.app-sidebar')
    const resizeHandle = screen.getByRole('separator', { name: /resize sidebar/i })

    // Check initial width (default should be 260px via inline style)
    await waitFor(() => {
      const initialStyle = sidebar.getAttribute('style')
      expect(initialStyle).toContain('260')
    }, { timeout: 1000 })

    // Simulate drag 80px to the right
    fireEvent.mouseDown(resizeHandle)
    // Manually dispatch mousemove with movementX set as a property
    const moveEvent = new MouseEvent('mousemove', { bubbles: true })
    Object.defineProperty(moveEvent, 'movementX', { value: 80, configurable: true })
    window.dispatchEvent(moveEvent)
    fireEvent.mouseUp(window)

    // Wait for width to update in localStorage and inline style
    await waitFor(() => {
      const saved = localStorage.getItem('madabyo:sidebar:layout:/ws')
      const parsed = JSON.parse(saved)
      expect(parsed.width).toBe(340)
    }, { timeout: 1000 })

    // Test clamping at minimum (160px)
    fireEvent.mouseDown(resizeHandle)
    // Drag far left to go below MIN_SIDEBAR_WIDTH (160px)
    const moveEvent2 = new MouseEvent('mousemove', { bubbles: true })
    Object.defineProperty(moveEvent2, 'movementX', { value: -500, configurable: true })
    window.dispatchEvent(moveEvent2)
    fireEvent.mouseUp(window)

    // Wait for clamping to MIN_SIDEBAR_WIDTH
    await waitFor(() => {
      const saved = localStorage.getItem('madabyo:sidebar:layout:/ws')
      const parsed = JSON.parse(saved)
      expect(parsed.width).toBe(160)
    }, { timeout: 1000 })
  })

  it('restores last saved width on reload', async () => {
    // Pre-seed localStorage with a saved width
    localStorage.setItem('madabyo:sidebar:layout:/ws', JSON.stringify({ width: 400 }))

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

    // Wait for sidebar to render and load saved width from localStorage
    await waitFor(() => {
      const sidebar = document.querySelector('.app-sidebar')
      const style = sidebar.getAttribute('style')
      expect(style).toContain('400')
    }, { timeout: 2000 })
  })

  it('clamps a corrupt negative saved width to the minimum', async () => {
    // Pre-seed localStorage with a corrupt negative width
    localStorage.setItem('madabyo:sidebar:layout:/ws', JSON.stringify({ width: -50 }))

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

    // Wait for sidebar to render and clamp negative width to MIN_SIDEBAR_WIDTH
    await waitFor(() => {
      const sidebar = document.querySelector('.app-sidebar')
      const style = sidebar.getAttribute('style')
      expect(style).toContain('160')
    }, { timeout: 2000 })
  })
})
