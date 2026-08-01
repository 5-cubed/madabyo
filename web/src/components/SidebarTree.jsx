import React from 'react'
import './SidebarTree.css'

const ICON_BASE = 'https://cdn.jsdelivr.net/npm/vscode-icons@12.0.0/icons'

const ICONS = {
  folder: `${ICON_BASE}/svg/default_folder.svg`,
  markdown: `${ICON_BASE}/svg/file_type_markdown.svg`
}

function TreeNode({ node }) {
  const isDir = node.type === 'dir'

  return (
    <div className="tree-node">
      <div className="tree-row">
        <img
          src={isDir ? ICONS.folder : ICONS.markdown}
          alt=""
        />
        <span>{node.name}</span>
      </div>
      {isDir && (
        <div className="tree-children">
          {node.children.map((child) => (
            <TreeNode key={child.path} node={child} />
          ))}
        </div>
      )}
    </div>
  )
}

export default function SidebarTree({ tree, status, onSelectFile }) {
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

  return (
    <div className="sidebar-tree">
      <TreeNode node={tree} />
    </div>
  )
}
