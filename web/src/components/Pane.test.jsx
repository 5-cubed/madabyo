import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Pane from './Pane.jsx';

describe('Pane', () => {
  // Step 16 test: empty state
  it('shows empty state when no tabs (Step 16)', () => {
    render(
      <Pane tabs={[]} activeTabId={null} onSelectTab={() => {}} onCloseTab={() => {}} />
    );
    expect(screen.getByText('No file open')).toBeInTheDocument();
  });

  // Step 18 test: render ok content
  it('renders file content when tab status is ok (Step 18)', () => {
    render(
      <Pane
        tabs={[{ fileId: 'notes.md', renderResult: { status: 'ok', html: '<h1>Hi</h1>' } }]}
        activeTabId="notes.md"
        onSelectTab={() => {}}
        onCloseTab={() => {}}
      />
    );
    expect(screen.getByRole('heading', { level: 1, name: 'Hi' })).toBeInTheDocument();
  });

  // Step 20 test: render-error state
  it('shows error message when render fails (Step 20)', () => {
    render(
      <Pane
        tabs={[{ fileId: 'bad.md', renderResult: { status: 'render-error' } }]}
        activeTabId="bad.md"
        onSelectTab={() => {}}
        onCloseTab={() => {}}
      />
    );
    expect(screen.getByText('This file could not be rendered.')).toBeInTheDocument();
    expect(screen.queryByRole('heading')).not.toBeInTheDocument();
  });

  // Step 24 test: not-found state
  it('shows not-found message when file is missing (Step 24)', () => {
    render(
      <Pane
        tabs={[{ fileId: 'gone.md', renderResult: { status: 'not-found' } }]}
        activeTabId="gone.md"
        onSelectTab={() => {}}
        onCloseTab={() => {}}
      />
    );
    expect(screen.getByText('This file could not be found.')).toBeInTheDocument();
    expect(screen.queryByRole('heading')).not.toBeInTheDocument();
    expect(screen.queryByText('This file could not be rendered.')).not.toBeInTheDocument();
  });

  // Step 27 test: tab-bar highlighting
  it('marks active tab and shows non-active tabs (Step 27)', () => {
    render(
      <Pane
        tabs={[
          { fileId: 'a.md', renderResult: { status: 'ok', html: '<h1>A</h1>' } },
          { fileId: 'b.md', renderResult: { status: 'ok', html: '<h1>B</h1>' } },
        ]}
        activeTabId="a.md"
        onSelectTab={() => {}}
        onCloseTab={() => {}}
      />
    );
    expect(screen.getByRole('tab', { name: 'a.md' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'b.md' })).toHaveAttribute('aria-selected', 'false');
  });

  // Step 29 test: tab-click fires onSelectTab
  it('calls onSelectTab when clicking a tab (Step 29)', () => {
    const onSelectTabSpy = vi.fn();
    render(
      <Pane
        tabs={[
          { fileId: 'a.md', renderResult: { status: 'ok', html: '<h1>A</h1>' } },
          { fileId: 'b.md', renderResult: { status: 'ok', html: '<h1>B</h1>' } },
        ]}
        activeTabId="a.md"
        onSelectTab={onSelectTabSpy}
        onCloseTab={() => {}}
      />
    );
    fireEvent.click(screen.getByRole('tab', { name: 'b.md' }));
    expect(onSelectTabSpy).toHaveBeenCalledOnce();
    expect(onSelectTabSpy).toHaveBeenCalledWith('b.md');
  });

  // Step 33 test: close button presence
  it('shows close button for each tab (Step 33)', () => {
    render(
      <Pane
        tabs={[
          { fileId: 'a.md', renderResult: { status: 'ok', html: '<h1>A</h1>' } },
          { fileId: 'b.md', renderResult: { status: 'ok', html: '<h1>B</h1>' } },
        ]}
        activeTabId="a.md"
        onSelectTab={() => {}}
        onCloseTab={() => {}}
      />
    );
    expect(screen.getByRole('button', { name: 'Close a.md' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Close b.md' })).toBeInTheDocument();
  });

  // Step 35 test: close-click fires onCloseTab
  it('calls onCloseTab when clicking close button (Step 35)', () => {
    const onCloseTabSpy = vi.fn();
    render(
      <Pane
        tabs={[
          { fileId: 'a.md', renderResult: { status: 'ok', html: '<h1>A</h1>' } },
          { fileId: 'b.md', renderResult: { status: 'ok', html: '<h1>B</h1>' } },
        ]}
        activeTabId="a.md"
        onSelectTab={() => {}}
        onCloseTab={onCloseTabSpy}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Close b.md' }));
    expect(onCloseTabSpy).toHaveBeenCalledOnce();
    expect(onCloseTabSpy).toHaveBeenCalledWith('b.md');
  });
});
