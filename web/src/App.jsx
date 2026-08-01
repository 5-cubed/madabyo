import React from 'react'
import { useWorkspace } from './workspace/useWorkspace'
import './App.css'

function App() {
  const { folderHandle, openFolder } = useWorkspace()

  return (
    <>
      <button
        type="button"
        onClick={openFolder}
      >
        Open Folder
      </button>
      {folderHandle && <p>{folderHandle.name}</p>}
    </>
  )
}

export default App
