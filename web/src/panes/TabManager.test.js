import { describe, it, expect } from 'vitest';
import { TabManager } from './TabManager.js';

describe('TabManager', () => {
  // Step 5 test: basic openTab
  it('opens a tab and sets it active (Step 5)', () => {
    const tm = new TabManager();
    tm.openTab('notes.md', { status: 'ok', html: '<h1>Hi</h1>' });
    expect(tm.tabs).toEqual([
      { fileId: 'notes.md', renderResult: { status: 'ok', html: '<h1>Hi</h1>' } },
    ]);
    expect(tm.activeTabId).toBe('notes.md');
  });

  // Step 7 test: dedup guard
  it('does not create duplicate entries when opening an already-open file (Step 7)', () => {
    const tm = new TabManager();
    tm.openTab('a.md', { status: 'ok', html: '<h1>A</h1>' });
    tm.openTab('b.md', { status: 'ok', html: '<h1>B</h1>' });
    tm.openTab('a.md', { status: 'ok', html: '<h1>A again</h1>' });
    expect(tm.tabs).toHaveLength(2);
    expect(tm.tabs[0].renderResult.html).toBe('<h1>A</h1>');
    expect(tm.activeTabId).toBe('a.md');
  });

  // Step 9 test: focusTab
  it('focuses an existing tab without modifying tabs array (Step 9)', () => {
    const tm = new TabManager();
    tm.openTab('a.md', { status: 'ok', html: '<h1>A</h1>' });
    tm.openTab('b.md', { status: 'ok', html: '<h1>B</h1>' });
    tm.focusTab('a.md');
    expect(tm.activeTabId).toBe('a.md');
    expect(tm.tabs).toHaveLength(2);
  });

  // Test: updateTabResult
  it('updates a tab result in place without changing order or activeTabId', () => {
    const tm = new TabManager();
    tm.openTab('a.md', { status: 'ok', html: '<h1>A</h1>' });
    tm.openTab('b.md', { status: 'ok', html: '<h1>B</h1>' });
    const newResult = { status: 'ok', html: '<h1>A Updated</h1>' };
    tm.updateTabResult('a.md', newResult);
    expect(tm.tabs[0].renderResult).toEqual(newResult);
    expect(tm.activeTabId).toBe('b.md');
    expect(tm.tabs).toHaveLength(2);
  });

  it('is a no-op when fileId not found', () => {
    const tm = new TabManager();
    tm.openTab('a.md', { status: 'ok', html: '<h1>A</h1>' });
    tm.updateTabResult('missing.md', { status: 'ok', html: '<h1>X</h1>' });
    expect(tm.tabs[0].renderResult.html).toBe('<h1>A</h1>');
  });

  // Step 31 test scenarios (SEQ-015 + SEQ-016)
  describe('closeTab', () => {
    // Scenario 1: closing non-active tab
    it('removes non-active tab and leaves activeTabId unchanged (Step 31 scenario 1)', () => {
      const tm = new TabManager();
      tm.openTab('a.md', { status: 'ok', html: '<h1>A</h1>' });
      tm.openTab('b.md', { status: 'ok', html: '<h1>B</h1>' });
      tm.closeTab('a.md');
      expect(tm.tabs).toEqual([
        { fileId: 'b.md', renderResult: { status: 'ok', html: '<h1>B</h1>' } },
      ]);
      expect(tm.activeTabId).toBe('b.md');
    });

    // Scenario 2: closing active tab with left neighbor (SEQ-016 left-neighbor case)
    it('activates left neighbor when closing active tab (Step 31 scenario 2)', () => {
      const tm = new TabManager();
      tm.openTab('a.md', { status: 'ok', html: '<h1>A</h1>' });
      tm.openTab('b.md', { status: 'ok', html: '<h1>B</h1>' });
      tm.openTab('c.md', { status: 'ok', html: '<h1>C</h1>' });
      tm.closeTab('c.md');
      expect(tm.tabs.map((t) => t.fileId)).toEqual(['a.md', 'b.md']);
      expect(tm.activeTabId).toBe('b.md');
    });

    // Scenario 3: closing leftmost active tab (SEQ-016 no-left-neighbor case)
    it('activates right neighbor when closing leftmost tab (Step 31 scenario 3)', () => {
      const tm = new TabManager();
      tm.openTab('a.md', { status: 'ok', html: '<h1>A</h1>' });
      tm.openTab('b.md', { status: 'ok', html: '<h1>B</h1>' });
      tm.focusTab('a.md');
      tm.closeTab('a.md');
      expect(tm.tabs.map((t) => t.fileId)).toEqual(['b.md']);
      expect(tm.activeTabId).toBe('b.md');
    });
  });
});
