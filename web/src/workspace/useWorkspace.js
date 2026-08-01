import { useState } from 'react'
import * as FolderPicker from './folderPicker'
import * as FolderHandleStore from './folderHandleStore'
import { scanTree } from './treeScanner'

export function useWorkspace() {
  const [folderHandle, setFolderHandle] = useState(null)
  const [tree, setTree] = useState(null)
  const [isScanning, setIsScanning] = useState(false)
  const [needsPermission, setNeedsPermission] = useState(false)

  async function openFolder() {
    const handle = await FolderPicker.pickFolder()
    if (handle != null) {
      setFolderHandle(handle)
      await FolderHandleStore.saveHandle(handle)
      setIsScanning(true)
      const scanned = await scanTree(handle)
      setTree(scanned)
      setIsScanning(false)
    }
  }

  async function resumeFolder() {
    const handle = await FolderHandleStore.loadHandle()
    if (handle != null) {
      setFolderHandle(handle)
      const permission = await FolderHandleStore.verifyPermission(handle)
      if (permission === 'granted') {
        setIsScanning(true)
        const scanned = await scanTree(handle)
        setTree(scanned)
        setIsScanning(false)
      } else {
        // TODO:
        // 1. permission is not 'granted' (it's 'denied' or 'prompt') — the
        //    persisted handle can't be used yet without the user re-granting.
        // 2. Record that fact so a future UI layer can render a re-grant prompt
        //    (SidebarTree's needs-permission status — App.jsx/SidebarTree wiring
        //    is a later pass's job, per the Scope note above) instead of the
        //    silent no-op this branch used to be (REQ-025 AC2).
        // e.g. permission = 'denied' -> setNeedsPermission(true) -> a future
        //      App.jsx render can show <SidebarTree status="needs-permission">
        //      permission = 'granted' -> this branch never runs (see the if above)
        setNeedsPermission(true)
      }
    }
  }

  async function regrantPermission() {
    const permission = await FolderHandleStore.verifyPermission(folderHandle, { request: true })
    if (permission === 'granted') {
      setNeedsPermission(false)
      setIsScanning(true)
      const scanned = await scanTree(folderHandle)
      setTree(scanned)
      setIsScanning(false)
    }
  }

  return { folderHandle, tree, isScanning, openFolder, isSupported: FolderPicker.isSupported(), resumeFolder, needsPermission, regrantPermission }
}
