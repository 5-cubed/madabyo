import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'
import App from './App'

describe('App settings refresh bug', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.useRealTimers()
  })

  it('refreshes tree after saving workspace path in settings without page reload', async () => {
    let settingsCallCount = 0
    const fetchMock = vi.fn((url, options) => {
      // Handle different HTTP methods
      if (url === '/api/settings') {
        if (options?.method === 'PUT') {
          // PUT /api/settings always returns the saved path
          return Promise.resolve({ json: async () => ({ workspacePath: '/tmp/ws' }) })
        }
        // GET /api/settings: return empty on first call, /tmp/ws on subsequent
        settingsCallCount += 1
        if (settingsCallCount === 1) {
          return Promise.resolve({ json: async () => ({ workspacePath: '' }) })
        }
        return Promise.resolve({ json: async () => ({ workspacePath: '/tmp/ws' }) })
      }

      if (url.startsWith('/api/list')) {
        return Promise.resolve({ json: async () => ({ entries: [{ name: 'file.md', isDir: false }] }) })
      }

      throw new Error(`Unmocked fetch: ${url}`)
    })
    vi.stubGlobal('fetch', fetchMock)

    const { container } = render(<App />)

    // Assert initial state: empty workspace
    expect(await screen.findByText('No markdown files found.')).toBeInTheDocument()

    // Open Settings
    const settingsBtn = screen.getByRole('button', { name: 'Settings' })
    fireEvent.click(settingsBtn)

    // Type path in the input (wait for it to appear and be seeded with empty value)
    const pathInput = await screen.findByRole('textbox', { name: 'Workspace path' })

    const user = userEvent.setup()

    // Clear the input and type the new path
    await user.clear(pathInput)
    await user.type(pathInput, '/tmp/ws')

    // Wait for the validity check to pass (PathAutocompleteInput's debounced /api/list call)
    await waitFor(() => expect(screen.getByRole('button', { name: 'Save' })).not.toBeDisabled(), { timeout: 1000 })

    // Click Save
    await user.click(screen.getByRole('button', { name: 'Save' }))

    // Assert: Settings should close
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    // Assert: WITHOUT any page reload, the tree should now be populated
    // The root directory should be visible (tree was refreshed after settings save)
    // Expand the root directory to verify the file entry is there
    const chevron = await waitFor(() => {
      const el = container.querySelector('.chevron')
      if (!el) throw new Error('chevron not found')
      return el
    })
    fireEvent.click(chevron)

    // Now the file should be visible
    expect(await screen.findByText('file.md')).toBeInTheDocument()
  })
})
