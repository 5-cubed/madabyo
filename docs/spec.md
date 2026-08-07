# Sidebar Tree Persistence Specification

## Restore Features

- ADD: sidebar restores previously open folders after a page reload.
- ADD: sidebar restores the previously highlighted file as a highlight only — no tab is opened.
- ADD: remembered state is stored in browser `localStorage`, keyed per workspace path.
- ADD: a remembered folder that can no longer be listed is dropped; remaining folders still restore.
- ADD: at most 100 folders are remembered; the least-recently-opened are dropped first.
- CHANGE: folder open/closed state is owned solely by `App`; `SidebarTree` rows receive it as a prop.
- OUT: open tabs, split panes, and sidebar scroll position are not restored.

## Restore Acceptance Criteria

| AC | Category | Verification Method |
|---|---|---|
| Given `docs` and `docs/drafts` were open for workspace `/ws` - When the app loads - Then a file inside `docs/drafts` is on screen with no clicks | Normal | `web/src/App.tree-persist.test.jsx` |
| Given `notes.md` was the highlighted file - When the app loads - Then `notes.md` shows the selected style and no tab is opened | Normal | `web/src/App.tree-persist.test.jsx` |
| Given saved folders exist for workspace `/ws` - When the app loads with workspace `/other` - Then no folder is expanded | Boundary | `web/src/App.tree-persist.test.jsx` |
| Given 2 saved folders where the first returns an error from `/api/list` - When the app loads - Then the second still expands | Exception | `web/src/App.tree-persist.test.jsx` |
| Given 100 folders are already saved - When a 101st folder is opened - Then the least-recently-opened is dropped and 100 remain saved | Boundary | `web/src/App.tree-persist.test.jsx` |

## Observability Features

- ADD: the server logs every HTTP request as method, path, status, and duration to stderr.
- ADD: `POST /api/log` accepts `{level, message}` and writes it to the same stderr log.
- ADD: `/api/log` rejects bodies over 4 KB, rejects unknown levels, and strips newlines from the message.
- ADD: `/api/log` responds 405 to any method other than POST.
- ADD: the sidebar restore path posts a log line when it drops an unlistable folder and when the 100-folder cap evicts one.
- OUT: log files and rotation — redirect stderr (`madabyo 2>> log.txt`) if a file is wanted.
- OUT: rewiring the existing `console.error` sites (poller, tab refresh, `loadTree`); they migrate when next touched.

## Observability Acceptance Criteria

| AC | Category | Verification Method |
|---|---|---|
| Given the server is running - When any request hits `/api/ping` - Then one log line with method, path, status, and duration is written | Normal | `internal/server/middleware_log_test.go` |
| Given a valid body `{"level":"error","message":"x"}` - When POSTed to `/api/log` - Then the server responds 200 and logs the message at that level | Normal | `internal/server/handlers_log_test.go` |
| Given a message containing `\n` - When POSTed to `/api/log` - Then the logged line contains no newline | Exception | `internal/server/handlers_log_test.go` |
| Given a body larger than 4 KB - When POSTed to `/api/log` - Then the server responds 400 and logs nothing | Boundary | `internal/server/handlers_log_test.go` |
| Given level `"banana"` - When POSTed to `/api/log` - Then the server responds 400 and logs nothing | Exception | `internal/server/handlers_log_test.go` |
| Given a GET to `/api/log` - When it is handled - Then the server responds 405 | Exception | `internal/server/handlers_log_test.go` |
| Given a remembered folder that cannot be listed - When the app restores the tree - Then one POST to `/api/log` is sent at level `error` | Exception | `web/src/App.tree-persist.test.jsx` |
