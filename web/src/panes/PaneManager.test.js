import { describe, it, expect } from 'vitest';
import { PaneManager } from './PaneManager.js';

function fakeFileHandle(name, content) {
  return {
    kind: 'file',
    name,
    async getFile() {
      return {
        text: async () => content,
      };
    },
  };
}

describe('PaneManager', () => {
  // Step 11 test: openFile with rendering
  it('renders a new file and opens it in a tab (Step 11)', async () => {
    const pm = new PaneManager(['pane-1']);
    await pm.openFile('pane-1', fakeFileHandle('notes.md', '# Hi'));
    const pane = pm.panes.find((p) => p.id === 'pane-1');
    expect(pane.tabManager.tabs).toEqual([
      {
        fileId: 'notes.md',
        renderResult: { status: 'ok', html: expect.stringContaining('<h1>Hi</h1>') },
      },
    ]);
    expect(pane.tabManager.activeTabId).toBe('notes.md');
  });

  // Step 13 test: check-then-dispatch behavior
  it('focuses existing tab instead of re-rendering when file is already open (Step 13)', async () => {
    const pm = new PaneManager(['pane-1']);
    await pm.openFile('pane-1', fakeFileHandle('notes.md', '# Hi'));
    await pm.openFile('pane-1', fakeFileHandle('other.md', '# Other'));
    await pm.openFile('pane-1', fakeFileHandle('notes.md', '# Hi Again'));
    const pane = pm.panes.find((p) => p.id === 'pane-1');
    expect(pane.tabManager.tabs).toHaveLength(2);
    expect(pane.tabManager.tabs[0].renderResult.html).toContain('<h1>Hi</h1>');
    expect(pane.tabManager.activeTabId).toBe('notes.md');
  });

  // Step 26 test: multiple distinct files in order (SEQ-013)
  it('opens multiple distinct files in tab order (Step 26 - SEQ-013)', async () => {
    const pm = new PaneManager(['pane-1']);
    await pm.openFile('pane-1', fakeFileHandle('a.md', '# A'));
    await pm.openFile('pane-1', fakeFileHandle('b.md', '# B'));
    await pm.openFile('pane-1', fakeFileHandle('c.md', '# C'));
    const pane = pm.panes.find((p) => p.id === 'pane-1');
    expect(pane.tabManager.tabs.length).toBe(3);
    expect(pane.tabManager.tabs.map((t) => t.fileId)).toEqual(['a.md', 'b.md', 'c.md']);
  });

  // Step 7 test: resizeDivider with 4 scenarios (SEQ-019, revised for SEQ-020)
  it('resizes panes, with default width and min-width clamp - scenario 1 (Step 7)', async () => {
    const pm = new PaneManager(['pane-1']);
    await pm.openFile('pane-1', fakeFileHandle('notes.md', '# Hi'));
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
    expect(paneA.tabManager.activeTabId).toBe('notes.md');
  });

  it('clamps pane to MIN_PANE_WIDTH when shrinking pane-side (Step 7, scenario 2)', async () => {
    const pm = new PaneManager(['pane-1']);
    await pm.splitRight('pane-1');
    pm.resizeDivider('pane-1', -1000);
    expect(pm.panes[0].width).toBe(20);
    expect(pm.panes[1].width).toBe(80);
    expect(pm.panes[0].width + pm.panes[1].width).toBe(100);
  });

  it('clamps neighbor to MIN_PANE_WIDTH when shrinking neighbor-side (Step 7, scenario 3)', async () => {
    const pm = new PaneManager(['pane-1']);
    await pm.splitRight('pane-1');
    pm.resizeDivider('pane-1', 1000);
    expect(pm.panes[1].width).toBe(20);
    expect(pm.panes[0].width).toBe(80);
  });

  it('repeated resize past clamp point stays pinned (Step 7, scenario 4)', async () => {
    const pm = new PaneManager(['pane-1']);
    await pm.splitRight('pane-1');
    pm.resizeDivider('pane-1', -1000);
    pm.resizeDivider('pane-1', -50);
    expect(pm.panes[0].width).toBe(20);
    expect(pm.panes[1].width).toBe(80);
  });

  // Step 13 test: closePane (SEQ-021)
  it('closes a pane and expands the survivor to full width (Step 13)', async () => {
    const pm = new PaneManager(['pane-1']);
    await pm.openFile('pane-1', fakeFileHandle('notes.md', '# Hi'));
    await pm.splitRight('pane-1');
    const [paneA] = pm.panes;
    const tabManagerBefore = paneA.tabManager;
    pm.closePane('pane-2');
    expect(pm.panes).toHaveLength(1);
    expect(pm.panes[0].id).toBe('pane-1');
    expect(pm.panes[0].tabManager).toBe(tabManagerBefore);
    expect(pm.panes[0].tabManager.tabs).toHaveLength(1);
    expect(pm.panes[0].tabManager.activeTabId).toBe('notes.md');
    expect(pm.panes[0].width).toBe(100);
  });
});
