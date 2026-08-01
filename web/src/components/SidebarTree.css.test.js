import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'

const sidebarTreeCss = fs.readFileSync(path.join(__dirname, './SidebarTree.css'), 'utf-8')

describe('SidebarTree CSS', () => {
  it('should use sidebar background color token', () => {
    expect(sidebarTreeCss).toContain('var(--color-sidebar-bg)')
  })

  it('should use ink color token', () => {
    expect(sidebarTreeCss).toContain('var(--color-ink)')
  })
})
