# Sidebar Tree Persistence

## Introduction

The sidebar displays a tree of markdown files in the workspace. Folders are expandable and their expanded state persists across page reloads. When a folder is expanded, its contents are fetched from `/api/list`. When expanded, folders are saved to browser localStorage up to a 100-folder limit with least-recently-opened eviction. Collapsed folders are removed from the saved list but their nested folders can be re-opened when the parent is re-expanded.

## Restore Features

Sidebar folders are saved per workspace and restored on load. The most recently opened folders are retained up to a limit of 100; older entries are dropped first. Folders that can no longer be listed are silently removed. Missing ancestor folders are automatically opened before their nested folders during restore. The previously highlighted file is restored as a visual highlight only, with no tab opened.

## Acceptance Criteria

| AC | Behavior | Verification Method |
|--|--|--|
| Given folder `docs` is open - When the user clicks the `docs` row - Then its contents leave the screen and `docs` is absent from `madabyo:sidebar:/ws` on that click | Collapse | `web/src/App.tree-persist.test.jsx` |
| Given `docs` and `docs/api` are both open - When the user clicks `docs` twice - Then `docs/api` is on screen and open again | Nested re-expand | `web/src/App.tree-persist.test.jsx` |
| Given the saved list holds `docs/api` but not `docs` - When the app loads - Then `docs/api` renders open on first paint | Ancestor restore | `web/src/App.tree-persist.test.jsx` |
| Given the workspace root row - When it is clicked - Then it stays open | Root protection | `web/src/App.tree-persist.test.jsx` |
| Given `docs` and `docs/drafts` were open for workspace `/ws` - When the app loads - Then a file inside `docs/drafts` is on screen with no clicks | Restore nested | `web/src/App.tree-persist.test.jsx` |
| Given `notes.md` was the highlighted file - When the app loads - Then `notes.md` shows the selected style and no tab is opened | Highlight restore | `web/src/App.tree-persist.test.jsx` |
| Given saved folders exist for workspace `/ws` - When the app loads with workspace `/other` - Then no folder is expanded | Workspace isolation | `web/src/App.tree-persist.test.jsx` |
| Given 2 saved folders where the first returns an error from `/api/list` - When the app loads - Then the second still expands | Error resilience | `web/src/App.tree-persist.test.jsx` |
| Given 100 folders are already saved - When a 101st folder is opened - Then the least-recently-opened is dropped and 100 remain saved | Capacity cap | `web/src/App.tree-persist.test.jsx` |
