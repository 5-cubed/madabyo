import { describe, it, expect, vi, afterEach } from 'vitest';
import { PaneManager } from './PaneManager.js';

describe('PaneManager', () => {
  afterEach(() => vi.restoreAllMocks());

  // Helper to mock fetch for file rendering (handles both /api/file and /api/file/meta)
  function mockFetchFile(...pathAndContentPairs) {
    const mockFn = vi.fn();
    for (let i = 0; i < pathAndContentPairs.length; i += 2) {
      const path = pathAndContentPairs[i];
      const content = pathAndContentPairs[i + 1];
      // Mock /api/file first (called first by renderFile in openFile)
      mockFn.mockResolvedValueOnce({
        json: async () => ({
          requested: path,
          resolved: path,
          content,
        }),
      });
      // Then mock /api/file/meta (called second by fetchMeta in openFile)
      mockFn.mockResolvedValueOnce({
        json: async () => ({
          requested: path,
          resolved: path,
          mtime: 1700000000000 + i,
        }),
      });
    }
    vi.stubGlobal('fetch', mockFn);
  }

  // Test: openFile with rendering
  it('renders a new file and opens it in a tab', async () => {
    mockFetchFile('/tmp/notes.md', '# Hi');
    const pm = new PaneManager(['pane-1']);
    await pm.openFile('pane-1', '/tmp/notes.md');
    const pane = pm.panes.find((p) => p.id === 'pane-1');
    expect(pane.tabManager.tabs).toEqual([
      {
        fileId: '/tmp/notes.md',
        renderResult: { status: 'ok', html: expect.stringContaining('<h1>Hi</h1>') },
        mtime: expect.any(Number),
      },
    ]);
    expect(pane.tabManager.activeTabId).toBe('/tmp/notes.md');
  });

  // Test: check-then-dispatch behavior
  it('focuses existing tab instead of re-rendering when file is already open', async () => {
    mockFetchFile('/tmp/notes.md', '# Hi', '/tmp/other.md', '# Other');
    const pm = new PaneManager(['pane-1']);
    await pm.openFile('pane-1', '/tmp/notes.md');
    await pm.openFile('pane-1', '/tmp/other.md');
    await pm.openFile('pane-1', '/tmp/notes.md');
    const pane = pm.panes.find((p) => p.id === 'pane-1');
    expect(pane.tabManager.tabs).toHaveLength(2);
    expect(pane.tabManager.tabs[0].renderResult.html).toContain('<h1>Hi</h1>');
    expect(pane.tabManager.activeTabId).toBe('/tmp/notes.md');
  });

  // Test: multiple distinct files in order
  it('opens multiple distinct files in tab order', async () => {
    mockFetchFile('/tmp/a.md', '# A', '/tmp/b.md', '# B', '/tmp/c.md', '# C');
    const pm = new PaneManager(['pane-1']);
    await pm.openFile('pane-1', '/tmp/a.md');
    await pm.openFile('pane-1', '/tmp/b.md');
    await pm.openFile('pane-1', '/tmp/c.md');
    const pane = pm.panes.find((p) => p.id === 'pane-1');
    expect(pane.tabManager.tabs.length).toBe(3);
    expect(pane.tabManager.tabs.map((t) => t.fileId)).toEqual(['/tmp/a.md', '/tmp/b.md', '/tmp/c.md']);
  });

  // Test: refreshTab updates content without changing order
  it('refreshTab updates tab result without changing order or activeTabId', async () => {
    const mockFetch = vi.fn((url) => {
      if (url.includes('/api/file/meta?path=%2Ftmp%2Fa.md')) {
        return Promise.resolve({ json: async () => ({ mtime: 1700000000000, requested: '/tmp/a.md', resolved: '/tmp/a.md' }) });
      }
      if (url.includes('/api/file/meta?path=%2Ftmp%2Fb.md')) {
        return Promise.resolve({ json: async () => ({ mtime: 1700000000001, requested: '/tmp/b.md', resolved: '/tmp/b.md' }) });
      }
      if (url.includes('/api/file?path=%2Ftmp%2Fa.md')) {
        return Promise.resolve({ json: async () => ({ content: '# A Updated', requested: '/tmp/a.md', resolved: '/tmp/a.md' }) });
      }
      if (url.includes('/api/file?path=%2Ftmp%2Fb.md')) {
        return Promise.resolve({ json: async () => ({ content: '# B', requested: '/tmp/b.md', resolved: '/tmp/b.md' }) });
      }
      throw new Error(`Unmocked: ${url}`);
    });
    vi.stubGlobal('fetch', mockFetch);

    const pm = new PaneManager(['pane-1']);
    await pm.openFile('pane-1', '/tmp/a.md');
    await pm.openFile('pane-1', '/tmp/b.md');
    await pm.refreshTab('pane-1', '/tmp/a.md');

    const pane = pm.panes.find((p) => p.id === 'pane-1');
    expect(pane.tabManager.tabs[0].renderResult.html).toContain('<h1>A Updated</h1>');
    expect(pane.tabManager.activeTabId).toBe('/tmp/b.md');
    expect(pane.tabManager.tabs.map((t) => t.fileId)).toEqual(['/tmp/a.md', '/tmp/b.md']);
  });

  // Test: resizeDivider with 4 scenarios
  it('resizes panes, with default width and min-width clamp - scenario 1', async () => {
    mockFetchFile('/tmp/notes.md', '# Hi', '/tmp/notes.md', '# Hi');
    const pm = new PaneManager(['pane-1']);
    await pm.openFile('pane-1', '/tmp/notes.md');
    await pm.splitRight('pane-1');
    const [paneA, paneB] = pm.panes;
    const tabManagerABefore = paneA.tabManager;
    const tabManagerBBefore = paneB.tabManager;
    pm.resizeDivider('pane-1', 20);
    expect(paneA.width).toBe(70);
    expect(paneB.width).toBe(30);
    expect(paneA.tabManager).toBe(tabManagerABefore);
    expect(paneB.tabManager).toBe(tabManagerBBefore);
    expect(paneA.tabManager.tabs).toHaveLength(1);
    expect(paneA.tabManager.activeTabId).toBe('/tmp/notes.md');
  });

  it('clamps pane to MIN_PANE_WIDTH when shrinking pane-side (scenario 2)', async () => {
    const pm = new PaneManager(['pane-1']);
    await pm.splitRight('pane-1');
    pm.resizeDivider('pane-1', -1000);
    expect(pm.panes[0].width).toBe(20);
    expect(pm.panes[1].width).toBe(80);
    expect(pm.panes[0].width + pm.panes[1].width).toBe(100);
  });

  it('clamps neighbor to MIN_PANE_WIDTH when shrinking neighbor-side (scenario 3)', async () => {
    const pm = new PaneManager(['pane-1']);
    await pm.splitRight('pane-1');
    pm.resizeDivider('pane-1', 1000);
    expect(pm.panes[1].width).toBe(20);
    expect(pm.panes[0].width).toBe(80);
  });

  it('repeated resize past clamp point stays pinned (scenario 4)', async () => {
    const pm = new PaneManager(['pane-1']);
    await pm.splitRight('pane-1');
    pm.resizeDivider('pane-1', -1000);
    pm.resizeDivider('pane-1', -50);
    expect(pm.panes[0].width).toBe(20);
    expect(pm.panes[1].width).toBe(80);
  });

  // Test: closePane
  it('closes a pane and expands the survivor to full width', async () => {
    mockFetchFile('/tmp/notes.md', '# Hi', '/tmp/notes.md', '# Hi');
    const pm = new PaneManager(['pane-1']);
    await pm.openFile('pane-1', '/tmp/notes.md');
    await pm.splitRight('pane-1');
    const [paneA] = pm.panes;
    const tabManagerBefore = paneA.tabManager;
    pm.closePane('pane-2');
    expect(pm.panes).toHaveLength(1);
    expect(pm.panes[0].id).toBe('pane-1');
    expect(pm.panes[0].tabManager).toBe(tabManagerBefore);
    expect(pm.panes[0].tabManager.tabs).toHaveLength(1);
    expect(pm.panes[0].tabManager.activeTabId).toBe('/tmp/notes.md');
    expect(pm.panes[0].width).toBe(100);
  });

  // Test: refreshTab skips re-render when mtime hasn't changed
  it('refreshTab skips renderFile when mtime unchanged', async () => {
    const mockFetch = vi.fn((url) => {
      if (url.includes('/api/file/meta')) {
        return Promise.resolve({
          json: async () => ({
            requested: '/tmp/notes.md',
            resolved: '/tmp/notes.md',
            mtime: 1700000000000,
          }),
        });
      } else if (url.includes('/api/file')) {
        return Promise.resolve({
          json: async () => ({
            requested: '/tmp/notes.md',
            resolved: '/tmp/notes.md',
            content: '# Hi',
          }),
        });
      }
    });
    vi.stubGlobal('fetch', mockFetch);

    const pm = new PaneManager(['pane-1']);
    await pm.openFile('pane-1', '/tmp/notes.md');
    expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('/api/file?'));
    mockFetch.mockClear();

    // Second refresh with same mtime should skip renderFile
    await pm.refreshTab('pane-1', '/tmp/notes.md');
    expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('/api/file/meta'));
    expect(mockFetch).not.toHaveBeenCalledWith(expect.stringContaining('/api/file?'));
  });

  // Test: refreshTab re-renders when mtime changed
  it('refreshTab re-renders renderFile when mtime changed', async () => {
    let mtimeVersion = 1700000000000;
    const mockFetch = vi.fn((url) => {
      if (url.includes('/api/file/meta')) {
        return Promise.resolve({
          json: async () => ({
            requested: '/tmp/notes.md',
            resolved: '/tmp/notes.md',
            mtime: mtimeVersion,
          }),
        });
      } else if (url.includes('/api/file')) {
        return Promise.resolve({
          json: async () => ({
            requested: '/tmp/notes.md',
            resolved: '/tmp/notes.md',
            content: '# Updated Content',
          }),
        });
      }
    });
    vi.stubGlobal('fetch', mockFetch);

    const pm = new PaneManager(['pane-1']);
    await pm.openFile('pane-1', '/tmp/notes.md');
    mockFetch.mockClear();

    // Change mtime and refresh
    mtimeVersion = 1700000001000;
    await pm.refreshTab('pane-1', '/tmp/notes.md');
    expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('/api/file/meta'));
    expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('/api/file?'));
  });

  // Test: refreshTab always re-renders on first refresh (no cached mtime)
  it('refreshTab always re-renders on first refresh with no cached mtime', async () => {
    const mockFetch = vi.fn((url) => {
      if (url.includes('/api/file/meta')) {
        return Promise.resolve({
          json: async () => ({
            requested: '/tmp/notes.md',
            resolved: '/tmp/notes.md',
            mtime: 1700000000000,
          }),
        });
      } else if (url.includes('/api/file')) {
        return Promise.resolve({
          json: async () => ({
            requested: '/tmp/notes.md',
            resolved: '/tmp/notes.md',
            content: '# Hi',
          }),
        });
      }
    });
    vi.stubGlobal('fetch', mockFetch);

    const pm = new PaneManager(['pane-1']);
    const pane = pm.panes[0];
    // Manually add a tab without mtime (simulating a fresh tab)
    pane.tabManager.tabs.push({
      fileId: '/tmp/notes.md',
      renderResult: null,
    });
    mockFetch.mockClear();

    // First refresh should always render
    await pm.refreshTab('pane-1', '/tmp/notes.md');
    expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('/api/file/meta'));
    expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('/api/file?'));
  });
});
