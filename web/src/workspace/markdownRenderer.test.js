import { describe, it, expect, vi, afterEach } from 'vitest';
import { marked } from 'marked';
import * as MarkdownRenderer from './markdownRenderer.js';
import { renderDiagram } from './diagramRenderer.js';

vi.mock('./diagramRenderer.js', () => ({ renderDiagram: vi.fn() }));

// Import the toggleCheckboxContent for testing
import { toggleCheckboxContent } from './markdownRenderer.js';

describe('toggleCheckboxContent', () => {
  it('toggles checkbox in a flat list from unchecked to checked', () => {
    const content = '- [ ] task one\n- [ ] task two';
    const result = toggleCheckboxContent(content, 0, true);
    expect(result).toBe('- [x] task one\n- [ ] task two');
  });

  it('toggles checkbox in a flat list from checked to unchecked', () => {
    const content = '- [x] done task\n- [ ] pending';
    const result = toggleCheckboxContent(content, 0, false);
    expect(result).toBe('- [ ] done task\n- [ ] pending');
  });

  it('toggles the second checkbox in a flat list', () => {
    const content = '- [ ] task one\n- [ ] task two\n- [ ] task three';
    const result = toggleCheckboxContent(content, 1, true);
    expect(result).toBe('- [ ] task one\n- [x] task two\n- [ ] task three');
  });

  it('toggles checkbox in a nested list', () => {
    const content = '- [ ] parent\n  - [ ] child one\n  - [ ] child two\n- [ ] sibling';
    const result = toggleCheckboxContent(content, 1, true);
    expect(result).toBe('- [ ] parent\n  - [x] child one\n  - [ ] child two\n- [ ] sibling');
  });

  it('toggles the last checkbox in a two-child nested list', () => {
    const content = '- [ ] parent\n  - [ ] child one\n  - [ ] child two\n- [ ] sibling';
    const result = toggleCheckboxContent(content, 2, true);
    expect(result).toBe('- [ ] parent\n  - [ ] child one\n  - [x] child two\n- [ ] sibling');
  });

  it('toggles the last checkbox in a three-child nested list', () => {
    const content = '- [ ] parent\n  - [ ] child one\n  - [ ] child two\n  - [ ] child three';
    const result = toggleCheckboxContent(content, 3, true);
    expect(result).toBe('- [ ] parent\n  - [ ] child one\n  - [ ] child two\n  - [x] child three');
  });

  it('ignores decoy checkbox inside a code fence', () => {
    const content = '- [ ] real task\n\n```\n- [ ] fake checkbox\n```\n\n- [ ] another real';
    const result = toggleCheckboxContent(content, 1, true);
    expect(result).toBe('- [ ] real task\n\n```\n- [ ] fake checkbox\n```\n\n- [x] another real');
  });

  it('throws error when checkbox index is out of range', () => {
    const content = '- [ ] only one checkbox';
    expect(() => toggleCheckboxContent(content, 5, true)).toThrow(/out of range/);
  });

  it('throws error when checkbox index is negative (invalid)', () => {
    const content = '- [ ] task';
    expect(() => toggleCheckboxContent(content, -1, true)).toThrow(/out of range/);
  });
});

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
      content: '# Hello',
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
    expect(result.html).toContain('<pre');
    expect(result.html).toContain('<code');
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

  // Test: 'plantuml' alias renders as a diagram (routed to the puml engine)
  it('renders a plantuml-aliased fence via the puml engine', async () => {
    const mockFetch = vi.fn().mockResolvedValueOnce({
      json: async () => ({
        content: '```plantuml\n@startuml\nA -> B\n@enduml\n```',
      }),
    });
    vi.stubGlobal('fetch', mockFetch);
    renderDiagram.mockResolvedValueOnce('<svg puml></svg>');

    const result = await MarkdownRenderer.renderFile('/path/to/alias.md');
    expect(result.status).toBe('ok');
    expect(result.html).toContain('<svg');
    expect(renderDiagram).toHaveBeenCalledWith('puml', '@startuml\nA -> B\n@enduml');
  });

  // Test: extra text after the lang tag still resolves to a diagram
  it('renders when extra text follows the fence lang (```puml @startuml)', async () => {
    const mockFetch = vi.fn().mockResolvedValueOnce({
      json: async () => ({
        content: '```puml @startuml\nA -> B\n@enduml\n```',
      }),
    });
    vi.stubGlobal('fetch', mockFetch);
    renderDiagram.mockResolvedValueOnce('<svg puml></svg>');

    const result = await MarkdownRenderer.renderFile('/path/to/extra.md');
    expect(result.status).toBe('ok');
    expect(result.html).toContain('<svg');
    expect(renderDiagram).toHaveBeenCalledWith('puml', 'A -> B\n@enduml');
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
    expect(result.html).toContain('<pre');
    expect(result.html).toContain('<code');
    expect(renderDiagram).not.toHaveBeenCalled();
  });
});
