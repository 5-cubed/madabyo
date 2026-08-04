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

// Map fence aliases to a canonical engine name
const DIAGRAM_ENGINES = { mermaid: 'mermaid', puml: 'puml', plantuml: 'puml' };

// Register marked extension once at module scope
marked.use({
  async: true,
  walkTokens: async (token) => {
    // marked keeps the whole fence info line as token.lang (e.g. 'puml @startuml'),
    // so match on the first whitespace-delimited word and resolve aliases.
    const engine = token.type === 'code' && DIAGRAM_ENGINES[token.lang?.split(/\s+/)[0]];
    if (engine) {
      try {
        const svg = await renderDiagram(engine, token.text);
        token.type = 'html';
        token.text = `<div class="diagram">${svg}</div>`;
      } catch (err) {
        token.type = 'html';
        token.text = `<div class="diagram-error"><p>${escapeHtml(err?.message ?? String(err))}</p><pre>${escapeHtml(token.text)}</pre></div>`;
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
