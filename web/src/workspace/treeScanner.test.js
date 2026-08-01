import { describe, it, expect } from 'vitest'
import { scanTree } from './treeScanner'

function fakeFile(name) {
  return { kind: 'file', name }
}

function fakeDir(name, entries) {
  return {
    kind: 'directory',
    name,
    entries: async function* () {
      for (const [entryName, entry] of entries) {
        yield [entryName, entry]
      }
    }
  }
}

describe('TreeScanner', () => {
  it('should scan a single markdown file', async () => {
    const root = fakeDir('root', [['notes.md', fakeFile('notes.md')]])
    const result = await scanTree(root)

    expect(result).toEqual({
      type: 'dir',
      name: 'root',
      path: 'root',
      children: [
        {
          type: 'file',
          name: 'notes.md',
          path: 'root/notes.md',
          handle: fakeFile('notes.md')
        }
      ]
    })
  })

  it('should exclude non-markdown files', async () => {
    const root = fakeDir('root', [
      ['notes.md', fakeFile('notes.md')],
      ['image.png', fakeFile('image.png')]
    ])
    const result = await scanTree(root)

    expect(result.children).toHaveLength(1)
    expect(result.children[0].name).toBe('notes.md')
  })

  it('should recurse into directories', async () => {
    const root = fakeDir('root', [
      ['docs', fakeDir('docs', [['api.md', fakeFile('api.md')]])]
    ])
    const result = await scanTree(root)

    expect(result).toEqual({
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
              path: 'root/docs/api.md',
              handle: fakeFile('api.md')
            }
          ]
        }
      ]
    })
  })

  it('should prune directories with no markdown descendants', async () => {
    const root = fakeDir('root', [
      ['docs', fakeDir('docs', [['image.png', fakeFile('image.png')]])],
      ['notes.md', fakeFile('notes.md')]
    ])
    const result = await scanTree(root)

    expect(result.children).toHaveLength(1)
    expect(result.children[0].name).toBe('notes.md')
  })

  it('should keep directories with markdown siblings', async () => {
    const root = fakeDir('root', [
      [
        'docs',
        fakeDir('docs', [
          ['api.md', fakeFile('api.md')],
          ['image.png', fakeFile('image.png')]
        ])
      ]
    ])
    const result = await scanTree(root)

    expect(result.children).toHaveLength(1)
    expect(result.children[0].name).toBe('docs')
    expect(result.children[0].children).toHaveLength(1)
    expect(result.children[0].children[0].name).toBe('api.md')
  })

  it('should return an empty tree when no markdown files exist', async () => {
    const root = fakeDir('root', [['image.png', fakeFile('image.png')]])
    const result = await scanTree(root)

    expect(result).toEqual({
      type: 'dir',
      name: 'root',
      path: 'root',
      children: []
    })
  })
})
