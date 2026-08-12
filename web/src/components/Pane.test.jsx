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

  it('keeps rendered details DOM intact when rerendered with the same render result', () => {
    const tabs = [
      {
        fileId: 'notes.md',
        renderResult: { status: 'ok', html: '<details><summary>s</summary>body</details>' },
      },
    ];
    const { container, rerender } = render(
      <Pane
        tabs={tabs}
        activeTabId="notes.md"
        onSelectTab={() => {}}
        onCloseTab={() => {}}
      />
    );

    const detailsEl = container.querySelector('details');
    detailsEl.open = true;

    rerender(
      <Pane
        tabs={tabs}
        activeTabId="notes.md"
        onSelectTab={() => {}}
        onCloseTab={() => {}}
      />
    );

    expect(container.querySelector('details')).toBe(detailsEl);
    expect(detailsEl.open).toBe(true);
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

  // Regression: fileId is a full path (Step 13); intent.md requires the tab
  // label to display the basename only, while selection/close still use the
  // full path so tabs from different folders with the same basename don't collide.
  it('displays only the basename in the tab label and close button, but keys/handlers on the full path', () => {
    const onSelectTabSpy = vi.fn();
    const onCloseTabSpy = vi.fn();
    render(
      <Pane
        tabs={[
          { fileId: '/repo/docs/notes.md', renderResult: { status: 'ok', html: '<h1>A</h1>' } },
          { fileId: '/repo/other/notes.md', renderResult: { status: 'ok', html: '<h1>B</h1>' } },
        ]}
        activeTabId="/repo/docs/notes.md"
        onSelectTab={onSelectTabSpy}
        onCloseTab={onCloseTabSpy}
      />
    );

    const tabs = screen.getAllByRole('tab', { name: 'notes.md' });
    expect(tabs).toHaveLength(2);
    expect(screen.queryByText('/repo/docs/notes.md')).not.toBeInTheDocument();
    expect(screen.queryByText('/repo/other/notes.md')).not.toBeInTheDocument();

    fireEvent.click(tabs[1]);
    expect(onSelectTabSpy).toHaveBeenCalledWith('/repo/other/notes.md');

    const closeButtons = screen.getAllByRole('button', { name: 'Close notes.md' });
    fireEvent.click(closeButtons[1]);
    expect(onCloseTabSpy).toHaveBeenCalledWith('/repo/other/notes.md');
  });

  // Link following: relative markdown link
  it('calls onFollowLink when clicking a relative markdown link', () => {
    const onFollowLinkSpy = vi.fn();
    render(
      <Pane
        tabs={[{ fileId: 'notes.md', renderResult: { status: 'ok', html: '<a href="other.md">x</a>' } }]}
        activeTabId="notes.md"
        onSelectTab={() => {}}
        onCloseTab={() => {}}
        onFollowLink={onFollowLinkSpy}
      />
    );
    fireEvent.click(screen.getByRole('link'));
    expect(onFollowLinkSpy).toHaveBeenCalledOnce();
    expect(onFollowLinkSpy).toHaveBeenCalledWith('other.md');
  });

  // Link following: external HTTPS link
  it('opens external HTTPS link in new window without calling onFollowLink', () => {
    const onFollowLinkSpy = vi.fn();
    const windowOpenSpy = vi.spyOn(window, 'open').mockReturnValue(null);
    render(
      <Pane
        tabs={[{ fileId: 'notes.md', renderResult: { status: 'ok', html: '<a href="https://example.com">x</a>' } }]}
        activeTabId="notes.md"
        onSelectTab={() => {}}
        onCloseTab={() => {}}
        onFollowLink={onFollowLinkSpy}
      />
    );
    fireEvent.click(screen.getByRole('link'));
    expect(windowOpenSpy).toHaveBeenCalledWith('https://example.com', '_blank', 'noopener,noreferrer');
    expect(onFollowLinkSpy).not.toHaveBeenCalled();
    windowOpenSpy.mockRestore();
  });

  // Link following: mailto and anchor links
  it('does nothing for mailto and same-page anchor links', () => {
    const onFollowLinkSpy = vi.fn();
    const windowOpenSpy = vi.spyOn(window, 'open').mockReturnValue(null);
    render(
      <Pane
        tabs={[{ fileId: 'notes.md', renderResult: { status: 'ok', html: '<a href="mailto:a@b.com">mail</a><a href="#section">anchor</a>' } }]}
        activeTabId="notes.md"
        onSelectTab={() => {}}
        onCloseTab={() => {}}
        onFollowLink={onFollowLinkSpy}
      />
    );
    fireEvent.click(screen.getByRole('link', { name: 'mail' }));
    fireEvent.click(screen.getByRole('link', { name: 'anchor' }));
    expect(onFollowLinkSpy).not.toHaveBeenCalled();
    expect(windowOpenSpy).not.toHaveBeenCalled();
    windowOpenSpy.mockRestore();
  });
});
