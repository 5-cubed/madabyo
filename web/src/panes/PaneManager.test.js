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
});
