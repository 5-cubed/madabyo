import { describe, it, expect, vi, afterEach } from 'vitest';
import { marked } from 'marked';
import * as MarkdownRenderer from './markdownRenderer.js';
import { renderDiagram } from './diagramRenderer.js';

vi.mock('./diagramRenderer.js', () => ({ renderDiagram: vi.fn() }));

describe('MarkdownRenderer', () => {
  afterEach(() => vi.restoreAllMocks());

  // Test: basic rendering with ok content
  it('renders a simple markdown file', async () => {
    const mockFetch = vi.fn().mockResolvedValueOnce({
      json: async () => ({
        requested: '/path/to/notes.md',
        resolved: '/path/to/notes.md',
        content: '# Hello',
      }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const result = await MarkdownRenderer.renderFile('/path/to/notes.md');
    expect(result).toEqual({
      status: 'ok',
      html: expect.stringContaining('<h1>Hello</h1>'),
    });
    expect(mockFetch).toHaveBeenCalledWith(
      `/api/file?path=${encodeURIComponent('/path/to/notes.md')}`
    );
  });

  // Test: rendering with headings, lists, and code blocks
  it('renders markdown with headings, lists, and code blocks', async () => {
    const mockFetch = vi.fn().mockResolvedValueOnce({
      json: async () => ({
        content: '## Section\n\n- item\n\n```js\ncode()\n```',
      }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const result = await MarkdownRenderer.renderFile('/path/to/guide.md');
    expect(result.status).toBe('ok');
    expect(result.html).toContain('<h2>Section</h2>');
    expect(result.html).toContain('<li>item</li>');
    expect(result.html).toContain('<pre><code');
  });

  // Test: render-error for parser exception
  it('resolves to render-error when parser throws', async () => {
    const mockFetch = vi.fn().mockResolvedValueOnce({
      json: async () => ({
        content: '# whatever',
      }),
    });
    vi.stubGlobal('fetch', mockFetch);
    vi.spyOn(marked, 'parse').mockImplementationOnce(() => {
      throw new Error('malformed input');
    });

    const result = await MarkdownRenderer.renderFile('/path/to/broken.md');
    expect(result).toEqual({ status: 'render-error' });
  });

  // Test: not-found for envelope error
  it('resolves to not-found when envelope has error', async () => {
    const mockFetch = vi.fn().mockResolvedValueOnce({
      json: async () => ({
        requested: '/path/to/missing.md',
        error: 'file not found',
      }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const result = await MarkdownRenderer.renderFile('/path/to/missing.md');
    expect(result).toEqual({ status: 'not-found' });
  });

  // Test: not-found for network error
  it('resolves to not-found when fetch throws', async () => {
    const mockFetch = vi.fn().mockRejectedValueOnce(new Error('network error'));
    vi.stubGlobal('fetch', mockFetch);

    const result = await MarkdownRenderer.renderFile('/path/to/network-fail.md');
    expect(result).toEqual({ status: 'not-found' });
  });

  // Test: mermaid and puml fences both produce SVG-bearing output
  it('renders mermaid and puml fences as SVG diagrams', async () => {
    const mockFetch = vi.fn().mockResolvedValueOnce({
      json: async () => ({
        content: '# Title\n\n```mermaid\ngraph LR\nA --> B\n```\n\n```puml\n@startuml\nA -> B\n@enduml\n```',
      }),
    });
    vi.stubGlobal('fetch', mockFetch);
    renderDiagram.mockResolvedValueOnce('<svg mermaid></svg>');
    renderDiagram.mockResolvedValueOnce('<svg puml></svg>');

    const result = await MarkdownRenderer.renderFile('/path/to/diagrams.md');
    expect(result.status).toBe('ok');
    expect(result.html).toContain('<svg');
    expect(result.html).toContain('diagram');
  });

  // Test: error isolation — one failed diagram doesn't blank the rest
  it('handles diagram errors without blanking the rest of the document', async () => {
    const mockFetch = vi.fn().mockResolvedValueOnce({
      json: async () => ({
        content: '# Heading\n\n```mermaid\nbad diagram\n```\n\n```puml\n@startuml\nA -> B\n@enduml\n```\n\nTrailing text.',
      }),
    });
    vi.stubGlobal('fetch', mockFetch);
    renderDiagram.mockRejectedValueOnce(new Error('bad diagram'));
    renderDiagram.mockResolvedValueOnce('<svg puml></svg>');

    const result = await MarkdownRenderer.renderFile('/path/to/mixed.md');
    expect(result.status).toBe('ok');
    expect(result.html).toContain('Heading');
    expect(result.html).toContain('diagram-error');
    expect(result.html).toContain('bad diagram'); // raw source in error
    expect(result.html).toContain('<svg');
    expect(result.html).toContain('Trailing text');
  });

  // Test: a non-Error rejection (e.g. a raw string) must not blank the document.
  // Guards the real failure shape: @plantuml/core's onError delivers a plain string.
  it('survives a diagram rejection that is a bare string, not an Error', async () => {
    const mockFetch = vi.fn().mockResolvedValueOnce({
      json: async () => ({
        content: '# Heading\n\n```puml\n@startuml\nbad\n@enduml\n```\n\nTrailing text.',
      }),
    });
    vi.stubGlobal('fetch', mockFetch);
    renderDiagram.mockRejectedValueOnce('raw string failure');

    const result = await MarkdownRenderer.renderFile('/path/to/string-err.md');
    expect(result.status).toBe('ok');
    expect(result.html).toContain('Heading');
    expect(result.html).toContain('diagram-error');
    expect(result.html).toContain('raw string failure');
    expect(result.html).toContain('Trailing text');
  });

  // Test: non-diagram code fences pass through unchanged
  it('does not call renderDiagram for non-diagram code fences', async () => {
    const mockFetch = vi.fn().mockResolvedValueOnce({
      json: async () => ({
        content: '```js\ncode()\n```',
      }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const result = await MarkdownRenderer.renderFile('/path/to/code.md');
    expect(result.status).toBe('ok');
    expect(result.html).toContain('<pre><code');
    expect(renderDiagram).not.toHaveBeenCalled();
  });
});
