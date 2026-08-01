# Release Guide for madabyo

Automated releases via `npm run release` — handles all steps from pre-flight checks through GitHub Actions trigger.

## Quick Start

```bash
cd web
npm run release
```

## What It Does

### Automated Pre-Release Checks
✓ Verifies git working directory is clean  
✓ Runs test suite (`npm test`)  
✓ Builds frontend (`npm run build`)  
✓ Builds Go binary (`go build ./cmd/madabyo`)  
✓ Fetches git tags (checks for conflicts)  

### Version Management
✓ Parses current version from `web/package.json`  
✓ Suggests three options: patch / minor / major  
✓ Updates version in `web/package.json`  

### Release Notes
✓ Extracts commits since last tag  
✓ Groups by type (feat, fix, docs, chore)  
✓ Generates CHANGELOG.md entry  
✓ Prepends to existing CHANGELOG.md  

### Git & Tags
✓ Creates commit: `release: vX.Y.Z`  
✓ Creates annotated git tag: `vX.Y.Z`  
✓ Pushes commits and tags to origin  
✓ GitHub Actions release workflow auto-triggers on tag push  

## Usage

### Interactive Mode (default)

```bash
npm run release
```

Output example:
```
📦 madabyo Release Agent

✓ Git status clean
✓ Tests passed
✓ Frontend build passed
✓ Go build passed
✓ Tag check passed

Current version: 0.0.0

Choose version bump:

  1) 0.0.1 - patch (bug fixes)
  2) 0.1.0 - minor (new features)
  3) 1.0.0 - major (breaking changes)

Enter choice (1-3): 2

📝 Creating release v0.1.0

  • Generating release notes from commits...
  ✓ Updated web/package.json
  ✓ Updated CHANGELOG.md
  ✓ Created commit: release: v0.1.0
  ✓ Created tag: v0.1.0

🚀 Push to origin? (y/N): y
  ✓ Pushed commits
  ✓ Pushed tags

✅ Release v0.1.0 complete!
🎯 GitHub Actions will build and publish binaries.
```

### Non-Interactive Mode (CI/CD)

```bash
# Patch release (0.1.0 -> 0.1.1)
npm run release -- --patch

# Minor release (0.1.0 -> 0.2.0)
npm run release -- --minor

# Major release (0.1.0 -> 1.0.0)
npm run release -- --major

# Dry-run (shows what would happen)
npm run release -- --patch --dry-run
```

## Commit Message Convention

The release script parses conventional commits to generate release notes. Use these prefixes:

- `feat:` — New features → added to "Features" section
- `fix:` — Bug fixes → added to "Fixes" section
- `docs:` — Documentation → added to "Documentation" section
- `chore:` — Maintenance tasks → added to "Chores" section
- Other commits are ignored in changelog grouping

Example:
```bash
git commit -m "feat: add split-pane resizing"
git commit -m "fix: prevent race in renderPanes"
git commit -m "chore: update dependencies"
```

## CHANGELOG.md Format

Follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) format.

Example:

```markdown
# Changelog

All notable changes to madabyo are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-08-01

### Features
- add split-pane resizing
- implement markdown rendering

### Fixes
- prevent race in renderPanes
```

Each release prepends a new `## [X.Y.Z] - YYYY-MM-DD` section at the top.

## Troubleshooting

### "Git working directory not clean"
Your working tree has uncommitted changes. Either:
- Commit them: `git add . && git commit -m "..."`
- Stash them: `git stash`

### "Tests failed"
Fix failing tests before attempting release:
```bash
cd web && npm test
```

### "Frontend build failed"
Fix build issues:
```bash
cd web && npm run build
```

### "Go build failed"
Check Go syntax:
```bash
go build -v ./cmd/madabyo
```

### "Tag already exists"
The tag is already pushed. Either:
- Delete the local tag: `git tag -d vX.Y.Z`
- Use a new version number

### "Push failed"
Ensure you have push permissions and the remote is reachable:
```bash
git remote -v
git push --dry-run origin main
```

## GitHub Actions Integration

Once a tag `vX.Y.Z` is pushed:

1. **CI workflow** skips (not triggered on tags)
2. **Release workflow** (`.github/workflows/release.yml`) auto-triggers
3. Builds binaries for:
   - Linux (ubuntu-latest)
   - macOS (macos-latest)
   - Windows (windows-latest)
4. Publishes to GitHub Releases with auto-generated release notes
5. Binaries named: `madabyo-{os}-{arch}[.exe]`

Example release artifacts:
- `madabyo-linux-amd64`
- `madabyo-darwin-amd64` (Intel macOS)
- `madabyo-darwin-arm64` (Apple Silicon macOS)
- `madabyo-windows-amd64.exe`

## Version Sources

- **Single source of truth:** `web/package.json` → `version` field
- Go binary can read this if needed (not required for release workflow)
- No separate VERSION file or Go constant needed

## Dry-Run Testing

Test the full release flow without making changes:

```bash
npm run release -- --patch --dry-run
```

Shows exactly what would happen:
- ✓ All checks run
- ✓ Version is calculated
- ✓ Changelog is generated
- [DRY-RUN] Changes are NOT written
- [DRY-RUN] Git tag is NOT created
- [DRY-RUN] Nothing is pushed

Perfect for validating setup or testing in CI before going live.

## Implementation Details

**File:** `scripts/release.js`

Dependencies:
- Node.js built-in: `fs`, `path`, `child_process`, `readline`
- npm package: `semver` (v7.6.3+)

Workflow:
1. Pre-flight checks (git, tests, build)
2. Version calculation (semver)
3. Changelog generation (git log parsing)
4. File updates (package.json, CHANGELOG.md)
5. Git commit and tag
6. Push to remote

Exit codes:
- `0` — Success
- `1` — Any error (git, test, build, etc.)
