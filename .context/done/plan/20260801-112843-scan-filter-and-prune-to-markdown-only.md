# Plan: Scan, Filter, and Prune to Markdown-only (SEQ-002)

**Type:** Self-Plan

## Scope
- Design unit: SEQ-002 "Scan, filter, and prune to markdown-only", REQ-002, CMP-001 (WorkspaceController — only the scan-wiring slice), CMP-003 (TreeScanner).
- Flow (from SEQ-002):
  ```
  WorkspaceController
    |
    v
  TreeScanner.scanTree(handle)
    |
    v
  TreeNode (markdown-only, pruned)
  ```
- This plan covers both arrows: TreeScanner's own scan/filter/prune algorithm (the leaf stage), and its wiring into `WorkspaceController`'s state (the flow-connecting stage). SidebarTree rendering of the tree (SEQ-003), `FolderHandleStore` persistence, and the `resumeFolder()` path are out of scope — later SEQs.
- Builds on the SEQ-001 self-plan (`20260801-112229-pick-a-folder.md`)'s `useWorkspace()` hook: its `folderHandle` state and `openFolder()` (with the `if (/* */) setFolderHandle(/* */)` hole at that plan's Step 8). This plan's Step 13 extends that same `if` branch to also trigger the scan. If that hole is still unfilled when this plan is auto-actioned, fill SEQ-001's hole first — Step 13 below assumes a working `if (handle) { ... }` branch to extend.
- No new test tooling needed — vitest/jsdom/testing-library were already added by the SEQ-001 plan's Step 0.
- Reference algorithm: the feasibility prototype's `walkHandle` (`experiments/.../app/index.html`) and `scan-benchmark.mjs`'s `walk` — both recurse per directory entry, keep `.md` files, and prune a subtree by returning `null`/skipping when it collects zero children. Sorting the prototype does for display is skipped here — not required by any REQ-002/SEQ-002 acceptance criterion, and SidebarTree (SEQ-003) owns presentation concerns.
- Contract note: unlike the prototype's `walkHandle` (which may return `null` for the whole tree), CMP-003 fixes `scanTree`'s return type as `Promise<TreeNode>` (non-nullable, "may be an empty tree"). So the production shape is a private recursive `walk(dirHandle, path)` that keeps the prototype's `null`-for-empty-subtree convention internally, wrapped by an exported `scanTree(handle)` that normalizes a root-level `null` into an empty dir node.
- Test doubles: `FileSystemDirectoryHandle`/`FileSystemFileHandle` are not a true system boundary the way the native folder picker dialog is — they're just objects exposing `.kind`, `.name`, and (for directories) an async-iterable `.entries()`. Per `tdd-mocking.md`, tests build in-memory fakes (`fakeDir(name, entries)`, `fakeFile(name)`) implementing that same shape, rather than mocking `TreeScanner` itself. `TreeScanner.scanTree` is domain logic in the same process — it is exercised for real in every test below, including the `useWorkspace` integration test in Step 12 (only `folderPicker.pickFolder`, the true native-dialog boundary already established in the SEQ-001 plan, is mocked there).
- **Revision note (SEQ-006 check, no changes needed):** SEQ-006 "Empty markdown result" (REQ-006) needs, as its first flow stage, `TreeScanner.scanTree()` resolving a zero-entry `TreeNode` (not `null`, not a thrown error) when the granted folder has no markdown descendants. That contract is already fully specified and tested here — Step 10 tests exactly this input (`fakeDir("root", [["image.png", fakeFile("image.png")]])`) and Step 11 implements the `null`-to-empty-dir-node normalization that satisfies it. No new step or hole was added for SEQ-006 in this plan; the genuinely missing pieces (`WorkspaceController` computing `status="empty"` from the tree, and `SidebarTree` rendering the "no markdown files found" message) belong to CMP-001's and CMP-005's render wiring and are closed instead in the `render-the-sidebar-tree.md` plan's Steps 18-21, per `/co-plan`'s revise-vs-create convention (each gap closed in the plan that already owns the affected file).
- **Revision note (SEQ-007 delta):** SEQ-007 "Large-tree scan stays responsive" (REQ-007) needs `status` to read `"loading"` for the full duration between calling `TreeScanner.scanTree()` and its resolution (AC1), while the page stays interactive throughout (AC2). Half of this belongs to `useWorkspace`'s own `openFolder`, which already owns the `scanTree(handle)` call site (Step 13 above) — so the loading-state bookkeeping is added here as Steps 14-15, rather than duplicating this plan's already-implemented call site into a new file. The other half — actually rendering a loading indicator from that state, and mounting `<SidebarTree>` while `tree` is still `null` during the very first scan — belongs to `SidebarTree`'s own status dispatch and `App.jsx`'s render wiring, both owned by the `render-the-sidebar-tree.md` plan; see that plan's own SEQ-007 delta (its Steps 22-25). AC2 ("the page remains interactive during the scan") needs no new code or test on either side: `walk`'s traversal (Step 2 above) iterates `dirHandle.entries()` with `for await`, and in the real File System Access API each iteration step is a genuine OS-level directory-read I/O call — a task-queue boundary, not a synchronous CPU loop — so the main thread is never monopolized, the same non-blocking behavior the feasibility prototype's benchmark already measured (CMP-003: "56ms avg over 12,877 files"). jsdom has no real single-threaded rendering to starve, so a literal "click during scan" test would only exercise jsdom's own scheduling, not this guarantee; Step 24 in the `render-the-sidebar-tree.md` plan's delta (the loading indicator becoming visible while the scan promise is still pending) is the closest meaningful evidence available in this test environment that rendering isn't blocked by the scan.

