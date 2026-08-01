import React from 'react'
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import SidebarTree from './SidebarTree'

const ICON_BASE = 'https://cdn.jsdelivr.net/npm/vscode-icons@12.0.0/icons'

describe('SidebarTree', () => {
  it('should render a folder icon for a directory node', () => {
    render(
      <SidebarTree
        tree={{ type: 'dir', name: 'notes', path: 'notes', children: [] }}
        status="ready"
        onSelectFile={() => {}}
      />
    )

    const img = screen.getByAltText('').closest('.tree-row').querySelector('img')
    expect(img.src).toContain('default_folder')
  })

  it('should render nothing when status is not ready', () => {
    render(
      <SidebarTree
        tree={{ type: 'dir', name: 'notes', path: 'notes', children: [] }}
        status="loading"
        onSelectFile={() => {}}
      />
    )

    expect(screen.queryByText('notes')).not.toBeInTheDocument()
  })

  it('should render both directory and file icons in a two-level tree', () => {
    render(
      <SidebarTree
        tree={{
          type: 'dir',
          name: 'notes',
          path: 'notes',
          children: [
            {
              type: 'file',
              name: 'todo.md',
              path: 'notes/todo.md'
            }
          ]
        }}
        status="ready"
        onSelectFile={() => {}}
      />
    )

    expect(screen.getByText('notes')).toBeInTheDocument()

    const todoRow = screen.getByText('todo.md').closest('.tree-row')
    const todoImg = todoRow.querySelector('img')
    expect(todoImg.src).toContain('file_type_markdown')
  })

  it('should render a multi-level tree correctly', () => {
    render(
      <SidebarTree
        tree={{
          type: 'dir',
          name: 'root',
          path: 'root',
          children: [
            {
              type: 'dir',
              name: 'docs',
              path: 'root/docs',
              children: [
                {
                  type: 'file',
                  name: 'api.md',
                  path: 'root/docs/api.md'
                }
              ]
            }
          ]
        }}
        status="ready"
        onSelectFile={() => {}}
      />
    )

    expect(screen.getByText('root')).toBeInTheDocument()
    expect(screen.getByText('docs')).toBeInTheDocument()

    const apiRow = screen.getByText('api.md').closest('.tree-row')
    const apiImg = apiRow.querySelector('img')
    expect(apiImg.src).toContain('file_type_markdown')
  })

  it('should display unsupported browser message when status is unsupported', () => {
    render(
      <SidebarTree
        tree={null}
        status="unsupported"
        onSelectFile={() => {}}
      />
    )

    expect(screen.getByText("Your browser doesn't support opening local folders.")).toBeInTheDocument()
  })

  it('should display empty state message when status is empty', () => {
    render(
      <SidebarTree
        tree={{ type: 'dir', name: 'root', path: 'root', children: [] }}
        status="empty"
        onSelectFile={() => {}}
      />
    )

    expect(screen.getByText('No markdown files found.')).toBeInTheDocument()
    expect(screen.queryByText('root')).not.toBeInTheDocument()
  })

  it('should display loading message when status is loading', () => {
    render(
      <SidebarTree
        tree={null}
        status="loading"
        onSelectFile={() => {}}
      />
    )

    expect(screen.getByText('Loading files...')).toBeInTheDocument()
  })
})
