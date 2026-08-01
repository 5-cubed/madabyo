import { describe, it, expect, afterEach, vi } from 'vitest'
import { isSupported, pickFolder } from './folderPicker'

describe('folderPicker', () => {
  afterEach(() => {
    delete window.showDirectoryPicker
  })

  describe('isSupported', () => {
    it('returns false when window.showDirectoryPicker is undefined', () => {
      delete window.showDirectoryPicker
      expect(isSupported()).toBe(false)
    })

    it('returns true when window.showDirectoryPicker is a function', () => {
      window.showDirectoryPicker = vi.fn()
      expect(isSupported()).toBe(true)
    })
  })

  describe('pickFolder', () => {
    it('resolves with the handle when showDirectoryPicker resolves', async () => {
      const fakeHandle = { name: 'notes' }
      window.showDirectoryPicker = vi.fn().mockResolvedValueOnce(fakeHandle)

      const result = await pickFolder()
      expect(result).toEqual(fakeHandle)
    })

    it('resolves to null when showDirectoryPicker rejects', async () => {
      window.showDirectoryPicker = vi.fn().mockRejectedValueOnce(new Error('User cancelled'))

      const result = await pickFolder()
      expect(result).toBeNull()
    })
  })
})