## Action Sequence

- **Step 1 (test).** Write failing test in `web/src/workspace/treeScanner.test.js`: define local helpers `fakeFile(name)` returning `{ kind: "file", name }` and `fakeDir(name, entries)` returning `{ kind: "directory", name, entries: async function* () { for (const e of entries) yield e; } }`. Given `fakeDir("root", [["notes.md", fakeFile("notes.md")]])`, `scanTree(root)` resolves to `{ type: "dir", name: "root", path: "root", children: [{ type: "file", name: "notes.md", path: "root/notes.md", handle: <the fake file handle> }] }`.

- **Step 2 (impl).** Implement the base of `walk(dirHandle, path)` and its wrapper `scanTree(handle)` in `web/src/workspace/treeScanner.js`: iterate `dirHandle.entries()`; for each entry with `kind === "file"`, push `{ type: "file", name, path: \`${path}/${name}\`, handle: entryHandle }` into `children`; after the loop, return `{ type: "dir", name: dirHandle.name, path, children }`. `scanTree(handle)` calls and returns `walk(handle, handle.name)`. So Step 1 passes.
  - **Working:** Entire step (8 lines: the loop setup, the file-kind check, the pushed file-node shape, the returned dir-node shape, and the wrapper's delegation). First-pass structural algorithm with no filter, recursion, or prune decision yet — nothing to hole.

- **Step 3 (test).** Write failing test in `treeScanner.test.js`: given `fakeDir("root", [["notes.md", fakeFile("notes.md")], ["image.png", fakeFile("image.png")]])`, `scanTree(root)`'s `children` contains only the `notes.md` entry — `image.png` is excluded.

- **Step 4 (impl).** Extend `walk`'s file-branch condition in `treeScanner.js` to `entryHandle.kind === "file" && name.toLowerCase().endsWith(".md")`, so Step 3 passes.
  - **Working:** The pushed node shape (`children.push({ type: "file", name, path: ..., handle: entryHandle })`), unchanged from Step 2.
  - **Hole:** The in-stage key-change line — the filter decision that determines whether a file entry belongs in the markdown-only tree (REQ-002: "filter entries to `.md` files"; SEQ-002 AC1: "excludes every non-markdown file"). TODO (per `todo-hole.md`):
    ```javascript
    // TODO:
    // 1. A file entry belongs in the tree only if its kind is "file" AND its
    //    name ends in ".md" (case-insensitively).
    // 2. Compare name.toLowerCase() against ".md" using endsWith.
    // e.g. entryHandle.kind="file", name="Report.MD"
    //      -> "Report.MD".toLowerCase() -> "report.md" -> endsWith(".md") -> true -> kept
    //      entryHandle.kind="file", name="image.png" -> "image.png".endsWith(".md") -> false -> skipped
    if (entryHandle.kind === "file" && /* */) {
      children.push({ type: "file", name, path: `${path}/${name}`, handle: entryHandle });
    }
    ```

- **Step 5 (test).** Write failing test in `treeScanner.test.js`: given `fakeDir("root", [["docs", fakeDir("docs", [["api.md", fakeFile("api.md")]])]])`, `scanTree(root)` resolves to `{ type: "dir", name: "root", path: "root", children: [{ type: "dir", name: "docs", path: "root/docs", children: [{ type: "file", name: "api.md", path: "root/docs/api.md", handle: <the fake file handle> }] }] }`.

- **Step 6 (impl).** Extend `walk`'s loop in `treeScanner.js` to add a directory branch ahead of the file branch: when `entryHandle.kind === "directory"`, recursively call `const sub = await walk(entryHandle, \`${path}/${name}\`)` and unconditionally push `sub` into `children`, so Step 5 passes.
  - **Working:** Entire step (3 lines: the directory-kind check, the recursive call, the push). This is the dispatch's other branch alongside Step 4's file/`.md` check — per `todo-hole.md`'s "several similar branches" rule, one representative branch (Step 4's filter) is already holed, so this one stays working code, giving a worked pattern to generalize from. Pruning an empty subtree from this push is added in Step 8.

