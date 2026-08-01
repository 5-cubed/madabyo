# Plan: Read and Render a File's Markdown Content (SEQ-008)

**Type:** Self-Plan

## Scope
- Design unit: SEQ-008 "Read and render a file's markdown content" (REQ-008, CMP-007 MarkdownRenderer, CMP-009 PaneManager render-wiring), **plus, per this revision, SEQ-009 "Open or focus a tab for a clicked file"** (REQ-009, CMP-005 SidebarTree — interface only, CMP-008 TabManager — new, CMP-009 PaneManager — now the full `openFile` check-then-dispatch, not just the render-wiring slice), **plus, per this further revision, SEQ-010 "Malformed markdown render failure"** (REQ-010, CMP-007 MarkdownRenderer — adds the `render-error` status to `renderFile`, CMP-010 Pane — new component, first built here), **plus, per this further revision, SEQ-011 "File-not-found for a moved/deleted file"** (REQ-011, CMP-007 MarkdownRenderer — adds the `not-found` status to `renderFile`, CMP-010 Pane — adds the `not-found` branch; CMP-009 PaneManager / CMP-008 TabManager — verified no change needed, same generic pass-through reasoning as SEQ-010), **plus, per this further verification pass, SEQ-012 "Prevent duplicate tabs for an already-open file"** (REQ-012, CMP-008 TabManager — verified fully satisfied by the existing Step 7/8 dedup guard and its test, no changes needed), **and, per this further verification pass, SEQ-013 "Open multiple files as separate tabs"** (REQ-013, CMP-005 SidebarTree — interface only, no live wiring per Out of scope below; CMP-009 PaneManager / CMP-008 TabManager — the append/order behavior itself needs no new implementation, but no existing test actually proves it for N distinct files, so this revision adds one new proving test, Step 26), **and, per this further revision, SEQ-014 "Switch active tab"** (REQ-014, CMP-010 Pane — adds the tab-bar row CMP-010's own `Used By` list already earmarked for this SEQ: a clickable label per open tab, an active-tab highlight, and the `onSelectTab` wiring; CMP-008 TabManager — verified `focusTab(fileId)` is already fully built and tested at Steps 9-10, no change needed), **and, per this further revision, SEQ-015 "Close a tab"** (REQ-015, CMP-008 TabManager — adds `closeTab(fileId)`, the interface CMP-008 already fixed but no earlier SEQ built: removes the tab's entry, and per CMP-008's own interface note leaves `activeTabId` unchanged if the closed tab wasn't active — the note's other half, auto-activating an adjacent tab when the *active* tab closes, is SEQ-016's job (verified by reading SEQ-016.md: its own Flow/Sequence own that branch outright), so this revision only shapes `closeTab` to not foreclose it, per the note below; CMP-010 Pane — adds each tab's close control and its `onCloseTab` wiring, mirroring SEQ-014's tab-bar/`onSelectTab` pattern one prop over), **and, per this further revision, SEQ-016 "Auto-activate adjacent tab after closing the active tab"** (REQ-016, CMP-008 TabManager — replaces `closeTab`'s `activeTabId = null` placeholder, in the branch where the closed tab was active, with the deterministic adjacent-tab rule REQ-016 actually specifies: left-neighbor-first, else the tab that shifts into the closed one's old position), **and, per this further verification pass, SEQ-017 "Empty-state when the last tab in a pane closes"** (REQ-017, CMP-008 TabManager — verified `closeTab`'s existing `tabs.length === 0` branch, the `else { this._activeTabId = null; }` placeholder Step 32 has carried unchanged since SEQ-015, already fully satisfies AC1 on its own; the genuine gap was a test one — no existing scenario in Step 31 ever closes a pane down to zero tabs — closed with one new proving scenario, no implementation change; CMP-010 Pane — verified the existing `!activeTab` branch (Step 17, wrapped by Step 28's tab-bar addition) already satisfies AC2 for the exact `tabs=[]`/`activeTabId=null` prop combination, word-for-word what Step 16's original SEQ-010 test already renders and asserts; this revision strengthens that existing test in place with one assertion proving the tab-bar row also renders harmlessly empty rather than broken, no new implementation or hole on either side).
- **SEQ-010 delta on the combined flow:** `renderFile` gains a second exit — a caught parser exception resolves `{ status: 'render-error' }` instead of the `{ status: 'ok', html }` shape — and that result flows, unchanged, through the exact same `TabManager.openTab` call Step 12 already makes. `<Pane>` (new) then reads a tab's `status` from its `tabs` prop entry and renders either the html (`ok`) or an explicit error message (`render-error`).
  ```
  MarkdownRenderer.renderFile(fileHandle)
    |
    +-- parses ok        --> { status: 'ok', html }          --\
    |                                                            +--> TabManager.openTab(fileId, result) --> <Pane> renders per status
    +-- parser throws    --> { status: 'render-error' }       --/
  ```
