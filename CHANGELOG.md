# Changelog

All notable changes to madabyo are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] - 2026-08-01

### Fixes
- run vitest in one-shot mode for npm test

### Other
- build: add Makefile with build target for web and go binary
- deps: bump @testing-library/react to ^16.3.2 for React 19 compatibility
- Bring markdown viewer UI in line with validated experiment prototype

## [0.1.0] - 2026-08-01

### Features
- implement automated release agent (SEQ-026)
- persist directory handle with IndexedDB (SEQ-023, SEQ-024, SEQ-025)

### Fixes
- wire SidebarTree file selection to PaneManager/SplitContainer in App
- resolve CSS import test failures
- resolve bugs in release script

### Documentation
- add release guide

### Chores
- add release subagent

### Other
- Implement split pane system with resize and close controls (SEQ-018-022)
- Implement markdown rendering and tab management (SEQ-008 through SEQ-016)
- Wire SidebarTree into App component
- Implement sidebar tree rendering (SEQ-003 + SEQ-005 + SEQ-006 + SEQ-007)
- Implement tree scanner and loading state (SEQ-002 + SEQ-007)
- Implement folder picker (SEQ-001 + SEQ-004) with test infrastructure
- Disable go build cache (no go.sum yet, avoids spurious cache-restore warning)
- Add CI (matrix build check) and Release (tag-triggered cross-OS binaries) workflows
- Bootstrap madabyo repo from validated go:embed monorepo layout

# Changelog

All notable changes to madabyo are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).