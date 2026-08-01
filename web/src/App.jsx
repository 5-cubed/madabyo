import React, { useRef, useState } from 'react'
import SidebarTree from './components/SidebarTree'
import Pane from './components/Pane'
import SplitContainer from './components/SplitContainer'
import { useWorkspace } from './workspace/useWorkspace'
import { PaneManager } from './panes/PaneManager'
import './theme/tokens.css'
import './App.css'

function App() {
  const { folderHandle, tree, isSupported, isScanning, openFolder } = useWorkspace()

  const paneManagerRef = useRef(null)
  if (paneManagerRef.current === null) {
    paneManagerRef.current = new PaneManager(['pane-1'])
  }
  const paneManager = paneManagerRef.current

  const [, bumpVersion] = useState(0)
  const rerender = () => bumpVersion((n) => n + 1)

  const [activePaneId, setActivePaneId] = useState(paneManager.panes[0].id)
  const effectiveActivePaneId = paneManager.panes.some((p) => p.id === activePaneId)
    ? activePaneId
    : paneManager.panes[0].id

  async function handleSelectFile(fileHandle) {
    await paneManager.openFile(effectiveActivePaneId, fileHandle)
    rerender()
  }

  async function handleSplit(paneId) {
    await paneManager.splitRight(paneId)
    rerender()
  }

  function handleResize(paneId, deltaPx) {
    paneManager.resizeDivider(paneId, deltaPx)
    rerender()
  }

  function handleClosePane(paneId) {
    paneManager.closePane(paneId)
    rerender()
  }

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
              onSelectFile={handleSelectFile}
            />
          )
        )
      )}
      <SplitContainer
        panes={paneManager.panes}
        onSplit={handleSplit}
        onResize={handleResize}
        onClosePane={handleClosePane}
      />
      <div className="panes-content">
        {paneManager.panes.map((pane) => (
          <div
            key={pane.id}
            className="pane-content-wrapper"
            style={pane.width != null ? { width: `${pane.width}%` } : undefined}
            onMouseDown={() => setActivePaneId(pane.id)}
          >
            <Pane
              tabs={pane.tabManager.tabs}
              activeTabId={pane.tabManager.activeTabId}
              onSelectTab={(fileId) => {
                pane.tabManager.focusTab(fileId)
                rerender()
              }}
              onCloseTab={(fileId) => {
                pane.tabManager.closeTab(fileId)
                rerender()
              }}
            />
          </div>
        ))}
      </div>
    </>
  )
}

export default App
