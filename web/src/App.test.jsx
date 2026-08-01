import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'
import App from './App'

describe('App', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('displays folder name after clicking Open Folder', async () => {
    const fakeHandle = { name: 'Projects' }
    vi.stubGlobal('showDirectoryPicker', vi.fn().mockResolvedValueOnce(fakeHandle))

    const user = userEvent.setup()
    render(<App />)

    const button = screen.getByRole('button', { name: 'Open Folder' })
    await user.click(button)

    expect(screen.getByText('Projects')).toBeInTheDocument()
  })
})
