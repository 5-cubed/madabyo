import React, { useRef, useState } from 'react'
import SidebarTree from './components/SidebarTree'
import Pane from './components/Pane'
import SplitContainer from './components/SplitContainer'
import SettingsPanel from './components/SettingsPanel'
import { PaneManager } from './panes/PaneManager'
import './theme/tokens.css'
import './App.css'

function App() {
  const [settingsOpen, setSettingsOpen] = useState(false)

  const paneManagerRef = useRef(null)
  if (paneManagerRef.current === null) {
    paneManagerRef.current = new PaneManager(['pane-1'])
  }
  const paneManager = paneManagerRef.current

  const [, bumpVersion] = useState(0)
  const rerender = () => bumpVersion((n) => n + 1)

  const [, setActivePaneId] = useState(paneManager.panes[0].id)

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
    <div className="app-shell">
      <header className="app-toolbar">
        <span className="app-title">Markdown Viewer</span>
        <button
          type="button"
          className="btn-settings"
          aria-label="Settings"
          onClick={() => setSettingsOpen(true)}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>
      </header>
      {settingsOpen && <SettingsPanel onClose={() => setSettingsOpen(false)} />}
      <div className="app-main">
        <aside className="app-sidebar">
          <SidebarTree tree={null} status="empty" onSelectFile={() => {}} />
        </aside>
        <div className="app-content">
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
        </div>
      </div>
    </div>
  )
}

export default App
