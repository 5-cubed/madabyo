export class TabManager {
  constructor() {
    this._tabs = [];
    this._activeTabId = null;
  }

  get tabs() {
    return this._tabs;
  }

  get activeTabId() {
    return this._activeTabId;
  }

  openTab(fileId, renderResult) {
    const existing = this._tabs.find((t) => t.fileId === fileId);
    if (existing) {
      this.focusTab(fileId);
      return;
    }

    this._tabs.push({ fileId, renderResult });
    this._activeTabId = fileId;
  }

  focusTab(fileId) {
    this._activeTabId = fileId;
  }

  closeTab(fileId) {
    const closedIndex = this._tabs.findIndex((t) => t.fileId === fileId);
    this._tabs = this._tabs.filter((t) => t.fileId !== fileId);

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
