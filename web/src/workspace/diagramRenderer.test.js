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

    it('propagates puml render errors via onError callback', async () => {
      mockRenderToString.mockImplementation((lines, onSuccess, onError) => {
        onError('PlantUML syntax error');
      });

      await expect(renderDiagram('puml', 'bad puml')).rejects.toThrow(
        'PlantUML syntax error'
      );
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
  });
});
