import React from 'react'
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import App from './App'

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

describe('Markdown heading links through App', () => {
  beforeEach(() => {
    localStorage.clear()
    files['/ws/main.md'] = '[jump](#section) [other](other.md)\n\n# Section\n'
    files['/ws/other.md'] = '# Other\n'
    vi.stubGlobal('fetch', vi.fn(async (input) => {
      const url = new URL(input, 'http://localhost')
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
    vi.unstubAllGlobals()
    delete files['/ws/한글 문서.md']
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

})
