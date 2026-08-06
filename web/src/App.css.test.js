import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'

const appCss = fs.readFileSync(path.join(__dirname, './App.css'), 'utf-8')

describe('App CSS', () => {
  describe('markdown table styling', () => {
    it('should set border-collapse on tables', () => {
      expect(appCss).toContain('border-collapse: collapse')
    })

    it('should style table cells with borders', () => {
      expect(appCss).toContain('var(--color-border)')
    })

    it('should style table header with sidebar background', () => {
      expect(appCss).toContain('var(--color-sidebar-bg)')
    })
  })

  describe('markdown other elements', () => {
    it('should style blockquote', () => {
      expect(appCss).toContain('.pane-content blockquote')
    })

    it('should style horizontal rule', () => {
      expect(appCss).toContain('.pane-content hr')
    })

    it('should style unordered lists', () => {
      expect(appCss).toContain('.pane-content ul')
    })

    it('should style ordered lists', () => {
      expect(appCss).toContain('.pane-content ol')
    })

    it('should style images', () => {
      expect(appCss).toContain('.pane-content img')
    })

    it('should style h4-h6 headings', () => {
      expect(appCss).toContain('.pane-content h4')
      expect(appCss).toContain('.pane-content h5')
      expect(appCss).toContain('.pane-content h6')
    })
  })
})
