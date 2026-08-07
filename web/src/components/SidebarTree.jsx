import React, { useState } from 'react'
import './SidebarTree.css'

const ICON_BASE = 'https://cdn.jsdelivr.net/gh/vscode-icons/vscode-icons@master/icons'

const ICONS = {
  folderOpen: `${ICON_BASE}/default_folder_opened.svg`,
  folderClosed: `${ICON_BASE}/default_folder.svg`,
  markdown: `${ICON_BASE}/file_type_markdown.svg`
}

function TreeNode({ node, selectedPath, onSelectFile, onExpandDir, expandedPaths = [], isRoot = false }) {
  const isDir = node.type === 'dir'
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const isExpanded = (isRoot || expandedPaths.includes(node.path)) && node.children !== undefined

  const handleExpandClick = async () => {
    if (!isExpanded) {
      setLoading(true)
      try {
        await onExpandDir(node.path)
      } catch (err) {
        setError(err.message || 'Failed to load directory')
      } finally {
        setLoading(false)
      }
    }
  }

  if (isDir) {
    return (
      <div className="tree-node">
        <div className="tree-row" onClick={handleExpandClick}>
          <span className={isExpanded ? 'chevron open' : 'chevron'}>&#9656;</span>
          <img src={isExpanded ? ICONS.folderOpen : ICONS.folderClosed} alt="" />
          <span>{node.name}</span>
          {loading && <span className="node-status">loading...</span>}
          {error && <span className="node-status error">{error}</span>}
        </div>
        {isExpanded && node.children && (
          <div className="tree-children">
            {node.children.map((child) => (
              <TreeNode
                key={child.path}
                node={child}
                selectedPath={selectedPath}
                onSelectFile={onSelectFile}
                onExpandDir={onExpandDir}
                expandedPaths={expandedPaths}
              />
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="tree-node">
      <div
        className={node.path === selectedPath ? 'tree-row selected' : 'tree-row'}
        onClick={() => onSelectFile(node.path)}
      >
        <img src={ICONS.markdown} alt="" />
        <span>{node.name}</span>
      </div>
    </div>
  )
}

export default function SidebarTree({ tree, status, expandedPaths = [], onSelectFile, onExpandDir }) {
  const [selectedPath, setSelectedPath] = useState(null)

  if (status === 'empty') {
    return <div className="sidebar-message">No markdown files found.</div>
  }

  if (status === 'loading') {
    return <div className="sidebar-message">Loading files...</div>
  }

  if (status === 'error') {
    return <div className="sidebar-message">Failed to load workspace.</div>
  }

  if (status !== 'ready') return null

  if (!tree) return null

  function handleSelectFile(path) {
    setSelectedPath(path)
    onSelectFile(path)
  }

  return (
    <div className="sidebar-tree">
      <h4 className="sidebar-tree-header">Explorer (.md only)</h4>
      <TreeNode
        node={tree}
        selectedPath={selectedPath}
        onSelectFile={handleSelectFile}
        onExpandDir={onExpandDir}
        expandedPaths={expandedPaths}
        isRoot={true}
      />
    </div>
  )
}
