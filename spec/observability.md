# Observability

## Introduction

The app includes two observability features: server-side HTTP request logging and a client-side logging endpoint. The server logs all HTTP requests with method, path, status, and duration to stderr. The `/api/log` POST endpoint accepts client-side messages (`{level, message}`) for debugging and monitoring in production. Both features integrate seamlessly without affecting core functionality.

## Features

### HTTP Request Logging

The server logs all HTTP requests with method, path, status, and duration. Request logging is automatically applied to all routes and helps track performance and errors in production.

### Client Logging Endpoint

The `/api/log` POST endpoint accepts JSON bodies with `level` (string, one of: error, warn, info, debug) and `message` (string). The endpoint rejects oversized bodies (>4 KB), unknown log levels, and strips newlines from messages. Sidebar restore operations log when folders are dropped due to errors or capacity limits.

## Acceptance Criteria

| AC | Behavior | Verification Method |
|--|--|--|
| Given the server is running - When any request hits `/api/ping` - Then one log line with method, path, status, and duration is written | Request logging | `internal/server/middleware_log_test.go` |
| Given a valid body `{"level":"error","message":"x"}` - When POSTed to `/api/log` - Then the server responds 200 and logs the message at that level | Log endpoint | `internal/server/handlers_log_test.go` |
| Given a message containing `\n` - When POSTed to `/api/log` - Then the logged line contains no newline | Newline stripping | `internal/server/handlers_log_test.go` |
| Given a body larger than 4 KB - When POSTed to `/api/log` - Then the server responds 400 and logs nothing | Size limit | `internal/server/handlers_log_test.go` |
| Given level `"banana"` - When POSTed to `/api/log` - Then the server responds 400 and logs nothing | Invalid level | `internal/server/handlers_log_test.go` |
| Given a GET to `/api/log` - When it is handled - Then the server responds 405 | Method restriction | `internal/server/handlers_log_test.go` |
| Given a remembered folder that cannot be listed - When the app restores the tree - Then one POST to `/api/log` is sent at level `error` | Restore logging | `web/src/App.tree-persist.test.jsx` |
