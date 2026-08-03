import { marked } from 'marked';
import { renderDiagram } from './diagramRenderer.js';

// Minimal HTML escape for error messages and raw diagram source
function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
  };
  return text.replace(/[&<>]/g, (char) => map[char]);
}

// Register marked extension once at module scope
marked.use({
  async: true,
  walkTokens: async (token) => {
    if (token.type === 'code' && ['mermaid', 'puml'].includes(token.lang)) {
      try {
        const svg = await renderDiagram(token.lang, token.text);
        token.type = 'html';
        token.text = `<div class="diagram">${svg}</div>`;
      } catch (err) {
        token.type = 'html';
        token.text = `<div class="diagram-error"><p>${escapeHtml(err.message)}</p><pre>${escapeHtml(token.text)}</pre></div>`;
      }
    }
  },
});

export async function renderFile(path) {
  let text;

  // Fetch file content from /api/file endpoint
  try {
    const res = await fetch(`/api/file?path=${encodeURIComponent(path)}`);
    const result = await res.json();
    if (result.error) return { status: 'not-found' };
    text = result.content;
  } catch {
    return { status: 'not-found' };
  }

  // Parse the markdown to HTML, with render-error handling
  try {
    const html = await marked.parse(text);
    return { status: 'ok', html };
  } catch {
    return { status: 'render-error' };
  }
}
