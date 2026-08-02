import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'

const settingsPanelCss = fs.readFileSync(path.join(__dirname, './SettingsPanel.css'), 'utf-8')

describe('SettingsPanel CSS', () => {
  it('should use editor background color token', () => {
    expect(settingsPanelCss).toContain('var(--color-editor-bg)')
  })

  it('should use border color token', () => {
    expect(settingsPanelCss).toContain('var(--color-border)')
  })

  it('should use ink color token', () => {
    expect(settingsPanelCss).toContain('var(--color-ink)')
  })
})
