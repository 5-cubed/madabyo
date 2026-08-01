import { useState } from 'react'
import * as FolderPicker from './folderPicker'

export function useWorkspace() {
  const [folderHandle, setFolderHandle] = useState(null)

  async function openFolder() {
    const handle = await FolderPicker.pickFolder()
    if (handle != null) setFolderHandle(handle)
  }

  return { folderHandle, openFolder }
}
