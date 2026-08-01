import { useState } from 'react'
import * as FolderPicker from './folderPicker'
import { scanTree } from './treeScanner'

export function useWorkspace() {
  const [folderHandle, setFolderHandle] = useState(null)
  const [tree, setTree] = useState(null)
  const [isScanning, setIsScanning] = useState(false)

  async function openFolder() {
    const handle = await FolderPicker.pickFolder()
    if (handle != null) {
      setFolderHandle(handle)
      setIsScanning(true)
      const scanned = await scanTree(handle)
      setTree(scanned)
      setIsScanning(false)
    }
  }

  return { folderHandle, tree, isScanning, openFolder, isSupported: FolderPicker.isSupported() }
}
