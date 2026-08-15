# Changelog

All notable changes to madabyo are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.9.1] - 2026-08-15

### Fixed
- nested checkbox toggle no longer corrupts the file when toggling the 2nd+ item in a nested list

## [0.9.0] - 2026-08-14

### Fixes
- remove disabled attribute and fix checkbox regex to enable clicking

### Other
- RED/GREEN: Wire onToggleCheckbox through App component
- RED/GREEN: Checkbox click handler and data-index rendering
- RED/GREEN: PaneManager.toggleCheckbox method
- spec: checkbox-edit feature specification
- RED/GREEN: toggleCheckboxContent and renderFile content field
- RED/GREEN: PUT /api/file handler for checkbox save
- RED/GREEN: FileUsecase.Save with stale-mtime guard and write infrastructure

## [0.8.4] - 2026-08-13

### Fixed
- self-host sidebar tree icons in bundled assets instead of loading from CDN, enabling use in locked-down networks — #19

### Documentation
- spec: icon hosting section under Sidebar Tree

## [0.8.3] - 2026-08-12

### Fixes
- preserve <details> fold state across unchanged-mtime refresh

## [0.8.2] - 2026-08-12

### Fixed
- Windows markdown links now resolve correctly — normalize backslashes to forward slashes and strip leading slash before drive letters — #15

### Documentation
- spec: Windows-style path acceptance criteria for link following

### Other
- RED/GREEN: Windows path normalization in markdown link handling

## [0.8.1] - 2026-08-12

### Fixed
- Markdown pane no longer re-renders and loses fold state when file hasn't changed — #16, #17

### Documentation
- spec for markdown-refresh, CHANGELOG for 0.8.1

### Other
- RED/GREEN: refreshTab skips re-render on unchanged mtime
- RED/GREEN: /api/file/meta endpoint
- RED/GREEN: FileUsecase.Meta and Stat on FileReader

## [0.8.0] - 2026-08-11

### Documentation
- spec and CHANGELOG for follow-markdown-links

### Other
- RED/GREEN: link resolution, workspace guard, and isAllowedMarkdownFile fix
- RED/GREEN: click delegation for markdown links in Pane.jsx

## [0.8.0] - 2026-08-11

### Added
- Follow relative markdown links as in-app tabs

## [0.7.1] - 2026-08-09

### Documentation
- reformat spec to match template structure

### Other
- Implement folder collapse toggle in sidebar tree

## [0.7.0] - 2026-08-07

### Chores
- remove archived context wiki files
- update package-lock and add observability test case

### Other
- feat(observability): request logging and /api/log handler
- Add CHANGELOG for 0.7.0 release
- TDD steps 2 & 5: nested restore and 100-folder cap
- TDD steps 1 & 7: save and restore folders, delete per-row collapsed state
- RED/GREEN: save one open folder to localStorage

## [0.6.1] - 2026-08-07

### Fixes
- remove dead imports and allowedHosts left by hostcheck no-op
- unreachable
- ignore hostcheck

## [0.6.0] - 2026-08-06

### Other
- feat(markdown): highlight code fences with token-light theme

## [0.5.2] - 2026-08-06

### Chores
- sync package-lock version

### Other
- Merge branch 'fix/markdown-element-styles' into main
- fix(markdown): style table, blockquote, hr, list, img, h4-h6

## [0.5.1] - 2026-08-05

### Other
- fix(diagram): auto-wrap bare PlantUML fence bodies with @startuml/@enduml
- fix(diagram): render plantuml alias and fences with trailing info text

## [Unreleased]

### Fixes
- auto-wrap bare PlantUML fence bodies with @startuml/@enduml directives for rendering

## [0.5.0] - 2026-08-03

### Features
- render mermaid/puml fenced code blocks as inline SVG via async marked extension
- add diagramRenderer for lazy client-side mermaid/plantuml rendering

### Fixes
- normalize plantuml onError string to Error so a bad diagram can't blank the doc

### Chores
- add mermaid and @plantuml/core dependencies for client-side diagram rendering

### Other
- Merge branch 'feature/uml-rendering' into main
- style: add .diagram-error styling for failed diagram renders

## [0.4.0] - 2026-08-03

### Other
- Add --port/-p flag, default web server port to 4800

## [0.3.0] - 2026-08-03

### Features
- finalize workspace path feature with tree state preservation and regression tests
- wire workspace path into markdown tree loading, add cwd default
- add workspace-path setting with server-side directory listing

### Fixes
- refresh sidebar tree immediately after saving workspace path

### Chores
- remove archived context documents

### Other
- add: .context to gitignore

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