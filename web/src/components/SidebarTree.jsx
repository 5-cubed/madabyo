import React, { useState } from 'react'
import './SidebarTree.css'

const ICON_BASE = 'https://cdn.jsdelivr.net/gh/vscode-icons/vscode-icons@master/icons'

const ICONS = {
  folderOpen: `${ICON_BASE}/default_folder_opened.svg`,
  folderClosed: `${ICON_BASE}/default_folder.svg`,
  markdown: `${ICON_BASE}/file_type_markdown.svg`
}

function TreeNode({ node, selectedPath, onSelectFile }) {
  const isDir = node.type === 'dir'
  const [collapsed, setCollapsed] = useState(false)

  if (isDir) {
    return (
      <div className="tree-node">
        <div className="tree-row" onClick={() => setCollapsed((c) => !c)}>
          <span className={collapsed ? 'chevron' : 'chevron open'}>&#9656;</span>
          <img src={collapsed ? ICONS.folderClosed : ICONS.folderOpen} alt="" />
          <span>{node.name}</span>
        </div>
        {!collapsed && (
          <div className="tree-children">
            {node.children.map((child) => (
              <TreeNode key={child.path} node={child} selectedPath={selectedPath} onSelectFile={onSelectFile} />
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
        onClick={() => onSelectFile(node)}
      >
        <img src={ICONS.markdown} alt="" />
        <span>{node.name}</span>
      </div>
    </div>
  )
}

export default function SidebarTree({ tree, status, onSelectFile }) {
  const [selectedPath, setSelectedPath] = useState(null)

  if (status === 'unsupported') {
    return <div className="sidebar-message">Your browser doesn't support opening local folders.</div>
  }

  if (status === 'empty') {
    return <div className="sidebar-message">No markdown files found.</div>
  }

  if (status === 'loading') {
    return <div className="sidebar-message">Loading files...</div>
  }

  if (status !== 'ready') return null

  if (!tree) return null

  function handleSelectFile(node) {
    setSelectedPath(node.path)
    onSelectFile(node.handle)
  }

  return (
    <div className="sidebar-tree">
      <h4 className="sidebar-tree-header">Explorer (.md only)</h4>
      <TreeNode node={tree} selectedPath={selectedPath} onSelectFile={handleSelectFile} />
    </div>
  )
}
