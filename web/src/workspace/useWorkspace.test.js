import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useWorkspace } from './useWorkspace'
import * as FolderPicker from './folderPicker'
import * as FolderHandleStore from './folderHandleStore'

vi.mock('./folderPicker')
vi.mock('./folderHandleStore')

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

  it('awaits saveHandle before scanning (SEQ-023)', async () => {
    const saveGate = deferred()
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
    vi.mocked(FolderHandleStore.saveHandle).mockReturnValueOnce(saveGate.promise)

    const { result } = renderHook(() => useWorkspace())

    const openPromise = result.current.openFolder()

    await act(async () => {
      await Promise.resolve()
    })

    // Verify saveHandle was called with the picked handle
    expect(FolderHandleStore.saveHandle).toHaveBeenCalledWith(fakeHandle)

    // Verify scan has not started while save is still pending
    expect(result.current.isScanning).toBe(false)
    expect(result.current.tree).toBeNull()

    // Resolve the save and check that scan proceeds
    saveGate.resolve()

    await act(async () => {
      await openPromise
    })

    expect(result.current.tree).toEqual(expectedTree)
  })

  it('resumes with granted permission (SEQ-024)', async () => {
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

    vi.mocked(FolderHandleStore.loadHandle).mockResolvedValueOnce(fakeHandle)
    vi.mocked(FolderHandleStore.verifyPermission).mockResolvedValueOnce('granted')

    const { result } = renderHook(() => useWorkspace())

    await act(async () => {
      await result.current.resumeFolder()
    })

    expect(FolderPicker.pickFolder).not.toHaveBeenCalled()
    expect(result.current.folderHandle).toEqual(fakeHandle)
    expect(result.current.tree).toEqual(expectedTree)
  })

  it('does not scan when resuming with no persisted handle', async () => {
    vi.mocked(FolderHandleStore.loadHandle).mockResolvedValueOnce(null)

    const { result } = renderHook(() => useWorkspace())

    await act(async () => {
      await result.current.resumeFolder()
    })

    expect(FolderHandleStore.verifyPermission).not.toHaveBeenCalled()
    expect(FolderPicker.pickFolder).not.toHaveBeenCalled()
    expect(result.current.folderHandle).toBeNull()
    expect(result.current.tree).toBeNull()
  })

  it('sets needsPermission when resuming with denied permission (SEQ-025)', async () => {
    const fakeHandle = fakeDir('notes', [])

    vi.mocked(FolderHandleStore.loadHandle).mockResolvedValueOnce(fakeHandle)
    vi.mocked(FolderHandleStore.verifyPermission).mockResolvedValueOnce('denied')

    const { result } = renderHook(() => useWorkspace())

    await act(async () => {
      await result.current.resumeFolder()
    })

    expect(result.current.needsPermission).toBe(true)
    expect(result.current.tree).toBeNull()
    expect(result.current.isScanning).toBe(false)
    expect(FolderPicker.pickFolder).not.toHaveBeenCalled()
  })

  it('regrantPermission re-verifies and scans on granted permission (SEQ-025)', async () => {
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

    // Set up initial state with needsPermission
    vi.mocked(FolderHandleStore.loadHandle).mockResolvedValueOnce(fakeHandle)
    vi.mocked(FolderHandleStore.verifyPermission).mockResolvedValueOnce('denied')

    const { result } = renderHook(() => useWorkspace())

    await act(async () => {
      await result.current.resumeFolder()
    })

    expect(result.current.needsPermission).toBe(true)

    // Now retry with permission granted
    vi.mocked(FolderHandleStore.verifyPermission).mockResolvedValueOnce('granted')

    await act(async () => {
      await result.current.regrantPermission()
    })

    expect(FolderHandleStore.verifyPermission).toHaveBeenLastCalledWith(fakeHandle, { request: true })
    expect(result.current.needsPermission).toBe(false)
    expect(result.current.tree).toEqual(expectedTree)
    expect(FolderPicker.pickFolder).not.toHaveBeenCalled()
  })

  it('keeps needsPermission true if regrantPermission still denies (SEQ-025)', async () => {
    const fakeHandle = fakeDir('notes', [])

    // Set up initial state with needsPermission
    vi.mocked(FolderHandleStore.loadHandle).mockResolvedValueOnce(fakeHandle)
    vi.mocked(FolderHandleStore.verifyPermission).mockResolvedValueOnce('denied')

    const { result } = renderHook(() => useWorkspace())

    await act(async () => {
      await result.current.resumeFolder()
    })

    expect(result.current.needsPermission).toBe(true)

    // Retry still gets denied
    vi.mocked(FolderHandleStore.verifyPermission).mockResolvedValueOnce('denied')

    await act(async () => {
      await result.current.regrantPermission()
    })

    expect(result.current.needsPermission).toBe(true)
    expect(result.current.tree).toBeNull()
  })
})