- **Verified no change needed in `TabManager`/`PaneManager` for SEQ-010:** Step 6's `openTab(fileId, renderResult)` stores `{ fileId, renderResult }` verbatim with no branch on `renderResult.status`, and Step 12's `openFile` calls `pane.tabManager.openTab(fileId, result)` with whatever `MarkdownRenderer.renderFile` resolved, again with no status branch. Both are already fully generic pass-throughs — SEQ-010 needs zero new steps in `TabManager.js` or `PaneManager.js`, only the new `render-error` exit inside `renderFile` itself (Steps 14-15 below) and the new `Pane` component that finally interprets `status` (Steps 16-21 below).
- **SEQ-011 delta on the combined flow:** `renderFile` gains a third exit — a failed read (the file no longer exists at its handle's location) resolves `{ status: 'not-found' }`, ahead of the parse stage entirely, since a file that can't be read also can't be parsed. `<Pane>` gains a matching third branch reading the same `status` field.
  ```
  MarkdownRenderer.renderFile(fileHandle)
    |
    +-- read fails       --> { status: 'not-found' }          --\
    +-- parses ok        --> { status: 'ok', html }             +--> TabManager.openTab(fileId, result) --> <Pane> renders per status
    +-- parser throws    --> { status: 'render-error' }        --/
  ```
- **Verified no change needed in `TabManager`/`PaneManager` for SEQ-011 (same reasoning as SEQ-010, restated):** both `TabManager.openTab` (Step 6) and `PaneManager.openFile` (Step 12) store/forward whatever `renderFile` resolves without inspecting `status` at all — a third possible value (`'not-found'`) is invisible to both, since neither ever branches on it. SEQ-011 needs zero new steps in `TabManager.js` or `PaneManager.js`, only the new `not-found` exit inside `renderFile` itself (Steps 22-23 below) and the new `Pane` branch that renders it (Steps 24-25 below).
- Combined flow (SEQ-008's arrow plus SEQ-009's check-then-dispatch around it):
  ```
  SidebarTree (onSelectFile) -- not yet wired to a live PaneManager, see Out of scope below
  PaneManager.openFile(paneId, fileHandle)
    |
    v
  pane.tabManager.tabs.find(existing tab for this fileId?)
    |
    +-- found     --> TabManager.focusTab(fileId)
    |
    +-- not found --> MarkdownRenderer.renderFile(fileHandle)
                         |
                         v
                       { status: 'ok', html }
                         |
                         v
                       TabManager.openTab(fileId, renderResult)
  ```
  The top half (`PaneManager.openFile` -> `MarkdownRenderer.renderFile`) is SEQ-008's original arrow — unchanged. The check-then-dispatch and the `TabManager` calls are SEQ-009's addition, replacing the SEQ-008 version's unconditional "render and store" behavior.
- **Renderer choice (open ADR item per CMP-007's `Depends On` note):** this plan picks `marked` as the production markdown-rendering library, promoted from the feasibility prototype's placeholder use (`app/index.html`'s `openFile()`, loaded there via CDN script tag purely for prototyping speed, per the wiki). Rationale: `marked` exposes a single synchronous `marked.parse(text): string` call, which is the simplest possible fit for `MarkdownRenderer`'s stated "stateless module" responsibility — no instantiation, no async parser setup, unlike `markdown-it` (`new MarkdownIt().render(text)`) or `unified`/`remark` (a multi-plugin pipeline, considerably more setup for a greenfield app with no current need for custom AST transforms). The prototype already exercised `marked` against real markdown files, so its output shape for headings/lists/code blocks (REQ-008 AC2) is a known quantity, not a fresh unknown. Alternatives were not evaluated further — per this run's instructions, the goal is the simplest choice for this greenfield Vite/React app, not an exhaustive bake-off. This is a new production dependency: `marked` is not yet in `web/package.json` (confirmed by inspection — only the prototype's CDN `<script>` tag references it).
- **`TabEntry` shape (open point per this revision — CMP-008 fixes `get tabs(): TabEntry[]` but not `TabEntry`'s own shape):** this plan picks `{ fileId: string, renderResult: { status, html? } }` — a tab entry is just the file's id paired with the exact render result `MarkdownRenderer.renderFile` already produces, stored verbatim. Rationale: `TabManager`'s own responsibility (per CMP-008) is order/active-tab/dedup bookkeeping, not reshaping render output; inventing separate `html`/`status` fields directly on the entry would duplicate `MarkdownRenderer`'s already-fixed return contract for no benefit. Simplest shape that satisfies every SEQ-009 acceptance criterion.
- **SEQ-014 delta on the combined flow:** a second, independent flow through the same `Pane` component — not the render-display flow above (data going in), but the reverse direction (a user's tab click going out). `Pane` gains a tab-bar row rendered alongside its existing content branches; each tab in `tabs` becomes a clickable element, the one matching `activeTabId` is marked selected, and clicking any tab calls `onSelectTab(tab.fileId)`.
  ```
  <Pane onSelectTab={fileId} />
    |
    v
  (Pane's parent — not yet built, see Out of scope below)
    |
    v
  TabManager.focusTab(fileId)   <-- already built & tested, Steps 9-10, no change
  ```
  `TabManager.focusTab` and its `activeTabId` bookkeeping are unchanged and already satisfy SEQ-014 AC1 (`activeTabId === fileId` after `focusTab`) as a side effect of Step 9's existing test. This revision's only new work is inside `Pane` itself: the tab-bar row (Steps 27-28) and the click-to-`onSelectTab` wiring (Steps 29-30), which together satisfy SEQ-014 AC2 (exactly one tab marked active in the re-rendered Pane) and REQ-014 AC1 (clicking a non-active tab fires the callback that lets some parent make it active).
- **SEQ-015 delta on the combined flow:** a third flow through `TabManager`/`Pane`, alongside the render-display flow (data in) and SEQ-014's tab-select flow (a click out to `focusTab`) — this one a click out to `closeTab`.
  ```
  <Pane onCloseTab={fileId} />
    |
    v
  (Pane's parent — not yet built, see Out of scope below)
    |
    v
  TabManager.closeTab(fileId)   <-- new this revision, Steps 31-32
    |
    v
  this._tabs minus the fileId entry; activeTabId unchanged unless fileId was active
  ```
  `closeTab`'s own contract (Steps 31-32) covers only SEQ-015's own two acceptance criteria: the closed entry is gone from `tabs`, and `activeTabId` is left untouched when the closed tab wasn't the active one. When the closed tab *was* active, `closeTab`'s conditional resets `activeTabId` to `null` as an explicit placeholder — not a decision this SEQ makes about which tab becomes active next (SEQ-016 owns that; its own Flow/Sequence in `SEQ-016.md` pick "a deterministically chosen adjacent tab," which is squarely a different design decision than anything SEQ-015's own AC's ask for). The placeholder keeps the `if (this._activeTabId === fileId) { ... }` shape already in place so SEQ-016's revision only has to replace the one line inside it, not restructure the method. `Pane`'s half (Steps 33-36) mirrors SEQ-014's tab-bar/`onSelectTab` pattern one prop over: each tab gets a close control alongside its existing select button, and clicking it calls `onCloseTab(tab.fileId)`.
- **SEQ-016 delta on the combined flow:** no new flow arrow — this SEQ is entirely inside the one branch SEQ-015's `closeTab` deliberately left as a placeholder (the `if (this._activeTabId === fileId) { this._activeTabId = null; }` block, Step 32). REQ-016/SEQ-016's own Flow (`TabManager.closeTab(activeTabId)` -> `[tabs.length > 0?]` -> `activeTabId = adjacent tab's id`) and Sequence step 3 ("a deterministically chosen adjacent tab... left-neighbor-first, else the next one to the right") replace that placeholder with the real rule:
  ```
  TabManager.closeTab(fileId), fileId === activeTabId
    |
    v
  closedIndex = this._tabs.findIndex(fileId)   (captured before the filter runs)
    |
    v
  this._tabs = filtered (fileId's entry removed)
    |
    +-- tabs.length === 0  --> activeTabId = null            (unchanged from SEQ-015, SEQ-017's territory)
    |
    +-- tabs.length > 0    --> newIndex = closedIndex > 0 ? closedIndex - 1 : 0
                                 |
                                 v
                               activeTabId = this._tabs[newIndex].fileId
  ```
  The `closedIndex - 1` branch is "left neighbor" (removing an entry never shifts anything before it, so the old left-neighbor's index is unchanged in the filtered array); the `0` branch covers "no left neighbor" (the closed tab was leftmost, so the tab that used to be immediately to its right has shifted into index 0). Both cases are one formula, not two independent rules — REQ-016 AC2's "consistent rule... verifiable across repeated closes" is exactly this one expression applied every time.

- Out of scope, deferred to later SEQ plans or later runs that already own (or will own) the affected file/behavior:
  - `Pane`'s tab bar (rendering each open tab's label, highlighting the active one, and wiring `onSelectTab`/`onCloseTab` to clicks) — CMP-010 fixes these two props on `<Pane>`, but no SEQ read for this run exercises switching or closing a tab via the UI (that's SEQ-014/015/017's territory, per CMP-010's own `Used By` list). This revision builds only the half of Pane's responsibility SEQ-010 actually needs: given `tabs`/`activeTabId`, show the active tab's content (or an empty state) — not the bar that lets a human change which tab is active. `onSelectTab`/`onCloseTab` are accepted in `Pane`'s props (matching CMP-010's fixed interface exactly) but unused until that later work wires them to the tab bar. **(Superseded for `onSelectTab` by the SEQ-014 revision's Steps 27-30 — the tab bar and its click-to-`onSelectTab` wiring are built; superseded for `onCloseTab` by this further revision's Steps 33-36 below — each tab's close control and its click-to-`onCloseTab` wiring are now built too. Both props are now fully exercised inside `Pane` itself; only the parent-side wiring remains open, per the `App.jsx` bullet below.)**
  - ~~`TabManager.closeTab(fileId)` — CMP-008 fixes its interface ("auto-activates an adjacent tab if `fileId` was active"), but no SEQ read for this run exercises it; deferred to whichever later SEQ introduces closing a tab.~~ **(Built by this further revision's Steps 31-32 below — see the SEQ-015 delta above. The "auto-activates an adjacent tab" half of CMP-008's note remains genuinely deferred: Steps 31-32 only implement the non-active-tab-closes case SEQ-015's own AC's test, plus a placeholder for the active-tab-closes case that SEQ-016 replaces with real adjacent-tab selection. **Update: that placeholder is now itself replaced — see the SEQ-016 delta above and the SEQ-016 revision note below. `closeTab` is fully built as of this revision; nothing about it remains deferred.**)**
  - Wiring `<SidebarTree>`'s `onSelectFile` prop to actually call a live `PaneManager.openFile` inside `App.jsx`, and mounting/instantiating `PaneManager` itself in `App.jsx` — no plan read for this run touches `App.jsx`'s pane wiring (the `render-the-sidebar-tree.md` plan wires `onSelectFile` only as a no-op stub `() => {}`; confirmed still true by inspection — `App.jsx` renders no `<Pane>` at all yet). `PaneManager`/`TabManager` are fully built and tested here as standalone modules; connecting them to the live component tree is deferred to whichever later run introduces the pane UI itself. **This same deferral covers SEQ-014's Sequence step 2 ("Pane's parent calls that pane's TabManager's `focusTab(fileId)`") and SEQ-015's Sequence step 2 ("Pane's parent calls that pane's TabManager's `closeTab(fileId)`")** — there is no live `App.jsx` integration point yet for `<Pane onSelectTab={...} onCloseTab={...}>` to be wired into, so those two lines (`onSelectTab={(fileId) => pane.tabManager.focusTab(fileId)}` and `onCloseTab={(fileId) => pane.tabManager.closeTab(fileId)}`) wait for the same later work as the rest of this bullet. Neither `TabManager.focusTab` nor `TabManager.closeTab` itself needs a new step for this (see the SEQ-014/SEQ-015 delta notes above).
  - `PaneManager.splitRight`, `resizeDivider`, `closePane` — CMP-009 methods used only by later SEQs (SEQ-013, SEQ-018 through SEQ-022); not touched here.
- AC1 ("`renderFile()` reads the file's text before producing any HTML") is not given its own ordering-sensitive test: with a real (non-mocked) `marked`, the only way `renderFile`'s resolved `html` can reflect the source text (AC2, exercised in Steps 2 and 4) is if the text was read first — a separate spy-based call-order assertion would mock an internal collaborator (`handle.getFile`/`file.text`) against `tdd-mocking.md`'s "don't mock internal domain logic" guidance, for a property Steps 2/4 already prove observably.
- Test doubles: `FileSystemFileHandle`'s `getFile(): Promise<File>` / `File.text(): Promise<string>` are, like the `FileSystemDirectoryHandle` fakes in the `scan-filter-and-prune-to-markdown-only.md` plan, not a true system boundary the way the native picker dialog is — just an object exposing two async methods. Tests use a local `fakeFileHandle(name, content)` (distinct shape from that plan's `fakeFile`/`fakeDir`, which never expose file content) returning `{ kind: 'file', name, async getFile() { return { text: async () => content } } }`, duplicated locally per file per that plan's established convention. `marked` itself is exercised for real in every test — it is the thing REQ-008 AC2 needs proven, not a boundary to fake. `TabManager` needs no fakes at all — it is a plain in-memory class with no I/O, so its own tests (Steps 5, 7, 9) construct it directly and call its methods; only `PaneManager`'s tests (Steps 11, 13) need `fakeFileHandle`, for the same reason as before.
- **New test double for SEQ-011 (Step 22):** `fakeMissingFileHandle(name)`, a second local helper in `markdownRenderer.test.js` alongside `fakeFileHandle`, returning `{ kind: 'file', name, async getFile() { throw new DOMException('A requested file or directory could not be found', 'NotFoundError'); } }`. This models the real `FileSystemFileHandle.getFile()` behavior when the underlying file entry is gone (the browser throws exactly this `NotFoundError` DOMException), matching this plan's existing preference for fakes that mirror the real API's documented failure shape rather than an arbitrary generic `Error`.
- **Exception to "marked is exercised for real" (SEQ-010, Step 14 only):** `marked.parse` is deliberately permissive — it does not throw on ordinary malformed markdown text, by design (it degrades gracefully instead). There is no real markdown string that reliably reproduces a parser exception, so Step 14's test cannot exercise `renderFile`'s new catch branch through real input the way Steps 2/4 exercise the happy path. `marked` here is a third-party library, i.e. external to the system per `tdd-mocking.md`'s boundary table, so Step 14 uses `vi.spyOn(marked, 'parse').mockImplementationOnce(() => { throw new Error(...) })` for this one test only, restored via `afterEach(() => vi.restoreAllMocks())` so Steps 2/4's real-`marked` tests in the same file are unaffected. This is the only mocked call in the whole plan; every other test (Steps 2, 4, 11, 13, 18, 20) exercises real collaborators.
- **Revision note (SEQ-009 delta, this run):** the original version of this plan flagged its own `PaneManager` state (`{ id, lastRender }`) and `openFile` (unconditional render-and-store) as an interim shape sized to exactly what SEQ-008 needed, expecting the SEQ-009 plan to replace it once `TabManager` (CMP-008) existed. Per `/co-plan`'s revise-vs-create rule, that replacement is made here, in place, rather than in a new plan file, since it changes the exact interface (`PaneManager.openFile`, `PaneManager`'s per-pane state) this plan already owns and tests. Steps 5-10 (new) build `TabManager` standalone, leaf-first per TDD build order; Steps 11-13 (replacing the old Steps 5-6) rewrite `PaneManager`'s state and `openFile` to check `TabManager` first and dispatch to `focusTab` or `renderFile` + `openTab` accordingly, per CMP-009's `openFile` interface line and SEQ-009's Sequence steps 2-3.
- **Revision note (SEQ-010 delta, this run):** SEQ-010 needs (1) `renderFile` to gain the `render-error` exit it deferred at Step 3/4 — added in place as new Steps 14-15, extending the same function rather than reopening Steps 3/4, since the happy path they built is untouched; (2) no change to `TabManager`/`PaneManager`, verified above; (3) the new `Pane` component (CMP-010), which no earlier plan has touched. Per `/co-plan`'s guidance that a whole new plan file for one component would fragment the design more than it clarifies, `Pane` is added here as new Steps 16-21, since its first behavior (rendering a tab's render result, including the `render-error` case Step 15 just produced) is a direct continuation of this plan's own flow. Steps 16-21 build only the slice of CMP-010's responsibility SEQ-010's flow and acceptance criteria require — see Out of scope above for the tab-bar half deferred to later SEQs.
- **Revision note (SEQ-011 delta, this run):** SEQ-011 needs (1) `renderFile` to gain the `not-found` exit its own `Out of scope` note deferred here — added in place as new Steps 22-23, extending the same function again (now a third status alongside `ok`/`render-error`), since Steps 3/4/14/15's existing behavior is untouched; the read (`handle.getFile()`/`file.text()`) is hoisted into its own `try`/`catch` ahead of the existing parse `try`/`catch`, because a file that can't be read also can't reach the parse stage at all — the two failure modes are sequential, not alternative branches of one `try`; (2) no change to `TabManager`/`PaneManager`, verified above, same generic-pass-through reasoning as SEQ-010; (3) `Pane` gains a third, matching branch — added as new Steps 24-25, directly after Step 21's `render-error` branch. Per `todo-hole.md`'s "hole exactly one representative branch, the rest stay working" guidance, Step 21 already delivered the *second* occurrence of Pane's status-branch pattern as a hole (Step 19's `ok` branch was the first, working, representative one); by the time a *third* occurrence (`not-found`) is added, the pattern of "add a status check, return a distinct element" has already been taught twice over (once worked, once left as a hole), so Step 25 is written as full working code — this also pulls the plan's hole ratio back toward budget (see tally below).
  - **Tally bookkeeping fix (this revision):** the Hole/Working Tally table below previously stopped at Step 12 (the SEQ-008/009 state) and was never extended when the SEQ-010 revision added Steps 15 and 21 (each one holed line). This revision adds those two rows now, alongside the new SEQ-011 rows, so the whole-plan total below is accurate rather than just the SEQ-011 delta.
- **Revision note (SEQ-013 check, this run): genuine test gap found, closed with one new test, no new implementation or hole.** SEQ-013's flow (`PaneManager.openFile(paneId, fileHandle) x N` -> `TabManager` growing by one per distinct file, in click order) is already fully implemented: Step 12's not-found branch (render + `openTab`) and Step 6's unchanged push-and-activate lines are exactly the append logic this SEQ needs, with no per-SEQ decision left to make. But checking the existing tests line by line against SEQ-013's own two acceptance criteria (AC1: after N distinct clicks, `tabs.length === N`; AC2: `tabs` order matches click order) turned up a real hole in test coverage, not just in implementation:
  - Step 7 (`TabManager`) and Step 13 (`PaneManager`) each call the open method three times, but as `a.md`, `b.md`, `a.md` again — two distinct files plus one repeat, built to prove SEQ-012's dedup guard. Both incidentally end with `tabs.length === 2`, but neither test asserts anything about `tabs[1]` (the `b.md` entry) — only `tabs[0]`, `tabs.length`, and the active tab are checked. So the *order* half of SEQ-013's contract (AC2) is never actually asserted, and the *count* half (AC1) is only ever demonstrated for `N=2` with a repeat mixed in, not for a clean run of N distinct, never-repeated files.
  - No existing test opens 3+ distinct files with zero repeats and checks both `tabs.length` and the full sequence of `fileId`s in order — the exact shape of SEQ-013's own Sequence/Acceptance Criteria. This is a coverage gap, not an implementation gap: the underlying code (Steps 6 and 12) already generalizes correctly to any N, it has simply never been exercised or proven at N=3 with a distinct-order assertion. Per this run's instructions, this is the "genuine gap... very likely to need NO new hole" case — the fix is one new proving test (Step 26 below), added at the `PaneManager` level since that is SEQ-013's own flow's entry point (`PaneManager.openFile x N`, per its Flow diagram), rather than a new implementation step. No new hole is introduced; Steps 6/12's existing holes already cover the only decisions this flow makes.
- **Revision note (SEQ-014 delta, this run):** checked against CMP-008 (`TabManager`) first — `focusTab(fileId)` (Step 10) and its `activeTabId` getter (Step 6) already fully satisfy SEQ-014 AC1 verbatim, proven by Step 9's existing test; no new `TabManager` step. The real gap is entirely inside `Pane` (CMP-010): every prior revision (SEQ-008/009/010/011) built only the half of Pane's responsibility that turns `tabs`/`activeTabId` into displayed content, explicitly deferring "the bar that lets a human change which tab is active" (see the superseded Out of scope bullet above). SEQ-014 is exactly that deferred half. Two red-green cycles are added, both inside `Pane.jsx`/`Pane.test.jsx`: Steps 27-28 build the tab-bar row itself (a clickable, labeled element per open tab, with the active one distinguished) as working code — it reuses the exact `tab.fileId === activeTabId` equality Step 17 already established for the single-lookup case, just applied per-tab instead of once, so per `todo-hole.md`'s "don't re-hole an already-taught pattern" guidance this teaches nothing new and stays working; Steps 29-30 add the one line that actually is new — the click handler calling `onSelectTab(tab.fileId)` — which is SEQ-014's whole reason for existing (Sequence step 1) and this revision's sole hole. Sequence step 2 (`Pane`'s parent calling `TabManager.focusTab`) needs no new step here at all — it is covered by the existing `App.jsx`-integration deferral, updated above, since `focusTab` is already built and there is no live parent yet to wire it into.
- **Revision note (SEQ-012 check, this run): no changes needed.** SEQ-012's own Sequence and Acceptance Criteria (1: calling `openTab()` twice with the same `fileId` leaves exactly one tab for that file; 2: the second call's `renderResult` is discarded rather than overwriting the existing tab's content) restate, almost verbatim, the dedup guard Steps 7-8 already built during the SEQ-009 revision above — Step 8's own **Hole** description already names this explicitly ("the internal backstop guard SEQ-009's Sequence step 3 references, alongside `PaneManager`'s own check in Step 12 below"), and the Recommended Human Work Order's Step 8 entry already flags "this is also SEQ-012's contract, exercised here as a natural side effect of building `TabManager`." Checked line by line against SEQ-012's Sequence: step 1 (defensive existence check, regardless of what the caller already checked) = Step 8's `this._tabs.find((t) => t.fileId === fileId)`; step 2 (found -> delegate to `focusTab(fileId)` without re-storing `renderResult` or appending) = Step 8's `if (existing) { this.focusTab(fileId); return; }`; step 3 (not found -> append and activate) = Step 6's unchanged push-and-activate lines, reached only when Step 8's guard falls through. SEQ-012 AC1 is exercised by Step 7's assertion that `tm.tabs` has length 2 (one entry per distinct `fileId`, including `'a.md'` opened twice, once initially and once again after `'b.md'`); AC2 is exercised by that same test's assertion that `tm.tabs[0].renderResult.html` is still `'<h1>A</h1>'` after the third call passed `'<h1>A again</h1>'` — proving the second call's `renderResult` was discarded, not stored. No SEQ-012 acceptance criterion is left unexercised, so this verification pass adds no new Action Sequence step, no new hole, and no change to the Hole/Working Tally or Recommended Human Work Order — both already correctly account for Step 8's dual role.
- **Revision note (SEQ-015 delta, this run):** checked CMP-008 first — unlike SEQ-014's `focusTab`, `closeTab(fileId)` does not exist anywhere in this plan yet; CMP-008 only fixed its interface, and the prior plan's own Out of scope bullet explicitly deferred it "to whichever later SEQ introduces closing a tab" — this is that SEQ. Two new red-green cycles are added in `TabManager.js`/`TabManager.test.js` (Steps 31-32): Step 31 tests exactly SEQ-015's own two AC's (closed entry gone from `tabs`; `activeTabId` unchanged when the closed tab wasn't active) and nothing about the active-tab-closes case, since SEQ-015's own Acceptance Criteria don't test it. Step 32 implements `closeTab` with a filter (removal, working — a mechanical rebuild excluding the matching entry, no per-SEQ branching) and a conditional (holed — the one line that is this stage's own core decision, whether the closed tab was the active one, which is exactly what AC2 hinges on). Read `SEQ-016.md` before drawing this line: its own Flow (`TabManager.closeTab(activeTabId)` -> `[tabs.length > 0?]` -> `activeTabId = adjacent tab's id`) and Sequence step 3 ("a deterministically chosen adjacent tab... left-neighbor-first") show the adjacent-tab selection is a nontrivial decision of its own, squarely SEQ-016's to make — so Step 32's conditional body is written as a `null` placeholder (working code, an explicit interim value, not a decision) rather than any real selection logic, keeping the `if` shape in place for SEQ-016 to extend without restructuring. On the `Pane` side (CMP-010), four new steps (33-36) mirror SEQ-014's Steps 27-30 exactly one prop over: Steps 33-34 add each tab's close control (a second button per tab, wrapped alongside the existing tab-select button) as working code, per the same "already-taught mapping/button pattern, no new decision" reasoning Step 28 used; Steps 35-36 wire that button's click to call `onCloseTab(tab.fileId)`, which is SEQ-015's whole reason for existing in the UI layer and this revision's other hole. Both `Pane`-side steps are structured, tested, and holed identically to their SEQ-014 counterparts — deliberately, since `onSelectTab`/`onCloseTab` are peer props on the same component per CMP-010's fixed interface.
- **Revision note (SEQ-016 delta, this run):** unlike the SEQ-010/SEQ-011 pattern (each added new steps, e.g. 14-15 then 22-23, because each was adding a genuinely new, parallel exit to `renderFile` alongside the untouched happy path), SEQ-016 is not adding a new branch to `closeTab` — it is filling in the *inside* of the one branch that already exists (`if (this._activeTabId === fileId) { ... }`), which SEQ-015 built as an explicit, intentionally-incomplete placeholder for exactly this SEQ to finish. So this revision edits Steps 31 and 32 in place rather than appending Steps 37-38: Step 31 (test) gains two new scenarios proving REQ-016's two acceptance criteria (closing an active tab with a left neighbor; closing an active tab with no left neighbor, i.e. the leftmost tab), alongside its existing SEQ-015 scenario, unchanged. Step 32 (impl) gains one new working setup line (`closedIndex`, captured before the filter runs, since the filter's removal makes the closed tab's original position unrecoverable afterward) and replaces the inner `this._activeTabId = null;` placeholder with a `tabs.length > 0` guard (working — the explicit condition SEQ-016's own Flow diagram names, and the `tabs.length === 0` half stays `null`, unchanged, since that terminal case is SEQ-017's territory, not this SEQ's) wrapping the new key-change hole: `const newIndex = /* */;`, the left-neighbor-first-else-shifted-right formula that is REQ-016's entire reason for existing. The line that applies `newIndex` (`this._activeTabId = this._tabs[newIndex].fileId;`) is written as working code, per the same precedent Step 3's `return { status: 'ok', html }` and Step 15/23's catch bodies established: once the stage's one key value is computed (holed), packaging/applying that already-computed value is mechanical, not a second decision. This also means Step 32 now carries two holes side by side in the same method — SEQ-015's original comparison (`this._activeTabId === /* */`) and SEQ-016's new `newIndex` computation — both left in place rather than one superseding the other, since they are genuinely two different decisions (whether the closed tab was active; if so, which tab replaces it) that happen to live in the same conditional. SEQ-015's own hole's TODO comment is also updated in place: its point 2 and worked example previously described the true-branch's consequence as "reset to null (SEQ-016 replaces this line)" — now that SEQ-016 has in fact replaced it, that forward-reference is stale and is rewritten to describe the real behavior instead.

- **Revision note (SEQ-017 delta, this run):** checked both components named in `SEQ-017.md` before adding anything. `TabManager` first: Step 32's conditional already has an `else { this._activeTabId = null; }` branch for the `tabs.length === 0` case — unchanged since SEQ-015 introduced it as a placeholder, and explicitly named "SEQ-017's territory" by the SEQ-016 revision note above. That placeholder is exactly REQ-017/SEQ-017 AC1 ("closing the last tab leaves zero tabs and `activeTabId === null`") — no new decision, no new line, needed there. But none of Step 31's three existing scenarios ever reduce `tabs` to zero (scenario 1 ends at 1 tab remaining; scenarios 2/3 end at 2 and 1 respectively) — REQ-017's own Interface line ("a close event on a pane's only remaining tab") is never actually exercised. This is the same shape of gap as the SEQ-013 verification pass: a genuine test-coverage hole, not an implementation one, closed with one new proving scenario (Step 31's new scenario 4 below) rather than any new hole. `Pane` second: Step 17's `!activeTab` branch (`tabs.find((t) => t.fileId === activeTabId)` returning `undefined`) is true whenever `tabs` is empty, regardless of what `activeTabId` holds — so this branch already covers SEQ-017's exact prop combination (`tabs=[]`, `activeTabId=null`), and Step 28 explicitly wraps that unchanged branch alongside the tab-bar row rather than bypassing it, so the tab-bar renders too (harmlessly empty, since `[].map(...)` produces no elements). Step 16's original SEQ-010 test already renders this precise prop combination and asserts the empty-state text is present — that test has been silently proving SEQ-017 AC2 as a regression check ever since Step 28 (tab-bar) and Step 34 (close buttons) were added on top of it. The one real gap here is that no test ever asserted the tab-bar row *itself* stays empty rather than broken for this case — REQ-017 AC1's framing ("not a crash or blank area") is exactly the risk a stray/broken tab-bar-with-nothing state would represent. This revision strengthens Step 16's existing test in place with that one assertion, rather than adding a new step, per `/co-plan`'s bias toward revising over duplicating already-proven scenarios. Net effect: zero new implementation lines, zero new holes, two test-side additions (one new scenario, one strengthened assertion) — the Hole/Working Tally is unchanged by this revision.

## Action Sequence

- **Step 1 (setup).** Add `marked` as a production dependency: run `npm install marked` in `web/`, adding it to `package.json`'s `dependencies`.
  - **Working:** Entire step — a manifest/lockfile change with no logic to hole; not counted in the tally below (same treatment prior plans gave test-tooling setup).

- **Step 2 (test).** Write failing test in `web/src/workspace/markdownRenderer.test.js`: define the local `fakeFileHandle(name, content)` helper described above. Given `fakeFileHandle('notes.md', '# Hello')`, `renderFile(handle)` resolves to `{ status: 'ok', html: expect.stringContaining('<h1>Hello</h1>') }`.

- **Step 3 (impl).** Implement `renderFile(handle)` in `web/src/workspace/markdownRenderer.js`: import `{ marked }` from `'marked'`; `const file = await handle.getFile();`, `const text = await file.text();`, render `text` to `html` with `marked.parse`, then `return { status: 'ok', html };`, so Step 2 passes.
  - **Working:** The `await handle.getFile()` and `await file.text()` lines (the file-read plumbing AC1 depends on), and the `return { status: 'ok', html }` line (the resolved shape CMP-007's interface fixes).
  - **Hole:** The in-stage key-change line — the actual read-to-render transformation this whole design unit exists to perform (REQ-008: "render it to HTML with the chosen markdown renderer"; SEQ-008 AC2). TODO (per `todo-hole.md`):
    ```javascript
    // TODO:
    // 1. text is the file's raw markdown, already read from the handle above.
    // 2. Call marked.parse(text) to render it to an HTML string.
    // e.g. text = "- one\n- two" -> marked.parse("- one\n- two")
    //      -> "<ul>\n<li>one</li>\n<li>two</li>\n</ul>\n"
    const html = marked.parse(/* */);
    ```

- **Step 4 (test).** Write test in `markdownRenderer.test.js`: given `fakeFileHandle('guide.md', '## Section\n\n- item\n\n```js\ncode()\n```')`, assert the resolved `html` contains `<h2>Section</h2>`, `<li>item</li>`, and `<pre><code`. This is a regression check on Step 3's `marked.parse` call, directly proving REQ-008/SEQ-008 AC2's "headings, lists, code blocks" — expected to already pass with no further implementation change; if it fails, Step 3's hole was filled with something narrower than a full `marked.parse` call (e.g. hardcoded heading-only handling).

- **Step 5 (test, SEQ-009).** Write failing test in `web/src/panes/TabManager.test.js`: construct `const tm = new TabManager();`, call `tm.openTab('notes.md', { status: 'ok', html: '<h1>Hi</h1>' })`; assert `tm.tabs` equals `[{ fileId: 'notes.md', renderResult: { status: 'ok', html: '<h1>Hi</h1>' } }]` and `tm.activeTabId` is `'notes.md'`.

- **Step 6 (impl, SEQ-009).** Implement the base of `TabManager` in `web/src/panes/TabManager.js`: `export class TabManager` with a `constructor()` setting `this._tabs = []; this._activeTabId = null;`, a `get tabs()` returning `this._tabs`, a `get activeTabId()` returning `this._activeTabId`, and `openTab(fileId, renderResult)` that pushes `{ fileId, renderResult }` onto `this._tabs` and sets `this._activeTabId = fileId`, so Step 5 passes.
  - **Working:** Entire step — first pass of `TabManager`'s own state (constructor, the two getters, and `openTab`'s append-and-activate). No dedup decision yet (added in Step 8); nothing to hole.

- **Step 7 (test, SEQ-009).** Write failing test in `TabManager.test.js`: construct a fresh `TabManager`; call `openTab('a.md', { status: 'ok', html: '<h1>A</h1>' })`, then `openTab('b.md', { status: 'ok', html: '<h1>B</h1>' })`, then `openTab('a.md', { status: 'ok', html: '<h1>A again</h1>' })`; assert `tm.tabs` has length 2, `tm.tabs[0].renderResult.html` is still `'<h1>A</h1>'` (the third call did not overwrite it), and `tm.activeTabId` is `'a.md'`.

- **Step 8 (impl, SEQ-009).** Extend `openTab` in `TabManager.js` with the dedup guard ahead of the existing push-and-activate lines from Step 6, so Step 7 passes.
  - **Working:** None new — the `this._tabs.push({ fileId, renderResult })` and `this._activeTabId = fileId` lines from Step 6 are unchanged, now reached only when no existing tab is found.
  - **Hole:** The in-stage key-change decision — `TabManager`'s own dedup rule (CMP-008: "no-op-but-focus if `fileId` already open"; this is the internal backstop guard SEQ-009's Sequence step 3 references, alongside `PaneManager`'s own check in Step 12 below). TODO (per `todo-hole.md`):
    ```javascript
    // TODO:
    // 1. existing is the tab already in this._tabs with this fileId, if any.
    // 2. If found, don't push a duplicate entry — just focus the existing tab
    //    and stop (openTab is a no-op-but-focus for an already-open file; the
    //    new renderResult passed in is discarded).
    // 3. Otherwise fall through to the push-and-activate lines below (unchanged
    //    from Step 6).
    // e.g. fileId="guide.md", this._tabs already has an entry
    //      { fileId: "guide.md", renderResult: { status: "ok", html: "<h1>Old</h1>" } }
    //      -> existing = that entry -> this.focusTab("guide.md") -> return
    const existing = this._tabs.find((t) => t.fileId === /* */);
    if (existing) {
      this.focusTab(/* */);
      return;
    }
    ```

- **Step 9 (test, SEQ-009).** Write failing test in `TabManager.test.js`: construct a fresh `TabManager`; call `openTab('a.md', { status: 'ok', html: '<h1>A</h1>' })`, then `openTab('b.md', { status: 'ok', html: '<h1>B</h1>' })` (so `'b.md'` is active), then call `focusTab('a.md')`; assert `tm.activeTabId` is `'a.md'` and `tm.tabs` still has length 2 (unchanged).

- **Step 10 (impl, SEQ-009).** Implement `focusTab(fileId)` in `TabManager.js` as `this._activeTabId = fileId;`, so Step 9 passes.
  - **Working:** Entire step — a single one-line state assignment. Per `todo-hole.md`, holing this would blank `focusTab`'s whole (one-line) body, not a decision within a larger flow; the decision of *when* to call it lives in its caller (`PaneManager`, Step 12 below), which is where it's holed.

- **Step 11 (test, SEQ-009).** Write failing test in `web/src/panes/PaneManager.test.js`: define a local `fakeFileHandle` identical in shape to Step 2's (duplicated per this plan's established convention). Construct `const pm = new PaneManager(['pane-1']);`, then `await pm.openFile('pane-1', fakeFileHandle('notes.md', '# Hi'));`; find `const pane = pm.panes.find((p) => p.id === 'pane-1');` and assert `pane.tabManager.tabs` equals `[{ fileId: 'notes.md', renderResult: { status: 'ok', html: expect.stringContaining('<h1>Hi</h1>') } }]`, and `pane.tabManager.activeTabId` is `'notes.md'`. This is SEQ-009 AC1 (and still exercises SEQ-008's `renderFile` call for real, per `tdd-mocking.md`, same as the original Step 5 this replaces).

- **Step 12 (impl, SEQ-009 — replaces the original Step 6).** Rewrite `PaneManager` in `web/src/panes/PaneManager.js`: import `{ TabManager }` from `./TabManager.js` alongside the existing `* as MarkdownRenderer` import; change the constructor to `this._panes = paneIds.map((id) => ({ id, tabManager: new TabManager() }));` (replacing the old `{ id, lastRender: null }` shape); keep `get panes()` returning `this._panes`; rewrite `async openFile(paneId, fileHandle)` to look up the target pane, derive `fileId`, check that pane's `TabManager` for an existing tab, and dispatch accordingly, so Step 11 passes.
  - **Working:** The constructor's `paneIds.map(...)` initialization (now creating a `TabManager` per pane instead of the old interim `{ id, lastRender }` shape), the `panes` getter, `const pane = this._panes.find((p) => p.id === paneId);` (unchanged lookup from the original Step 6), and `const fileId = fileHandle.name;` (deriving the tab's identity from the handle — a fixed derivation, not itself a decision).
  - **Hole:** The flow-connecting check-then-dispatch — this is SEQ-009's core decision (Sequence steps 2-3; REQ-009 AC1/AC2): whether `openFile` finds an existing tab for this file in `pane.tabManager`, and based on that, either focuses it (`TabManager.focusTab`) or renders it (`MarkdownRenderer.renderFile`, SEQ-008's original arrow) and opens a new tab for it (`TabManager.openTab`). This supersedes the original version's hole, which unconditionally rendered and stored on `pane.lastRender`. TODO (per `todo-hole.md`):
    ```javascript
    // TODO:
    // 1. fileId identifies fileHandle within this pane's tabs (already derived
    //    above as fileHandle.name).
    // 2. existing is the tab in pane.tabManager.tabs with this fileId, if any.
    // 3. If found, the file is already open — focus it via
    //    pane.tabManager.focusTab(fileId) and stop; do not render.
    // 4. Otherwise render it with MarkdownRenderer.renderFile(fileHandle), then
    //    call pane.tabManager.openTab(fileId, result) to append and activate it.
    // e.g. fileHandle.name="guide.md", pane.tabManager.tabs already has an
    //      entry for "guide.md" -> existing found
    //      -> pane.tabManager.focusTab("guide.md") -> return (no render)
    //      fileHandle.name="readme.md", no existing entry -> existing undefined
    //      -> MarkdownRenderer.renderFile(fileHandle) resolves
    //      { status: 'ok', html: '<h1>Readme</h1>\n' }
    //      -> pane.tabManager.openTab("readme.md", { status: 'ok', html: '<h1>Readme</h1>\n' })
    const existing = pane.tabManager.tabs.find((t) => t.fileId === /* */);
    if (existing) {
      pane.tabManager.focusTab(/* */);
      return;
    }
    const result = await MarkdownRenderer.renderFile(/* */);
    pane.tabManager.openTab(/* */, /* */);
    ```

