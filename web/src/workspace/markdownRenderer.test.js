import { describe, it, expect, vi, afterEach } from 'vitest';
import { marked } from 'marked';
import * as MarkdownRenderer from './markdownRenderer.js';

function fakeFileHandle(name, content) {
  return {
    kind: 'file',
    name,
    async getFile() {
      return {
        text: async () => content,
      };
    },
  };
}

function fakeMissingFileHandle(name) {
  return {
    kind: 'file',
    name,
    async getFile() {
      throw new DOMException(
        'A requested file or directory could not be found',
        'NotFoundError'
      );
    },
  };
}

describe('MarkdownRenderer', () => {
  afterEach(() => vi.restoreAllMocks());

  // Step 2 test: basic rendering
  it('renders a simple markdown file (Step 2)', async () => {
    const handle = fakeFileHandle('notes.md', '# Hello');
    const result = await MarkdownRenderer.renderFile(handle);
    expect(result).toEqual({
      status: 'ok',
      html: expect.stringContaining('<h1>Hello</h1>'),
    });
  });

  // Step 4 test: regression check for headings, lists, code blocks
  it('renders markdown with headings, lists, and code blocks (Step 4)', async () => {
    const handle = fakeFileHandle(
      'guide.md',
      '## Section\n\n- item\n\n```js\ncode()\n```'
    );
    const result = await MarkdownRenderer.renderFile(handle);
    expect(result.status).toBe('ok');
    expect(result.html).toContain('<h2>Section</h2>');
    expect(result.html).toContain('<li>item</li>');
    expect(result.html).toContain('<pre><code');
  });

  // Step 14 test: render-error for parser exception
  it('resolves to render-error when parser throws (Step 14)', async () => {
    vi.spyOn(marked, 'parse').mockImplementationOnce(() => {
      throw new Error('malformed input');
    });
    const handle = fakeFileHandle('broken.md', '# whatever');
    const result = await MarkdownRenderer.renderFile(handle);
    expect(result).toEqual({ status: 'render-error' });
  });

  // Step 22 test: not-found for missing file
  it('resolves to not-found when file is missing (Step 22)', async () => {
    const handle = fakeMissingFileHandle('gone.md');
    const result = await MarkdownRenderer.renderFile(handle);
    expect(result).toEqual({ status: 'not-found' });
  });
});
