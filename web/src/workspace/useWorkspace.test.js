import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useWorkspace } from './useWorkspace'
import * as FolderPicker from './folderPicker'

vi.mock('./folderPicker')

describe('useWorkspace', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('updates folderHandle when pickFolder resolves with a handle', async () => {
    const fakeHandle = { name: 'notes' }
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
    const fakeHandle = { name: 'notes' }

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
})
