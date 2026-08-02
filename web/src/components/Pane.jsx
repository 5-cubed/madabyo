import React from 'react';

function basename(path) {
  const idx = path.lastIndexOf('/');
  return idx === -1 ? path : path.slice(idx + 1);
}

export default function Pane({ tabs, activeTabId, onSelectTab, onCloseTab }) {
  const activeTab = tabs.find((t) => t.fileId === activeTabId);

  // Empty state
  if (!activeTab) {
    return <div className="pane-empty">No file open</div>;
  }

  const { status, html } = activeTab.renderResult;

  // Step 19: ok branch (working code)
  if (status === 'ok') {
    return (
      <div className="pane">
        <div role="tablist" className="tab-bar">
          {tabs.map((tab) => (
            <span key={tab.fileId} className="tab-item">
              <button
                role="tab"
                aria-selected={tab.fileId === activeTabId}
                onClick={() => onSelectTab(tab.fileId)}
              >
                {basename(tab.fileId)}
              </button>
              <button
                aria-label={`Close ${basename(tab.fileId)}`}
                onClick={() => onCloseTab(tab.fileId)}
              >
                ×
              </button>
            </span>
          ))}
        </div>
        <div className="pane-content" dangerouslySetInnerHTML={{ __html: html }} />
      </div>
    );
  }

  // Step 21: render-error branch (has hole)
  if (status === 'render-error') {
    return (
      <div className="pane">
        <div role="tablist" className="tab-bar">
          {tabs.map((tab) => (
            <span key={tab.fileId} className="tab-item">
              <button
                role="tab"
                aria-selected={tab.fileId === activeTabId}
                onClick={() => onSelectTab(tab.fileId)}
              >
                {basename(tab.fileId)}
              </button>
              <button
                aria-label={`Close ${basename(tab.fileId)}`}
                onClick={() => onCloseTab(tab.fileId)}
              >
                ×
              </button>
            </span>
          ))}
        </div>
        <div className="pane-error">This file could not be rendered.</div>
      </div>
    );
  }

  // Step 25: not-found branch (working code, full implementation)
  if (status === 'not-found') {
    return (
      <div className="pane">
        <div role="tablist" className="tab-bar">
          {tabs.map((tab) => (
            <span key={tab.fileId} className="tab-item">
              <button
                role="tab"
                aria-selected={tab.fileId === activeTabId}
                onClick={() => onSelectTab(tab.fileId)}
              >
                {basename(tab.fileId)}
              </button>
              <button
                aria-label={`Close ${basename(tab.fileId)}`}
                onClick={() => onCloseTab(tab.fileId)}
              >
                ×
              </button>
            </span>
          ))}
        </div>
        <div className="pane-error">This file could not be found.</div>
      </div>
    );
  }

  return null;
}