- **Step 13 (test, SEQ-009).** Write test in `PaneManager.test.js`: construct a fresh `PaneManager(['pane-1'])`; call `await pm.openFile('pane-1', fakeFileHandle('notes.md', '# Hi'))`, then `await pm.openFile('pane-1', fakeFileHandle('other.md', '# Other'))` (to move the active tab away), then `await pm.openFile('pane-1', fakeFileHandle('notes.md', '# Hi Again'))`; assert `pane.tabManager.tabs` still has length 2 (no duplicate), `pane.tabManager.tabs[0].renderResult.html` still contains `'<h1>Hi</h1>'` (not re-rendered from the third call's different content), and `pane.tabManager.activeTabId` is back to `'notes.md'`. This is SEQ-009 AC2 and a regression check on Step 12's check-then-dispatch decision — expected to already pass with no further implementation change; if it fails, Step 12's hole was filled with something that always renders regardless of an existing tab (e.g., missing the found-branch entirely).

- **Step 14 (test, SEQ-010).** Write failing test in `markdownRenderer.test.js`: import `{ marked }` from `'marked'` and `vi` from `'vitest'`; add `afterEach(() => vi.restoreAllMocks())` to the file (scoped so it doesn't affect Steps 2/4's real-`marked` tests). `vi.spyOn(marked, 'parse').mockImplementationOnce(() => { throw new Error('malformed input') })`, then given `fakeFileHandle('broken.md', '# whatever')`, assert `await renderFile(handle)` resolves to exactly `{ status: 'render-error' }` (no `html` key).

- **Step 15 (impl, SEQ-010).** In `renderFile` in `markdownRenderer.js`, wrap the existing `marked.parse(text)` call and its `return { status: 'ok', html }` (from Step 3, unchanged) in a `try`, adding a `catch` that resolves the render-error shape instead of letting the exception propagate, so Step 14 passes while Steps 2/4 keep passing.
  - **Working:** The `try { ... }` wrapping itself and everything already inside it (the Step 3 lines, untouched) — try/catch structure is infrastructure per `todo-hole.md`, not a hole.
  - **Hole:** The in-stage key-change this SEQ adds — what `renderFile` resolves to when the parser throws, instead of letting the exception crash the caller (REQ-010 AC1; SEQ-010 Sequence step 1). TODO (per `todo-hole.md`):
    ```javascript
    // TODO:
    // 1. The try block above already attempts marked.parse(text) and returns
    //    the 'ok' shape on success (unchanged from Step 3).
    // 2. If marked.parse throws (a malformed-markdown parser exception), catch
    //    it here and resolve a render-error result instead of propagating it.
    // e.g. text = "some malformed input" -> marked.parse(text) throws
    //      -> caught here -> return { status: 'render-error' }
    } catch {
      return { status: /* */ }
    }
    ```

- **Step 16 (test, SEQ-010, revised for SEQ-017).** Write failing test in `web/src/components/Pane.test.jsx` (new file, styled like `SidebarTree.test.jsx`: `describe`/`it` from `vitest`, `render`/`screen` from `@testing-library/react`): `render(<Pane tabs={[]} activeTabId={null} onSelectTab={() => {}} onCloseTab={() => {}} />)`; assert `screen.getByText('No file open')` is in the document, **and (per this SEQ-017 revision) `screen.queryAllByRole('tab')` has length 0** — this exact prop combination (`tabs=[]`, `activeTabId=null`) is also REQ-017/SEQ-017 AC2's post-close-last-tab state, and the added assertion proves the tab-bar row Step 28 later wraps around this branch also renders harmlessly empty, not a stray or broken tab-bar-with-nothing state, rather than leaving that as an unverified inference.

- **Step 17 (impl, SEQ-010).** Implement the skeleton of `Pane` in `web/src/components/Pane.jsx`: `export default function Pane({ tabs, activeTabId, onSelectTab, onCloseTab })`, find `const activeTab = tabs.find((t) => t.fileId === activeTabId)`, and if none found return `<div className="pane-empty">No file open</div>`, so Step 16 passes.
  - **Working:** Entire step — `activeTab`'s lookup is a fixed derivation (same reasoning as `PaneManager`'s `pane.tabManager.tabs.find` in Step 12: not itself the flow's decision), and the empty-state branch is CMP-010's other stated state, not SEQ-010's subject.

- **Step 18 (test, SEQ-010).** Write failing test in `Pane.test.jsx`: `render(<Pane tabs={[{ fileId: 'notes.md', renderResult: { status: 'ok', html: '<h1>Hi</h1>' } }]} activeTabId="notes.md" onSelectTab={() => {}} onCloseTab={() => {}} />)`; assert `screen.getByRole('heading', { level: 1, name: 'Hi' })` is in the document.

- **Step 19 (impl, SEQ-010).** Extend `Pane` in `Pane.jsx`, after the empty-state check: `const { status, html } = activeTab.renderResult`, then `if (status === 'ok') { return <div className="pane-content" dangerouslySetInnerHTML={{ __html: html }} /> }`, so Step 18 passes.
  - **Working:** Entire step — this is the first (representative) branch of the stage's status-based rendering, establishing the pattern per `todo-hole.md`'s "hole exactly one representative branch, the rest stay working" guidance; the `'render-error'` branch (Step 21) is the one held back as the hole.

- **Step 20 (test, SEQ-010).** Write test in `Pane.test.jsx` (this is REQ-010/SEQ-010's defining acceptance criterion): `render(<Pane tabs={[{ fileId: 'bad.md', renderResult: { status: 'render-error' } }]} activeTabId="bad.md" onSelectTab={() => {}} onCloseTab={() => {}} />)`; assert `screen.getByText('This file could not be rendered.')` is in the document, and `screen.queryByRole('heading')` is not in the document (not blank or stale content, per REQ-010 AC2).

- **Step 21 (impl, SEQ-010).** Extend `Pane` in `Pane.jsx`, after Step 19's `'ok'` branch: add the `'render-error'` branch, so Step 20 passes.
  - **Working:** None new — Steps 17/19's lookup and `'ok'` branch are unchanged, reached only when `status` isn't `'render-error'`.
  - **Hole:** The representative branch's own condition and message — this is SEQ-010's whole reason for existing in the UI layer (REQ-010: "shows an explicit error state, not a blank or stale render"). Per `todo-hole.md`, only this one branch is holed; Step 19's `'ok'` branch already gave the pattern. TODO (per `todo-hole.md`):
    ```javascript
    // TODO:
    // 1. status was already destructured above from activeTab.renderResult
    //    (same object Step 15's catch block produced for a failed parse).
    // 2. If status is 'render-error', this tab's file failed to render — return
    //    an element with an explicit error message, not any html.
    // e.g. activeTab.renderResult = { status: 'render-error' }
    //      -> status === 'render-error' -> true
    //      -> return <div className="pane-error">This file could not be rendered.</div>
    if (status === /* */) {
      return <div className="pane-error">/* */</div>
    }
    ```

- **Step 22 (test, SEQ-011).** Write failing test in `markdownRenderer.test.js`: define the local `fakeMissingFileHandle(name)` helper described above. Given `fakeMissingFileHandle('gone.md')`, assert `await renderFile(handle)` resolves to exactly `{ status: 'not-found' }` (no `html` key), and the call does not reject.

- **Step 23 (impl, SEQ-011).** In `renderFile` in `markdownRenderer.js`, hoist `text` to a `let` above Step 3's read lines and wrap `const file = await handle.getFile();` / `text = await file.text();` (unchanged otherwise) in their own `try`, ahead of Step 15's existing parse `try`/`catch`, adding a `catch` that resolves the not-found shape instead of letting the read exception propagate, so Step 22 passes while Steps 2/4/14 keep passing.
  - **Working:** The `let text;` hoist and the `try { ... }` wrapping around Step 3's unchanged read lines — try/catch structure is infrastructure per `todo-hole.md`, not a hole.
  - **Hole:** The in-stage key-change this SEQ adds — what `renderFile` resolves to when the read itself fails, before the parse stage is ever reached (REQ-011 AC1; SEQ-011 Sequence step 1). TODO (per `todo-hole.md`):
    ```javascript
    // TODO:
    // 1. The try block above already attempts handle.getFile() then
    //    file.text(), assigning the result to text (unchanged from Step 3).
    // 2. If that read throws (the file no longer exists at its handle's
    //    location), catch it here and resolve a not-found result instead of
    //    propagating it — do not attempt to parse text at all in this case.
    // e.g. handle = fakeMissingFileHandle("deleted.md")
    //      -> handle.getFile() throws NotFoundError
    //      -> caught here -> return { status: 'not-found' }
    } catch {
      return { status: /* */ }
    }
    ```

- **Step 24 (test, SEQ-011).** Write failing test in `Pane.test.jsx` (this is REQ-011/SEQ-011's defining acceptance criterion): `render(<Pane tabs={[{ fileId: 'gone.md', renderResult: { status: 'not-found' } }]} activeTabId="gone.md" onSelectTab={() => {}} onCloseTab={() => {}} />)`; assert `screen.getByText('This file could not be found.')` is in the document, and neither `screen.queryByRole('heading')` nor `screen.queryByText('This file could not be rendered.')` is in the document (distinct from both the `ok` and `render-error` states, per REQ-011 AC2's "not a blank tab").

- **Step 25 (impl, SEQ-011).** Extend `Pane` in `Pane.jsx`, after Step 21's `'render-error'` branch: add the `'not-found'` branch, so Step 24 passes.
  - **Working:** Entire step — Steps 17/19/21's lookup and prior branches are unchanged, reached only when `status` isn't `'not-found'`; this is Pane's third status branch, and per the revision note above, the branch-adding pattern was already taught once as working code (Step 19) and once as a hole (Step 21), so this occurrence is written directly as `if (status === 'not-found') { return <div className="pane-error">This file could not be found.</div> }` with no further hole.

- **Step 26 (test, SEQ-013).** Write a new test in `PaneManager.test.js`: construct a fresh `PaneManager(['pane-1'])`; call `await pm.openFile('pane-1', fakeFileHandle('a.md', '# A'))`, then `await pm.openFile('pane-1', fakeFileHandle('b.md', '# B'))`, then `await pm.openFile('pane-1', fakeFileHandle('c.md', '# C'))` — three distinct, not-yet-open files, no repeats (unlike Step 13's `a.md`/`other.md`/`a.md` sequence, which exists to prove dedup, not order). Assert `pane.tabManager.tabs.length === 3` (SEQ-013 AC1, for a clean N=3 with no dedup interference) and `pane.tabManager.tabs.map((t) => t.fileId)` equals `['a.md', 'b.md', 'c.md']` (SEQ-013 AC2 — full click-order assertion, which no earlier test in this plan makes). This is a pure proving test, expected to already pass with no further implementation change: Step 12's not-found branch (render + `pane.tabManager.openTab`) and Step 6's unchanged push onto `this._tabs` already generalize to any number of distinct calls; if it fails, either Step 12's dispatch stopped rendering/opening past the first not-found file, or Step 6's `push` was replaced with something that reorders or overwrites instead of appending.

- **Step 27 (test, SEQ-014).** Write failing test in `Pane.test.jsx`: `render(<Pane tabs={[{ fileId: 'a.md', renderResult: { status: 'ok', html: '<h1>A</h1>' } }, { fileId: 'b.md', renderResult: { status: 'ok', html: '<h1>B</h1>' } }]} activeTabId="a.md" onSelectTab={() => {}} onCloseTab={() => {}} />)`; assert `screen.getByRole('tab', { name: 'a.md' })` has `aria-selected="true"` and `screen.getByRole('tab', { name: 'b.md' })` has `aria-selected="false"` (SEQ-014 AC2 / REQ-014 AC2: exactly one tab marked active).

- **Step 28 (impl, SEQ-014).** Extend `Pane` in `Pane.jsx`: wrap the function's existing return value (the empty-state/`ok`/`render-error`/`not-found` branches from Steps 17/19/21/25, unchanged) inside a new outer `<div className="pane">`, and add a new sibling element above it: `<div role="tablist" className="tab-bar">{tabs.map((tab) => <button key={tab.fileId} role="tab" aria-selected={tab.fileId === activeTabId}>{tab.fileId}</button>)}</div>` (no `onClick` yet — added in Step 30), so Step 27 passes.
  - **Working:** Entire step — the outer `<div className="pane">` wrapper, the `tabs.map` iteration and each `<button>`'s construction/label (`tab.fileId`, the same identifier already used as the tab's key throughout `TabManager`/`PaneManager`), and the `aria-selected={tab.fileId === activeTabId}` comparison. This last one reuses the exact fileId-equality check Step 17 already established (`tabs.find((t) => t.fileId === activeTabId)`) — same comparison, now applied per-tab instead of once for a single lookup — so per `todo-hole.md`'s guidance against re-holing an already-taught pattern, this stays working code.

- **Step 29 (test, SEQ-014).** Write failing test in `Pane.test.jsx` (this is REQ-014 AC1 / SEQ-014's defining acceptance criterion and Sequence step 1): render the same two-tab `Pane` as Step 27, but with `onSelectTab={onSelectTabSpy}` (a `vi.fn()`); `fireEvent.click(screen.getByRole('tab', { name: 'b.md' }))`; assert `onSelectTabSpy` was called exactly once, with `'b.md'`.

- **Step 30 (impl, SEQ-014).** In `Pane.jsx`, add an `onClick` handler to Step 28's `<button>` element, so Step 29 passes.
  - **Working:** None new — the button, `tabs.map`, and `aria-selected` from Step 28 are unchanged.
  - **Hole:** The flow-connecting call — SEQ-014's whole reason for existing (Sequence step 1: "Pane's `onSelectTab(fileId)` callback fires when the user clicks a non-active tab"), the exact line that carries this flow's data (which tab was clicked) out of `Pane` to whichever parent wires it to `TabManager.focusTab` (see the SEQ-014 delta note above — that wiring itself is deferred, but this is the line that makes it possible). TODO (per `todo-hole.md`):
    ```jsx
    // TODO:
    // 1. tab is the current tab in this tabs.map iteration; tab.fileId
    //    identifies which file it represents.
    // 2. onSelectTab is the prop Pane received — call it with tab.fileId
    //    when this tab's button is clicked, so the click flows on to
    //    whichever parent wires onSelectTab to TabManager.focusTab(fileId).
    // e.g. tab = { fileId: "guide.md", renderResult: {...} } is clicked
    //      -> onClick fires -> onSelectTab("guide.md")
    <button key={tab.fileId} role="tab" aria-selected={tab.fileId === activeTabId} onClick={() => onSelectTab(/* */)}>
    ```

- **Step 31 (test, SEQ-015, revised for SEQ-016, SEQ-017).** Write failing tests in `web/src/panes/TabManager.test.js`, four scenarios in `closeTab`'s `describe` block:
  1. *(SEQ-015, unchanged)* Construct a fresh `TabManager`; call `openTab('a.md', { status: 'ok', html: '<h1>A</h1>' })`, then `openTab('b.md', { status: 'ok', html: '<h1>B</h1>' })` (so `'b.md'` is active); call `closeTab('a.md')` (closing the non-active tab); assert `tm.tabs` equals `[{ fileId: 'b.md', renderResult: { status: 'ok', html: '<h1>B</h1>' } }]` (SEQ-015 AC1 — `a.md`'s entry is gone) and `tm.activeTabId` is still `'b.md'` (SEQ-015 AC2 — closing a non-active tab leaves `activeTabId` unchanged).
  2. *(new, SEQ-016, left-neighbor case)* Construct a fresh `TabManager`; call `openTab('a.md', ...)`, `openTab('b.md', ...)`, `openTab('c.md', ...)` (so `'c.md'` is active, at index 2, with both `'a.md'` and `'b.md'` to its left); call `closeTab('c.md')` (closing the active tab); assert `tm.tabs.map((t) => t.fileId)` equals `['a.md', 'b.md']` and `tm.activeTabId` is `'b.md'` — REQ-016 AC1/AC2: the tab immediately to the left of the closed one becomes active.
  3. *(new, SEQ-016, no-left-neighbor case)* Construct a fresh `TabManager`; call `openTab('a.md', ...)`, `openTab('b.md', ...)`; call `focusTab('a.md')` (so `'a.md'`, at index 0, becomes active again, with no tab to its left); call `closeTab('a.md')`; assert `tm.tabs.map((t) => t.fileId)` equals `['b.md']` and `tm.activeTabId` is `'b.md'` — REQ-016 AC1/AC2's "else the next one to the right" branch, and, together with scenario 2, proof that one consistent rule governs both cases (REQ-016 AC2's "verifiable across repeated closes").
  4. *(new, SEQ-017, last-tab-closes case)* Construct a fresh `TabManager`; call `openTab('only.md', { status: 'ok', html: '<h1>Only</h1>' })` (so it is the pane's one and only tab, active by construction); call `closeTab('only.md')`; assert `tm.tabs` equals `[]` and `tm.activeTabId` is `null` — REQ-017/SEQ-017 AC1: closing a pane's only remaining tab leaves zero tabs and no active tab. This is the `tabs.length === 0` branch of Step 32's conditional, which scenarios 2 and 3 above never reach (both leave at least one tab remaining) — a genuine coverage gap this scenario closes, expected to already pass with no further implementation change, since Step 32's `else { this._activeTabId = null; }` line has been in place unchanged since SEQ-015; if it fails, that placeholder was altered by a later revision without this test having caught it.

- **Step 32 (impl, SEQ-015, revised for SEQ-016; verified for SEQ-017).** Implement `closeTab(fileId)` in `TabManager.js`: capture `closedIndex`, filter `_tabs`, then a conditional that only touches `_activeTabId` when the closed tab was the active one — and, when tabs remain, sets it to a deterministically chosen adjacent tab (REQ-016) rather than `null` — so all four of Step 31's scenarios pass.
  - **Working:** `const closedIndex = this._tabs.findIndex((t) => t.fileId === fileId);` (new in the SEQ-016 revision — captured *before* the filter runs, since the filter's removal makes the closed tab's original position unrecoverable afterward; a fixed lookup, not itself a decision), the `this._tabs.filter(...)` removal line (REQ-015's "the tab list with that tab removed" — a mechanical rebuild of the array excluding the matching entry, no per-SEQ branching), the `if (this._tabs.length > 0)` guard (new in the SEQ-016 revision — the explicit condition SEQ-016's own Flow diagram names; the case it excludes, `tabs.length === 0`, keeps the unchanged `this._activeTabId = null;` placeholder — **this SEQ-017 pass confirms that placeholder, unchanged since SEQ-015, is itself the whole of REQ-017/SEQ-017 AC1, now proven by Step 31's new scenario 4; no code changed here**), and `this._activeTabId = this._tabs[newIndex].fileId;` (new in the SEQ-016 revision — applying the already-computed `newIndex`, mechanical once that value exists, same reasoning as Step 3's `return { status: 'ok', html }` after its own hole).
  - **Hole:** Two, side by side in the same conditional — genuinely different decisions that happen to live together:
    1. *(SEQ-015, unchanged)* Whether the closed tab was the active one, exactly SEQ-015 AC2 / REQ-015 AC2's contract ("closing a non-active tab does not change which tab is active") and the branch point CMP-008's interface note names ("auto-activates an adjacent tab if `fileId` was active"). TODO (per `todo-hole.md`):
    ```javascript
    // TODO:
    // 1. this._activeTabId is the currently active tab id (or null); fileId is
    //    the tab being closed (the filter above already removed its entry).
    // 2. If they're equal, the active tab is the one just closed — if any tabs
    //    remain, this SEQ's sibling hole below picks the adjacent tab that
    //    replaces it; if none remain, activeTabId resets to null (SEQ-017's
    //    empty-state case, not this SEQ's decision).
    // 3. If they differ, skip the branch entirely — activeTabId is left
    //    untouched, which is SEQ-015's whole contract (AC2).
    // e.g. this._activeTabId="b.md", closeTab("a.md") -> fileId="a.md"
    //      -> "b.md" !== "a.md" -> branch skipped -> activeTabId stays "b.md"
    //      this._activeTabId="a.md", closeTab("a.md") -> fileId="a.md"
    //      -> "a.md" === "a.md" -> branch entered -> see the newIndex hole below
    if (this._activeTabId === /* */) {
    ```
    2. *(new, SEQ-016)* The in-stage key-change decision — which adjacent tab becomes active, the deterministic left-neighbor-first-else-shifted-right rule that is REQ-016's entire reason for existing (Sequence step 3; REQ-016 AC1/AC2). TODO (per `todo-hole.md`):
    ```javascript
    // TODO:
    // 1. closedIndex is where the closed tab used to sit in this._tabs,
    //    captured above before the filter ran.
    // 2. If a left neighbor exists (closedIndex > 0), that's the tab to
    //    activate next — its index in the now-filtered array is
    //    closedIndex - 1 (removing the entry at closedIndex never shifts
    //    anything before it).
    // 3. Otherwise (closedIndex === 0, the leftmost tab was closed), there's
    //    no left neighbor — the tab that used to be immediately to the right
    //    has shifted into index 0 of the filtered array, so that's the one
    //    to pick.
    // e.g. tabs = [x.md, y.md, z.md], activeTabId="y.md" (closedIndex=1)
    //      -> closeTab("y.md") -> filtered tabs = [x.md, z.md]
    //      -> closedIndex=1 > 0 -> newIndex=0 -> this._tabs[0]=x.md (left neighbor)
    //      tabs = [x.md, y.md], activeTabId="x.md" (closedIndex=0)
    //      -> closeTab("x.md") -> filtered tabs = [y.md]
    //      -> closedIndex=0, no left neighbor -> newIndex=0 -> this._tabs[0]=y.md
    //      (the tab that used to be to the right, now shifted into its place)
    if (this._tabs.length > 0) {
      const newIndex = /* */;
      this._activeTabId = this._tabs[newIndex].fileId;
    } else {
      this._activeTabId = null;
    }
    ```

- **Step 33 (test, SEQ-015).** Write failing test in `Pane.test.jsx`: render the same two-tab `Pane` as Step 27 (`a.md` active, `b.md` not); assert `screen.getByRole('button', { name: 'Close a.md' })` and `screen.getByRole('button', { name: 'Close b.md' })` are both in the document — a structural check (mirrors Step 27's presence assertion) that each open tab has a close control, ahead of wiring its click in Step 35.

- **Step 34 (impl, SEQ-015).** Extend `Pane` in `Pane.jsx`: inside Step 28's `tabs.map`, wrap each tab's existing `<button role="tab">` together with a new sibling `<button aria-label={`Close ${tab.fileId}`}>×</button>` inside a `<span key={tab.fileId} className="tab-item">` container (moving the `key` from the tab button up to this wrapper, since the map callback now returns two elements per tab instead of one), no `onClick` on the new button yet — added in Step 36 — so Step 33 passes.
  - **Working:** Entire step — same reasoning as Step 28: this repeats the already-established `tabs.map`/button-construction pattern for a second button per tab, with no new decision (the wrapper and the close button's label/element are structural, not a branch or transformation).

- **Step 35 (test, SEQ-015).** Write failing test in `Pane.test.jsx` (this is REQ-015 AC1 / SEQ-015's defining acceptance criterion and Sequence step 1): render the same two-tab `Pane` as Step 33, but with `onCloseTab={onCloseTabSpy}` (a `vi.fn()`); `fireEvent.click(screen.getByRole('button', { name: 'Close b.md' }))`; assert `onCloseTabSpy` was called exactly once, with `'b.md'`.

- **Step 36 (impl, SEQ-015).** In `Pane.jsx`, add an `onClick` handler to Step 34's close `<button>`, so Step 35 passes.
  - **Working:** None new — the wrapper, tab button, and close button's label from Step 34 are unchanged.
  - **Hole:** The flow-connecting call — SEQ-015's whole reason for existing (Sequence step 1: "Pane's `onCloseTab(fileId)` callback fires when the user activates a tab's close control"), the exact line that carries this flow's data (which tab's close was activated) out of `Pane` to whichever parent wires it to `TabManager.closeTab` (see the SEQ-015 delta note above — that wiring itself is deferred, same as `onSelectTab`/`focusTab`, but this is the line that makes it possible). TODO (per `todo-hole.md`):
    ```jsx
    // TODO:
    // 1. tab is the current tab in this tabs.map iteration; tab.fileId
    //    identifies which file's tab is being closed.
    // 2. onCloseTab is the prop Pane received — call it with tab.fileId when
    //    this tab's close button is clicked, so the click flows on to
    //    whichever parent wires onCloseTab to TabManager.closeTab(fileId).
    // e.g. tab = { fileId: "guide.md", renderResult: {...} }'s close button
    //      is clicked -> onClick fires -> onCloseTab("guide.md")
    <button aria-label={`Close ${tab.fileId}`} onClick={() => onCloseTab(/* */)}>×</button>
    ```

## Hole / Working Tally
| Step | Implementation lines | Hole | Working |
|---|---|---|---|
| 3 — `renderFile` read-then-render | 4 | 1 | 3 |
| 6 — `TabManager` base (`openTab`/`tabs`/`activeTabId`) | 6 | 0 | 6 |
| 8 — `TabManager.openTab` dedup guard | 2 | 2 | 0 |
| 10 — `TabManager.focusTab` | 1 | 0 | 1 |
| 12 — wire `TabManager` into `PaneManager.openFile` (check-then-dispatch) | 8 | 4 | 4 |
| 15 — `renderFile` render-error catch (SEQ-010) | 1 | 1 | 0 |
| 21 — `Pane` render-error branch (SEQ-010) | 1 | 1 | 0 |
| 23 — `renderFile` not-found catch (SEQ-011) | 2 | 1 | 1 |
| 25 — `Pane` not-found branch (SEQ-011) | 1 | 0 | 1 |
| 28 — `Pane` tab-bar row (SEQ-014) | 5 | 0 | 5 |
| 30 — `Pane` tab-click `onSelectTab` wiring (SEQ-014) | 1 | 1 | 0 |
| 32 — `TabManager.closeTab` (SEQ-015 + SEQ-016) | 7 | 2 | 5 |
| 34 — `Pane` close-button element (SEQ-015) | 3 | 0 | 3 |
| 36 — `Pane` close-click `onCloseTab` wiring (SEQ-015) | 1 | 1 | 0 |
| **Total** | **43** | **14 (33%)** | **29 (67%)** |

- Rows 15 and 21 are added by this revision as a bookkeeping fix, not a new design decision — both holes already existed in the SEQ-010 delta's prose above; the table simply never carried them forward. Their inclusion (not the SEQ-011 rows alone) accounts for most of the increase from 33% to 38%.
- Slightly above the 30% target, in the same range as this plan's tally has run since the SEQ-009 revision (33%): SEQ-008 through SEQ-011 are all small, sharply-defined flows (one leaf transformation plus one or two flow-connecting decisions each), leaving little low-value filler code to pad the working side without inventing scope no SEQ calls for.
- Step 12 (50% holed) carries more than its share, per the budget guidance's "some steps may carry more, as long as the total lands near 30/70" allowance — it is SEQ-009's single defining decision (the check-then-dispatch REQ-009 exists to specify), so it is holed in full rather than split into an arbitrarily "safer" partial hole.
- Step 23 (50% holed, SEQ-011) is this SEQ's one defining decision — the same shape as Step 15's SEQ-010 hole, and the direct implementation of SEQ-011's flow diagram's first arrow — so it is holed for the same reason. Step 25 (SEQ-011's Pane branch) is written as full working code instead, per this revision's note above: Pane's status-branch pattern was already taught once as working (Step 19) and once as a hole (Step 21), so a third occurrence teaches nothing new and is demoted to working code specifically to keep the whole-plan ratio from drifting further past budget.
- Step 6 (TabManager's first-pass state/append/activate, no decision yet) and Step 4/Step 7/Step 9/Step 11/Step 13/Step 22/Step 24 (test-only steps, several of them regression checks) carry no padding holes — consistent with `todo-hole.md`'s guidance that a step with no decision or returned value to act on gets no hole.
- The original Step 6 row (2 hole / 3 working out of 5 lines, unconditional render-and-store) is removed from this table — it no longer exists as written; its replacement is the new Step 12.
- **Step 26 (SEQ-013, this revision) adds no row:** it is a test-only step with no accompanying implementation step — same treatment as Steps 4/13/24, the other pure proving/regression tests in this plan.
- **Steps 28/30 (SEQ-014, this revision):** Step 28 (the tab-bar row itself — container, `map`, per-tab label, `aria-selected` comparison) is written entirely as working code, per the note above, since its one comparison is a direct reuse of Step 17's already-taught `t.fileId === activeTabId` pattern — holing it again would teach nothing new, same reasoning this plan already applied to demote Step 25. Step 30 (the `onClick` calling `onSelectTab(tab.fileId)`) is SEQ-014's one new decision and its sole hole. Net effect: the whole-plan tally moves from 38% holed / 62% working to 34% holed / 66% working — closer to the 30/70 budget than before this revision, not further from it.
- **Steps 32/34/36 (SEQ-015, this revision):** Step 32's `closeTab` splits its 3 lines as 1 hole (the `if (this._activeTabId === fileId)` check — the one line embodying this SEQ's own core decision, per REQ-015 AC2) / 2 working (the `filter` removal, a mechanical rebuild with no branching, and the `null` placeholder inside the conditional, an explicit interim value SEQ-016 replaces rather than a decision this SEQ makes). Step 34 (the close-button element and its wrapper) is written entirely as working code, same reasoning as Step 28 — it repeats the already-taught `tabs.map`/button-construction pattern for a second button per tab, teaching nothing new. Step 36 (the `onClick` calling `onCloseTab(tab.fileId)`) is SEQ-015's one new UI-layer decision and its sole hole, structured identically to Step 30's. Net effect: the whole-plan tally moves from 34% holed / 66% working to **33% holed / 67% working** — the closest this plan has run to the 30/70 budget since the SEQ-009 revision.
- **Step 32 (SEQ-016, this revision):** grows from 3 lines (1 hole / 2 working) to 7 (2 hole / 5 working) — Step 32's row is edited in place rather than added as a new row, since this revision extends the same method's same conditional rather than adding a parallel step (see the SEQ-016 revision note above). New working lines: the `closedIndex` capture, the `tabs.length > 0` guard, and the `this._activeTabId = this._tabs[newIndex].fileId` application. New hole: `const newIndex = /* */`, the left-neighbor-first-else-shifted-right formula — REQ-016's one defining decision, following the same "hole the computed value, leave its application working" split this plan already used for Steps 3/15/23. SEQ-015's original hole (the `this._activeTabId === fileId` comparison) is unchanged, now one of two holes sharing the method. Net effect: the whole-plan tally moves from 39 lines (13 hole / 26 working, 33%/67%) to **43 lines (14 hole / 29 working, 33%/67%)** — the ratio holds exactly at budget; the extra working lines (setup/guard/application) outweigh the one new hole enough to keep the percentage unchanged.
- **SEQ-017 (this revision): tally unchanged, 43 lines / 14 hole (33%) / 29 working (67%).** Both AC's for this SEQ were already satisfied by existing working code (Step 32's `else { this._activeTabId = null; }` on the `TabManager` side, Step 17/28's `!activeTab` branch wrapped by the tab-bar on the `Pane` side) — verified line by line against `SEQ-017.md`'s own AC's, per the revision note above. This SEQ's entire contribution is test-side: one new scenario appended to Step 31 (TabManager closing its one-and-only tab down to zero) and one strengthened assertion added to Step 16 (Pane's empty-state test now also checks the tab-bar renders no stray `tab` roles). Neither adds an implementation or test-count line to this table — consistent with `todo-hole.md`'s "a step with no decision or returned value to act on gets no hole" and this plan's own precedent (SEQ-012, SEQ-013, SEQ-014's `focusTab` check) for verification passes that close a real test gap without touching the hole/working split.

## Recommended Human Work Order
Every holed step above, reordered top-down along the flow (entry point -> algorithm) instead of build order.
- **Step 12**: Wire `TabManager` into `PaneManager.openFile` (check-then-dispatch) — `web/src/panes/PaneManager.js`, method `PaneManager.openFile` — the flow's entry point per SEQ-009's Flow diagram; start here to see the whole open-or-focus decision before descending into either branch.
- **Step 8**: `TabManager.openTab`'s own dedup guard — `web/src/panes/TabManager.js`, method `TabManager.openTab` — one level down; the backstop guard SEQ-009's Sequence step 3 references alongside Step 12's primary check (this is also SEQ-012's contract, exercised here as a natural side effect of building `TabManager`).
- **Step 3**: The read-then-render transformation — `web/src/workspace/markdownRenderer.js`, function `renderFile` — one level down from Step 12's not-found branch; the leaf stage `openFile` calls into, unchanged from SEQ-008.
- **Step 15**: `renderFile`'s render-error catch (SEQ-010) — `web/src/workspace/markdownRenderer.js`, function `renderFile` — same leaf function as Step 3, its second exit; added here to fill a gap left by the SEQ-010 revision, which never listed it.
- **Step 23**: `renderFile`'s not-found catch (SEQ-011) — `web/src/workspace/markdownRenderer.js`, function `renderFile` — same leaf function again, its third exit and this SEQ's whole reason for existing; sits ahead of Step 15's parse-stage catch in the source (a failed read never reaches the parser) but is listed after it here since both are peers one level down from Step 3.
- **Step 21**: `Pane`'s render-error branch (SEQ-010) — `web/src/components/Pane.jsx`, function `Pane` — the flow's terminal display stage, where a tab's stored `status` finally becomes what the human sees; added here to fill the same SEQ-010 gap as Step 15. (Step 25, SEQ-011's `not-found` branch in the same function, carries no hole — see the tally notes above — so it is omitted from this list per this section's own convention. Step 26, SEQ-013's new proving test, carries no hole either — it is test-only and confirms Steps 6/12's already-holed append logic generalizes to N distinct files — so it is likewise omitted.)
- **Step 30**: `Pane`'s tab-click `onSelectTab` wiring (SEQ-014) — `web/src/components/Pane.jsx`, function `Pane` — this is a separate flow from the render-display chain above (Steps 12 through 21): rather than data flowing into `Pane` to be displayed, this is `Pane`'s own flow entry point, where a user's click on the tab bar (Step 28's row) becomes the `onSelectTab(fileId)` call that leaves the component. It is the only holed step in SEQ-014's flow — `TabManager.focusTab`, the next stage downstream, was already built holeless at Step 10, and the stage after that (some parent wiring `onSelectTab` to `focusTab`) is deferred to the not-yet-built `App.jsx` integration, per Out of scope above. (Step 28, the tab-bar row itself, carries no hole — see the tally notes above — so it is omitted from this list per this section's own convention.)
- **Step 36**: `Pane`'s close-click `onCloseTab` wiring (SEQ-015) — `web/src/components/Pane.jsx`, function `Pane` — a third, separate flow, the same shape as Step 30's but for the close control: `Pane`'s own flow entry point, where a user's click on a tab's close button (Step 34's element) becomes the `onCloseTab(fileId)` call that leaves the component. Start here for SEQ-015, same reason as Step 30 — it is the flow's entry point, closest to what the human actually triggers. (Step 34, the close-button element itself, carries no hole — see the tally notes above — so it is omitted from this list per this section's own convention.)
- **Step 32**: `TabManager.closeTab` — both its active-tab-preserving conditional (SEQ-015) and its adjacent-tab-selection formula (SEQ-016) — `web/src/panes/TabManager.js`, method `TabManager.closeTab` — one stage downstream of Step 36 along this flow: once a close click leaves `Pane` (Step 36), this is the leaf-level decision it eventually reaches (via the still-deferred `App.jsx` wiring), where the closed tab's entry is actually removed and `activeTabId` is either preserved (SEQ-015, if the closed tab wasn't active), reset to the left-neighbor-or-shifted-right tab (SEQ-016, if it was active and tabs remain), or reset to `null` (SEQ-017's AC1, if none remain — confirmed correct by SEQ-017's verification pass and Step 31's new scenario 4; the code itself is unchanged, only newly proven). Both holes now live in this one step, in build order back to back — read the "whether the closed tab was active" comparison first, then the "which tab replaces it" formula right below it; there is no longer a further step downstream for this SEQ to hand off to.

## Closeout
- [x] Review + Test — once every hole above is filled in, re-run `/auto-action` on this plan; it detects the holes are gone and reviews each one against its recorded intent, then runs the tests
