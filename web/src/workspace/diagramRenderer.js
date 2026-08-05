let idCounter = 0;

// Vite/Rolldown's bundler transform corrupts @plantuml/core's pre-minified
// TeaVM output (breaks its internal monitor bookkeeping, e.g. "Cannot read
// properties of undefined (reading 'bGH')") when it's imported as a normal
// ES module dependency. Loading it as a raw asset URL and letting the browser's
// native module loader evaluate it untouched avoids the bundler entirely —
// the same workaround already used for viz-global.js below.
let vizLoadPromise;
let plantumlModulePromise;

// The PlantUML/Viz engine keeps shared mutable state and isn't safe for
// concurrent renders (see @plantuml/core's GITHUB_INTEGRATION.md: "you must
// serialize renders ... will silently overwrite the previous result
// otherwise"). marked's async walkTokens fires every fenced diagram in a
// document concurrently (`Promise.all`), so calls are queued here.
let renderQueue = Promise.resolve();

export async function renderDiagram(lang, source) {
  if (lang === 'mermaid') {
    const mermaid = (await import('mermaid')).default;
    const { svg } = await mermaid.render(`mermaid-${idCounter++}`, source);
    return svg;
  }

  if (lang === 'puml') {
    // Load viz-global.js as a classic <script> (required for PlantUML layout engine)
    vizLoadPromise ??= (async () => {
      const vizUrl = (await import('@plantuml/core/viz-global.js?url')).default;
      await new Promise((res, rej) => {
        if (globalThis.Viz) return res();
        const s = document.createElement('script');
        s.src = vizUrl;
        s.onload = res;
        s.onerror = () => rej(new Error('viz-global load failed'));
        document.head.appendChild(s);
      });
    })();
    await vizLoadPromise;

    plantumlModulePromise ??= (async () => {
      const plantumlUrl = (await import('@plantuml/core/plantuml.js?url')).default;
      return import(/* @vite-ignore */ plantumlUrl);
    })();
    const { renderToString } = await plantumlModulePromise;

    // Auto-wrap bare diagram bodies (no @start... directive) with @startuml/@enduml.
    // Check if first non-empty line already starts with @start; if not, wrap.
    let wrappedSource = source;
    const firstNonEmpty = source.split('\n').find(line => line.trim());
    if (firstNonEmpty && !firstNonEmpty.trim().startsWith('@start')) {
      wrappedSource = `@startuml\n${source}\n@enduml`;
    }

    // renderToString's onError delivers either a plain string or an Error —
    // normalize without stringifying an existing Error via `new Error(err)`,
    // which mangles its message.
    const task = renderQueue.then(
      () =>
        new Promise((resolve, reject) =>
          renderToString(wrappedSource.split('\n'), resolve, (err) =>
            reject(err instanceof Error ? err : new Error(String(err)))
          )
        )
    );
    renderQueue = task.catch(() => {});
    return task;
  }
}
