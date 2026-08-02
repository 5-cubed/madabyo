import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'

const pathAutocompleteCss = fs.readFileSync(path.join(__dirname, './PathAutocompleteInput.css'), 'utf-8')

describe('PathAutocompleteInput CSS', () => {
  it('should use sidebar background color token for the dropdown', () => {
    expect(pathAutocompleteCss).toContain('var(--color-sidebar-bg)')
  })

  it('should use accent color token for error text', () => {
    expect(pathAutocompleteCss).toContain('var(--color-accent)')
  })

  it('should use ink color token', () => {
    expect(pathAutocompleteCss).toContain('var(--color-ink)')
  })
})