- **Step 7 (test).** Write failing test in `treeScanner.test.js`: given `fakeDir("root", [["docs", fakeDir("docs", [["image.png", fakeFile("image.png")]])], ["notes.md", fakeFile("notes.md")]])` (a subdirectory with zero markdown descendants, alongside a markdown file at the root), `scanTree(root)`'s `children` contains only the `notes.md` entry — the whole `docs` node is absent (not present as an empty dir).

- **Step 8 (impl).** Extend `walk` in `treeScanner.js` with the prune decision: after the loop, add `if (children.length === 0) return null;`; change Step 6's directory-branch push to `if (sub) children.push(sub);`, so Step 7 passes.
  - **Working:** None new — the surrounding return-dir-node line is unchanged from Step 2.
  - **Hole:** The in-stage key-change decision — pruning a subtree with zero surviving children, expressed as two statements of the same decision (REQ-002: "prune directories with no markdown descendants"; SEQ-002 AC2: "every directory node ... has at least one markdown descendant"). TODO (per `todo-hole.md`):
    ```javascript
    // TODO:
    // 1. After the loop, if children collected nothing, this subtree has no
    //    markdown descendants — return null instead of a dir node, so the
    //    caller (the recursive call one level up) knows to drop it.
    // 2. In the directory branch above, only keep a recursed subtree (`sub`)
    //    if it is non-null — a null sub means that subdirectory was pruned.
    // e.g. dir "assets" holds only "logo.png" -> children stays [] after the
    //      loop -> return null
    //      dir "root" recurses into "assets" -> sub = null -> children.push
    //      is skipped -> "assets" does not appear in root's children
    if (/* */) return null;
    ...
    if (/* */) children.push(sub);
    ```

- **Step 9 (test).** Write test in `treeScanner.test.js`: given `fakeDir("root", [["docs", fakeDir("docs", [["api.md", fakeFile("api.md")], ["image.png", fakeFile("image.png")]])]])` (a directory with one markdown file and one non-markdown sibling), `scanTree(root)`'s `docs` node is present and its `children` contains only the `api.md` entry. This is a regression check on Steps 4+6+8 combined (REQ-002: "retained even if it has non-markdown siblings") — expected to already pass with no further implementation change; if it fails, Step 8's guard was filled in without preserving Step 4's filter.

- **Step 10 (test).** Write failing test in `treeScanner.test.js`: given `fakeDir("root", [["image.png", fakeFile("image.png")]])` (zero markdown descendants anywhere under the root), `scanTree(root)` resolves to `{ type: "dir", name: "root", path: "root", children: [] }` — not `null` — per CMP-003's "may be an empty tree" contract.

- **Step 11 (impl).** Change `scanTree(handle)` in `treeScanner.js` to capture `walk`'s result and normalize a `null` into an empty dir node, so Step 10 passes.
  - **Working:** The call line `const node = await walk(handle, handle.name);` — unchanged delegation from Step 2, now assigned to a variable instead of returned directly.
  - **Hole:** The in-stage key-change line — `scanTree`'s own transformation from `walk`'s internal `null`-means-pruned convention to its public non-nullable `TreeNode` contract. TODO (per `todo-hole.md`):
    ```javascript
    // TODO:
    // 1. node is walk's result: either a dir TreeNode, or null (root had zero
    //    markdown descendants).
    // 2. If node is null, return an empty dir node instead:
    //    { type: "dir", name: handle.name, path: handle.name, children: [] }.
    // 3. Otherwise return node as-is.
    // e.g. handle.name="empty-repo" -> walk(..) -> null
    //      -> return { type: "dir", name: "empty-repo", path: "empty-repo", children: [] }
    return node ?? /* */;
    ```

