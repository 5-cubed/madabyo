import React, { useRef, useState, useEffect } from 'react'
import SidebarTree from './components/SidebarTree'
import Pane from './components/Pane'
import SplitContainer from './components/SplitContainer'
import SettingsPanel from './components/SettingsPanel'
import { PaneManager } from './panes/PaneManager'
import './theme/tokens.css'
import './App.css'

// Helper: check if a file is allowed (matches allowlist)
function isAllowedMarkdownFile(name) {
  const ext = name.substring(name.lastIndexOf('.')).toLowerCase()
  if (ext === '.md' || ext === '.markdown') {
    return true
  }
  // Check for extensionless README
  if (ext === '' && name.toLowerCase() === 'readme') {
    return true
  }
  return false
}

// Helper: convert API list entries to tree nodes
function entriesToNodes(entries, basePath) {
  return entries
    .map((entry) => {
      const path = `${basePath}${basePath.endsWith('/') ? '' : '/'}${entry.name}`
      if (entry.isDir) {
        return { type: 'dir', name: entry.name, path, children: undefined }
      }
      // File: only include if allowed
      if (isAllowedMarkdownFile(entry.name)) {
        return { type: 'file', name: entry.name, path }
      }
      return null
    })
    .filter((n) => n !== null)
}

// Helper: merge new list results into existing tree, preserving expansion state
function mergeTreeNode(existing, newEntries, path) {
  if (!existing || existing.type === 'file') {
    return existing
  }

  // Merge: new entries replace old ones at this level, but preserve deeper state
  const newNodes = entriesToNodes(newEntries, path)
  if (!existing.children) {
    existing.children = newNodes
    return existing
  }

  // Match new entries against existing by path
  const nodesByPath = {}
  existing.children.forEach((node) => {
    nodesByPath[node.path] = node
  })

  existing.children = newNodes.map((newNode) => {
    const existing = nodesByPath[newNode.path]
    if (existing && existing.type === 'dir' && existing.children) {
      // Preserve the directory's expanded state
      newNode.children = existing.children
    }
    return newNode
  })

  return existing
}

function App() {
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [activePaneId, setActivePaneId] = useState(null)

  const paneManagerRef = useRef(null)
  if (paneManagerRef.current === null) {
    paneManagerRef.current = new PaneManager(['pane-1'])
  }
  const paneManager = paneManagerRef.current

  // Fix activePaneId initialization after paneManager is ready
  if (activePaneId === null) {
    setActivePaneId(paneManager.panes[0].id)
  }

  const [, bumpVersion] = useState(0)
  const rerender = () => bumpVersion((n) => n + 1)

  // Tree state
  const [tree, setTree] = useState(null)
  const [treeStatus, setTreeStatus] = useState('loading')
  const [expandedPaths, setExpandedPaths] = useState(new Set())

  // Load workspace settings and initialize tree
  async function loadTree() {
    try {
      const settingsRes = await fetch('/api/settings')
      const settings = await settingsRes.json()

      if (!settings.workspacePath) {
        setTreeStatus('empty')
        return
      }

      // Load root tree
      const listRes = await fetch(`/api/list?path=${encodeURIComponent(settings.workspacePath)}`)
      const listResult = await listRes.json()

      if (listResult.error) {
        setTreeStatus('error')
        return
      }

      const rootNode = {
        type: 'dir',
        name: settings.workspacePath.split('/').pop() || settings.workspacePath,
        path: settings.workspacePath,
        children: entriesToNodes(listResult.entries || [], settings.workspacePath)
      }

      setTree(rootNode)
      setTreeStatus('ready')
    } catch (err) {
      console.error('Failed to load tree:', err)
      setTreeStatus('error')
    }
  }

  useEffect(() => {
    loadTree()
  }, [])

  // Handle directory expansion
  const handleExpandDir = async (path) => {
    try {
      const listRes = await fetch(`/api/list?path=${encodeURIComponent(path)}`)
      const listResult = await listRes.json()

      if (listResult.error) {
        // Fail silently, let the tree render error marker
        throw new Error(listResult.error)
      }

      // Merge the result into tree
      setTree((prevTree) => {
        if (!prevTree) return prevTree
        const merged = mergeTreeNode({ ...prevTree }, listResult.entries || [], path)
        return merged
      })

      setExpandedPaths((prev) => new Set([...prev, path]))
    } catch (err) {
      console.error(`Failed to expand ${path}:`, err)
      throw err
    }
  }

  // Polling: every 5 seconds
  useEffect(() => {
    if (treeStatus !== 'ready' || !tree) {
      return
    }

    const pollInterval = setInterval(async () => {
      try {
        // Re-list root + expanded paths
        const pathsToList = [tree.path, ...expandedPaths]

        for (const path of pathsToList) {
          try {
            const listRes = await fetch(`/api/list?path=${encodeURIComponent(path)}`)
            const listResult = await listRes.json()

            if (!listResult.error) {
              setTree((prevTree) => {
                if (!prevTree) return prevTree
                return mergeTreeNode({ ...prevTree }, listResult.entries || [], path)
              })
            }
          } catch (err) {
            console.error(`Failed to re-list ${path}:`, err)
          }
        }

        // Refresh active pane's active tab
        if (activePaneId) {
          const pane = paneManager.panes.find((p) => p.id === activePaneId)
          if (pane && pane.tabManager.activeTabId) {
            try {
              await paneManager.refreshTab(activePaneId, pane.tabManager.activeTabId)
              rerender()
            } catch (err) {
              console.error('Failed to refresh active tab:', err)
            }
          }
        }
      } catch (err) {
        console.error('Poll error:', err)
      }
    }, 5000)

    return () => clearInterval(pollInterval)
  }, [treeStatus, tree, expandedPaths, activePaneId, paneManager])

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

  function handleSettingsSaved() {
    loadTree()
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
      {settingsOpen && <SettingsPanel onClose={() => setSettingsOpen(false)} onSaved={handleSettingsSaved} />}
      <div className="app-main">
        <aside className="app-sidebar">
          <SidebarTree tree={tree} status={treeStatus} onSelectFile={(path) => {
            paneManager.openFile(activePaneId, path).then(rerender)
          }} onExpandDir={handleExpandDir} />
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
                    // Refresh once when switching tabs
                    paneManager.refreshTab(pane.id, fileId).then(rerender).catch((err) => {
                      console.error('Failed to refresh tab:', err)
                    })
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
