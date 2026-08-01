import React from 'react'
import SidebarTree from './components/SidebarTree'
import { useWorkspace } from './workspace/useWorkspace'
import './theme/tokens.css'
import './App.css'

function App() {
  const { folderHandle, tree, isSupported, isScanning, openFolder } = useWorkspace()

  return (
    <>
      <button
        type="button"
        onClick={openFolder}
      >
        Open Folder
      </button>
      {folderHandle && <p>{folderHandle.name}</p>}
      {!isSupported ? (
        <SidebarTree tree={null} status="unsupported" onSelectFile={() => {}} />
      ) : (
        isScanning ? (
          <SidebarTree tree={null} status="loading" onSelectFile={() => {}} />
        ) : (
          tree && (
            <SidebarTree
              tree={tree}
              status={tree.children.length === 0 ? 'empty' : 'ready'}
              onSelectFile={() => {}}
            />
          )
        )
      )}
    </>
  )
}

export default App
