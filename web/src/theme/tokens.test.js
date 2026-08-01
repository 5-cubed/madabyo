import { describe, it, expect } from 'vitest'
import tokensCss from './tokens.css?raw'

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
