import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SplitContainer from './SplitContainer';

describe('SplitContainer', () => {
  // Step 5 test: SEQ-018 split-trigger (single click with pending-state guard)
  it('disables split trigger while onSplit promise is pending (Step 5)', async () => {
    let resolveSplit;
    const onSplit = vi.fn(
      () =>
        new Promise((resolve) => {
          resolveSplit = resolve;
        })
    );
    const panes = [{ id: 'pane-1', tabManager: {} }];
    render(
      <SplitContainer
        panes={panes}
        onSplit={onSplit}
        onResize={() => {}}
        onClosePane={() => {}}
      />
    );
    const button = screen.getByRole('button', { name: 'Split pane-1' });
    fireEvent.click(button);
    expect(onSplit).toHaveBeenCalledTimes(1);
    expect(onSplit).toHaveBeenCalledWith('pane-1');
    expect(button).toBeDisabled();
    resolveSplit();
    await waitFor(() => expect(button).not.toBeDisabled());
  });

  // Step 9 test: SEQ-019 divider skeleton (one divider between panes, not one per pane)
  it('renders exactly one divider between two panes (Step 9)', () => {
    const panes = [
      { id: 'pane-1', tabManager: {} },
      { id: 'pane-2', tabManager: {} },
    ];
    render(
      <SplitContainer
        panes={panes}
        onSplit={() => {}}
        onResize={() => {}}
        onClosePane={() => {}}
      />
    );
    expect(screen.getByRole('separator', { name: 'Resize pane-1' })).toBeInTheDocument();
    expect(screen.queryByRole('separator', { name: 'Resize pane-2' })).toBeNull();
  });

  // Step 11 test: SEQ-019 drag wiring (mousemove fires onResize with paneId and movementX)
  it('fires onResize on divider drag with paneId and movementX (Step 11)', () => {
    const onResize = vi.fn();
    const panes = [
      { id: 'pane-1', tabManager: {} },
      { id: 'pane-2', tabManager: {} },
    ];
    render(
      <SplitContainer
        panes={panes}
        onSplit={() => {}}
        onResize={onResize}
        onClosePane={() => {}}
      />
    );
    const divider = screen.getByRole('separator', { name: 'Resize pane-1' });
    fireEvent.mouseDown(divider);

    // Create and dispatch a mousemove event with movementX property
    const moveEvent1 = new MouseEvent('mousemove');
    Object.defineProperty(moveEvent1, 'movementX', { value: 15 });
    window.dispatchEvent(moveEvent1);
    expect(onResize).toHaveBeenCalledWith('pane-1', 15);

    const moveEvent2 = new MouseEvent('mousemove');
    Object.defineProperty(moveEvent2, 'movementX', { value: -5 });
    window.dispatchEvent(moveEvent2);
    expect(onResize).toHaveBeenCalledTimes(2);
    expect(onResize).toHaveBeenLastCalledWith('pane-1', -5);

    fireEvent.mouseUp(window);

    const moveEvent3 = new MouseEvent('mousemove');
    Object.defineProperty(moveEvent3, 'movementX', { value: 100 });
    window.dispatchEvent(moveEvent3);
    expect(onResize).toHaveBeenCalledTimes(2);
  });

  // Step 15 test: SEQ-021 close-control skeleton (one close button per pane)
  it('renders a close button for each pane (Step 15)', () => {
    const panes = [
      { id: 'pane-1', tabManager: {} },
      { id: 'pane-2', tabManager: {} },
    ];
    render(
      <SplitContainer
        panes={panes}
        onSplit={() => {}}
        onResize={() => {}}
        onClosePane={() => {}}
      />
    );
    expect(screen.getByRole('button', { name: 'Close pane-1' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Close pane-2' })).toBeInTheDocument();
  });

  // Step 17 test: SEQ-021 close click wiring (click close button calls onClosePane with paneId)
  it('calls onClosePane with paneId when close button is clicked (Step 17)', () => {
    const onClosePane = vi.fn();
    const panes = [
      { id: 'pane-1', tabManager: {} },
      { id: 'pane-2', tabManager: {} },
    ];
    render(
      <SplitContainer
        panes={panes}
        onSplit={() => {}}
        onResize={() => {}}
        onClosePane={onClosePane}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Close pane-2' }));
    expect(onClosePane).toHaveBeenCalledTimes(1);
    expect(onClosePane).toHaveBeenCalledWith('pane-2');
  });

  // Step 19 test: SEQ-022 rapid-double-split proving test
  it('blocks second split click while first is pending (Step 19 - SEQ-022)', async () => {
    let resolveSplit;
    const onSplit = vi.fn(
      () =>
        new Promise((resolve) => {
          resolveSplit = resolve;
        })
    );
    const panes = [{ id: 'pane-1', tabManager: {} }];
    render(
      <SplitContainer
        panes={panes}
        onSplit={onSplit}
        onResize={() => {}}
        onClosePane={() => {}}
      />
    );
    const button = screen.getByRole('button', { name: 'Split pane-1' });
    // Two rapid clicks before the promise resolves
    fireEvent.click(button);
    fireEvent.click(button);
    // onSplit should have been called only once; the second click didn't reach it
    expect(onSplit).toHaveBeenCalledTimes(1);
    resolveSplit();
    await waitFor(() => expect(button).not.toBeDisabled());
  });
});
