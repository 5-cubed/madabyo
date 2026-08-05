import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';

// Mock mermaid at module top level with a configurable render function
const mockMermaidRender = vi.fn();
vi.mock('mermaid', () => ({
  default: {
    render: mockMermaidRender,
  },
}));

// Mock @plantuml/core at module top level with configurable renderToString
const mockRenderToString = vi.fn();
vi.mock('@plantuml/core', () => ({
  renderToString: mockRenderToString,
}));

// Mock viz-global.js?url at module top level
vi.mock('@plantuml/core/viz-global.js?url', () => ({
  default: 'mocked-viz-global.js',
}));

// Mock plantuml.js?url so the raw-asset-URL dynamic import resolves back to
// the '@plantuml/core' mock above (mirrors the bundler-bypass in diagramRenderer.js).
vi.mock('@plantuml/core/plantuml.js?url', () => ({
  default: '@plantuml/core',
}));

import { renderDiagram } from './diagramRenderer.js';

describe('diagramRenderer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Pre-set globalThis.Viz so the script load guard short-circuits
    globalThis.Viz = {};
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete globalThis.Viz;
  });

  describe('mermaid rendering', () => {
    it('renders mermaid diagram with incrementing ID', async () => {
      mockMermaidRender.mockResolvedValueOnce({ svg: '<svg>mermaid content</svg>' });

      const result = await renderDiagram('mermaid', 'graph TD; A-->B');

      expect(result).toBe('<svg>mermaid content</svg>');
      expect(mockMermaidRender).toHaveBeenCalledWith('mermaid-0', 'graph TD; A-->B');
    });

    it('increments mermaid ID on multiple calls', async () => {
      mockMermaidRender.mockResolvedValue({ svg: '<svg>content</svg>' });

      await renderDiagram('mermaid', 'diagram 1');
      await renderDiagram('mermaid', 'diagram 2');

      expect(mockMermaidRender).toHaveBeenNthCalledWith(1, 'mermaid-1', 'diagram 1');
      expect(mockMermaidRender).toHaveBeenNthCalledWith(2, 'mermaid-2', 'diagram 2');
    });

    it('propagates mermaid render errors', async () => {
      mockMermaidRender.mockRejectedValueOnce(new Error('mermaid render failed'));

      await expect(renderDiagram('mermaid', 'bad diagram')).rejects.toThrow(
        'mermaid render failed'
      );
    });
  });

  describe('plantuml rendering', () => {
    it('renders puml diagram via renderToString', async () => {
      mockRenderToString.mockImplementation((lines, onSuccess) => {
        onSuccess('<svg>puml content</svg>');
      });

      const result = await renderDiagram('puml', '@startuml\nBob->Alice: Hello\n@enduml');

      expect(result).toBe('<svg>puml content</svg>');
      expect(mockRenderToString).toHaveBeenCalledWith(
        ['@startuml', 'Bob->Alice: Hello', '@enduml'],
        expect.any(Function),
        expect.any(Function)
      );
    });

    it('normalizes puml onError string into an Error', async () => {
      // renderToString's onError delivers a plain string; renderDiagram must
      // reject with an Error so the caller's err.message path works.
      mockRenderToString.mockImplementation((lines, onSuccess, onError) => {
        onError('PlantUML syntax error');
      });

      await expect(renderDiagram('puml', 'bad puml')).rejects.toThrow(
        'PlantUML syntax error'
      );
      await expect(renderDiagram('puml', 'bad puml')).rejects.toBeInstanceOf(Error);
    });

    it('skips viz-global script load when globalThis.Viz already set', async () => {
      mockRenderToString.mockImplementation((lines, onSuccess) => {
        onSuccess('<svg>puml</svg>');
      });

      const result = await renderDiagram('puml', 'diagram');

      expect(result).toBe('<svg>puml</svg>');
      // Verify renderToString was called (it wouldn't be if script load hung)
      expect(mockRenderToString).toHaveBeenCalled();
    });

    it('serializes concurrent renders instead of overlapping them', async () => {
      // The engine keeps shared mutable state and isn't safe for concurrent
      // renderToString calls (see diagramRenderer.js comment). Two overlapping
      // renderDiagram('puml', ...) calls — as marked's Promise.all(walkTokens)
      // produces for a doc with multiple diagrams — must not both be in-flight
      // at once.
      let active = 0;
      let maxActive = 0;
      mockRenderToString.mockImplementation((lines, onSuccess) => {
        active++;
        maxActive = Math.max(maxActive, active);
        setTimeout(() => {
          active--;
          onSuccess(`<svg>${lines.join(',')}</svg>`);
        }, 0);
      });

      const [a, b] = await Promise.all([
        renderDiagram('puml', 'first'),
        renderDiagram('puml', 'second'),
      ]);

      expect(maxActive).toBe(1);
      expect(a).toBe('<svg>@startuml,first,@enduml</svg>');
      expect(b).toBe('<svg>@startuml,second,@enduml</svg>');
    });

    it('wraps bare content (no @start...) with @startuml/@enduml', async () => {
      mockRenderToString.mockImplementation((lines, onSuccess) => {
        onSuccess('<svg>wrapped</svg>');
      });

      const result = await renderDiagram('puml', 'Bob->Alice: Hello');

      expect(result).toBe('<svg>wrapped</svg>');
      expect(mockRenderToString).toHaveBeenCalledWith(
        ['@startuml', 'Bob->Alice: Hello', '@enduml'],
        expect.any(Function),
        expect.any(Function)
      );
    });

    it('passes through content already starting with @start... unwrapped', async () => {
      mockRenderToString.mockImplementation((lines, onSuccess) => {
        onSuccess('<svg>already wrapped</svg>');
      });

      const result = await renderDiagram('puml', '@startuml\nBob->Alice: Hello\n@enduml');

      expect(result).toBe('<svg>already wrapped</svg>');
      expect(mockRenderToString).toHaveBeenCalledWith(
        ['@startuml', 'Bob->Alice: Hello', '@enduml'],
        expect.any(Function),
        expect.any(Function)
      );
    });

    it('wraps bare content with leading whitespace', async () => {
      mockRenderToString.mockImplementation((lines, onSuccess) => {
        onSuccess('<svg>wrapped</svg>');
      });

      const result = await renderDiagram('puml', '  \n  Bob->Alice: Hello');

      expect(result).toBe('<svg>wrapped</svg>');
      expect(mockRenderToString).toHaveBeenCalledWith(
        ['@startuml', '  ', '  Bob->Alice: Hello', '@enduml'],
        expect.any(Function),
        expect.any(Function)
      );
    });

    it('handles @startmindmap variant without re-wrapping', async () => {
      mockRenderToString.mockImplementation((lines, onSuccess) => {
        onSuccess('<svg>mindmap</svg>');
      });

      const result = await renderDiagram('puml', '@startmindmap\nRoot\n@endmindmap');

      expect(result).toBe('<svg>mindmap</svg>');
      expect(mockRenderToString).toHaveBeenCalledWith(
        ['@startmindmap', 'Root', '@endmindmap'],
        expect.any(Function),
        expect.any(Function)
      );
    });
  });
});
