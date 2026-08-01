async function walk(dirHandle, path) {
  const children = []

  for await (const [name, entryHandle] of dirHandle.entries()) {
    if (entryHandle.kind === 'directory') {
      const sub = await walk(entryHandle, `${path}/${name}`)
      if (sub) children.push(sub)
    }

    if (entryHandle.kind === 'file' && name.toLowerCase().endsWith('.md')) {
      children.push({
        type: 'file',
        name,
        path: `${path}/${name}`,
        handle: entryHandle
      })
    }
  }

  if (children.length == 0) return null

  return {
    type: 'dir',
    name: dirHandle.name,
    path,
    children
  }
}

export async function scanTree(handle) {
  const node = await walk(handle, handle.name)
  return node ?? {
    type: 'dir',
    name: handle.name,
    path: handle.name,
    children: []
  }
}
