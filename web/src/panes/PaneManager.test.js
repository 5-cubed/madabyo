import { describe, it, expect, vi, afterEach } from 'vitest';
import { PaneManager } from './PaneManager.js';

describe('PaneManager', () => {
  afterEach(() => vi.restoreAllMocks());

  // Helper to mock fetch for file rendering
  function mockFetchFile(...pathAndContentPairs) {
    const mockFn = vi.fn();
    for (let i = 0; i < pathAndContentPairs.length; i += 2) {
      const path = pathAndContentPairs[i];
      const content = pathAndContentPairs[i + 1];
      mockFn.mockResolvedValueOnce({
        json: async () => ({
          requested: path,
          resolved: path,
          content,
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
    mockFetchFile('/tmp/a.md', '# A', '/tmp/b.md', '# B', '/tmp/a.md', '# A Updated');
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
});
