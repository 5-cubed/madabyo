import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import React from 'react'
import PathAutocompleteInput from './PathAutocompleteInput'

function mockFetchOnce(response) {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      json: async () => response
    })
  )
}

describe('PathAutocompleteInput', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('does not fetch until the debounce window elapses', async () => {
    mockFetchOnce({ requested: '/tmp', resolved: '/tmp', entries: [] })
    const onChange = vi.fn()
    const onValidityChange = vi.fn()

    render(<PathAutocompleteInput value="/tmp" onChange={onChange} onValidityChange={onValidityChange} />)

    expect(fetch).not.toHaveBeenCalled()

    await waitFor(() => expect(fetch).toHaveBeenCalledWith('/api/list?path=%2Ftmp'))
  })

  it('shows directory suggestions after a successful lookup, capped at 6 with an overflow hint', async () => {
    const entries = Array.from({ length: 9 }, (_, i) => ({ name: `dir${i}`, isDir: true }))
    mockFetchOnce({ requested: '/tmp', resolved: '/tmp', entries })
    const onValidityChange = vi.fn()

    render(<PathAutocompleteInput value="/tmp" onChange={() => {}} onValidityChange={onValidityChange} />)
    await waitFor(() => expect(onValidityChange).toHaveBeenCalledWith(true))

    const options = await screen.findAllByRole('option')
    expect(options).toHaveLength(6)
    expect(screen.getByText('+3 more — keep typing to narrow')).toBeInTheDocument()
  })

  it('shows an inline error and marks the path invalid when the lookup fails', async () => {
    mockFetchOnce({ requested: '/bad', error: 'evalsymlinks: lstat /bad: no such file or directory' })
    const onValidityChange = vi.fn()

    render(<PathAutocompleteInput value="/bad" onChange={() => {}} onValidityChange={onValidityChange} />)

    await waitFor(() => expect(onValidityChange).toHaveBeenCalledWith(false))
    expect(await screen.findByRole('alert')).toHaveTextContent('no such file or directory')
  })

  it('appends the selected directory name and a trailing slash on click', async () => {
    mockFetchOnce({ requested: '/tmp', resolved: '/tmp', entries: [{ name: 'notes', isDir: true }] })
    const onChange = vi.fn()

    render(<PathAutocompleteInput value="/tmp" onChange={onChange} onValidityChange={() => {}} />)

    const option = await screen.findByRole('option', { name: 'notes' })
    fireEvent.click(option)

    expect(onChange).toHaveBeenCalledWith('/tmp/notes/')
  })
})
