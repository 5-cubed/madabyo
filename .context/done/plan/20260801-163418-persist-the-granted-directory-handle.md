# Plan: Persist the Granted Directory Handle (SEQ-023)

**Type:** Self-Plan

## Scope
- Design unit: SEQ-023 "Persist the granted directory handle" (REQ-023, CMP-004 FolderHandleStore — new component, first built here, CMP-001 WorkspaceController — its `useWorkspace.openFolder` gains one new call).
- **New plan file, not a revision — judgment call recorded here.** Two existing plans touch `useWorkspace.js`/`openFolder`:
  - `done/plan/20260801-112229-pick-a-folder.md` owns the function's original shape (SEQ-001/004/005) and is fully closed out — its Closeout checkbox is checked, its holes were filled with real code and reviewed. Per this codebase's own convention, closed-out plans in `done/` are left alone; they are not reopened for new design work.
  - `done/plan/20260801-112843-scan-filter-and-prune-to-markdown-only.md` extended the same function (SEQ-002/007) and, as of this run, has **also moved to `done/`** — checked its Closeout checkbox: `[x]`. It is no longer an open document to revise; it is finished work, same as `pick-a-folder.md`.
  - **Verified against the real file, not the plans' prose.** Read the real `web/src/workspace/useWorkspace.js`: it contains no `TODO`/hole markers anywhere — `openFolder` is a complete, working implementation (`pickFolder()` → `if (handle != null)` guard → `setFolderHandle` → `setIsScanning(true)` → `await scanTree(handle)` → `setTree` → `setIsScanning(false)`, returning `{ folderHandle, tree, isScanning, openFolder, isSupported }`). This is real, shipped code, not template/TODO scaffolding.
  - Because both prior owners of this file are closed out and the real function is already fully implemented, `useWorkspace.openFolder` is treated here the same way the sibling `create-a-second-independent-pane-on-split.md` plan treated `PaneManager` when adding `splitRight`: as an **already-established collaborator** being called into, not a document to reopen. `FolderHandleStore` (CMP-004) is a wholly new component with its own new file (`web/src/workspace/folderHandleStore.js`) and its own multi-SEQ `Used By` list (SEQ-023 through SEQ-026) — the same shape that justified a new plan file for `SplitContainer`/CMP-011. This plan is the new home for the folder-handle-persistence feature area; SEQ-024 through SEQ-026 are expected to revise *this* file in place.
- Flow (per `SEQ-023.md`):
  ```
  WorkspaceController.openFolder() --grant obtained-->
    |
    v
  FolderHandleStore.saveHandle(handle)
    |
    v
  IndexedDB
  ```
- CMP-004 fixes three interfaces (`saveHandle`, `loadHandle`, `verifyPermission`), but SEQ-023's own Sequence/Acceptance Criteria only exercise `saveHandle` (the write) and `loadHandle` (the read-back proof, AC2). `verifyPermission` is SEQ-025's concern (permission re-request) — not touched here.
- **IndexedDB is not available in jsdom** (the project's test environment, `web/vite.config.js`) — jsdom does not implement the IndexedDB API. Per `tdd-mocking.md`'s "Database I/O" row and its "prefer a test double at the outermost boundary (in-memory adapter)" guidance, this plan adds `fake-indexeddb` as a dev dependency and polyfills the global `indexedDB` in test setup — this lets `folderHandleStore.js` run its real open/transaction/get/put logic against a real (in-memory) IndexedDB implementation in tests, rather than mocking any of its own internals. This is tooling, like `pick-a-folder.md`'s Step 0; it carries no hole.
- **Mocking boundary for `useWorkspace.test.js`.** That file already mocks `folderPicker` wholesale (`vi.mock('./folderPicker')`) even though it is an in-process module, because it wraps a true system boundary (`window.showDirectoryPicker`) one layer down — an established precedent in this codebase for wrapping an external-boundary module at the call site's own test, rather than driving the real boundary from every caller's test. `folderHandleStore` wraps the same kind of boundary (IndexedDB) one layer down, so this plan mocks it the same way in `useWorkspace.test.js` (`vi.mock('./folderHandleStore')`); `folderHandleStore.js`'s own test drives the real (fake-indexeddb-backed) boundary directly, the same split `folderPicker.test.js` vs. `useWorkspace.test.js` already established for `pickFolder`.
- **Hole placement.** `FolderHandleStore`'s `saveHandle`/`loadHandle` are IndexedDB open/transaction boilerplate — CMP-004 is explicitly a leaf module ("Depends On: none"), and neither function has a flow-connecting call to another stage. `saveHandle` is pure delegation (put the value, no decision — the same shape as the prior plans' un-holed `pickFolder` happy path and `isSupported`). `loadHandle` has exactly one in-stage key-change: normalizing IndexedDB's "no record found" result into the domain-meaningful `null` CMP-004's own interface promises (`loadHandle(): Promise<FileSystemDirectoryHandle | null>` — "`null` if nothing persisted") — the same shape as `pick-a-folder.md`'s Step 6 hole (normalizing a rejection into `null`). The one flow-connecting hole is the `useWorkspace.openFolder` call site wiring in `saveHandle(handle)`, awaited before the scan proceeds (SEQ-023 AC1).

