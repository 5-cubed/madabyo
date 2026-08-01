import { describe, it, expect } from 'vitest'
import sidebarTreeCss from './SidebarTree.css?raw'

describe('SidebarTree CSS', () => {
  it('should use sidebar background color token', () => {
    expect(sidebarTreeCss).toContain('var(--color-sidebar-bg)')
  })

  it('should use ink color token', () => {
    expect(sidebarTreeCss).toContain('var(--color-ink)')
  })
})
