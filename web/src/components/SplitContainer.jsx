import React, { useState } from 'react';

export default function SplitContainer({ panes, onSplit, onResize, onClosePane }) {
  const [pendingPaneId, setPendingPaneId] = useState(null);

  const handleDividerMouseDown = (paneId) => {
    const handleMouseMove = (e) => {
      onResize(paneId, e.movementX);
    };
    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <div className="split-container">
      {panes.map((pane, i) => (
        <div key={pane.id} className="split-pane">
          <button
            aria-label={`Split ${pane.id}`}
            disabled={pendingPaneId === pane.id}
            onClick={async () => {
              setPendingPaneId(pane.id);
              await onSplit(pane.id);
              setPendingPaneId(null);
            }}
          >
            Split right
          </button>
          {i < panes.length - 1 && (
            <div
              role="separator"
              aria-label={`Resize ${pane.id}`}
              className="divider"
              onMouseDown={() => handleDividerMouseDown(pane.id)}
            />
          )}
          <button
            aria-label={`Close ${pane.id}`}
            onClick={() => onClosePane(pane.id)}
          >
            Close
          </button>
        </div>
      ))}
    </div>
  );
}
