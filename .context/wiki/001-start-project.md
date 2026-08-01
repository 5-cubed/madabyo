# 001 - Start Project

**Status:** Closed (2026-07-31)
**Research dir:** `research/001-start-project/`

## Goal
Build "madabyo": a single executable that starts a server for a markdown viewer, combining a Go CLI and a React viewer frontend.

## Outcome
Two foundational, hard-to-reverse structural decisions were validated experimentally before any real feature code was written. Both experiments returned **Supported** with zero refuting observations. The repo (github.com/5-cubed/madabyo) was then bootstrapped from the validated layout, with CI/CD wired in. Markdown-viewer feature work continues there, outside this research project.

```
Decision 1: repo layout          Decision 2: CI/CD
(go-embed-monorepo-layout)       (gh-actions-cross-platform-ci)
        |                                |
        v                                v
cmd/ + internal/ + web/          3-OS matrix (ubuntu/macos/windows)
go:embed all:dist                push -> build+vet
single dependency-free binary    tag v*.*.* -> build -> Release
        |                                |
        +---------------+----------------+
                         v
              github.com/5-cubed/madabyo
              (bootstrapped, CI/CD live)
```

## Decision 1: Go+React monorepo layout with `go:embed`

**Verdict:** Supported — [full report](../../research/001-start-project/experiments/go-embed-monorepo-layout/report.md)

- Layout: `cmd/madabyo/` (entrypoint) + `internal/server/` (HTTP handler) + `web/` (Vite React app, `web/embed.go` using `//go:embed all:dist`).
- `go:embed` must live at the `web/` package boundary, next to `dist/` — it cannot reach across package directories. This placement is load-bearing, not incidental.
- Isolation test: the compiled binary alone (no `web/`, no `node_modules`, no `.go` files) correctly served `GET /` (HTML), a byte-exact hashed static asset, and `GET /api/ping` (JSON) — proving zero runtime dependency on Node/npm/source.
- Caveat: validates the embed+serve+isolate *mechanism* only, using a placeholder Vite template — not the actual markdown-rendering feature set.

## Decision 2: GitHub Actions cross-platform CI/CD

**Verdict:** Supported — [full report](../../research/001-start-project/experiments/gh-actions-cross-platform-ci/report.md)

- CI workflow: 3-OS matrix (`ubuntu-latest`, `macos-latest`, `windows-latest`), each running `npm ci && npm run build` in `web/` before `go build` (required so `web/dist` exists for `go:embed`).
- Release workflow: triggered by a `v*.*.*` tag, runs the same matrix, then a `publish` job (`needs: build`) attaches three OS-specific binaries to a GitHub Release.
- Verified on real runs against github.com/5-cubed/madabyo (10/10 jobs succeeded across 2 CI runs + 1 release run). Release binaries were independently verified with `file` (not just filename) — correct Mach-O / ELF / PE32+ formats for their target OS.
- `cache: false` was needed in both workflows since there's no `go.sum` yet (no external Go deps) — otherwise `setup-go`'s cache step warns.
- Windows builds consistently ran ~2x slower than ubuntu/macos (59s vs 25-28s) — not a failure, just a pipeline-speed data point for later.
- Caveat: validates *build success and artifact format* only — does not verify the binaries actually run correctly on each native OS (in scope for a later pass).
- The test tag/release (`v0.0.1-test`) was deleted after verification to keep release history clean.

## Notes for future work
- Both experiments used a placeholder Vite template / minimal `/api/ping` route — actual markdown rendering, multi-file routing, etc. are unvalidated and belong to follow-on work in the live repo.
- Binary runtime verification per-OS (does it actually start and serve correctly on native Windows/macOS/Linux, not just build) is still open.
