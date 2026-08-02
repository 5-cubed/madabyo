import { describe, it, expect, vi, afterEach } from 'vitest';
import { marked } from 'marked';
import * as MarkdownRenderer from './markdownRenderer.js';

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
});
