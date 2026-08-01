export function isSupported() {
  return 'showDirectoryPicker' in window
}

export async function pickFolder() {
  try {
    return await window.showDirectoryPicker()
  } catch {
    return null
  }
}
