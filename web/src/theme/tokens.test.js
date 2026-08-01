import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'

const tokensCss = fs.readFileSync(path.join(__dirname, './tokens.css'), 'utf-8')

describe('Theme Tokens', () => {
  it('should define color-editor-bg token', () => {
    expect(tokensCss).toContain('--color-editor-bg: #faf9f5')
  })

  it('should define color-sidebar-bg token', () => {
    expect(tokensCss).toContain('--color-sidebar-bg: #f6f5f1')
  })

  it('should define color-ink token', () => {
    expect(tokensCss).toContain('--color-ink: #2a2920')
  })

  it('should define color-accent token', () => {
    expect(tokensCss).toContain('--color-accent: #9a4929')
  })
})
