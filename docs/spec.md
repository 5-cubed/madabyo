# Sidebar Tree Persistence and Observability

## Introduction

The app persists sidebar state to browser localStorage so folders remain open across page reloads, with a 100-folder cap and automatic cleanup of broken paths. Observability features add request logging to stderr and a `/api/log` endpoint for client messages, enabling debugging and monitoring in production. Both features integrate seamlessly without affecting tabs, panes, or scroll position.

### Restore Features

Sidebar folders are saved per workspace and restored on load. The most recently opened folders are retained up to a limit of 100; older entries are dropped first. Folders that can no longer be listed are silently removed. The previously highlighted file is restored as a visual highlight only, with no tab opened.

#### AC
- Given `docs` and `docs/drafts` were open for workspace `/ws` - When the app loads - Then a file inside `docs/drafts` is on screen with no clicks
  - Type: normal
  - Method: `web/src/App.tree-persist.test.jsx`
- Given `notes.md` was the highlighted file - When the app loads - Then `notes.md` shows the selected style and no tab is opened
  - Type: normal
  - Method: `web/src/App.tree-persist.test.jsx`
- Given saved folders exist for workspace `/ws` - When the app loads with workspace `/other` - Then no folder is expanded
  - Type: boundary
  - Method: `web/src/App.tree-persist.test.jsx`
- Given 2 saved folders where the first returns an error from `/api/list` - When the app loads - Then the second still expands
  - Type: exception
  - Method: `web/src/App.tree-persist.test.jsx`
- Given 100 folders are already saved - When a 101st folder is opened - Then the least-recently-opened is dropped and 100 remain saved
  - Type: boundary
  - Method: `web/src/App.tree-persist.test.jsx`

### Observability Features

The server logs all HTTP requests with method, path, status, and duration. The `/api/log` POST endpoint accepts `{level, message}` for client-side logging. The endpoint rejects oversized bodies (>4 KB), unknown log levels, and strips newlines. Sidebar restore operations log when folders are dropped due to errors or capacity limits.

#### AC
- Given the server is running - When any request hits `/api/ping` - Then one log line with method, path, status, and duration is written
  - Type: normal
  - Method: `internal/server/middleware_log_test.go`
- Given a valid body `{"level":"error","message":"x"}` - When POSTed to `/api/log` - Then the server responds 200 and logs the message at that level
  - Type: normal
  - Method: `internal/server/handlers_log_test.go`
- Given a message containing `\n` - When POSTed to `/api/log` - Then the logged line contains no newline
  - Type: exception
  - Method: `internal/server/handlers_log_test.go`
- Given a body larger than 4 KB - When POSTed to `/api/log` - Then the server responds 400 and logs nothing
  - Type: boundary
  - Method: `internal/server/handlers_log_test.go`
- Given level `"banana"` - When POSTed to `/api/log` - Then the server responds 400 and logs nothing
  - Type: exception
  - Method: `internal/server/handlers_log_test.go`
- Given a GET to `/api/log` - When it is handled - Then the server responds 405
  - Type: exception
  - Method: `internal/server/handlers_log_test.go`
- Given a remembered folder that cannot be listed - When the app restores the tree - Then one POST to `/api/log` is sent at level `error`
  - Type: exception
  - Method: `web/src/App.tree-persist.test.jsx`
