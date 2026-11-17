import React from 'react'
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent, within, waitFor, act } from '@testing-library/react'
import App from './App'

const pendingFiles = {}
const files = {
  '/ws/main.md': '[jump](#section) [other](other.md)\n\n# Section\n',
  '/ws/other.md': '# Other\n',
}

async function openMain(name = 'main.md') {
  render(<App />)
  fireEvent.click(await screen.findByText(name))
  await screen.findByRole('link', { name: 'jump' })
  return screen.getByRole('link', { name: 'jump' }).closest('.pane-content')
}

function layout(content, positions = { section: 540 }) {
  content.getBoundingClientRect = () => ({ top: 100 })
  for (const heading of content.querySelectorAll('h1,h2,h3,h4,h5,h6')) {
    heading.getBoundingClientRect = () => ({ top: 100 + (positions[heading.id] ?? 540) - content.scrollTop })
  }
}

function layoutAll() {
  const originalRect = HTMLElement.prototype.getBoundingClientRect
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function () {
    if (this.matches('h1,h2,h3,h4,h5,h6')) return { top: 640 - this.closest('.pane-content').scrollTop }
    if (this.matches('.pane-content')) return { top: 100 }
    return originalRect.call(this)
  })
}

describe('Markdown heading links through App', () => {
  beforeEach(() => {
    localStorage.clear()
    files['/ws/main.md'] = '[jump](#section) [other](other.md)\n\n# Section\n'
    files['/ws/other.md'] = '# Other\n'
    vi.stubGlobal('fetch', vi.fn(async (input) => {
      const url = new URL(input, 'http://localhost')
      if (url.pathname === '/api/file') await pendingFiles[url.searchParams.get('path')]
      let result
      if (url.pathname === '/api/settings') result = { workspacePath: '/ws' }
      else if (url.pathname === '/api/list') result = { entries: Object.keys(files).map((path) => ({ name: path.slice(4), isDir: false })) }
      else if (url.pathname === '/api/file/meta') result = { mtime: 1 }
      else if (url.pathname === '/api/file') result = files[url.searchParams.get('path')] === undefined
        ? { error: 'missing' } : { content: files[url.searchParams.get('path')] }
      else throw new Error(`Unexpected fetch: ${input}`)
      return { json: async () => result }
    }))
  })
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
    for (const path of Object.keys(pendingFiles)) delete pendingFiles[path]
    for (const path of Object.keys(files)) if (!['/ws/main.md', '/ws/other.md'].includes(path)) delete files[path]
  })

  it('renders a target ID, jumps immediately on every click and restores the jumped reading position', async () => {
    const content = await openMain()
    expect(within(content).getByRole('heading', { name: 'Section' })).toHaveAttribute('id', 'section')
    layout(content)
    content.scrollTop = 80
    const fetchCount = fetch.mock.calls.length
    fireEvent.click(within(content).getByRole('link', { name: 'jump' }))
    expect(content.scrollTop).toBe(540)
    content.scrollTop = 20
    fireEvent.scroll(content)
    fireEvent.click(within(content).getByRole('link', { name: 'jump' }))
    expect(content.scrollTop).toBe(540)
    expect(fetch).toHaveBeenCalledTimes(fetchCount)
    expect(screen.getAllByRole('tab')).toHaveLength(1)
    fireEvent.click(within(content).getByRole('link', { name: 'other' }))
    await screen.findByRole('heading', { name: 'Other' })
    fireEvent.click(screen.getByRole('tab', { name: 'main.md' }))
    await screen.findByRole('heading', { name: 'Section' })
    expect(content.scrollTop).toBe(540)
  })

  it('uses GitHub identifiers across heading forms, Unicode, formatting and collisions', async () => {
    files['/ws/main.md'] = `[jump](#thisll-be-a-helpful-section) [korean](#%ED%95%9C%EA%B8%80-%EC%A0%9C%EB%AA%A9) [duplicate](#repeat-2) [self](./main.md#last-level)

# This'll be a _Helpful_ Section! ###
## 한글 제목
### Repeat
#### Repeat-1
##### Repeat
###### Last Level

Setext *Heading*
==============

Second \`code\` &amp; <em>HTML</em>
-------------------------------

## Keep_this - dash
## Repeat-1
`
    const content = await openMain()
    expect([...content.querySelectorAll('h1,h2,h3,h4,h5,h6')].map((heading) => heading.id)).toEqual([
      'thisll-be-a-helpful-section', '한글-제목', 'repeat', 'repeat-1', 'repeat-2', 'last-level',
      'setext-heading', 'second-code--html', 'keep_this---dash', 'repeat-1-1',
    ])
    layout(content, { 'thisll-be-a-helpful-section': 200, '한글-제목': 400, 'repeat-2': 600, 'last-level': 800 })
    for (const [name, position] of [['jump', 200], ['korean', 400], ['duplicate', 600], ['self', 800]]) {
      fireEvent.click(within(content).getByRole('link', { name }))
      expect(content.scrollTop).toBe(position)
    }
  })


  it('leaves missing and malformed targets in place and keeps fragment navigation inside the clicked pane', async () => {
    files['/ws/main.md'] = '[jump](#section) [missing](#absent) [malformed](#%ZZ) [literal](#한글)\n\n# Section\n## 한글\n'
    const left = await openMain()
    layout(left)
    left.scrollTop = 90
    fireEvent.scroll(left)
    document.documentElement.scrollTop = 17
    fireEvent.click(within(left).getByRole('link', { name: 'missing' }))
    fireEvent.click(within(left).getByRole('link', { name: 'malformed' }))
    expect(left.scrollTop).toBe(90)
    fireEvent.click(screen.getByRole('button', { name: 'Split pane-1' }))
    const empty = await screen.findByText('No file open')
    fireEvent.mouseDown(empty.closest('.pane-content-wrapper'))
    fireEvent.click(screen.getByText('main.md', { selector: '.sidebar-tree .tree-row span' }))
    await screen.findAllByRole('link', { name: 'jump' })
    const contents = document.querySelectorAll('.pane-content')
    expect(contents).toHaveLength(2)
    const right = contents[1]
    layout(right, { section: 700, 한글: 900 })
    expect(within(right).getByRole('heading', { name: 'Section' })).toHaveAttribute('id', 'section')
    right.scrollTop = 30
    fireEvent.scroll(right)
    fireEvent.click(within(right).getByRole('link', { name: 'jump' }))
    expect(right.scrollTop).toBe(700)
    expect(left.scrollTop).toBe(90)
    expect(document.documentElement.scrollTop).toBe(17)
    fireEvent.click(within(right).getByRole('link', { name: 'literal' }))
    expect(right.scrollTop).toBe(900)
    expect(left.scrollTop).toBe(90)
  })


  it('jumps within a current document whose filename contains Korean and spaces', async () => {
    files['/ws/한글 문서.md'] = '[jump](#section) [self](./%ED%95%9C%EA%B8%80%20%EB%AC%B8%EC%84%9C.md#section)\n\n# Section'
    const content = await openMain('한글 문서.md')
    layout(content)
    const fetchCount = fetch.mock.calls.length
    fireEvent.click(within(content).getByRole('link', { name: 'jump' }))
    expect(content.scrollTop).toBe(540)
    content.scrollTop = 20
    fireEvent.scroll(content)
    fireEvent.click(within(content).getByRole('link', { name: 'self' }))
    expect(content.scrollTop).toBe(540)
    expect(fetch).toHaveBeenCalledTimes(fetchCount)
    expect(screen.getAllByRole('tab')).toHaveLength(1)
  })

  it('waits for a new destination to render, jumps there, and reuses its saved tab on subsequent clicks', async () => {
    files['/ws/main.md'] = '[jump](other.md#section)'
    files['/ws/other.md'] = '# Other\n\n## Section\n\n[self](other.md#section)'
    const content = await openMain()
    layoutAll()
    let finish
    pendingFiles['/ws/other.md'] = new Promise((resolve) => { finish = resolve })
    fireEvent.click(within(content).getByRole('link', { name: 'jump' }))
    await waitFor(() => expect(fetch.mock.calls.some(([input]) => input.includes('path=%2Fws%2Fother.md'))).toBe(true))
    expect(screen.getByRole('tab', { name: 'main.md' })).toHaveAttribute('aria-selected', 'true')
    await act(async () => finish())
    await screen.findByRole('heading', { name: 'Other' })
    expect(content.scrollTop).toBe(540)
    expect(screen.getByRole('tab', { name: 'other.md' })).toHaveAttribute('aria-selected', 'true')
    content.scrollTop = 20
    fireEvent.scroll(content)
    fireEvent.click(within(content).getByRole('link', { name: 'self' }))
    expect(content.scrollTop).toBe(540)
    content.scrollTop = 88
    fireEvent.scroll(content)
    fireEvent.click(screen.getByRole('tab', { name: 'main.md' }))
    await screen.findByRole('link', { name: 'jump' })
    fireEvent.click(within(content).getByRole('link', { name: 'jump' }))
    await screen.findByRole('heading', { name: 'Other' })
    expect(content.scrollTop).toBe(540)
    expect(screen.getAllByRole('tab')).toHaveLength(2)
    await act(async () => fireEvent.click(screen.getByRole('tab', { name: 'main.md' })))
    await act(async () => fireEvent.click(screen.getByRole('tab', { name: 'other.md' })))
    expect(content.scrollTop).toBe(540)
  })

  it.each([false, true])('cancels delayed navigation after a tab switch (return to source: %s)', async (returnToSource) => {
    files['/ws/main.md'] = '[jump](other.md#section)'
    files['/ws/other.md'] = '# Other\n\n## Section'
    files['/ws/stay.md'] = '# Stay\n\n## Section'
    const content = await openMain()
    fireEvent.click(screen.getByText('stay.md', { selector: '.sidebar-tree .tree-row span' }))
    await screen.findByRole('heading', { name: 'Stay' })
    await act(async () => fireEvent.click(screen.getByRole('tab', { name: 'main.md' })))
    let finish
    pendingFiles['/ws/other.md'] = new Promise((resolve) => { finish = resolve })
    fireEvent.click(within(content).getByRole('link', { name: 'jump' }))
    await waitFor(() => expect(fetch.mock.calls.some(([input]) => input.includes('path=%2Fws%2Fother.md'))).toBe(true))
    await act(async () => fireEvent.click(screen.getByRole('tab', { name: 'stay.md' })))
    if (returnToSource) await act(async () => fireEvent.click(screen.getByRole('tab', { name: 'main.md' })))
    layout(content)
    content.scrollTop = 88
    fireEvent.scroll(content)
    await act(async () => finish())
    expect(screen.getByRole('tab', { name: returnToSource ? 'main.md' : 'stay.md' })).toHaveAttribute('aria-selected', 'true')
    expect(content.scrollTop).toBe(88)
    expect(within(content).queryByRole('heading', { name: 'Other' })).not.toBeInTheDocument()
  })

  it('preserves an existing target position for missing fragments and opens a new missing target at the top', async () => {
    files['/ws/main.md'] = '[jump](other.md#absent) [malformed](other.md#%ZZ) [new](new.md#absent)'
    files['/ws/new.md'] = '# New'
    const content = await openMain()
    fireEvent.click(screen.getByText('other.md', { selector: '.sidebar-tree .tree-row span' }))
    await screen.findByRole('heading', { name: 'Other' })
    content.scrollTop = 88
    fireEvent.scroll(content)
    for (const name of ['jump', 'malformed']) {
      await act(async () => fireEvent.click(screen.getByRole('tab', { name: 'main.md' })))
      await act(async () => fireEvent.click(within(content).getByRole('link', { name })))
      expect(content.scrollTop).toBe(88)
      expect(screen.getByRole('tab', { name: 'other.md' })).toHaveAttribute('aria-selected', 'true')
    }
    await act(async () => fireEvent.click(screen.getByRole('tab', { name: 'main.md' })))
    fireEvent.click(within(content).getByRole('link', { name: 'new' }))
    await screen.findByRole('heading', { name: 'New' })
    expect(content.scrollTop).toBe(0)
  })

  it('resolves relative Markdown types and Unicode or duplicate fragments only in the clicked pane', async () => {
    files['/ws/main.md'] = '[jump](./nested/../guide.markdown#%ED%95%9C%EA%B8%80) [duplicate](README#repeat-1)'
    files['/ws/guide.markdown'] = '# 한글'
    files['/ws/README'] = '# Repeat\n\n## Repeat'
    const left = await openMain()
    layoutAll()
    document.documentElement.scrollTop = 17
    left.scrollTop = 90
    fireEvent.scroll(left)
    fireEvent.click(screen.getByRole('button', { name: 'Split pane-1' }))
    const empty = await screen.findByText('No file open')
    fireEvent.mouseDown(empty.closest('.pane-content-wrapper'))
    fireEvent.click(screen.getByText('guide.markdown', { selector: '.sidebar-tree .tree-row span' }))
    await screen.findByRole('heading', { name: '한글' })
    const right = document.querySelectorAll('.pane-content')[1]
    right.scrollTop = 32
    fireEvent.scroll(right)
    await act(async () => fireEvent.click(within(left).getByRole('link', { name: 'jump' })))
    expect(within(left).getByRole('heading', { name: '한글' })).toHaveAttribute('id', '한글')
    expect(left.scrollTop).toBe(540)
    expect(right.scrollTop).toBe(32)
    expect(document.documentElement.scrollTop).toBe(17)
    const leftPane = left.closest('.pane')
    await act(async () => fireEvent.click(within(leftPane).getByRole('tab', { name: 'main.md' })))
    await act(async () => fireEvent.click(within(left).getByRole('link', { name: 'duplicate' })))
    expect(within(left).getAllByRole('heading').map((h) => h.id)).toEqual(['repeat', 'repeat-1'])
    expect(left.scrollTop).toBe(540)
    expect(right.scrollTop).toBe(32)
  })

  it('keeps unsupported, external, ordinary, missing-file and outside-workspace link behavior', async () => {
    files['/ws/main.md'] = '[jump](photo.png#section) [external](https://example.com/a#section) [ordinary](other.md) [missing](gone.md#section) [outside](../outside.md#section)'
    const content = await openMain()
    const external = vi.spyOn(window, 'open').mockImplementation(() => null)
    const count = fetch.mock.calls.length
    fireEvent.click(within(content).getByRole('link', { name: 'jump' }))
    fireEvent.click(within(content).getByRole('link', { name: 'external' }))
    expect(external).toHaveBeenCalledWith('https://example.com/a#section', '_blank', 'noopener,noreferrer')
    expect(fetch).toHaveBeenCalledTimes(count)
    expect(screen.getAllByRole('tab')).toHaveLength(1)
    fireEvent.click(within(content).getByRole('link', { name: 'ordinary' }))
    await screen.findByRole('heading', { name: 'Other' })
    expect(content.scrollTop).toBe(0)
    await act(async () => fireEvent.click(screen.getByRole('tab', { name: 'main.md' })))
    fireEvent.click(within(content).getByRole('link', { name: 'missing' }))
    await screen.findByText('This file could not be found.')
    await act(async () => fireEvent.click(screen.getByRole('tab', { name: 'main.md' })))
    const mainContent = screen.getByRole('link', { name: 'outside' }).closest('.pane-content')
    const beforeBlocked = fetch.mock.calls.length
    fireEvent.click(within(mainContent).getByRole('link', { name: 'outside' }))
    await screen.findByText('This link points outside your workspace.')
    expect(fetch).toHaveBeenCalledTimes(beforeBlocked)
  })

})
