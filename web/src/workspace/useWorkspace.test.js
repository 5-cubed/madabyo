import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useWorkspace } from './useWorkspace'
import * as FolderPicker from './folderPicker'

vi.mock('./folderPicker')

function fakeFile(name) {
  return { kind: 'file', name }
}

function fakeDir(name, entries) {
  return {
    kind: 'directory',
    name,
    entries: async function* () {
      for (const [entryName, entry] of entries) {
        yield [entryName, entry]
      }
    }
  }
}

function deferred() {
  let resolve
  const promise = new Promise((r) => {
    resolve = r
  })
  return { promise, resolve }
}

function fakeDirDeferred(name, entries, gate) {
  return {
    kind: 'directory',
    name,
    entries: async function* () {
      await gate.promise
      for (const [entryName, entry] of entries) {
        yield [entryName, entry]
      }
    }
  }
}

describe('useWorkspace', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('updates folderHandle when pickFolder resolves with a handle', async () => {
    const fakeHandle = fakeDir('notes', [])
    vi.mocked(FolderPicker.pickFolder).mockResolvedValueOnce(fakeHandle)

    const { result } = renderHook(() => useWorkspace())

    await act(async () => {
      await result.current.openFolder()
    })

    expect(FolderPicker.pickFolder).toHaveBeenCalledTimes(1)
    expect(result.current.folderHandle).toEqual(fakeHandle)
  })

  it('does not update folderHandle when pickFolder resolves to null', async () => {
    vi.mocked(FolderPicker.pickFolder).mockResolvedValueOnce(null)

    const { result } = renderHook(() => useWorkspace())

    await act(async () => {
      await result.current.openFolder()
    })

    expect(FolderPicker.pickFolder).toHaveBeenCalledTimes(1)
    expect(result.current.folderHandle).toBeNull()
  })

  it('does not update folderHandle when pickFolder resolves to null (SEQ-004: cancel with no prior pick)', async () => {
    vi.mocked(FolderPicker.pickFolder).mockResolvedValueOnce(null)

    const { result } = renderHook(() => useWorkspace())

    await act(async () => {
      await result.current.openFolder()
    })

    expect(result.current.folderHandle).toBeNull()
  })

  it('preserves folderHandle when user cancels a re-pick (SEQ-004: stale state preservation)', async () => {
    const fakeHandle = fakeDir('notes', [])

    vi.mocked(FolderPicker.pickFolder).mockResolvedValueOnce(fakeHandle)

    const { result } = renderHook(() => useWorkspace())

    await act(async () => {
      await result.current.openFolder()
    })

    expect(result.current.folderHandle).toEqual(fakeHandle)

    vi.mocked(FolderPicker.pickFolder).mockResolvedValueOnce(null)

    await act(async () => {
      await result.current.openFolder()
    })

    expect(result.current.folderHandle).toEqual(fakeHandle)
  })

  it('scans the tree when a folder is picked (SEQ-002)', async () => {
    const todoFile = fakeFile('todo.md')
    const fakeHandle = fakeDir('notes', [['todo.md', todoFile]])
    const expectedTree = {
      type: 'dir',
      name: 'notes',
      path: 'notes',
      children: [
        {
          type: 'file',
          name: 'todo.md',
          path: 'notes/todo.md',
          handle: todoFile
        }
      ]
    }

    vi.mocked(FolderPicker.pickFolder).mockResolvedValueOnce(fakeHandle)

    const { result } = renderHook(() => useWorkspace())

    await act(async () => {
      await result.current.openFolder()
    })

    expect(result.current.tree).toEqual(expectedTree)
  })

  it('sets isScanning while scan is in progress (SEQ-007)', async () => {
    const gate = deferred()
    const todoFile = fakeFile('todo.md')
    const fakeHandle = fakeDirDeferred('notes', [['todo.md', todoFile]], gate)
    const expectedTree = {
      type: 'dir',
      name: 'notes',
      path: 'notes',
      children: [
        {
          type: 'file',
          name: 'todo.md',
          path: 'notes/todo.md',
          handle: todoFile
        }
      ]
    }

    vi.mocked(FolderPicker.pickFolder).mockResolvedValueOnce(fakeHandle)

    const { result } = renderHook(() => useWorkspace())

    const openPromise = result.current.openFolder()

    await act(async () => {
      await Promise.resolve()
    })

    expect(result.current.isScanning).toBe(true)
    expect(result.current.tree).toBeNull()

    gate.resolve()

    await act(async () => {
      await openPromise
    })

    expect(result.current.isScanning).toBe(false)
    expect(result.current.tree).toEqual(expectedTree)
  })
})
