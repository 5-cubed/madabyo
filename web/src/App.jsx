/*
---
type: React Component
title: Markdown viewer application
description: Renders the viewer shell and persists sidebar folder expansion state.
tags: [react, sidebar, persistence]
timestamp: 2026-09-08T16:34:00Z
---
*/

import React, { useRef, useState, useEffect, Fragment } from 'react'
import SidebarTree from './components/SidebarTree'
import Pane from './components/Pane'
import SplitContainer from './components/SplitContainer'
import SettingsPanel from './components/SettingsPanel'
import { PaneManager } from './panes/PaneManager'
import './theme/tokens.css'
import './App.css'

// Constants for sidebar width constraints
const MIN_SIDEBAR_WIDTH = 160
const MAX_SIDEBAR_WIDTH = 600
const DEFAULT_SIDEBAR_WIDTH = 260

// Helper: check if a file is allowed (matches allowlist)
function isAllowedMarkdownFile(name) {
  const dotIndex = name.lastIndexOf('.')
  const ext = dotIndex === -1 ? '' : name.substring(dotIndex).toLowerCase()
  if (ext === '.md' || ext === '.markdown') {
    return true
  }
  // Check for extensionless README
  if (ext === '' && name.toLowerCase() === 'readme') {
    return true
  }
  return false
}

// Helper: normalize backslashes to forward slashes for cross-platform path handling
function normalizeSlashes(p) {
  return p.replace(/\\/g, '/')
}

