import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'
import SettingsPanel from './SettingsPanel'

function mockFetch(handlers) {
  vi.stubGlobal(
    'fetch',
    vi.fn((url, options) => {
      const method = options?.method ?? 'GET'
      const route = url.startsWith('/api/list') ? '/api/list' : url
      const handler = handlers[`${method} ${route}`]
      if (!handler) return Promise.reject(new Error(`Unhandled fetch: ${method} ${url}`))
      return Promise.resolve({ json: async () => handler() })
    })
  )
}

describe('SettingsPanel', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('seeds the input from GET /api/settings on mount', async () => {
    mockFetch({
      'GET /api/settings': () => ({ workspacePath: '/existing/workspace' })
    })

    render(<SettingsPanel onClose={() => {}} />)

    expect(await screen.findByDisplayValue('/existing/workspace')).toBeInTheDocument()
  })

  it('disables Save until the path is confirmed valid', async () => {
    mockFetch({
      'GET /api/settings': () => ({ workspacePath: '' })
    })

    render(<SettingsPanel onClose={() => {}} />)
    await screen.findByRole('textbox', { name: 'Workspace path' })

    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled()
  })

  it('saves via PUT /api/settings and closes on success', async () => {
    const onClose = vi.fn()
    mockFetch({
      'GET /api/settings': () => ({ workspacePath: '/tmp' }),
      'GET /api/list': () => ({ requested: '/tmp', resolved: '/tmp', entries: [] }),
      'PUT /api/settings': () => ({ workspacePath: '/tmp' })
    })

    render(<SettingsPanel onClose={onClose} />)
    const input = await screen.findByDisplayValue('/tmp')

    // PathAutocompleteInput's own debounced /api/list check (250ms) must
    // resolve and confirm the seeded path before Save enables.
    await waitFor(() => expect(screen.getByRole('button', { name: 'Save' })).not.toBeDisabled(), { timeout: 1000 })

    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(onClose).toHaveBeenCalled())
    expect(input).toBeInTheDocument()
  })

  it('closes without saving when Cancel is clicked', async () => {
    const onClose = vi.fn()
    mockFetch({
      'GET /api/settings': () => ({ workspacePath: '' })
    })

    render(<SettingsPanel onClose={onClose} />)
    await screen.findByRole('textbox', { name: 'Workspace path' })

    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(onClose).toHaveBeenCalled()
  })
})