- **Step 12 (test).** Write failing test in `web/src/workspace/useWorkspace.test.js` (extending the SEQ-001 plan's suite, `folderPicker.pickFolder` mocked via `vi.mock` as before): mock `pickFolder` to resolve with `fakeDir("notes", [["todo.md", fakeFile("todo.md")]])` (same fake-handle shape as `treeScanner.test.js`, duplicated locally — a small test-only utility, not exported production code). After `await result.current.openFolder()`, assert `result.current.tree` equals `{ type: "dir", name: "notes", path: "notes", children: [{ type: "file", name: "todo.md", path: "notes/todo.md", handle: <the fake file handle> }] }`. This runs the real `treeScanner.scanTree` (not mocked) over the fake handle, per `tdd-mocking.md` — only the true native-dialog boundary (`pickFolder`) is a mock here.

- **Step 13 (impl).** Extend `useWorkspace()` in `web/src/workspace/useWorkspace.js`: add `const [tree, setTree] = useState(null);`; inside the existing `if (handle) { ... }` branch from the SEQ-001 plan's Step 8, call `scanTree(handle)` and store its result via `setTree`; update the returned object to `{ folderHandle, tree, openFolder }`, so Step 12 passes.
  - **Working:** The `useState(null)` declaration for `tree`, and the updated return shape `{ folderHandle, tree, openFolder }`.
  - **Hole:** The flow-connecting line(s) — this is SEQ-002's flow arrow (`WorkspaceController` -> `TreeScanner.scanTree(handle)`): where `openFolder` calls `scanTree(handle)` and uses its returned `TreeNode` to update state. TODO (per `todo-hole.md`):
    ```javascript
    // TODO:
    // 1. Call scanTree(handle) to get the pruned, markdown-only TreeNode for
    //    this handle.
    // 2. Call setTree with that TreeNode to store it in state.
    // e.g. handle = { name: "wiki" } -> scanTree(handle) resolves to
    //      { type: "dir", name: "wiki", path: "wiki", children: [...] }
    //      -> setTree({ type: "dir", name: "wiki", path: "wiki", children: [...] })
    const scanned = await scanTree(/* */);
    setTree(/* */);
    ```

- **Step 14 (test, SEQ-007).** Write failing test in `web/src/workspace/useWorkspace.test.js`: add a local `deferred()` helper (`{ promise, resolve }`, a manually-resolvable promise) and a `fakeDirDeferred(name, entries, gate)` variant of the existing `fakeDir` helper whose `entries()` generator does `await gate.promise;` before yielding anything — this pauses the scan mid-flight under test control, since `scanTree` itself is exercised for real (not mocked) per this file's established convention. Mock `pickFolder` to resolve `fakeDirDeferred("notes", [["todo.md", fakeFile("todo.md")]], gate)`. Inside `act`, call `openFolder()` without awaiting it yet; flush the pending `pickFolder` microtask (e.g. `await act(async () => { await Promise.resolve() })`); assert `result.current.isScanning` is `true` and `result.current.tree` is still `null`. Then call `gate.resolve()` and `await act(async () => { await openPromise })`; assert `result.current.isScanning` is `false` and `result.current.tree` matches the scanned `notes` tree.

- **Step 15 (impl, SEQ-007).** Extend `useWorkspace()` in `web/src/workspace/useWorkspace.js`: add `const [isScanning, setIsScanning] = useState(false);`; inside the existing `if (handle) { ... }` block (from Step 13), wrap the `scanTree` call with `setIsScanning` transitions; update the returned object to `{ folderHandle, tree, isScanning, openFolder }`, so Step 14 passes.
  - **Working:** The `useState(false)` declaration for `isScanning`, and the updated return shape.
  - **Hole:** The flow-connecting lines — this is SEQ-007's flow arrows (`WorkspaceController` sets `status="loading"` immediately before calling `TreeScanner.scanTree(handle)`, then back to `"ready"` on resolution): the two `setIsScanning` calls bracketing the existing `scanTree`/`setTree` lines from Step 13. TODO (per `todo-hole.md`):
    ```javascript
    // TODO:
    // 1. Call setIsScanning(true) before scanTree(handle) — status reads
    //    "loading" for the full duration of the scan (SEQ-007 AC1).
    // 2. Await scanTree(handle) and store its result with setTree, unchanged
    //    from Step 13.
    // 3. Call setIsScanning(false) once the scan has resolved.
    // e.g. handle = { name: "wiki" } -> setIsScanning(true) -> scanTree(handle)
    //      resolves to { type: "dir", name: "wiki", path: "wiki", children: [...] }
    //      -> setTree({ type: "dir", ... }) -> setIsScanning(false)
    setIsScanning(/* */);
    const scanned = await scanTree(handle);
    setTree(scanned);
    setIsScanning(/* */);
    ```

## Hole / Working Tally
| Step | Implementation lines | Hole | Working |
|---|---|---|---|
| 2 — `walk`/`scanTree` base | 8 | 0 | 8 |
| 4 — `.md` filter decision | 2 | 1 | 1 |
| 6 — directory recursion branch | 3 | 0 | 3 |
| 8 — prune decision | 2 | 2 | 0 |
| 11 — `scanTree` null-to-empty-tree | 2 | 1 | 1 |
| 13 — wire `scanTree` into `useWorkspace` | 4 | 2 | 2 |
| 15 — `isScanning` bracketing (SEQ-007) | 4 | 2 | 2 |
| **Total** | **25** | **8 (32%)** | **17 (68%)** |

- Lands within a couple points of the 30% target: TreeScanner's algorithm has three genuinely distinct core decisions (filter, prune, empty-tree normalization) plus the two flow-connecting wires into `WorkspaceController` (the `scanTree` call itself, and now the `isScanning` bracketing around it), each holed once per `todo-hole.md`'s "one representative branch" rule — Step 6's directory-recursion branch is the dispatch's other branch and stays working, giving the pattern the Step 4 hole asks the human to generalize.
- No holes were added purely to hit the ratio: Step 2's base iteration/collection code and Step 9 (a pure regression test, no implementation) carry none, since neither has a decision or a returned value to act on yet.
- **SEQ-007 revision delta:** Step 15 adds one new flow-connecting hole (4 implementation lines, 2 holed lines) covering REQ-007 AC1. Combined tally moves from 29% to 32% holed — just past the 30% target but not "well past" it per the budget guidance, and both holed lines are the exact mechanism SEQ-007 exists to teach (bracketing the scan call with the loading-state transition); no padding hole was added purely to chase the ratio, nor was anything demoted to avoid the two extra points.

## Recommended Human Work Order
Every holed step above, reordered top-down along the flow (entry point -> algorithm), instead of build order.
- **Step 15**: Bracket the `scanTree` call with `isScanning` transitions (SEQ-007) — `web/src/workspace/useWorkspace.js`, function `useWorkspace` (the returned `openFolder`) — the flow's entry point for SEQ-007 (`WorkspaceController` sets `status="loading"` -> calls `TreeScanner.scanTree(handle)` -> back to `"ready"`); start here to see the whole loading-state flow before descending into the scan call itself.
- **Step 13**: Wire `TreeScanner.scanTree(handle)` into `useWorkspace`'s `openFolder` and store the result — `web/src/workspace/useWorkspace.js`, function `useWorkspace` (the returned `openFolder`) — the call Step 15 brackets; the flow's entry point for SEQ-002 (`WorkspaceController` -> `TreeScanner.scanTree(handle)`).
- **Step 4**: The `.md` filter decision — `web/src/workspace/treeScanner.js`, function `walk` — one level down, inside TreeScanner's own algorithm.
- **Step 8**: The prune-empty-subtree decision — `web/src/workspace/treeScanner.js`, function `walk` — same level, the algorithm's other core decision.
- **Step 11**: The `null`-to-empty-tree normalization — `web/src/workspace/treeScanner.js`, function `scanTree` — the algorithm's boundary back out to the flow, fulfilling CMP-003's non-nullable `TreeNode` contract.

## Closeout
- [x] Review + Test — once every hole above is filled in, re-run `/auto-action` on this plan; it detects the holes are gone and reviews each one against its recorded intent, then runs the tests
