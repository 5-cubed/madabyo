import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'
import App from './App'

// Test helpers for fake file system handles
function fakeFile(name) {
  return {
    name,
    kind: 'file',
    getFile: async () => new File([''], name)
  }
}

function fakeDir(name, entries = []) {
  return {
    name,
    kind: 'directory',
    entries: async function* () {
      for (const [entryName, entry] of entries) {
        yield [entryName, entry]
      }
    }
  }
}

function deferred() {
  let resolve, reject
  const promise = new Promise((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

function fakeDirDeferred(name, entries = [], gate) {
  return {
    name,
    kind: 'directory',
    entries: async function* () {
      for (const [entryName, entry] of entries) {
        yield [entryName, entry]
      }
      await gate.promise
    }
  }
}

describe('App', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
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

  it('displays tree content after scanning folder with markdown files', async () => {
    const mockHandle = fakeDir('notes', [['todo.md', fakeFile('todo.md')]])
    vi.stubGlobal('showDirectoryPicker', vi.fn().mockResolvedValueOnce(mockHandle))

    const user = userEvent.setup()
    render(<App />)

    const button = screen.getByRole('button', { name: 'Open Folder' })
    await user.click(button)

    const todoRow = await screen.findByText('todo.md')
    const img = todoRow.closest('.tree-row').querySelector('img')
    expect(img.src).toContain('file_type_markdown')
  })

  it('displays unsupported browser message when File System Access API is unavailable', () => {
    // jsdom doesn't have showDirectoryPicker by default, simulating unsupported browser
    render(<App />)

    expect(screen.getByText("Your browser doesn't support opening local folders.")).toBeInTheDocument()
  })

  it('displays unsupported message even after clicking Open Folder on unsupported browser', async () => {
    render(<App />)

    const button = screen.getByRole('button', { name: 'Open Folder' })
    await screen.findByText("Your browser doesn't support opening local folders.")

    expect(button).toBeInTheDocument()
    expect(screen.queryByText(/\.md/)).not.toBeInTheDocument()
  })

  it('displays empty state when folder has no markdown files', async () => {
    const mockHandle = fakeDir('empty-notes', [['image.png', fakeFile('image.png')]])
    vi.stubGlobal('showDirectoryPicker', vi.fn().mockResolvedValueOnce(mockHandle))

    const user = userEvent.setup()
    render(<App />)

    const button = screen.getByRole('button', { name: 'Open Folder' })
    await user.click(button)

    await screen.findByText('No markdown files found.')
    expect(screen.getByText('empty-notes')).toBeInTheDocument()
  })

  it('displays loading state during scan and shows tree after completion', async () => {
    const gate = deferred()
    const mockHandle = fakeDirDeferred('notes', [['todo.md', fakeFile('todo.md')]], gate)
    vi.stubGlobal('showDirectoryPicker', vi.fn().mockResolvedValueOnce(mockHandle))

    const user = userEvent.setup()
    render(<App />)

    const button = screen.getByRole('button', { name: 'Open Folder' })
    await user.click(button)

    await screen.findByText('Loading files...')
    expect(screen.queryByText('todo.md')).not.toBeInTheDocument()

    gate.resolve()

    await screen.findByText('todo.md')
    expect(screen.queryByText('Loading files...')).not.toBeInTheDocument()
  })
})
