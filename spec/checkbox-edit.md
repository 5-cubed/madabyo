# Checkbox Edit

## Introduction

The markdown pane now supports editing task-list checkboxes inline. Clicking a rendered `- [ ]` or `- [x]` checkbox toggles it and instantly writes the change to disk without a separate save step. The browser's markdown parser (marked) is the single source of truth for "which checkbox is #N," so the server never re-implements markdown parsing.

## Write Path

Clicking a checkbox in the rendered pane:
1. The browser's native `<input type="checkbox">` toggles immediately (no wait for the server).
2. The client reads the new `.checked` state, calls `MarkdownRenderer.toggleCheckboxContent(rawText, index, newChecked)` to mutate the raw markdown, and sends `PUT /api/file` with `{path, content, expectedMtime}`.
3. The server checks if the file's current mtime matches `expectedMtime` (reject if stale to avoid overwriting concurrent edits).
4. On success, the server writes the file, re-stat's it to get the new mtime, and returns the updated mtime.
5. On failure (stale mtime, write error, extension not allowed), the checkbox in the UI is reverted to its pre-click state, and the error is logged to `/api/log`.

## Checkbox Position Calculation

`toggleCheckboxContent(content, index, checked)` uses `marked.lexer()` to walk the token tree in document order:
- For each top-level list, recurse into its items.
- For each item, if it has a checkbox token, record its byte span using a bounded `indexOf` search within the item's raw markdown (never a whole-document search, so an identical `[ ]` inside a code fence elsewhere cannot be matched).
- For nested lists within items, find their position by anchoring on the parent item's own text token, not by searching for the nested child's text (this avoids false matches on duplicate text).
- Cursor advancement for items inside a nested list accounts for indentation: for each source line of an item, add back the indentation width that `marked` strips from nested-list tokens (once per line, threaded through recursive calls).
- Throw (do not silently return unchanged text) if the index is out of range — an out-of-sync index is a bug, not a graceful no-op.
- **Known Limitation**: nesting 2+ levels deep (a nested list inside a nested list) is not supported by this fix; such cases will have undefined behavior.

## Stale-Mtime Detection

The write is atomic on the client: send expected mtime, check response. On return:
- If the server says "stale", the file on disk was modified by another process. The checkbox is reverted and the user is notified (via log) — no overwrite occurs.
- If the server returns a new mtime greater than the one sent, the tab's cached mtime is updated to match; this skips the 5-second poll's next redundant re-render (mtime will not have changed by then).

## Acceptance Criteria

| AC | Category | Verification Method |
|--|--|--|
| Given a nested list with 2 children under one parent - When `toggleCheckboxContent` toggles the 2nd (last) child - Then only that child's `[ ]`/`[x]` changes, byte-identical elsewhere | Normal | unit test: `web/src/workspace/markdownRenderer.test.js` |
| Given a nested list with 3 children under one parent - When toggling the 3rd (last) child - Then only that checkbox changes | Boundary | unit test: `web/src/workspace/markdownRenderer.test.js` |
| Given a top-level item that follows a nested list with 2+ children - When toggling that top-level item's own checkbox - Then it is located correctly | Normal | unit test: `web/src/workspace/markdownRenderer.test.js` |
| Given two separate top-level items, each with its own single-level nested list - When toggling a checkbox in the second item's nested list - Then it is located correctly | Normal | unit test: `web/src/workspace/markdownRenderer.test.js` |
| Given raw markdown with 3 checkboxes across a top-level and a nested list, plus a decoy `[ ]` inside a fenced code block - When `toggleCheckboxContent(content, 2, true)` is called - Then only the 3rd real checkbox's line changes to `[x]`, byte-for-byte identical everywhere else | Normal | unit test: `web/src/workspace/markdownRenderer.test.js` |
| Given an index beyond the number of real checkboxes - When `toggleCheckboxContent` is called - Then it throws, it does not silently no-op or corrupt text | Boundary | unit test: `web/src/workspace/markdownRenderer.test.js` |
| Given a nested list inside a nested list (2+ levels) - When toggling a checkbox there - Then behavior is undefined and documented as such, not silently claimed correct | Boundary | manual: spec's Known Limitation bullet + code comment |
| Given a `.md` file and its current mtime - When `PUT /api/file` is sent with matching `expectedMtime` - Then it returns 200, `{mtime}` (new, greater than before), and the file's bytes on disk equal the sent `content` exactly | Normal | integration test: `internal/server/handlers_file_test.go` |
| Given a `.md` file that changed on disk after it was loaded - When `PUT /api/file` is sent with the stale `expectedMtime` - Then it returns 200 with `error` populated and the file on disk is byte-for-byte unchanged | Exception | integration test: `internal/server/handlers_file_test.go` |
| Given a `.txt` file - When `PUT /api/file` is sent - Then it returns 200 with `error: "extension not allowed"` and no write occurs | Exception | unit test: `internal/workspace/usecase/file_test.go` |
| Given a pane with a rendered checkbox - When the user clicks it - Then the DOM checkbox flips immediately (native), and on success the tab's cached `mtime` is updated to the server's returned value | Normal | unit test: `web/src/panes/PaneManager.test.js` |
| Given the save fails (stale mtime or network error) - When the click handler awaits the result - Then the checkbox's `.checked` is reverted to its pre-click value | Exception | unit test: `web/src/components/Pane.test.jsx` |
