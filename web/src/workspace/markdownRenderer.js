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

// Lazy singleton for Shiki highlighter; holds the getHighlighter promise once created.
// ponytail: singleton per process; upgrade to per-worker if throughput matters
let highlighterPromise;
async function ensureHighlighter() {
  if (!highlighterPromise) {
    const { createHighlighter } = await import('shiki');
    // Imported from upstream: ~/.local/share/nvim/lazy/token/contrib/vscode/themes/token-light-color-theme.json
    const tokenLightThemeModule = await import('../theme/token-light-color-theme.json', { assert: { type: 'json' } });
    const tokenLightTheme = tokenLightThemeModule.default;
    // Register with explicit name 'token-light' for consistency
    tokenLightTheme.name = 'token-light';
    highlighterPromise = createHighlighter({
      themes: [tokenLightTheme],
      langs: ['js', 'json', 'ts', 'tsx', 'go', 'python', 'rust', 'cpp', 'c', 'java', 'sql', 'bash', 'sh', 'zsh', 'css', 'html', 'xml', 'yaml', 'toml', 'text'],
    });
  }
  return highlighterPromise;
}

// Map fence aliases to a canonical engine name
const DIAGRAM_ENGINES = { mermaid: 'mermaid', puml: 'puml', plantuml: 'puml' };

// Register marked extension once at module scope
marked.use({
  async: true,
  walkTokens: async (token) => {
    if (token.type !== 'code') return;

    // Extract language from fence info line (first word only; discard attributes like title=x)
    const lang = token.lang?.split(/\s+/)[0];
    const engine = DIAGRAM_ENGINES[lang];

    // Route to diagram renderer for mermaid/puml
    if (engine) {
      try {
        const svg = await renderDiagram(engine, token.text);
        token.type = 'html';
        token.text = `<div class="diagram">${svg}</div>`;
      } catch (err) {
        token.type = 'html';
        token.text = `<div class="diagram-error"><p>${escapeHtml(err?.message ?? String(err))}</p><pre>${escapeHtml(token.text)}</pre></div>`;
      }
      return;
    }

    // Short-circuit for text and unknown languages — render as plain code
    if (!lang || lang === 'text') {
      return;
    }

    // Attempt syntax highlighting via Shiki
    try {
      const highlighter = await ensureHighlighter();
      const highlighted = highlighter.codeToHtml(token.text, {
        lang,
        theme: 'token-light',
        transformers: [
          {
            pre(node) {
              // Strip inline background-color; let App.css own the surface
              delete node.properties.style;
              return node;
            },
          },
        ],
      });
      token.type = 'html';
      token.text = highlighted;
    } catch (err) {
      // Highlight failed (unknown lang, Shiki error, etc.) — fall back to plain code
      console.warn(`syntax highlight failed for lang '${lang}':`, err?.message ?? String(err));
      // Keep token as-is; marked will render it as <pre><code>
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