- **SEQ-024 delta on the combined flow (this revision):** SEQ-024 ("Retrieve and re-scan a persisted handle on load") adds a second top-level entry point alongside `openFolder` — `WorkspaceController.resumeFolder()` — sharing the same two collaborators this plan already owns/uses: `FolderHandleStore` (now gains `verifyPermission`, its third fixed interface, left unbuilt above) and `TreeScanner.scanTree` (already shipped, `treeScanner.js`, no change).
  ```
  App load
    |
    v
  WorkspaceController.resumeFolder()
    |
    v
  FolderHandleStore.loadHandle() --> handle
    |
    v
  FolderHandleStore.verifyPermission(handle) --> 'granted' | 'denied' | 'prompt'
    |
    +-- 'granted'      --> TreeScanner.scanTree(handle) --> <SidebarTree status="ready" />
    |
    +-- not 'granted'  --> (SEQ-025's territory — placeholder only, see Step 11 below)
  ```
  Per this run's scoping (verified against `SEQ-025.md`/`SEQ-026.md` directly, not just their titles): SEQ-025 owns the entire non-`'granted'` branch (its own Flow/Sequence render `status="needs-permission"` and own the re-grant retry loop — `SidebarTree` doesn't even have a `needs-permission`-driven state field in `useWorkspace` yet, since nothing before this revision needed one); SEQ-026 owns wrapping `scanTree(handle)` in a catch for the "folder gone" case (its own Sequence step 2 explicitly says WorkspaceController "catches this failure"). This revision therefore builds only: `loadHandle()` -> `verifyPermission()` as a gate -> on `'granted'`, the same scan-and-render sequence `openFolder` already established (Step 7's post-guard body) -> render `status="ready"`. `pickFolder()` is never referenced by `resumeFolder` at all, so SEQ-024 AC1 ("pickFolder() is never called") holds structurally, not as a runtime branch to test.
  - **`verifyPermission`'s hole placement.** CMP-004 fixes its return type as exactly `'granted' | 'denied' | 'prompt'` — the same three literal strings the real `FileSystemDirectoryHandle.queryPermission()` API itself resolves to. There is no normalization step the way `loadHandle` needed one (IndexedDB's `undefined` -> domain `null`): `verifyPermission` is pure passthrough of the browser API's own result, so it is written as working code, no hole, the same reasoning `saveHandle` (Step 5) already established for pure delegation with no decision behind it.
  - **`resumeFolder`'s hole placement.** The `null`-handle guard (mirrors `openFolder`'s existing `if (handle != null)` shape, Working) and the `'granted'`-branch's scan-and-render body (identical four lines to `openFolder`'s already-un-holed happy path, Step 7 — reusing an already-taught pattern a second time stays Working, per `todo-hole.md`'s "don't re-hole an already-taught pattern," same reasoning the `read-and-render-a-files-markdown-content.md` plan gave at its own Step 25) are not holed. The one flow-connecting hole is the call to `verifyPermission(handle)` and the gate on its result — this is SEQ-024's own defining decision (Flow step: "permission checks pass" -> proceed to scan) and the exact place its own Acceptance Criteria (AC1/AC2) hinge on.
  - **Not-`'granted'` placeholder.** Written as an explicit no-op (function resolves without changing any state), not a second hole — unlike the `read-and-render` plan's `closeTab` precedent (SEQ-015 left `this._activeTabId = null` as a working placeholder *inside* an already-shaped branch for SEQ-016 to fill in), there is no `needs-permission` state field yet for SEQ-025 to extend; SEQ-025 will need to *add* new state and wire it into a render, not just replace one placeholder value. An honest empty branch is the right placeholder here, not a fabricated shape SEQ-025 would likely have to tear out.
  - **Out of scope, deferred:** wiring `resumeFolder()` into `App.jsx`'s mount lifecycle (e.g. `useEffect(() => { resumeFolder() }, [])`), so the resume flow actually fires "on app load" in the running app. `App.test.jsx` does not mock `./workspace/folderHandleStore` at all (unlike `useWorkspace.test.js`), and several of its tests already call `openFolder()` via a button click, which (per this plan's Step 7) persists a handle through the *real*, fake-indexeddb-backed store. Verified by inspection: wiring an unconditional mount-time `resumeFolder()` call today would make every subsequent test in that file attempt to resume the *previous* test's persisted (and permission-less, since those tests' fake handles have no `queryPermission` method) handle — a real cross-test bleed hazard, not a hypothetical one. Fixing it requires its own isolation work (an indexedDB-clearing `beforeEach` in `App.test.jsx`, mirroring `folderHandleStore.test.js`'s own convention) that is a separate integration concern from SEQ-024's own Acceptance Criteria, both of which are fully exercised at the `useWorkspace` hook level (same level `openFolder`'s tests already operate at). Deferred to whichever later pass completes `App.jsx`'s live integration, the same way the `read-and-render` plan deferred `PaneManager`/`onSelectFile` wiring in `App.jsx` across several SEQs.

- **SEQ-025 delta on the combined flow (this revision):** SEQ-025 "Re-request revoked/expired permission" (REQ-025) fills the exact placeholder the SEQ-024 delta above left open — Step 11's non-`'granted'` branch was deliberately written as a bare no-op precisely because no `needs-permission` state existed yet to extend into. This revision adds that state and the retry path that clears it, per SEQ-025's own Flow:
  ```
  WorkspaceController.resumeFolder()
    |
    v
  FolderHandleStore.verifyPermission(handle) --> not 'granted'
    |
    v
  useWorkspace: needsPermission = true            (fills Step 11's placeholder)
    |
    v
  [user clicks re-grant control, owned by SidebarTree/App.jsx — see scope note below]
    |
    v
  WorkspaceController.regrantPermission()  <-- new this revision, Steps 12-13
    |
    v
  FolderHandleStore.verifyPermission(handle, { request: true }) --> 'granted'
    |
    v
  TreeScanner.scanTree(handle) --> <SidebarTree status="ready" />
  ```
  - **Interface fix, verified against CMP-004.md directly (not assumed).** CMP-004's own Interfaces list fixes `verifyPermission` as `verifyPermission(handle: FileSystemDirectoryHandle): Promise<'granted' | 'denied' | 'prompt'>` — a single parameter, no second argument for "which browser method to call." But SEQ-025's own Sequence step 3 requires two distinct behaviors under that one name: `resumeFolder`'s existing call (Step 9, unchanged) must stay a **passive** check (`queryPermission` — no native prompt, since it runs on app load with no user gesture behind it, per SEQ-024's own already-un-holed rationale for that choice); the retry call, triggered from inside a click handler, must be an **active** check (`requestPermission` — allowed to show the browser's native permission dialog, because a user gesture is present). One un-parameterized function cannot express both, so this revision extends `verifyPermission`'s signature with an options parameter (`verifyPermission(handle, { request = false } = {})`), defaulting to the existing passive behavior — `resumeFolder`'s Step 11 call site needs no change at all, and every already-planned Step 8 test keeps passing unmodified. This is a plan-level extension of CMP-004's literal spec text, not a guess: the alternative (two separately named functions) was rejected because SEQ-025's Sequence prose itself says the retry "re-invokes `verifyPermission(handle)`" — the same name, called again — so a same-name/added-parameter shape matches the design text more literally than a new function name would.
  - **Scope split with CMP-005/App.jsx, same shape as the SEQ-005 precedent.** REQ-025's user-facing half — rendering `<SidebarTree status="needs-permission" onRegrantPermission={...} />` and the click that fires it — is CMP-005's/CMP-001's `App.jsx` render-wiring territory, the same split the `pick-a-folder.md` plan made for SEQ-005 ("Half (2) belongs to `App.jsx`'s render wiring and `SidebarTree` itself, owned by the `render-the-sidebar-tree.md` plan"). That plan's own Closeout is unchecked but it is not this revision's file to reopen, and — independently — `resumeFolder()` itself isn't wired into `App.jsx`'s mount lifecycle yet at all (the SEQ-024 delta's own "Out of scope, deferred" note above): there is no live status ternary in `App.jsx` yet for a `needs-permission` branch to slot into. This revision therefore stops at the `useWorkspace` hook boundary — the same boundary SEQ-023/024 already operate at — exposing exactly what a future `App.jsx` integration pass needs: a `needsPermission` boolean and a `regrantPermission()` function on the hook's returned object. Rendering the message/button and wiring `onRegrantPermission={regrantPermission}` is deferred to that same future pass, alongside the already-deferred `resumeFolder()` mount-time call.
  - **State shape.** `setFolderHandle(handle)` moves out of Step 11's `'granted'`-only branch to run unconditionally right after the `handle != null` guard — the handle itself is available and worth holding onto (for the eventual re-grant retry) whether or not its permission is currently live; nothing in SEQ-023/024's own Acceptance Criteria constrains what `folderHandle` holds before a scan (both only assert on `pickFolder`-never-called and on `tree`/`isScanning`), so this is a safe, non-breaking relocation, not a new decision. A new `needsPermission` boolean state (`useState(false)`) records the outcome Step 11's placeholder used to discard; `regrantPermission()` (Steps 12-13) reads the already-stored `folderHandle` to retry against, without any new OS picker (REQ-025 AC3).

## Action Sequence

- **Step 1 (setup, no hole).** Add `fake-indexeddb` to `web/package.json` devDependencies. Add `import 'fake-indexeddb/auto'` to `web/src/setupTests.js` (alongside the existing `@testing-library/jest-dom` import) — this polyfills `indexedDB`/`IDBKeyRange` as real, in-memory-backed globals for every test file, since jsdom itself has no IndexedDB implementation.
  - **Working:** Entire step — tooling and config only, no application logic, no hole.

- **Step 2 (test).** Write failing test in new file `web/src/workspace/folderHandleStore.test.js`: add a `beforeEach` that clears any persisted state between tests (delete the fixed database name `folderHandleStore.js` will use, via the global `indexedDB.deleteDatabase(...)`, awaiting its `onsuccess`/`onerror`/`onblocked`). First test: `await loadHandle()` resolves `null` when nothing has ever been saved.

- **Step 3 (impl).** Implement `web/src/workspace/folderHandleStore.js`: a private `openDb()` helper (opens/creates the singleton IndexedDB database and object store) and `loadHandle()` built on it, so Step 2 passes.
  - **Working:** `openDb()` in full — open the database, create the object store on first upgrade, resolve with the connection, reject on error. Pure leaf setup with no branch on domain data, the same shape as this codebase's existing un-holed `isSupported`/`pickFolder`-happy-path leaves. Also working: `loadHandle`'s own transaction/get setup and its error-rejection wiring.
  - **Hole:** The in-stage key-change line — where `loadHandle`'s `get` request succeeds and its result is turned into the function's actual resolved value. IndexedDB resolves a missing key's `get` as `undefined`, but CMP-004's own interface promises `null` ("`null` if nothing persisted") — this line is the one place that contract is actually honored. TODO (per `todo-hole.md`):
    ```javascript
    // TODO:
    // 1. request.result is what IndexedDB's get() returned — undefined if no
    //    record was ever saved under this key, or the saved handle otherwise.
    // 2. Resolve the outer promise with that value, but map a missing record
    //    (undefined) to null, per loadHandle's null-if-nothing-persisted contract.
    // e.g. no prior saveHandle() call -> request.result === undefined
    //      -> resolve(null)
    //      a handle was saved -> request.result === { kind: "directory", name: "notes" }
    //      -> resolve({ kind: "directory", name: "notes" })
    request.onsuccess = () => resolve(/* */)
    ```

- **Step 4 (test).** Extend `web/src/workspace/folderHandleStore.test.js`: a fake handle `{ kind: 'directory', name: 'docs' }` (a plain-object stand-in for `FileSystemDirectoryHandle` — IndexedDB's structured clone only cares about the value's shape, not its real type); call `await saveHandle(fakeHandle)`, then assert `await loadHandle()` resolves a value deep-equal to `fakeHandle`.

- **Step 5 (impl).** Implement `saveHandle(handle)` in `web/src/workspace/folderHandleStore.js`, reusing Step 3's `openDb()`, so Step 4 passes.
  - **Working:** Entire function — open a read-write transaction, `put(handle, key)`, resolve on the transaction's completion, reject on error. Pure delegation with no decision to make (the value to store is exactly the argument received), the same shape as this codebase's un-holed `pickFolder` happy path.

- **Step 6 (test).** Write failing test in `web/src/workspace/useWorkspace.test.js` (extending the existing suite; add `vi.mock('./folderHandleStore')` and `import * as FolderHandleStore from './folderHandleStore'`, matching the file's existing `FolderPicker` mocking pattern; reuse the file's local `deferred()` helper from the SEQ-007 test): mock `pickFolder` to resolve `fakeDir('notes', [])`; mock `FolderHandleStore.saveHandle` to return a `gate.promise` that does not resolve yet. Call `openFolder()` without awaiting it; flush the pending microtask (`await act(async () => { await Promise.resolve() })`); assert `FolderHandleStore.saveHandle` was called with the picked handle, and that `result.current.isScanning` is still `false` and `result.current.tree` is still `null` — proving the scan has not started while the save is still pending (SEQ-023 AC1: "`saveHandle()` completes before the sidebar renders the scanned tree"). Then call `gate.resolve()`, `await` the original `openFolder()` promise inside `act`, and assert `result.current.tree` matches the scanned tree — proving the scan proceeds once the save resolves.

- **Step 7 (impl).** Extend `openFolder` in `web/src/workspace/useWorkspace.js`: after `setFolderHandle(handle)` and before `setIsScanning(true)`, add `await FolderHandleStore.saveHandle(handle)` (plus the module import), so Step 6 passes.
  - **Working:** Every pre-existing line of `openFolder` (unchanged from the prior, already-closed-out plans) — the `pickFolder()` call, the `if (handle != null)` guard, `setFolderHandle`, the `isScanning`/`scanTree`/`setTree` sequence, and the returned object shape.
  - **Hole:** The one new flow-connecting line — this is SEQ-023's own Flow arrow (`WorkspaceController.openFolder()` → `FolderHandleStore.saveHandle(handle)` → IndexedDB): where `openFolder` hands the just-picked handle to `saveHandle` and awaits its completion before the scan proceeds. TODO (per `todo-hole.md`):
    ```javascript
    // TODO:
    // 1. Call FolderHandleStore.saveHandle(handle) to persist the handle that
    //    was just picked.
    // 2. Await it, so the write finishes before the scan below starts (SEQ-023
    //    AC1 — the sidebar must not render the scanned tree before the save
    //    completes).
    // e.g. handle = { name: "wiki" } -> await saveHandle({ name: "wiki" })
    //      resolves -> setIsScanning(true) runs next -> scanTree(handle) begins
    await FolderHandleStore.saveHandle(/* */)
    ```

- **Step 8 (test, SEQ-024; revised for SEQ-025).** Extend `web/src/workspace/folderHandleStore.test.js`:
  1. *(SEQ-024, unchanged)* `verifyPermission(handle)` resolves whatever `handle.queryPermission({ mode: 'read' })` resolves — construct a fake handle `{ queryPermission: vi.fn().mockResolvedValue('granted') }` and assert `await verifyPermission(fakeHandle)` resolves `'granted'`; then, in a second case, rebuild the fake with `queryPermission` mocked to resolve `'denied'` and assert `verifyPermission` resolves `'denied'` too — proving this is a real passthrough of whatever the handle reports, not a hardcoded value.
  2. *(new, SEQ-025, retry mode)* Construct a fake handle with **both** methods stubbed: `{ queryPermission: vi.fn().mockResolvedValue('prompt'), requestPermission: vi.fn().mockResolvedValue('granted') }`. Call `await verifyPermission(fakeHandle, { request: true })`; assert it resolves `'granted'` **and** that `requestPermission` was called while `queryPermission` was not — proving the second argument actually switches which browser method runs, not just which value comes back (a test that only asserted the resolved value could pass even if the branch were wired backwards).

- **Step 9 (impl, SEQ-024; revised for SEQ-025).** Implement `verifyPermission(handle, { request = false } = {})` in `web/src/workspace/folderHandleStore.js` so Step 8 passes:
    ```javascript
    export function verifyPermission(handle, { request = false } = {}) {
      return request
        ? handle./* */({ mode: 'read' })
        : handle./* */({ mode: 'read' })
    }
    ```
  - **Working:** *(SEQ-024, unchanged)* The `{ mode: 'read' }` argument to whichever method runs, and the fact that the resolved value (`'granted'|'denied'|'prompt'`) already matches CMP-004's interface contract verbatim with no normalization needed — same shape as `saveHandle`'s un-holed treatment. The `request = false` default (so every existing Step 8 case-1 call and `resumeFolder`'s own call site, Step 11, need no change).
  - **Hole:** *(new, SEQ-025)* The in-stage key-change decision — which of the handle's two permission methods each mode maps to. This is the interface fix the Scope note above verifies against CMP-004 directly: a single un-parameterized `verifyPermission` can't express both "passive check, never prompts" (`resumeFolder`'s existing call, unchanged) and "active check, may prompt" (the re-grant retry, Step 13) — this branch is where that distinction is actually decided. TODO (per `todo-hole.md`):
    ```javascript
    // TODO:
    // 1. request tells you which check the caller wants. false (the default) is
    //    resumeFolder's existing, unchanged call — a passive check that must
    //    never show a native prompt, since it runs on app load with no click
    //    behind it (SEQ-024's own reason for choosing queryPermission there).
    // 2. true is the re-grant retry (Step 13) — triggered from inside a click
    //    handler, so it's safe to let the browser show its native permission
    //    dialog if the state is still 'prompt'.
    // 3. Map false -> handle.queryPermission (passive), true ->
    //    handle.requestPermission (active, may prompt).
    // e.g. verifyPermission(handle) -> request=false -> handle.queryPermission(...)
    //      verifyPermission(handle, { request: true }) -> handle.requestPermission(...)
    return request
      ? handle./* */({ mode: 'read' })
      : handle./* */({ mode: 'read' })
    ```

- **Step 10 (test, SEQ-024; revised for SEQ-025).** Extend `web/src/workspace/useWorkspace.test.js`:
  1. *(SEQ-024, unchanged)* Mock `FolderHandleStore.loadHandle` to resolve a fake handle (`fakeDir('notes', [['todo.md', fakeFile('todo.md')]])`) and `FolderHandleStore.verifyPermission` to resolve `'granted'`. Render the hook, call `await act(async () => { await result.current.resumeFolder() })`, then assert: `FolderPicker.pickFolder` was never called (SEQ-024 AC1); `result.current.folderHandle` equals the fake handle; `result.current.tree` equals the same scanned-tree shape Step 6/the existing SEQ-002 test already expects for that fixture (SEQ-024 AC2 — same scan logic path as REQ-002).
  2. *(SEQ-024, unchanged)* Sibling test: mock `loadHandle` to resolve `null`; call `resumeFolder()`; assert `verifyPermission` is never called, `pickFolder` is never called, and `folderHandle`/`tree` stay at their initial `null` (a fresh/never-configured session is untouched by resume).
  3. *(new, SEQ-025, needs-permission case)* Mock `loadHandle` to resolve a fake handle; mock `verifyPermission` to resolve `'denied'` (its default, no-second-argument call — matching `resumeFolder`'s own call site). Call `await act(async () => { await result.current.resumeFolder() })`; assert `result.current.needsPermission` is `true`; `result.current.tree` stays `null`; `result.current.isScanning` stays `false`; `FolderPicker.pickFolder` was never called — REQ-025 AC2 ("a re-grant prompt is shown instead of silently failing or forcing `showDirectoryPicker()` again").

- **Step 11 (impl, SEQ-024; revised for SEQ-025).** Add `resumeFolder` to `web/src/workspace/useWorkspace.js`, alongside `openFolder`, and include it (plus the new `needsPermission` state) in the hook's returned object:
    ```javascript
    const [needsPermission, setNeedsPermission] = useState(false)

    async function resumeFolder() {
      const handle = await FolderHandleStore.loadHandle()
      if (handle != null) {
        setFolderHandle(handle)
        const permission = await FolderHandleStore.verifyPermission(handle)
        if (permission === /* */) {
          setIsScanning(true)
          const scanned = await scanTree(handle)
          setTree(scanned)
          setIsScanning(false)
        } else {
          /* */
        }
      }
    }
    ```
  - **Working:** *(SEQ-024, unchanged)* The `loadHandle()` call and its `if (handle != null)` guard (mirrors `openFolder`'s existing null-guard shape exactly). The whole `'granted'`-branch body (`setIsScanning(true)` through `setIsScanning(false)`) — identical to `openFolder`'s already-un-holed happy path, reused verbatim; per `todo-hole.md`, an already-taught pattern's second occurrence stays working, not re-holed. *(new, SEQ-025)* The `const [needsPermission, setNeedsPermission] = useState(false)` declaration — a plain state slot with no decision, same rationale as the hook's existing `useState(null)` declarations. `setFolderHandle(handle)` relocated out of the `'granted'`-only branch to run unconditionally right after the `handle != null` guard — a relocation, not a new decision (see Scope note above for why this doesn't disturb SEQ-023/024's own Acceptance Criteria).
  - **Hole:** *(SEQ-024, unchanged, still open)* The `if (permission === /* */)` comparison target — SEQ-024's own flow-connecting decision (Flow: `loadHandle() -> handle` then "permission checks pass" -> proceed to scan; SEQ-024's own Sequence step 2). TODO (per `todo-hole.md`, unchanged from the original delta):
    ```javascript
    // TODO:
    // 1. permission was already fetched above via FolderHandleStore.verifyPermission(handle).
    // 2. Only proceed to scan when that result is the literal string 'granted'
    //    (CMP-004's contract: 'granted' | 'denied' | 'prompt').
    // e.g. permission = 'granted' -> scanTree(handle) runs -> status="ready"
    //      permission = 'denied' or 'prompt' -> falls to the else branch below
    if (permission === /* */) {
    ```
  - **Hole:** *(new, SEQ-025)* The `else` branch — this is the exact placeholder the SEQ-024 delta above deliberately left as a bare no-op ("no `needs-permission` state field yet ... an honest empty branch"); this revision fills that same branch rather than duplicating the gate around it. TODO (per `todo-hole.md`):
    ```javascript
    // TODO:
    // 1. permission is not 'granted' (it's 'denied' or 'prompt') — the
    //    persisted handle can't be used yet without the user re-granting.
    // 2. Record that fact so a future UI layer can render a re-grant prompt
    //    (SidebarTree's needs-permission status — App.jsx/SidebarTree wiring
    //    is a later pass's job, per the Scope note above) instead of the
    //    silent no-op this branch used to be (REQ-025 AC2).
    // e.g. permission = 'denied' -> setNeedsPermission(true) -> a future
    //      App.jsx render can show <SidebarTree status="needs-permission">
    //      permission = 'granted' -> this branch never runs (see the if above)
    } else {
      /* */
    }
    ```

- **Step 12 (test, SEQ-025).** Extend `web/src/workspace/useWorkspace.test.js`: building on Step 10 case 3's needs-permission setup (mock `loadHandle` resolving a fake handle, `verifyPermission`'s default call resolving `'denied'`, then `await result.current.resumeFolder()`), reconfigure the same `verifyPermission` mock so that its **next** call — the one made with a second argument — resolves `'granted'` instead (e.g. `FolderHandleStore.verifyPermission.mockImplementation((handle, opts) => Promise.resolve(opts?.request ? 'granted' : 'denied'))`). Call `await act(async () => { await result.current.regrantPermission() })`; assert: `FolderHandleStore.verifyPermission` was called a second time with `(fakeHandle, { request: true })`; `result.current.needsPermission` is now `false`; `result.current.tree` equals the same scanned-tree shape used for that fixture; `FolderPicker.pickFolder` was still never called (REQ-025 AC3 — same handle re-scanned, no new OS picker). Add a sibling test: keep the retry mock resolving `'denied'` too; call `regrantPermission()`; assert `needsPermission` stays `true` and `tree` stays `null` (a second denial leaves the user able to retry again, not stuck or errored).

- **Step 13 (impl, SEQ-025).** Add `regrantPermission` to `web/src/workspace/useWorkspace.js`, alongside `resumeFolder`, and include it in the hook's returned object:
    ```javascript
    async function regrantPermission() {
      const permission = await FolderHandleStore.verifyPermission(folderHandle, /* */)
      if (permission === 'granted') {
        setNeedsPermission(false)
        setIsScanning(true)
        const scanned = await scanTree(folderHandle)
        setTree(scanned)
        setIsScanning(false)
      }
    }
    ```
  - **Working:** The `if (permission === 'granted')` comparison, written out in full this time (not re-holed) — the exact same decision already taught at Step 11, its third occurrence in this file (Step 7's `openFolder`, Step 11's `resumeFolder`, now here), per `todo-hole.md`'s "don't re-hole an already-taught pattern." The entire granted-branch body (`setNeedsPermission(false)` through `setIsScanning(false)`) — reuses `openFolder`/`resumeFolder`'s already-un-holed scan-and-render shape verbatim, plus one new but undecided line (`setNeedsPermission(false)`, a plain state reset with nothing to decide). The omitted `else` (leaving `needsPermission` at `true` on a repeated denial) is not new code to hole — it's the absence of a branch, not a blanked one.
  - **Hole:** The `verifyPermission` call's second argument — this is SEQ-025's own defining line (its Sequence step 3: the retry "internally calls the handle's `requestPermission()` this time, not just `queryPermission()`"), and the one place this function's behavior actually differs from `resumeFolder`'s otherwise-identical-looking call at Step 11. TODO (per `todo-hole.md`):
    ```javascript
    // TODO:
    // 1. folderHandle was already set by resumeFolder (Step 11) or openFolder
    //    (Step 7) — the same handle the user is re-granting access to.
    // 2. This call must request active re-verification (requestPermission),
    //    not resumeFolder's passive default (queryPermission) — this runs
    //    inside a click handler, so a native prompt is safe to show here.
    // 3. Pass { request: true } as the second argument to verifyPermission
    //    (Step 9's interface fix) to select that behavior.
    // e.g. folderHandle = { name: "wiki" }, user clicks re-grant ->
    //      verifyPermission({ name: "wiki" }, { request: true }) ->
    //      requestPermission() resolves 'granted' -> scanTree runs, no picker
    const permission = await FolderHandleStore.verifyPermission(folderHandle, /* */)
    ```

## Hole / Working Tally
| Step | Implementation lines | Hole | Working |
|---|---|---|---|
| 3 — `openDb` + `loadHandle` | 12 | 1 | 11 |
| 5 — `saveHandle` | 6 | 0 | 6 |
| 7 — `useWorkspace.openFolder` wiring | 1 | 1 | 0 |
| 9 — `verifyPermission` query/request branch (SEQ-024, revised SEQ-025) | 3 | 2 | 1 |
| 11 — `useWorkspace.resumeFolder` (SEQ-024, revised SEQ-025) | 11 | 3 | 8 |
| 13 — `useWorkspace.regrantPermission` (SEQ-025) | 7 | 1 | 6 |
| **Total** | **40** | **8 (20%)** | **32 (80%)** |

- Well below the ~30% target, for the same reason `pick-a-folder.md` (SEQ-001) landed at 22%: this is a genuinely small flow. SEQ-023's own Flow diagram has exactly one arrow into an already-fully-built `WorkspaceController`, and CMP-004 is an explicit leaf module (`Depends On: none`) whose two exercised functions are almost entirely IndexedDB open/transaction boilerplate with only one real domain decision (`loadHandle`'s missing-record-to-`null` normalization) and one pure-delegation function (`saveHandle`) — the same shape that left `isSupported`/`pickFolder`'s happy path un-holed in that same prior plan.
- No holes were added to pad the ratio. `openDb()` and `saveHandle()` are pure leaf setup/delegation with no branch on domain data and nothing meaningful to blank, per `todo-hole.md`; padding either with an arbitrary hole would blank code with no decision behind it, the same reasoning `pick-a-folder.md` gave for leaving those two leaves un-holed.
- **SEQ-024 delta:** adds one more pure-delegation leaf (`verifyPermission`, Step 9, un-holed for the same reason as `saveHandle`) and one more flow-connecting gate (`resumeFolder`'s permission check, Step 11, holed for the same reason `openFolder`'s `saveHandle` wiring was holed at Step 7 — the one place a new SEQ's own Acceptance Criteria are actually decided). `resumeFolder`'s reused scan-and-render body (4 lines, identical to `openFolder`'s Step 7 happy path) stays working, not re-holed, per `todo-hole.md`'s "don't re-hole an already-taught pattern." Ratio moves from 11% to 14%, still comfortably under the ~30% target — same reasoning as above: this remains a small, mostly-mechanical flow with exactly one new domain decision.
- **SEQ-025 delta (this revision):** fills the two placeholders the SEQ-024 delta deliberately left open, rather than duplicating either gate:
  - Step 9's `verifyPermission` gains its query-vs-request branch — 2 new lines, both holed, since this is the actual interface fix (see the Scope note's "Interface fix" bullet): a single un-parameterized function can't express `resumeFolder`'s passive check and the retry's active one, so the decision of which handle method each mode maps to is the one new domain choice here.
  - Step 11's bare `else` no-op becomes a real `setNeedsPermission(true)` — 1 new line, holed, since this is literally the placeholder SEQ-024 said "there is no `needs-permission` state field yet ... SEQ-025 will need to *add* new state and wire it into a render" for. The new `useState(false)` declaration (1 line) is un-holed infrastructure, same rationale as every other bare `useState` in this file.
  - Step 13 adds `regrantPermission` as a new sibling function to `resumeFolder` — its granted-branch body (6 lines) reuses the scan-and-render pattern for the *third* time in this file (Step 7, Step 11, now Step 13) and stays working per `todo-hole.md`'s "don't re-hole an already-taught pattern," even though it's the line that satisfies REQ-025 AC3 — the same precedent the `render-the-sidebar-tree.md` plan set when its third and fourth status-message branches (SEQ-006's `"empty"`, SEQ-007's `"loading"`) stayed working despite each satisfying its own SEQ's acceptance criteria. The one new hole (1 line) is the retry call's `{ request: true }` argument — the single place SEQ-025's own defining behavior (active re-check instead of passive) is decided at the call site, distinguishing this call from `resumeFolder`'s otherwise-identical-looking one.
  - Ratio moves from 14% to 20%, still comfortably under the ~30% target — consistent with this plan's established small-flow rationale: three new domain decisions (the query/request branch, the needs-permission recording, the retry's active-check argument), surrounded by reused, already-taught scan-and-render and gate-comparison code.
- Rendering `status="needs-permission"` and wiring a re-grant button's `onClick` to `regrantPermission` is CMP-005's/`App.jsx`'s half (per the Scope note's split with the SEQ-005 precedent) — not implemented here. SEQ-026's catch around `scanTree(handle)` for the "folder gone" case is also not implemented here — both remain explicit gaps for those components'/SEQs' own revisions.

## Recommended Human Work Order
Every holed step above, reordered top-down along the flow (entry point → algorithm), instead of build order.
- **Step 11**: Gate `resumeFolder` on `verifyPermission(handle)`'s result before scanning, and (new, SEQ-025) record `needsPermission` when it isn't `'granted'` — `web/src/workspace/useWorkspace.js`, function `useWorkspace` (the returned `resumeFolder`) — SEQ-024/025's shared flow entry point (`WorkspaceController.resumeFolder()` → `FolderHandleStore.loadHandle()` → `FolderHandleStore.verifyPermission(handle)` → gate → needs-permission branch); start here — it is the "app load" counterpart to Step 7 below, and the first place both SEQs' Acceptance Criteria (never call `pickFolder`; scan only on `'granted'`; record needs-permission otherwise) are decided.
- **Step 13** *(new, SEQ-025)*: `regrantPermission` — `web/src/workspace/useWorkspace.js`, function `useWorkspace` (the returned `regrantPermission`) — the direct continuation of Step 11's needs-permission outcome, reached after the (not-yet-wired, deferred) re-grant click; verify the retry call passes `{ request: true }` and that a `'granted'` result clears `needsPermission` and re-scans the *same* `folderHandle` with no new picker (REQ-025 AC3).
- **Step 7**: Wire `saveHandle(handle)` into `openFolder`, awaited before the scan proceeds — `web/src/workspace/useWorkspace.js`, function `useWorkspace` (the returned `openFolder`) — SEQ-023's flow entry point (`WorkspaceController.openFolder()` → `FolderHandleStore.saveHandle(handle)`); a sibling entry point to Step 11, sharing the same file.
- **Step 3**: Normalize a missing IndexedDB record into `null` — `web/src/workspace/folderHandleStore.js`, function `loadHandle` — the leaf/read-back stage Step 11 calls first: SEQ-023 AC2 exercises it directly ("a handle written by `saveHandle()` is retrievable by `loadHandle()`").
- **Step 9** *(revised, SEQ-025)*: The query-vs-request branch in `verifyPermission` — `web/src/workspace/folderHandleStore.js`, function `verifyPermission` — the leaf stage both Step 11 (passive, default call) and Step 13 (active, `{ request: true }`) call into; verify the default path still calls `queryPermission` only, and the `request: true` path calls `requestPermission` only — no cross-wiring between the two branches.

## Closeout
- [x] Test
- [ ] Review — once the code above is reviewed, re-run `/auto-action` on this plan to mark it done
