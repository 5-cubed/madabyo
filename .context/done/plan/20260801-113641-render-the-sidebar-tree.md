# Plan: Render the Sidebar Tree (SEQ-003)

**Type:** Self-Plan

## Scope
- Design unit: SEQ-003 "Render the sidebar tree", REQ-003, CMP-001 (WorkspaceController — only the sidebar-render wiring slice), CMP-005 (SidebarTree), CMP-006 (ThemeTokens).
- Flow (from SEQ-003):
  ```
  WorkspaceController
    |
    v
  <SidebarTree tree status onSelectFile />
    |
    v
  ThemeTokens (CSS custom properties)
  ```
- This plan covers both arrows: wiring the scanned tree into `<SidebarTree>` once a scan completes (`WorkspaceController` -> `SidebarTree`), and `SidebarTree`'s own render algorithm — the per-node VS Code icon decision and its stylesheet reading `ThemeTokens`' CSS custom properties (`SidebarTree` -> `ThemeTokens`).
- Builds on the SEQ-001 plan (`20260801-112229-pick-a-folder.md`)'s `useWorkspace()` (`folderHandle`, `openFolder`) and the SEQ-002 plan (`20260801-112843-scan-filter-and-prune-to-markdown-only.md`)'s addition of `tree` state to that same hook. This plan's Step 13 extends `App.jsx` (last touched by the SEQ-001 plan's Step 11) to render `<SidebarTree>` once `tree` is non-null. If either prior plan's holes are still unfilled when this one is auto-actioned, fill those first — Step 13 assumes a working `useWorkspace()` that already returns `tree`.
- No new test tooling needed — vitest/jsdom/testing-library were already added by the SEQ-001 plan's Step 0.
- Reference implementation: the feasibility prototype's `renderTree`/`renderNode` and `ICONS` map (`experiments/ide-style-markdown-viewer-feasibility/app/index.html`, lines 100-234) — a recursive per-node renderer picking a VS Code icon by node type from a `vscode-icons` CDN URL map. This plan keeps that same icon source and recursion shape. The prototype's expand/collapse chevron toggle and click-to-open-file behavior are **out of scope** — SEQ-003's own acceptance criteria only require icons-per-type and theme colors, not interaction; those are for the SEQs that introduce selection and collapsing (CMP-005 is listed as `Used By` several later SEQs, which will extend this same component). `onSelectFile` is accepted per CMP-005's interface but wired as a no-op stub here.
- `status` (per CMP-005: `'loading'|'ready'|'empty'|'unsupported'|'needs-permission'`) is only implemented for the `'ready'` value SEQ-003 calls for ("`status="ready"`" in the SEQ's own Sequence step 1). Every other value is handled by a single not-yet-differentiated `return null` gate (Step 6) — the loading spinner, empty-state message, unsupported-browser notice, and permission-request UI these other statuses imply are left for the SEQs that introduce them, the same way the SEQ-002 plan deferred `SidebarTree` itself.
- Theme values are pre-validated, not re-derived here: Token Light's editor bg `#faf9f5`, sidebar `#f6f5f1`, ink `#2a2920`, rust-orange accent `#9a4929`, per `experiments/token-light-theme-preview/index.html` and CMP-006. `tokens.css` is a new file; fully retiring the scaffold's placeholder `App.css`/`index.css` tokens (which CMP-006 says it eventually supersedes) is out of scope — not required by any REQ-003/SEQ-003 acceptance criterion.
- Test doubles: `FileSystemDirectoryHandle`/`FileSystemFileHandle` fakes (`fakeDir`, `fakeFile`) are reused from the SEQ-002 plan's convention (locally duplicated in the test file, not exported production code) for the one integration test that exercises a real scan. `SidebarTree`'s own unit tests use plain `TreeNode`-shaped JS objects (no fakes needed — `SidebarTree` never touches a handle, only the already-scanned tree shape).
- **Revision note (SEQ-005 delta):** SEQ-005 "Unsupported browser" (REQ-005 AC2) requires `SidebarTree` to display an unsupported-browser message when `status="unsupported"`. Step 6 below already introduced the `status` gate but only differentiated `"ready"` from everything else, collapsing `"unsupported"` (and every other non-`"ready"` value) into a bare `return null` — the message itself was never written. That gap belongs to this plan's own component (CMP-005) and its own `App.jsx` wiring (Step 13), so it is closed here as Steps 14-17, rather than duplicating this plan's already-implemented `SidebarTree`/wiring into a new file. The other half of REQ-005 — `WorkspaceController` not calling `pickFolder()` when unsupported (AC1) — belongs to `useWorkspace.openFolder`, owned by the `pick-a-folder.md` plan (SEQ-001); see that plan's own SEQ-005 delta (its Steps 14-15), which exposes the `isSupported` value this plan's Step 17 consumes. Steps 14-17 below assume that value exists on `useWorkspace()`'s return object; if that plan's Step 15 is unfilled when this plan is auto-actioned, fill it first.
  - **Fixture note:** the real `web/src/App.test.jsx` has one existing test that calls `vi.stubGlobal('showDirectoryPicker', vi.fn()...)` with no matching `vi.unstubAllGlobals()` afterward, so a global stub from one test can leak into the next. Step 16 below adds an `afterEach(() => vi.unstubAllGlobals())` to that file alongside its own test, so its "browser lacks the API" scenario (jsdom's real default — `showDirectoryPicker` doesn't exist there — no stubbing needed to simulate it) isn't polluted by test order, and future tests in the file stay isolated too.
- **Revision note (SEQ-006 delta):** SEQ-006 "Empty markdown result" (REQ-006) needs two things: (1) `SidebarTree` to show a distinct "no markdown files found" message when `status="empty"` (REQ-006 AC1), and (2) `WorkspaceController` (rendered here as `App.jsx`, per this plan's Step 13/17 wiring) to compute that status from the scanned tree's emptiness instead of hardcoding `"ready"` (SEQ-006 AC1: "An empty `TreeNode` result sets `status="empty"`, never `"ready"`"). Both halves are already owned by this plan's own component and its own `App.jsx` wiring — CMP-005's status dispatch (Steps 6, 15) and CMP-001's status-wiring (Steps 13, 17) — so the gap is closed here as Steps 18-21, rather than duplicating this plan's already-implemented component into a new file. TreeScanner's half of SEQ-006 (CMP-003: `scanTree()` resolving a non-null, zero-entry `TreeNode` when the folder has no markdown descendants) is already fully implemented and tested by the `scan-filter-and-prune-to-markdown-only.md` plan's Steps 10-11 — no gap there, so that plan carries only a documentation note, not new steps; Step 20 below is the integration test proving the two plans' work composes correctly end-to-end.
- **Revision note (SEQ-007 delta):** SEQ-007 "Large-tree scan stays responsive" (REQ-007) needs `SidebarTree` to render an actual loading indicator when `status="loading"` (AC1) — currently Step 6's status gate collapses `"loading"` into the same undifferentiated `return null` as every other non-`"ready"` status, per this plan's original Scope note — and needs `App.jsx` to mount `<SidebarTree>` with that status while a scan is in flight, even during the very first scan when `tree` is still `null` (today's Step 13/17/21 wiring only ever mounts `<SidebarTree>` once `tree` is truthy, so nothing renders at all during that first scan). Both halves are already owned by this plan's own component and its own `App.jsx` wiring, so the gap is closed here as Steps 22-25, rather than duplicating this plan's already-implemented component and wiring into a new file. The `isScanning` state this plan's Step 25 consumes is added to `useWorkspace()` by the `scan-filter-and-prune-to-markdown-only.md` plan's own SEQ-007 delta (its Steps 14-15), which already owns the `scanTree(handle)` call site it brackets; if that plan's Step 15 is unfilled when this plan is auto-actioned, fill it first. See that plan's Scope note for why REQ-007 AC2 ("the page remains interactive during the scan") needs no dedicated test here or there: it's an inherent property of the real File System Access API's async, I/O-bound directory iteration, not something either plan's code changes.

## Action Sequence

- **Step 1 (test).** Write failing test in `web/src/theme/tokens.test.js`: import `web/src/theme/tokens.css` as raw text (`import tokensCss from './tokens.css?raw'`) and assert it contains `--color-editor-bg: #faf9f5`, `--color-sidebar-bg: #f6f5f1`, `--color-ink: #2a2920`, and `--color-accent: #9a4929`.

- **Step 2 (impl).** Create `web/src/theme/tokens.css` with a `:root` block defining those four custom properties at those exact values, so Step 1 passes.
  - **Working:** Entire step — four literal, pre-validated constant values (Token Light, per CMP-006 and the token-light-theme-preview check). There is no decision or transformation to make; holing a given constant would blank a fact, not a choice, so per `todo-hole.md` this has no hole.

- **Step 3 (test).** Write failing test in `web/src/components/SidebarTree.test.jsx`: render `<SidebarTree tree={{ type: "dir", name: "notes", path: "notes", children: [] }} status="ready" onSelectFile={() => {}} />`; assert the row containing the text "notes" has an `<img>` whose `src` contains `default_folder`.

- **Step 4 (impl).** Implement the base of `SidebarTree` in `web/src/components/SidebarTree.jsx`: a private `TreeNode({ node })` that renders one row (`<img>` + `<span>{node.name}</span>`, both wrapped in a `.tree-row` inside a `.tree-node`) using a fixed `ICONS.folder` icon (from an `ICONS` map of `vscode-icons` CDN URLs, matching the prototype's `ICON_BASE`/`ICONS`), and an exported `SidebarTree({ tree })` that renders `null` when `tree` is falsy, otherwise `<div className="sidebar-tree"><TreeNode node={tree} /></div>`, so Step 3 passes.
  - **Working:** Entire step (the `ICON_BASE`/`ICONS` map — both URLs already validated by the prototype, not re-derived; `TreeNode`'s row markup; `SidebarTree`'s null-guard and wrapper). First-pass structural rendering with no per-node-type or per-status decision yet — nothing to hole.

- **Step 5 (test).** Write failing test in `SidebarTree.test.jsx`: render `<SidebarTree tree={{ type: "dir", name: "notes", path: "notes", children: [] }} status="loading" onSelectFile={() => {}} />`; assert `screen.queryByText("notes")` is absent (nothing renders for a non-`"ready"` status).

- **Step 6 (impl).** Extend `SidebarTree` in `SidebarTree.jsx` with a status gate ahead of the existing tree/null check, so Step 5 passes.
  - **Working:** None new — the surrounding tree-rendering logic from Step 4 is unchanged.
  - **Hole:** The in-stage key-change line — `SidebarTree`'s own decision that only the `"ready"` status renders tree content, the one differentiated branch of CMP-005's five-value `status` dispatch (the other four are deferred, per Scope). TODO (per `todo-hole.md`):
    ```jsx
    // TODO:
    // 1. Compare status against the literal string "ready" — the only status
    //    this SEQ renders content for. Every other value means the tree isn't
    //    displayable yet (loading, empty, unsupported, needs-permission are
    //    handled by later work).
    // 2. If status is not "ready", return null before touching tree at all.
    // e.g. status="empty" -> status !== "ready" -> true -> return null
    //      status="ready" -> status !== "ready" -> false -> falls through to render tree
    if (status !== /* */) return null;
    ```

- **Step 7 (test).** Write failing test in `SidebarTree.test.jsx`: render `<SidebarTree tree={{ type: "dir", name: "notes", path: "notes", children: [{ type: "file", name: "todo.md", path: "notes/todo.md" }] }} status="ready" onSelectFile={() => {}} />`; assert the "notes" row's `<img>` still contains `default_folder`, and the "todo.md" row's `<img>` contains `file_type_markdown`.

- **Step 8 (impl).** Extend `TreeNode` in `SidebarTree.jsx`: compute `const isDir = node.type === "dir";`; change the row's icon to a ternary on `isDir`; when `isDir`, additionally render a `.tree-children` block mapping `node.children` to recursive `<TreeNode key={child.path} node={child} />` calls, so Step 7 passes.
  - **Working:** The `const isDir = node.type === "dir";` declaration, and the `{isDir && (<div className="tree-children">{node.children.map(...)}</div>)}` recursion block — new infrastructure that lets the tree render more than one level, not itself the AC1 icon decision.
  - **Hole:** The in-stage key-change line — the one line directly answering REQ-003/SEQ-003 AC1 ("every folder node shows the folder icon; every markdown file node shows the markdown icon"): the ternary choosing the icon from `isDir`. TODO (per `todo-hole.md`):
    ```jsx
    // TODO:
    // 1. isDir tells you which icon this node needs: ICONS.folder for a
    //    directory, ICONS.markdown for a file.
    // 2. Build a ternary on isDir that picks between the two.
    // e.g. node = { type: "file", name: "README.md" } -> isDir = false
    //      -> isDir ? ICONS.folder : ICONS.markdown -> ICONS.markdown
    //      node = { type: "dir", name: "assets" } -> isDir = true
    //      -> isDir ? ICONS.folder : ICONS.markdown -> ICONS.folder
    <img src={/* */} alt="" />
    ```

- **Step 9 (test).** Write test in `SidebarTree.test.jsx`: render a two-level tree (`{ type: "dir", name: "root", path: "root", children: [{ type: "dir", name: "docs", path: "root/docs", children: [{ type: "file", name: "api.md", path: "root/docs/api.md" }] }] }`) with `status="ready"`; assert "root", "docs", and "api.md" all render, with "api.md"'s icon containing `file_type_markdown`. This is a regression check confirming Step 8's recursion generalizes past one level — expected to already pass with no further implementation change; if it fails, Step 8's recursion block was filled in without recursing on every directory child.

- **Step 10 (test).** Write failing test (same file or a co-located `SidebarTree.css.test.js`): import `web/src/components/SidebarTree.css` as raw text and assert it contains `var(--color-sidebar-bg)` and `var(--color-ink)`.

- **Step 11 (impl).** Create `web/src/components/SidebarTree.css` with a `.sidebar-tree` rule setting `background: var(--color-sidebar-bg);` and `color: var(--color-ink);`; import it at the top of `SidebarTree.jsx` (`import './SidebarTree.css'`), so Step 10 passes.
  - **Working:** Entire step — a static stylesheet referencing already-defined tokens by name, no decision to make (same rationale as Step 2's `tokens.css`).

- **Step 12 (test).** Write failing test in `web/src/App.test.jsx` (extending the SEQ-001/002 plans' suite, `folderPicker.pickFolder` mocked via `vi.mock` as before, plus the local `fakeDir`/`fakeFile` helpers from the SEQ-002 plan): mock `pickFolder` to resolve `fakeDir("notes", [["todo.md", fakeFile("todo.md")]])`. Render `<App />`, click the "Open Folder" button, then assert (via `findByText`, since the scan resolves asynchronously) that "todo.md" appears with an icon `src` containing `file_type_markdown`. This is the end-to-end integration test for SEQ-003's first flow arrow (click -> `openFolder` -> `scanTree` -> `tree` state -> `<SidebarTree>` renders it), mocking only the true system boundary (`pickFolder`), per `tdd-mocking.md` — `scanTree` and `SidebarTree` both run for real.

- **Step 13 (impl).** Extend `web/src/App.jsx`: import `SidebarTree` from `./components/SidebarTree.jsx` and `./theme/tokens.css`; read `tree` from `useWorkspace()` (alongside the existing `folderHandle`/`openFolder`); render `<SidebarTree>` next to the existing button, gated on `tree`, so Step 12 passes.
  - **Working:** The `import SidebarTree from './components/SidebarTree.jsx'` and `import './theme/tokens.css'` statements, the destructure extended to `const { folderHandle, tree, openFolder } = useWorkspace();`, and the `status="ready"`/`onSelectFile={() => {}}` prop values passed to `<SidebarTree>` (status is fixed per Scope; the click-wiring stub is a later SEQ's concern).
  - **Hole:** The flow-connecting line — this is SEQ-003's first flow arrow (`WorkspaceController` -> `<SidebarTree>`): the decision to mount `<SidebarTree>` only once `tree` (from `useWorkspace()`) is non-null, i.e. once the scan has completed. TODO (per `todo-hole.md`):
    ```jsx
    // TODO:
    // 1. tree comes from useWorkspace() — null until a scan completes, then
    //    the pruned TreeNode.
    // 2. Only mount <SidebarTree> once tree is truthy; render nothing before that.
    // e.g. tree = { type: "dir", name: "wiki", path: "wiki", children: [...] }
    //      -> truthy -> renders <SidebarTree tree={tree} status="ready" onSelectFile={() => {}} />
    //      tree = null -> falsy -> nothing renders
    {/* */ && (
      <SidebarTree tree={tree} status="ready" onSelectFile={() => {}} />
    )}
    ```

- **Step 14 (test, SEQ-005).** Write failing test in `SidebarTree.test.jsx`: render `<SidebarTree tree={null} status="unsupported" onSelectFile={() => {}} />`; assert `screen.getByText("Your browser doesn't support opening local folders.")` is present.

- **Step 15 (impl, SEQ-005).** Extend the Step 6 status gate in `SidebarTree.jsx`: ahead of the existing `if (status !== "ready") return null;` line, add a branch that returns the unsupported-browser message when `status === "unsupported"`, so Step 14 passes.
  - **Working:** The existing `if (status !== "ready") return null;` line from Step 6, unchanged — it still catches every other non-`"ready"` status (loading, empty, needs-permission), deferred per this plan's original Scope. The message element's own markup (`<div className="sidebar-message">...</div>`) — fixed, pre-decided text, not a decision (same rationale as Step 2's `tokens.css` values).
  - **Hole:** The in-stage key-change line — `SidebarTree`'s decision that `"unsupported"` specifically (as opposed to every other non-`"ready"` status) gets a message instead of `null`, the one differentiated branch REQ-005 AC2 asks for, alongside Step 6's existing `"ready"` branch. TODO (per `todo-hole.md`):
    ```jsx
    // TODO:
    // 1. Compare status against the literal string "unsupported" — the one
    //    status this SEQ renders a message for, ahead of the existing
    //    ready-only gate below.
    // 2. If it matches, return the message element instead of falling through.
    // e.g. status="loading" -> status === "unsupported" -> false -> falls
    //      through to the existing `if (status !== "ready") return null;` gate
    //      status="unsupported" -> status === "unsupported" -> true -> returns
    //      the message element
    if (status === /* */) {
      return <div className="sidebar-message">Your browser doesn't support opening local folders.</div>
    }
    ```

- **Step 16 (test, SEQ-005).** Extend `web/src/App.test.jsx`: add `afterEach(() => vi.unstubAllGlobals())` (the fixture fix from the Scope note above). Write a new failing test: with no `vi.stubGlobal` call at all (jsdom has no `showDirectoryPicker` by default, so the browser is unsupported without any setup), render `<App />`; assert `screen.getByText("Your browser doesn't support opening local folders.")` appears immediately, before any click. As a regression check on the `pick-a-folder.md` plan's Step 15 gate, also click the "Open Folder" button and assert no folder name or tree content ever appears — confirming AC1 end-to-end, on top of that plan's own direct unit test of the same gate.

- **Step 17 (impl, SEQ-005).** Extend `web/src/App.jsx`: read `isSupported` from `useWorkspace()` (alongside the existing `folderHandle`, `tree`, `openFolder`); wrap the existing Step 13 tree-gated branch in an outer condition on `isSupported`, so that when it's `false`, `<SidebarTree tree={null} status="unsupported" onSelectFile={() => {}} />` renders unconditionally instead, so Step 16 passes.
  - **Working:** The destructure update `const { folderHandle, tree, isSupported, openFolder } = useWorkspace()`. The unsupported branch's fixed props (`tree={null} status="unsupported" onSelectFile={() => {}}`). The existing tree-gated branch from Step 13 (`tree && <SidebarTree tree={tree} status="ready" onSelectFile={() => {}} />`), now nested as the `else`, unchanged.
  - **Hole:** The flow-connecting line — this is SEQ-005's final flow arrow (`FolderPicker.isSupported() --> false` -> `<SidebarTree status="unsupported">`): the outer condition on `isSupported` that decides which of the two branches renders. TODO (per `todo-hole.md`):
    ```jsx
    // TODO:
    // 1. isSupported comes from useWorkspace() — a fixed feature-detection
    //    result, independent of tree or folderHandle.
    // 2. When it's false, render the unsupported branch unconditionally;
    //    otherwise fall through to the existing tree-gated branch.
    // e.g. isSupported=true, tree=null -> falls to the tree-gated branch,
    //      which renders nothing (tree is falsy)
    //      isSupported=false -> renders <SidebarTree tree={null}
    //      status="unsupported" onSelectFile={() => {}} />, regardless of tree
    {/* */ ? (
      <SidebarTree tree={null} status="unsupported" onSelectFile={() => {}} />
    ) : (
      tree && <SidebarTree tree={tree} status="ready" onSelectFile={() => {}} />
    )}
    ```

- **Step 18 (test, SEQ-006).** Write failing test in `SidebarTree.test.jsx`: render `<SidebarTree tree={{ type: "dir", name: "root", path: "root", children: [] }} status="empty" onSelectFile={() => {}} />`; assert `screen.getByText("No markdown files found.")` is present, and `screen.queryByText("root")` is absent — the empty-state message replaces the tree, it doesn't render alongside it.

- **Step 19 (impl, SEQ-006).** Extend the status gate in `SidebarTree.jsx`: add a branch returning the empty-state message when `status === "empty"`, alongside the existing Step 15 `"unsupported"` branch and ahead of the Step 6 `if (status !== "ready") return null;` catch-all, so Step 18 passes.
  - **Working:** Entire step (the `if (status === "empty") { return <div className="sidebar-message">No markdown files found.</div> }` branch). Per `todo-hole.md`'s "several similar branches" rule, this status dispatch already has two holed representative branches from earlier revisions (Step 6's `"ready"` gate, Step 15's `"unsupported"` branch) — both teach the same pattern (compare `status` to a literal, return early with a message or `null`). A third repetition of that exact pattern adds no new understanding, so it stays working code.

- **Step 20 (test, SEQ-006).** Write failing test in `web/src/App.test.jsx` (`folderPicker.pickFolder` mocked via `vi.mock` as established in Step 12, plus the local `fakeDir`/`fakeFile` helpers): mock `pickFolder` to resolve `fakeDir("empty-notes", [["image.png", fakeFile("image.png")]])` — zero markdown descendants, the same fixture shape as the `scan-filter-and-prune-to-markdown-only.md` plan's Step 10. Render `<App />`, click the "Open Folder" button, then (via `findByText`, since the scan resolves asynchronously) assert `"No markdown files found."` appears, and assert `screen.queryByText("empty-notes")` never appears. This confirms REQ-006 AC1 (a distinct empty message, not a blank sidebar) end-to-end, and REQ-006 AC2 (no error thrown) — an unhandled exception anywhere in `scanTree` or the new status computation would fail this test on the `await` rather than resolve to the expected text.

- **Step 21 (impl, SEQ-006).** Extend `App.jsx`'s Step 17 tree-gated branch: replace the hardcoded `status="ready"` with a value computed from `tree.children.length`, so Step 20 passes.
  - **Working:** The surrounding `tree && <SidebarTree tree={tree} ... onSelectFile={() => {}} />` gate and its `tree`/`onSelectFile` props, unchanged from Step 17.
  - **Hole:** The flow-connecting line — this is SEQ-006's flow arrow (`TreeScanner.scanTree(handle) --> TreeNode (empty)` -> `WorkspaceController` sets status): the line where `App.jsx` uses the scanned `tree`'s emptiness to decide between `"empty"` and `"ready"` before rendering `<SidebarTree>`. This directly implements SEQ-006 AC1 ("An empty `TreeNode` result sets `status="empty"`, never `"ready"`"). TODO (per `todo-hole.md`):
    ```jsx
    // TODO:
    // 1. tree.children is the pruned, markdown-only entries directly under the
    //    scanned root — TreeScanner.scanTree's contract says an empty result
    //    has children: [].
    // 2. If tree.children.length is 0, the folder has zero markdown files —
    //    use status "empty". Otherwise use "ready".
    // e.g. tree = { type: "dir", name: "wiki", path: "wiki", children: [] }
    //      -> tree.children.length === 0 -> true -> status = "empty"
    //      tree = { type: "dir", name: "wiki", path: "wiki", children: [{...}] }
    //      -> tree.children.length === 0 -> false -> status = "ready"
    tree && (
      <SidebarTree
        tree={tree}
        status={tree.children.length === 0 ? /* */ : /* */}
        onSelectFile={() => {}}
      />
    )
    ```

- **Step 22 (test, SEQ-007).** Write failing test in `SidebarTree.test.jsx`: render `<SidebarTree tree={null} status="loading" onSelectFile={() => {}} />`; assert `screen.getByText("Loading files...")` is present.

- **Step 23 (impl, SEQ-007).** Extend the status gate in `SidebarTree.jsx`: add a branch returning the loading message when `status === "loading"`, alongside the existing Step 15 `"unsupported"` and Step 19 `"empty"` branches, ahead of the Step 6 `if (status !== "ready") return null;` catch-all, so Step 22 passes.
  - **Working:** Entire step (the `if (status === "loading") { return <div className="sidebar-message">Loading files...</div> }` branch). Per `todo-hole.md`'s "several similar branches" rule, this status dispatch already has representative holed/working branches teaching the same compare-and-return-early pattern (Step 6's `"ready"` gate holed, Step 15's `"unsupported"` branch holed, Step 19's `"empty"` branch left working once the pattern was already taught twice) — a fourth near-identical branch adds no new understanding, so it stays working code, same rationale as Step 19.

- **Step 24 (test, SEQ-007).** Write failing test in `web/src/App.test.jsx`: reuse the `deferred()` and `fakeDirDeferred(name, entries, gate)` helpers from the `scan-filter-and-prune-to-markdown-only.md` plan's Step 14 (duplicated locally in this file, per this plan's established convention for the shared `fakeDir`/`fakeFile` doubles). Mock `pickFolder` to resolve `fakeDirDeferred("notes", [["todo.md", fakeFile("todo.md")]], gate)`. Render `<App />` and click the "Open Folder" button; before resolving the gate, assert (via `findByText`, waiting for the click handler's `pickFolder` await to flush) that "Loading files..." appears and `screen.queryByText("todo.md")` is absent. Then call `gate.resolve()` and assert (via `findByText`) that "todo.md" appears and `screen.queryByText("Loading files...")` is gone. This is the end-to-end proof of SEQ-007 AC1 (loading shown for the full scan duration, then replaced on resolution) — see this plan's Scope note above for why AC2 needs no separate assertion here.

- **Step 25 (impl, SEQ-007).** Extend `App.jsx`: add `isScanning` to the `useWorkspace()` destructure (alongside `folderHandle`, `tree`, `isSupported`, `openFolder`); insert a second branch between the existing `!isSupported` check (Step 17) and the tree-gated branch (Steps 13/21): when `isScanning` is true, render `<SidebarTree tree={null} status="loading" onSelectFile={() => {}} />` before ever evaluating `tree`, so Step 24 passes.
  - **Working:** The destructure update (`const { folderHandle, tree, isSupported, isScanning, openFolder } = useWorkspace();`), the loading branch's fixed props, and the existing tree-gated branch (Steps 13/21), unchanged.
  - **Hole:** The flow-connecting line — this is SEQ-007's flow arrow (`WorkspaceController(status="loading")` -> `<SidebarTree status="loading">`): the condition on `isScanning` that decides whether the loading branch renders instead of the tree-gated branch. TODO (per `todo-hole.md`):
    ```jsx
    // TODO:
    // 1. isScanning comes from useWorkspace() — true for the full duration
    //    between calling scanTree() and its resolution (SEQ-007 AC1).
    // 2. Add it as a second branch between the existing !isSupported check and
    //    the tree-gated branch: when isScanning is true, render the loading
    //    branch before ever looking at tree.
    // e.g. isSupported=true, isScanning=true, tree=null (first scan in flight)
    //      -> renders <SidebarTree tree={null} status="loading" onSelectFile={() => {}} />
    //      isSupported=true, isScanning=false, tree={...} -> falls through to
    //      the existing tree && <SidebarTree tree={tree} status={...} .../> branch
    {!isSupported ? (
      <SidebarTree tree={null} status="unsupported" onSelectFile={() => {}} />
    ) : /* */ ? (
      <SidebarTree tree={null} status="loading" onSelectFile={() => {}} />
    ) : (
      tree && (
        <SidebarTree
          tree={tree}
          status={tree.children.length === 0 ? "empty" : "ready"}
          onSelectFile={() => {}}
        />
      )
    )}
    ```

## Hole / Working Tally
| Step | Implementation lines | Hole | Working |
|---|---|---|---|
| 2 — `tokens.css` values | 4 | 0 | 4 |
| 4 — `SidebarTree`/`TreeNode` base | 6 | 0 | 6 |
| 6 — status gate | 1 | 1 | 0 |
| 8 — icon-per-type decision + recursion | 5 | 1 | 4 |
| 11 — `SidebarTree.css` | 2 | 0 | 2 |
| 13 — wire `tree` into `<SidebarTree>` | 4 | 1 | 3 |
| 15 — unsupported-message branch (SEQ-005) | 2 | 1 | 1 |
| 17 — wire `isSupported` into `<SidebarTree>` (SEQ-005) | 4 | 1 | 3 |
| 19 — empty-state message branch (SEQ-006) | 2 | 0 | 2 |
| 21 — wire empty/ready status into `<SidebarTree>` (SEQ-006) | 1 | 1 | 0 |
| 23 — loading-message branch (SEQ-007) | 2 | 0 | 2 |
| 25 — wire `isScanning` into `<SidebarTree>` (SEQ-007) | 4 | 1 | 3 |
| **Total** | **37** | **7 (19%)** | **30 (81%)** |

- Below the ~30% target. SEQ-003's flow has only one true flow-connecting arrow (`WorkspaceController` -> `<SidebarTree>`, Step 13) — the second arrow (`SidebarTree` -> `ThemeTokens`) is a static CSS variable reference with no decision to hole, same as `tokens.css` itself. The remaining holes are `SidebarTree`'s and `App.jsx`'s own core decisions (status gate, icon-per-type, empty/ready/loading computation). A meaningful share of this SEQ's actual work is literal, pre-validated constants (the Token Light hex values, the `vscode-icons` CDN URLs) that the task explicitly calls out as already validated and not to be re-derived — per `todo-hole.md`, holing a given constant would blank a fact, not a choice, so none of that carries a hole.
- No holes were added to pad the ratio: Step 4's base rendering and Step 9's regression test carry none because, per `todo-hole.md`, they have no decision or returned value to act on at that point in the build.
- **SEQ-005 revision delta:** Steps 15 and 17 add two new holes (6 implementation lines, 2 holes) covering REQ-005 AC2 and the render-side half of AC1/AC2's flow arrow. Combined tally moved from 14% to 18% holed — still below 30%, consistent with this plan's already-established rationale above (a component with more literal/constant content than decision points); no padding hole was added purely to chase the ratio.
- **SEQ-006 revision delta:** Steps 19 and 21 add one new hole (3 implementation lines total, 1 hole) covering REQ-006 AC1's status computation. Step 19's empty-state branch stays working code, per `todo-hole.md`'s "several similar branches" rule — the status-dispatch pattern was already taught twice (Steps 6 and 15), so a third near-identical branch adds no new teaching value. Combined tally moves from 18% to 19% holed — still below 30%, consistent with this plan's established rationale; no padding hole was added purely to chase the ratio.
- **SEQ-007 revision delta:** Steps 23 and 25 add one new hole (6 implementation lines total, 1 hole) covering REQ-007 AC1's render-side wiring. Step 23's loading-message branch stays working code for the same "several similar branches" reason as Step 19 — the status-dispatch pattern has now been taught three times over (Steps 6, 15, 19). Combined tally holds flat at 19% holed — still below 30%, consistent with this plan's established rationale; no padding hole was added purely to chase the ratio.

## Recommended Human Work Order
Every holed step above, reordered top-down along the flow (entry point -> algorithm), instead of build order.
- **Step 17**: Wire `isSupported` into `<SidebarTree>` (SEQ-005) — `web/src/App.jsx`, function `App` — the flow's entry point; runs first on every render, deciding between the unsupported branch and everything else.
- **Step 25**: Wire `isScanning` into `<SidebarTree>` (SEQ-007) — `web/src/App.jsx`, function `App` — nested inside Step 17's `else` branch; runs next, deciding between the loading branch and the tree-gated branch before `tree` is ever evaluated.
- **Step 13**: Wire `tree` into `<SidebarTree>` — `web/src/App.jsx`, function `App` — nested inside Step 25's `else` branch; the original entry point for the supported-and-not-scanning path (`WorkspaceController` -> `<SidebarTree>`).
- **Step 21**: Wire the empty/ready status into `<SidebarTree>` (SEQ-006) — `web/src/App.jsx`, function `App` — same nested location as Step 13; decides *what* status value the tree-gated branch passes, right after Step 13 decides *whether* to render it at all.
- **Step 15**: The unsupported-message branch (SEQ-005) — `web/src/components/SidebarTree.jsx`, function `SidebarTree` — one level down, inside `SidebarTree`'s own status dispatch, alongside Steps 6 and 23.
- **Step 6**: The `status` gate — `web/src/components/SidebarTree.jsx`, function `SidebarTree` — same level as Step 15; the first decision `SidebarTree` makes on every render, before it looks at `tree` at all.
- **Step 8**: The icon-per-type decision — `web/src/components/SidebarTree.jsx`, function `TreeNode` — the algorithm's leaf-level decision, fulfilling REQ-003/SEQ-003 AC1.

## Closeout
- [ ] Review + Test — once every hole above is filled in, re-run `/auto-action` on this plan; it detects the holes are gone and reviews each one against its recorded intent, then runs the tests
