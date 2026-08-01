import { describe, it, expect, beforeEach, vi } from 'vitest'
import { loadHandle, saveHandle, verifyPermission, closeDb } from './folderHandleStore'

const DB_NAME = 'folderHandleStore'

beforeEach(async () => {
  // Close any open connection
  closeDb()
  
  // Clear the persisted state between tests
  await new Promise((resolve) => {
    const request = indexedDB.deleteDatabase(DB_NAME)
    request.onsuccess = () => resolve()
    request.onerror = () => resolve()
    request.onblocked = () => resolve()
  })
})

describe('folderHandleStore', () => {
  it('loadHandle() resolves null when nothing has been saved', async () => {
    const result = await loadHandle()
    expect(result).toBeNull()
  })

  it('saveHandle() and loadHandle() round-trip a fake directory handle', async () => {
    const fakeHandle = { kind: 'directory', name: 'docs' }
    await saveHandle(fakeHandle)
    const result = await loadHandle()
    expect(result).toEqual(fakeHandle)
  })

  it('verifyPermission(handle) passes through handle.queryPermission() result', async () => {
    const fakeHandle = { queryPermission: vi.fn().mockResolvedValue('granted') }
    const result = await verifyPermission(fakeHandle)
    expect(result).toBe('granted')
    expect(fakeHandle.queryPermission).toHaveBeenCalledWith({ mode: 'read' })
  })

  it('verifyPermission(handle) resolves "denied" when handle.queryPermission() resolves "denied"', async () => {
    const fakeHandle = { queryPermission: vi.fn().mockResolvedValue('denied') }
    const result = await verifyPermission(fakeHandle)
    expect(result).toBe('denied')
  })

  it('verifyPermission(handle, { request: true }) calls handle.requestPermission() instead', async () => {
    const fakeHandle = {
      queryPermission: vi.fn(),
      requestPermission: vi.fn().mockResolvedValue('granted')
    }
    const result = await verifyPermission(fakeHandle, { request: true })
    expect(result).toBe('granted')
    expect(fakeHandle.requestPermission).toHaveBeenCalledWith({ mode: 'read' })
    expect(fakeHandle.queryPermission).not.toHaveBeenCalled()
  })
})
