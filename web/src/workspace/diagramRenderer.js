let idCounter = 0;

export async function renderDiagram(lang, source) {
  if (lang === 'mermaid') {
    const mermaid = (await import('mermaid')).default;
    const { svg } = await mermaid.render(`mermaid-${idCounter++}`, source);
    return svg;
  }

  if (lang === 'puml') {
    // Load viz-global.js as a classic <script> (required for PlantUML layout engine)
    const vizUrl = (await import('@plantuml/core/viz-global.js?url')).default;
    await new Promise((res, rej) => {
      if (globalThis.Viz) return res();
      const s = document.createElement('script');
      s.src = vizUrl;
      s.onload = res;
      s.onerror = () => rej(new Error('viz-global load failed'));
      document.head.appendChild(s);
    });

    // Import and call renderToString (callback-based, not promise)
    // renderToString's onError delivers a plain string, not an Error — normalize it
    const { renderToString } = await import('@plantuml/core');
    return new Promise((resolve, reject) =>
      renderToString(source.split('\n'), resolve, (msg) => reject(new Error(msg)))
    );
  }
}
