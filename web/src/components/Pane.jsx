import React from 'react';

function basename(path) {
  const idx = path.lastIndexOf('/');
  return idx === -1 ? path : path.slice(idx + 1);
}

function handlePaneClick(event, onFollowLink) {
  const anchor = event.target.closest('a')
  if (!anchor) return
  const href = anchor.getAttribute('href')
  if (!href) return
  if (/^https?:\/\//i.test(href)) {
    event.preventDefault()
    window.open(href, '_blank', 'noopener,noreferrer')
    return
  }
  if (href.startsWith('#') || /^[a-z][a-z0-9+.-]*:/i.test(href)) {
    return
  }
  event.preventDefault()
  onFollowLink(href)
}

export default function Pane({ tabs, activeTabId, onSelectTab, onCloseTab, onFollowLink }) {
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
        <div className="pane-content" onClick={(e) => handlePaneClick(e, onFollowLink)} dangerouslySetInnerHTML={{ __html: html }} />
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

  // blocked branch (link points outside workspace)
  if (status === 'blocked') {
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
        <div className="pane-error">This link points outside your workspace.</div>
      </div>
    );
  }

  return null;
}
