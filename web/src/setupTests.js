import 'fake-indexeddb/auto'
import '@testing-library/jest-dom'

// Mock localStorage for all tests
const localStorageMock = (() => {
  let store = {}
  return {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => { store[key] = value.toString() },
    removeItem: (key) => { delete store[key] },
    clear: () => { store = {} }
  }
})()

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
  writable: true
})
