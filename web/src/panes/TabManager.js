export class TabManager {
  constructor() {
    this._tabs = [];
    this._activeTabId = null;
    this._scrollPositions = new Map();
  }

  get tabs() {
    return this._tabs;
  }

  get activeTabId() {
    return this._activeTabId;
  }

  openTab(fileId, renderResult, mtime) {
    const existing = this._tabs.find((t) => t.fileId === fileId);
    if (existing) {
      this.focusTab(fileId);
      return;
    }

    this._tabs.push({ fileId, renderResult, mtime });
    this._scrollPositions.set(fileId, 0);
    this._activeTabId = fileId;
  }

  focusTab(fileId) {
    this._activeTabId = fileId;
  }

  updateTabResult(fileId, renderResult, mtime) {
    const tab = this._tabs.find((t) => t.fileId === fileId);
    if (tab) {
      tab.renderResult = renderResult;
      tab.mtime = mtime;
    }
  }

  getScrollPosition(fileId) {
    return this._scrollPositions.get(fileId) ?? 0;
  }

  setScrollPosition(fileId, position) {
    if (this._tabs.some((tab) => tab.fileId === fileId)) {
      this._scrollPositions.set(fileId, position);
    }
  }

  closeTab(fileId) {
    const closedIndex = this._tabs.findIndex((t) => t.fileId === fileId);
    this._tabs = this._tabs.filter((t) => t.fileId !== fileId);
    this._scrollPositions.delete(fileId);

    if (this._activeTabId === fileId) {
      if (this._tabs.length > 0) {
        const newIndex = closedIndex > 0 ? closedIndex - 1 : 0;
        this._activeTabId = this._tabs[newIndex].fileId;
      } else {
        this._activeTabId = null;
      }
    }
  }
}
