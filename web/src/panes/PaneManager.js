import * as MarkdownRenderer from '../workspace/markdownRenderer.js';
import { TabManager } from './TabManager.js';

export class PaneManager {
  constructor(paneIds) {
    this._panes = paneIds.map((id) => ({ id, tabManager: new TabManager() }));
  }

  get panes() {
    return this._panes;
  }

  async openFile(paneId, fileHandle) {
    const pane = this._panes.find((p) => p.id === paneId);
    const fileId = fileHandle.name;

    const existing = pane.tabManager.tabs.find((t) => t.fileId === fileId);
    if (existing) {
      pane.tabManager.focusTab(fileId);
      return;
    }
    const result = await MarkdownRenderer.renderFile(fileHandle);
    pane.tabManager.openTab(fileId, result);
  }
}
