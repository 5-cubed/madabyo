# Follow Markdown Links

## Introduction

Clicking a relative markdown link like `[x](other.md)` in a rendered note now opens that file as a new tab in the same pane. Internal links (relative paths to `.md`, `.markdown`, or `README` files) open in-app; external http/https links open in a new browser tab; same-page anchors and mailto links use native browser behavior. Links pointing outside the workspace are blocked with an error message.

## Link Routing

Pane intercepts all link clicks. Markdown links (relative paths to allowed files) route through app navigation. External URLs (`http://`, `https://`) open in new tabs. Same-page anchors (`#section`) and special schemes (`mailto:`, `tel:`) bypass app handling. Non-markdown files and links outside workspace block or show errors.

## Acceptance Criteria

| AC | Behavior | Verification Method |
|--|--|--|
| Given a note with a relative link to another markdown file in the same workspace - When the user clicks the link - Then a new tab for that file opens in the clicked pane and becomes active | Sibling open | `web/src/App.link-follow.test.jsx` |
| Given the link's target file is already open as a tab in that pane - When the user clicks the link - Then the existing tab is focused, no duplicate tab is created | Dedup focus | `web/src/App.link-follow.test.jsx` |
| Given a clicked link points to `README` (no extension) or `x.markdown` - When the user clicks it - Then it opens as a new tab the same as a `.md` link | README/markdown boundary | `web/src/App.link-follow.test.jsx` |
| Given a clicked link is `[x](other.md#section)` - When the user clicks it - Then `other.md` opens as a new tab and no scrolling to `#section` occurs | Fragment ignored | `web/src/App.link-follow.test.jsx` |
| Given a clicked link resolves outside the workspace folder - When the user clicks it - Then a new tab opens showing "This link points outside your workspace." and no file is fetched | Workspace guard | `web/src/App.link-follow.test.jsx` |
| Given a clicked link resolves inside the workspace to a file that doesn't exist - When the user clicks it - Then a new tab opens showing the existing "This file could not be found." message | Not found | `web/src/App.link-follow.test.jsx` |
| Given a clicked link points to a non-markdown file (e.g. `photo.png`) - When the user clicks it - Then nothing opens and no tab is created | Non-md inert | `web/src/App.link-follow.test.jsx` |
| Given a clicked link is `http://` or `https://` - When the user clicks it - Then it opens in a new external browser tab and the app does not navigate away | External link | `web/src/components/Pane.test.jsx` |
| Given a clicked link is `mailto:` or a same-page `#anchor` - When the user clicks it - Then the app performs no special handling and does not call the link-follow callback | Mailto/anchor inert | `web/src/components/Pane.test.jsx` |
