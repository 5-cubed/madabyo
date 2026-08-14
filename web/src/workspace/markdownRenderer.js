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

// Find all checkbox token positions in the raw markdown text
function findCheckboxSpans(content) {
  const tokens = marked.lexer(content);
  const spans = [];

  function findNestedListStart(item, nestedList) {
    // Try to find where the nested list starts in item.raw
    // The nested list items will be indented in item.raw but not in nestedList.raw
    // Strategy: search for the text content of the first nested item
    if (nestedList.items.length === 0) return -1;
    // Find the text content of the first nested item
    for (const token of nestedList.items[0].tokens) {
      if (token.type === 'text' || token.type === 'paragraph') {
        // Search for this text in item.raw, but skip the first few characters (parent's content)
        // Start search after the parent's text (which is usually on the first line)
        const firstNewline = item.raw.indexOf('\n');
        if (firstNewline >= 0) {
          const afterParent = item.raw.substring(firstNewline);
          const idx = afterParent.indexOf(token.raw);
          if (idx >= 0) {
            // Found it after the parent line; now find the line start
            const fullIdx = firstNewline + idx;
            const lineStart = item.raw.lastIndexOf('\n', fullIdx - 1);
            const markerStart = lineStart < 0 ? 0 : lineStart + 1;
            // Skip leading whitespace to find the list marker position
            const stripped = item.raw.substring(markerStart).search(/\S/);
            return markerStart + stripped;
          }
        }
      }
    }
    return -1;
  }

  function walkList(listTok, regionStart) {
    let cursor = regionStart;
    for (const item of listTok.items) {
      const checkboxTok = item.tokens.find((t) => t.type === 'checkbox');
      if (checkboxTok) {
        const start = cursor + item.raw.indexOf(checkboxTok.raw);
        spans.push({ start, end: start + checkboxTok.raw.length });
      }
      // For nested lists, find their start position within this item
      for (const t of item.tokens) {
        if (t.type === 'list') {
          const nestedStart = findNestedListStart(item, t);
          if (nestedStart >= 0) {
            walkList(t, cursor + nestedStart);
          }
        }
      }
      cursor += item.raw.length;
    }
  }

  let cursor = 0;
  for (const tok of tokens) {
    if (tok.type === 'list') walkList(tok, cursor);
    cursor += tok.raw.length;
  }
  return spans;
}

export function toggleCheckboxContent(content, index, checked) {
  const span = findCheckboxSpans(content)[index];
  if (!span) throw new Error(`checkbox index ${index} out of range`);
  return content.slice(0, span.start) + (checked ? '[x] ' : '[ ] ') + content.slice(span.end);
}

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
    let html = await marked.parse(text);

    // Add data-index to checkboxes for interactive toggling, remove disabled attribute
    let checkboxIndex = 0;
    html = html.replace(/<input [^>]*type="checkbox"[^>]*>/g, (match) => {
      const isChecked = match.includes('checked') ? 'checked' : '';
      return `<input type="checkbox" data-index="${checkboxIndex++}" ${isChecked}>`;
    });

    return { status: 'ok', html, content: text };
  } catch {
    return { status: 'render-error' };
  }
}

export async function fetchMeta(path) {
  try {
    const res = await fetch(`/api/file/meta?path=${encodeURIComponent(path)}`);
    const result = await res.json();
    if (result.error) return { status: 'not-found' };
    return { status: 'ok', mtime: result.mtime };
  } catch {
    return { status: 'not-found' };
  }
}

export async function saveFile(path, content, expectedMtime) {
  try {
    const res = await fetch('/api/file', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path, content, expectedMtime }),
    });
    const result = await res.json();
    if (result.error) return { status: 'error', error: result.error };
    return { status: 'ok', mtime: result.mtime };
  } catch (err) {
    return { status: 'error', error: err.message };
  }
}
