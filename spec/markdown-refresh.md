# Markdown Refresh Guard

## Introduction

The markdown pane no longer re-renders and loses fold state when the file hasn't changed. A refresh (manual or automatic 5-second poll) now checks the file's last-modified time via `/api/file/meta` and skips rendering if the mtime is unchanged. Folded sections and expanded/collapsed diagrams stay put across refreshes of unchanged files.

## Refresh Guard

Timer (5s) or tab-switch triggers `PaneManager.refreshTab`. The method first fetches the file's current mtime via `/api/file/meta`. If the mtime matches the cached value from the last render, rendering is skipped. If mtime is new or the file was never rendered, `renderFile` is called and the mtime is cached.

## Acceptance Criteria

| AC | Category | Verification Method |
|--|--|--|
| Given a valid markdown path - When `GET /api/file/meta?path=` is called - Then it returns 200 with `mtime` > 0 and no error | Normal | `internal/server/handlers_meta_test.go` |
| Given a nonexistent file path - When `GET /api/file/meta?path=` is called - Then it returns 200 with `error` populated, no `mtime` | Exception | `internal/server/handlers_meta_test.go` |
| Given a path with a disallowed extension - When `FileUsecase{}.Meta` is called - Then it returns `error: "extension not allowed"` before any stat | Exception | `internal/workspace/usecase/file_test.go` |
| Given a tab whose cached mtime equals the file's current mtime - When `refreshTab` runs (poll or tab-switch) - Then `MarkdownRenderer.renderFile` is NOT called and `renderResult` is unchanged | Normal | `web/src/panes/PaneManager.test.js` |
| Given a tab whose cached mtime differs from the file's current mtime - When `refreshTab` runs - Then `renderFile` IS called and the tab's `mtime` is updated | Normal | `web/src/panes/PaneManager.test.js` |
| Given a tab with no cached mtime yet (first refresh after open) - When `refreshTab` runs - Then it always re-renders and caches the returned mtime | Boundary | `web/src/panes/PaneManager.test.js` |