function resolveRuntimePath(path, workspacePath) {
  const normalizedWorkspacePath = normalizeSlashes(workspacePath)
  if (path === normalizedWorkspacePath) return workspacePath
  const prefix = `${normalizedWorkspacePath}/`
  return path.startsWith(prefix) ? `${workspacePath}${path.slice(normalizedWorkspacePath.length)}` : null
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

// Helper: recursively find and merge a node at a specific path
function findAndMergeNode(node, targetPath, newEntries) {
  if (!node || node.type === 'file') {
    return node
  }

  // If this is the target node, merge the new entries into its children
  if (node.path === targetPath) {
    const newNodes = entriesToNodes(newEntries, targetPath)
    if (!node.children) {
      node.children = newNodes
      return node
    }

    // Match new entries against existing by path
    const nodesByPath = {}
    node.children.forEach((child) => {
      nodesByPath[child.path] = child
    })

    node.children = newNodes.map((newNode) => {
      const existing = nodesByPath[newNode.path]
      if (existing && existing.type === 'dir' && existing.children) {
        // Preserve the directory's expanded state
        newNode.children = existing.children
      }
      return newNode
    })

    return node
  }

  // If this is not the target, recursively search children
  if (node.children) {
    node.children = node.children.map((child) => findAndMergeNode(child, targetPath, newEntries))
  }

  return node
}

// Helper: merge new list results into existing tree, preserving expansion state
function mergeTreeNode(existing, newEntries, path) {
  if (!existing || existing.type === 'file') {
    return existing
  }

  return findAndMergeNode(existing, path, newEntries)
}

function App() {
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [activePaneId, setActivePaneId] = useState(null)

  const paneManagerRef = useRef(null)
  if (paneManagerRef.current === null) {
    paneManagerRef.current = new PaneManager(['pane-1'])
  }
  const paneManager = paneManagerRef.current

  const panesContentRef = useRef(null)

  // Fix activePaneId initialization after paneManager is ready
  if (activePaneId === null) {
    setActivePaneId(paneManager.panes[0].id)
  }

  const [, bumpVersion] = useState(0)
  const rerender = () => bumpVersion((n) => n + 1)

  // Tree state
  const [tree, setTree] = useState(null)
  const [treeStatus, setTreeStatus] = useState('loading')
  const [expandedPaths, setExpandedPaths] = useState([])
  const [workspacePath, setWorkspacePath] = useState(null)
  const [folded, setFolded] = useState(false)
  const [sidebarWidth, setSidebarWidth] = useState(DEFAULT_SIDEBAR_WIDTH)

  // Load workspace settings and initialize tree
  async function loadTree() {
    try {
      const settingsRes = await fetch('/api/settings')
      const settings = await settingsRes.json()

      if (!settings.workspacePath) {
        setTreeStatus('empty')
        return
      }

      setWorkspacePath(settings.workspacePath)

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

  // Handle directory expansion (defined early to avoid closure issues)
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

      // Only save non-root folders to expandedPaths
      if (path !== workspacePath) {
        setExpandedPaths((prev) => {
          if (!prev.includes(path)) {
            let updated = [...prev, path]
            // Cap at 100; drop least-recently-opened (first item)
            if (updated.length > 100) {
              updated = updated.slice(1)
            }
            if (workspacePath) {
              const storageKey = `madabyo:sidebar:${normalizeSlashes(workspacePath)}`
              localStorage.removeItem(`${storageKey}:collapsed:${normalizeSlashes(path)}`)
              localStorage.setItem(storageKey, JSON.stringify(updated.map(normalizeSlashes)))
            }
            return updated
          }
          return prev
        })
      }
    } catch (err) {
      console.error(`Failed to expand ${path}:`, err)
      throw err
    }
  }

  // Handle directory collapse
  const handleCollapseDir = (path) => {
    if (path !== workspacePath) {
      setExpandedPaths((prev) => {
        const updated = prev.filter((p) => normalizeSlashes(p) !== normalizeSlashes(path))
        if (workspacePath) {
          const storageKey = `madabyo:sidebar:${normalizeSlashes(workspacePath)}`
          localStorage.setItem(`${storageKey}:collapsed:${normalizeSlashes(path)}`, '1')
          localStorage.setItem(storageKey, JSON.stringify(updated.map(normalizeSlashes)))
        }
        return updated
      })
    }
  }

  useEffect(() => {
    loadTree()
  }, [])

  // Helper: get ancestors of a path up to the workspace root
  function getAncestors(path, basePath) {
    const ancestors = []
    let current = path
    while (current !== basePath && current.length > basePath.length) {
      current = current.substring(0, current.lastIndexOf('/'))
      if (current === basePath) break
      ancestors.unshift(current)
    }
    return ancestors
  }

  // Restore expanded folders after tree loads
  useEffect(() => {
    if (treeStatus === 'ready' && workspacePath && expandedPaths.length === 0) {
      const normalizedWorkspacePath = normalizeSlashes(workspacePath)
      const normalizedKey = `madabyo:sidebar:${normalizedWorkspacePath}`
      const saved = localStorage.getItem(normalizedKey) ?? localStorage.getItem(`madabyo:sidebar:${workspacePath}`)
      if (saved) {
        const savedPaths = JSON.parse(saved).map(normalizeSlashes)

        // Insert missing ancestors before the saved paths (shallowest first)
        const pathsToRestore = []
        const seen = new Set()
        for (const path of savedPaths) {
          const ancestors = getAncestors(path, normalizedWorkspacePath)
          for (const ancestor of ancestors) {
            if (!seen.has(ancestor)) {
              pathsToRestore.push(ancestor)
              seen.add(ancestor)
            }
          }
          if (!seen.has(path)) {
            pathsToRestore.push(path)
            seen.add(path)
          }
        }

        ;(async () => {
          // ponytail: sequential, one request per folder; upgrade path is a batch endpoint if it ever gets slow
          for (const path of pathsToRestore) {
            const runtimePath = resolveRuntimePath(path, workspacePath)
            if (!runtimePath) {
              console.error(`Failed to restore folder ${path}: path is outside workspace`)
              continue
            }
            try {
              console.assert(normalizeSlashes(runtimePath) === path, 'Restore must request the runtime path')
              const listRes = await fetch(`/api/list?path=${encodeURIComponent(runtimePath)}`)
              const listResult = await listRes.json()

              if (!listResult.error) {
                setTree((prevTree) => {
                  if (!prevTree) return prevTree
                  return mergeTreeNode({ ...prevTree }, listResult.entries || [], runtimePath)
                })

                setExpandedPaths((prev) => {
                  if (!prev.includes(runtimePath) && !localStorage.getItem(`${normalizedKey}:collapsed:${path}`)) {
                    return [...prev, runtimePath]
                  }
                  return prev
                })
              } else {
                // Post to /api/log when a remembered folder cannot be listed
                try {
                  await fetch('/api/log', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ level: 'error', message: `Cannot list folder: ${runtimePath}` })
                  })
                } catch (logErr) {
                  console.error('Failed to log dropped folder:', logErr)
                }
              }
            } catch (err) {
              console.error(`Failed to restore folder ${runtimePath}:`, err)
            }
          }
        })()
      }
    }
  }, [treeStatus, workspacePath])

  // Load folded state and sidebar width from localStorage when workspace changes
  useEffect(() => {
    if (workspacePath) {
      const saved = localStorage.getItem(`madabyo:sidebar:layout:${workspacePath}`)
      if (saved) {
        try {
          const parsed = JSON.parse(saved)
          // Assert: coerce folded to boolean, treating non-boolean as false
          const isFolded = typeof parsed.folded === 'boolean' ? parsed.folded : false
          setFolded(isFolded)
          // Assert: width must be finite and clamped to [MIN, MAX], else default to 260
          const width = Number.isFinite(parsed.width) ? Math.min(MAX_SIDEBAR_WIDTH, Math.max(MIN_SIDEBAR_WIDTH, parsed.width)) : DEFAULT_SIDEBAR_WIDTH
          setSidebarWidth(width)
        } catch (err) {
          console.error('Failed to parse sidebar layout:', err)
          setFolded(false)
          setSidebarWidth(DEFAULT_SIDEBAR_WIDTH)
        }
      }
    }
  }, [workspacePath])

  // Save folded state and sidebar width to localStorage when they change
  useEffect(() => {
    if (workspacePath) {
      const layout = { folded, width: sidebarWidth }
      localStorage.setItem(`madabyo:sidebar:layout:${workspacePath}`, JSON.stringify(layout))
    }
  }, [folded, sidebarWidth, workspacePath])

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

  async function handleFollowLink(pane, href) {
    const nid = normalizeSlashes(pane.tabManager.activeTabId)
    const dir = nid.slice(0, nid.lastIndexOf('/'))
    const resolvedUrl = new URL(href, `file://${dir}/`).pathname
    const name = resolvedUrl.slice(resolvedUrl.lastIndexOf('/') + 1)
    if (!isAllowedMarkdownFile(name)) return

    const nws = normalizeSlashes(workspacePath)
    const root = new URL(`file://${nws}${nws.endsWith('/') ? '' : '/'}`).pathname
    if (!resolvedUrl.startsWith(root)) {
      pane.tabManager.openTab(resolvedUrl, { status: 'blocked' })
      rerender()
      return
    }

    const resolved = resolvedUrl.replace(/^\/([A-Za-z]:\/)/, '$1')
    await paneManager.openFile(pane.id, resolved)
    rerender()
  }

  async function handleSplit(paneId) {
    await paneManager.splitRight(paneId)
    rerender()
  }

  function handleResize(paneId, deltaPx) {
    // Convert pixels to percentage points: (pixels / container width) * 100
    // This ensures 1px mouse movement moves the pane edge ~1px, not 12x faster
    const containerRect = panesContentRef.current?.getBoundingClientRect();
    const containerWidth = (containerRect?.width && containerRect.width > 0) ? containerRect.width : 1200;
    const percentDelta = (deltaPx / containerWidth) * 100;
    paneManager.resizeDivider(paneId, percentDelta)
    rerender()
  }

  function handleContentDividerMouseDown(paneId) {
    const handleMouseMove = (e) => {
      handleResize(paneId, e.movementX)
    }
    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
  }

  function handleClosePane(paneId) {
    paneManager.closePane(paneId)
    rerender()
  }

  function handleSettingsSaved() {
    loadTree()
  }

  function handleSidebarDividerMouseDown() {
    const handleMouseMove = (e) => {
      setSidebarWidth((prevWidth) => {
        const newWidth = prevWidth + e.movementX
        // Clamp at every mousemove tick to ensure invariant holds
        return Math.min(MAX_SIDEBAR_WIDTH, Math.max(MIN_SIDEBAR_WIDTH, newWidth))
      })
    }
    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
  }

  return (
    <div className="app-shell">
      <header className="app-toolbar">
        <span className="app-title">Markdown Viewer</span>
        <button
          type="button"
          className="btn-fold"
          aria-label={folded ? "Unfold sidebar" : "Fold sidebar"}
          data-testid="fold-button"
          onClick={() => setFolded(!folded)}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            {folded ? (
              <path d="M13 17h8M13 13h8M13 9h8M5 4v16M2 7l3-3 3 3" />
            ) : (
              <path d="M6 17H2M6 13H2M6 9H2M19 4V20M22 7l-3-3-3 3" />
            )}
          </svg>
        </button>
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
        {!folded && (
          <aside className="app-sidebar" style={{ width: `${sidebarWidth}px` }}>
            <SidebarTree tree={tree} status={treeStatus} expandedPaths={expandedPaths} onSelectFile={(path) => {
              paneManager.openFile(activePaneId, normalizeSlashes(path)).then(rerender)
            }} onExpandDir={handleExpandDir} onCollapseDir={handleCollapseDir} />
            <div
              role="separator"
              aria-label="Resize sidebar"
              className="divider"
              onMouseDown={handleSidebarDividerMouseDown}
            />
          </aside>
        )}
        <div className="app-content">
          <SplitContainer
            panes={paneManager.panes}
            onSplit={handleSplit}
            onResize={handleResize}
            onClosePane={handleClosePane}
          />
          <div className="panes-content" ref={panesContentRef}>
            {paneManager.panes.map((pane, paneIndex) => {
              const renderedWidth = pane.width ?? (100 / paneManager.panes.length);
              // Assertion: rendered width is never undefined/NaN
              console.assert(
                Number.isFinite(renderedWidth),
                `pane render width is not finite: width=${pane.width}, panes.length=${paneManager.panes.length}, computed=${renderedWidth}`
              );
              return (
                <Fragment key={`pane-group-${pane.id}`}>
                  <div
                    key={pane.id}
                    className="pane-content-wrapper"
                    style={{ width: `${renderedWidth}%` }}
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
                      onFollowLink={(href) => handleFollowLink(pane, href)}
                      onToggleCheckbox={(index, checked) => {
                        const result = paneManager.toggleCheckbox(pane.id, pane.tabManager.activeTabId, index, checked);
                        rerender();
                        return result;
                      }}
                    />
                  </div>
                  {paneIndex < paneManager.panes.length - 1 && (
                    <div
                      role="separator"
                      aria-label={`Resize ${pane.id}`}
                      className="divider-content"
                      onMouseDown={() => handleContentDividerMouseDown(pane.id)}
                    />
                  )}
                </Fragment>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
