import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'
import App from './App'

function mockFetchSettings(workspacePath = '') {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      json: async () => ({ workspacePath })
    })
  )
}

describe('App', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('renders the app shell with a settings button', () => {
    render(<App />)

    expect(screen.getByText('Markdown Viewer')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Settings' })).toBeInTheDocument()
  })

  it('shows the empty-workspace sidebar message (no client-side folder flow in this pass)', () => {
    render(<App />)

    expect(screen.getByText('No markdown files found.')).toBeInTheDocument()
  })

  it('opens the settings panel when the gear icon is clicked', async () => {
    mockFetchSettings()
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Settings' }))

    expect(await screen.findByRole('dialog', { name: 'Settings' })).toBeInTheDocument()
  })

  it('closes the settings panel via the Cancel button', async () => {
    mockFetchSettings()
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Settings' }))
    await screen.findByRole('dialog', { name: 'Settings' })

    await user.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(screen.queryByRole('dialog', { name: 'Settings' })).not.toBeInTheDocument()
  })

  it('shows a split control for the initial pane', () => {
    render(<App />)

    expect(screen.getByRole('button', { name: 'Split pane-1' })).toBeInTheDocument()
  })
})
