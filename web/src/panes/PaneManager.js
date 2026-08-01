import * as MarkdownRenderer from '../workspace/markdownRenderer.js';
import { TabManager } from './TabManager.js';

const DEFAULT_PANE_WIDTH = 50;
const MIN_PANE_WIDTH = 20;
const FULL_PANE_WIDTH = 100;

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

  async splitRight(sourcePaneId) {
    const sourceIndex = this._panes.findIndex((p) => p.id === sourcePaneId);
    const newPane = { id: `pane-${this._panes.length + 1}`, tabManager: new TabManager() };
    this._panes.splice(sourceIndex + 1, 0, newPane);
  }

  resizeDivider(paneId, deltaPx) {
    const index = this._panes.findIndex((p) => p.id === paneId);
    const pane = this._panes[index];
    const neighbor = this._panes[index + 1];
    const currentPaneWidth = pane.width ?? DEFAULT_PANE_WIDTH;
    const currentNeighborWidth = neighbor.width ?? DEFAULT_PANE_WIDTH;
    let appliedDelta = deltaPx;
    if (currentPaneWidth + appliedDelta < MIN_PANE_WIDTH) {
      appliedDelta = MIN_PANE_WIDTH - currentPaneWidth;
    } else if (currentNeighborWidth - appliedDelta < MIN_PANE_WIDTH) {
      appliedDelta = currentNeighborWidth - MIN_PANE_WIDTH;
    }
    pane.width = currentPaneWidth + appliedDelta;
    neighbor.width = currentNeighborWidth - appliedDelta;
  }

  closePane(paneId) {
    this._panes = this._panes.filter((p) => p.id !== paneId);
    if (this._panes.length === 1) {
      this._panes[0].width = FULL_PANE_WIDTH;
    }
  }
}
