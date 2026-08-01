# 002 - Basic Markdown Viewer

**Status:** Closed (2026-08-01)
**Research dir:** `research/002-bagic-markdown-viewer/`

## Goal
Explore markdown rendering approaches for the madabyo markdown viewer — a research/experiment phase comparing rendering libraries and UI techniques before committing to an implementation. In practice, the concrete ask was to validate feasibility of a VS Code-like viewer UI: light theme, an IDE-style sidebar showing only markdown files in the real folder structure, tabs for multiple open files, split-pane viewing, and VS Code icons.

## Outcome
One experiment validated that the entire requested feature set is achievable as a pure static web app — no backend, no Electron — with wide performance headroom. Verdict: **Supported**, zero refuting observations.

```
File System Access API
        |
        v
Real folder scan (13k files, 1.4k dirs)
        |
        v
scan + filter + prune  --  avg 56ms
        |                  (18-36x under the 1-2s "feels instant" ceiling)
        v
422 .md files -> sidebar tree (VS Code icons)
        |
        v
Tabs (per pane)  --split-->  2 independent panes, each rendering markdown
        |
        v
Light theme throughout
        |
        v
Verdict: Supported (static web app, no backend needed)
```

## Decision: Static web app (File System Access API) can host the full VS Code-like UI

**Verdict:** Supported — [full report](../../research/002-bagic-markdown-viewer/experiments/ide-style-markdown-viewer-feasibility/report.md)

- Directory scan+filter+prune over a real, unmodified 12,877-file / 1,382-directory workspace averaged **56.12ms** (3 runs, 50-68ms range), found 422 markdown files. Measured via a Node.js script that replicates the browser's exact traversal algorithm, since the real `showDirectoryPicker()` call opens a native OS dialog that can't be driven headlessly — the traversal/filter cost is identical either way.
- All five required UI features were built and visually confirmed working together in one static `index.html` (no backend process): light theme, a sidebar tree filtered to only `.md` files using genuine VS Code icon-theme assets (folder/markdown icons, confirmed via zoom — not broken placeholders), independent tabs per pane, and a working split-pane view with two panes rendering different files simultaneously.
- No console errors during interaction with the running prototype.
- Caveat: the prototype used `marked` as a placeholder renderer and a fixed (non-resizable) split — real renderer choice and resizable panes are unvalidated, follow-on work.
- Caveat: the real `showDirectoryPicker()` code path was verified by code review + the Node-equivalent benchmark, not an end-to-end automated click-through (native OS dialogs can't be scripted) — the downstream logic it feeds (tree render, filtering, tabs, split-pane) was exercised and screenshotted via a seeded mock-tree path instead.

## Notes for future work
- The prototype (`research/002-bagic-markdown-viewer/experiments/ide-style-markdown-viewer-feasibility/app/index.html`) is a throwaway feasibility build, not production code — turning it into the real implementation is open work.
- Open items for that follow-on work: pick a real markdown renderer (marked was a placeholder, chosen for speed of prototyping rather than evaluated), add drag-to-resize for split-pane, and persist the opened folder handle across reloads (File System Access API supports this via IndexedDB).
- **Token Light theme preview (2026-08-01, quick check, not a formal experiment):** applied the actual color values from [ThorstenRhau/token](https://github.com/ThorstenRhau/token)'s `contrib/vscode/themes/token-light-color-theme.json` (warm off-white editor bg `#faf9f5`, sidebar `#f6f5f1`, ink `#2a2920`, rust-orange accent `#9a4929`) to a copy of the prototype at `research/002-bagic-markdown-viewer/experiments/token-light-theme-preview/index.html` (screenshot: `preview.png` in the same dir). Low-stakes visual check only — no verdict recorded, original prototype untouched, decision on whether to adopt it as the production theme is still open.
- **Bug found (unfixed, out of scope for the theme check):** `splitRight()` in the prototype calls `renderPanes()` without awaiting it. Calling `splitRight()` immediately followed by another render-triggering call (e.g. `openFile()`) races two overlapping `renderPanes()` runs, each of which clears then re-appends the `#panes` container — the interleaving duplicates pane DOM nodes (observed: 2 real panes rendered as 4 elements). Needs `await` added in `splitRight()` before it's promoted past prototype status.
- Relates to [[001-start-project]] — that project bootstrapped the Go+React single-binary repo (github.com/5-cubed/madabyo) that this viewer UI is destined to live in; this research project only validated feasibility, it didn't touch that repo.
