# Plan: Create a Second Independent Pane on Split (SEQ-018)

**Type:** Self-Plan

## Scope
- Design unit: SEQ-018 "Create a second independent pane on split" (REQ-018, CMP-011 SplitContainer — new component, first built here, CMP-009 PaneManager — adds `splitRight(sourcePaneId): Promise<void>`, CMP-008 TabManager — reused unchanged, its constructor is the flow's leaf call).
- **New plan file, not a revision — judgment call recorded here.** `read-and-render-a-files-markdown-content.md` owns `PaneManager.js` (Steps 11-13) and explicitly deferred `splitRight`/`resizeDivider`/`closePane` as "used only by later SEQs (SEQ-013, SEQ-018 through SEQ-022); not touched here." Per `/co-plan`'s "revise the plan that already owns the affected file/behavior" rule, that plan owns `PaneManager.js` as a *file*, but it never owned `splitRight` as a *behavior* — it named the method only to explicitly hand it off. `SplitContainer.jsx` (CMP-011) is a brand new file no plan has touched at all, and CMP-011's own `Used By` list (SEQ-018, SEQ-019, SEQ-021, SEQ-022) marks this as the start of a genuinely separate feature area (pane splitting/resizing/closing) from that plan's own topic (markdown rendering and tabs within a single pane). Folding a new component plus a new multi-SEQ feature area into an already-416-line, ten-SEQ document would obscure more than it clarifies. This plan is the new home for that feature area; SEQ-019 through SEQ-022 are expected to revise *this* file in place, the same way the other plan grew SEQ-008 through SEQ-017.
- **Verified: `PaneManager`'s state does NOT need reshaping.** Read the real `web/src/panes/PaneManager.js` (not just the prior plan's prose) before designing this: its constructor already takes `paneIds` and builds `this._panes = paneIds.map((id) => ({ id, tabManager: new TabManager() }))` — i.e. `panes` is already `PaneEntry[]` (`{ id, tabManager }`), not a single implicit pane. `get panes()` already returns the array. Every existing test (`PaneManager.test.js` Steps 11, 13, 26) constructs `new PaneManager(['pane-1'])` and looks up `pm.panes.find((p) => p.id === 'pane-1')` — none of them assume there is ever exactly one pane, they simply never construct more than one. `splitRight` only needs to append a second entry of the same shape to the same array. **No existing test needs adjustment; nothing here is a refactor.**
- Flow (per `SEQ-018.md`):
  ```
  <SplitContainer onSplit={sourcePaneId} />
    |
    v
  PaneManager.splitRight(sourcePaneId): Promise<void>
    |
    v
  new TabManager instance (second pane)
  ```
- Build order (leaf-first, matching this codebase's established TDD convention — e.g. the sibling plan builds `TabManager` before wiring it into `PaneManager`, and `Pane`'s branches before wiring their click handlers): `PaneManager.splitRight` (Step 1, the flow's next-to-leaf stage — `TabManager`'s own constructor is already fully built and holeless) is built first, then `SplitContainer` (Steps 2-3, the flow's entry point) is wired on top of it.
- **New pane id — open design point.** Neither REQ-018 nor CMP-009 fixes a naming scheme for the new pane's `id`. This plan picks `pane-${this._panes.length + 1}`, computed at call time from the current array length — no new constructor state, so it cannot disturb the untouched constructor from the other plan. This is provisional: once SEQ-021 (collapse on close) exists, closing and re-splitting could in principle produce a repeated id (e.g. close `pane-2`, split again, get another `pane-2`). That collision risk is out of scope for SEQ-018, whose own Acceptance Criteria only require `panes.length === 2` and the new pane's independence, not a globally unique id scheme; flagged here for whichever of SEQ-021/022 revises this file next to check against.
- **`SplitContainer` scope for this SEQ only.** CMP-011 fixes the full interface `<SplitContainer panes={PaneState[]} onSplit={(paneId) => Promise<void>} onResize={(paneId, deltaPx) => void} onClosePane={(paneId) => void} />` for the whole pane-splitting feature area (`Used By`: SEQ-018, 019, 021, 022). SEQ-018's own Flow/Sequence only exercise `onSplit` — the split trigger firing, and `SplitContainer` awaiting the returned `Promise<void>`. This plan builds exactly that slice: one split-trigger control per pane, wired to call `onSplit(paneId)` and disabled while that call's promise is pending (CMP-011's own Responsibility line: "disabling its split trigger while a `splitRight()` call is in flight"). `onResize`/`onClosePane` are accepted as props (matching CMP-011's fixed signature exactly, so later revisions don't have to change the signature) but are not called by anything and no drag handle or close control is rendered yet — deferred to SEQ-019 (resize) and SEQ-021 (close), the same "accept the prop now, wire it later" pattern the sibling plan used for `onSelectTab`/`onCloseTab` on `Pane`.
  - Also out of scope, deferred to later SEQs/runs that will own it: rendering each pane's actual tab content (`<Pane tabs={...} activeTabId={...} .../>`) inside `SplitContainer` — SEQ-018's own AC's test only the state layer (`PaneManager.panes.length`, the new pane's empty `TabManager`) and the split-trigger's own behavior, never that pane content is visible side by side; and mounting `SplitContainer`/`PaneManager` into `App.jsx` — no plan run for this project has wired live `App.jsx` pane integration yet (confirmed by inspection, same gap the sibling plan's own "Out of scope" section already tracks for `openFile`/`focusTab`/`closeTab`).
- Test doubles: `PaneManager.test.js` already defines a local `fakeFileHandle(name, content)` helper (from the sibling plan) — reused as-is, not redefined, for the one new test this plan adds to that file. `SplitContainer.test.jsx` (new file) needs no fake at all: its `panes` prop fixtures are plain literals (`{ id: 'pane-1', tabManager: {} }`) since this SEQ's slice of `SplitContainer` never reads into `tabManager`'s contents, only `pane.id`.

### SEQ-019 addition: Resize panes via divider drag
- Design unit: SEQ-019 "Resize panes via divider drag" (REQ-019, CMP-011 SplitContainer — adds the divider element and its drag wiring, CMP-009 PaneManager — adds `resizeDivider(paneId, deltaPx): void`). Revising this file in place per the note above — SEQ-019 is exactly the feature area this plan was carved out to house.
- Flow (per `SEQ-019.md`):
  ```
  <SplitContainer onResize={paneId, deltaPx} />  (per drag-move event)
    |
    v
  PaneManager.resizeDivider(paneId, deltaPx)
    |
    v
  panes[].width updated
  ```
- Build order: same leaf-first convention as SEQ-018 above — `PaneManager.resizeDivider` (Steps 7-8, the flow's leaf stage) is built before `SplitContainer`'s divider skeleton and drag wiring (Steps 9-12, the flow's entry point).
- **Open design point: initial pane width.** Neither REQ-019 nor CMP-009 fixes what a pane's `width` is before any drag ever happens — `panes[]` currently has no `width` field at all (verified against the real `PaneManager.js`: the constructor builds `{ id, tabManager }` only, and SEQ-018's still-unfilled `splitRight` hole builds the same shape). Rather than retrofit the constructor or `splitRight` (both already-designed, and width isn't either of their concerns), `resizeDivider` falls back to a `DEFAULT_PANE_WIDTH = 50` module constant via `pane.width ?? DEFAULT_PANE_WIDTH` the first time a given pane is resized. This keeps the change fully additive and contained to the one method REQ-019 actually owns. Flagged for SEQ-020 (clamp at minimum width), which will read/write this same `width` field.
- **Open design point: which pane(s) a resize affects.** `onResize`'s signature carries a single `paneId`, not a pair. This plan reads `paneId` as identifying the pane to the *left* of the dragged divider, and has `resizeDivider` grow/shrink that pane and `this._panes[index + 1]` (its right neighbor) by the same `deltaPx` in opposite directions — i.e. exactly the pane pair CMP-011's "one divider between adjacent panes" renders. Sound for the current 2-pane scope (SEQ-018 only ever produces 2 panes; nothing through SEQ-022 introduces a 3rd); flagged for whichever future SEQ, if any, generalizes past 2 panes.
- **AC2 verification lives at the `PaneManager` state layer, not in `SplitContainer`'s DOM.** AC2 ("neither pane's TabManager instance is replaced or reset") is not a separate behavior to implement — it falls out of `resizeDivider` only ever touching `pane.width`/`neighbor.width` and never reconstructing or reassigning `.tabManager`. But it still gets its own explicit test (Step 7), because "falls out of not touching the field" is exactly the kind of assumption a regression could silently break (e.g. a future edit that rebuilds pane objects via spread). The test asserts object-identity (`pane.tabManager` is the *same reference* before and after `resizeDivider`) plus that its `tabs`/`activeTabId` are unchanged — this is the right level for the current codebase: `SplitContainer` still doesn't render any `<Pane tabs={...} .../>` content (deferred by the SEQ-018 addition above, still deferred here), so there is no mounted DOM/TabManager-backed content in `SplitContainer` yet to assert "wasn't unmounted" against at the component level. Flagged for whichever SEQ finally wires real pane content into `SplitContainer` to add a render-level regression test then.
- AC1's "before the next paint" is satisfied by `resizeDivider` being a synchronous, non-batched mutation on the plain `_panes` array (same style as every other `PaneManager` method) — the actual trigger that makes some parent re-render `SplitContainer` after calling it is out of scope here, same "not wired into `App.jsx` yet" deferral the SEQ-018 addition already recorded for `openFile`/`splitRight`.

### SEQ-020 addition: Clamp resize at a minimum pane width
- Design unit: SEQ-020 "Clamp resize at a minimum pane width" (REQ-020, CMP-009 PaneManager — `resizeDivider` gains a clamp; no new component, no new file). Revising this file in place, same as the SEQ-019 addition above.
- Flow (per `SEQ-020.md`): `PaneManager.resizeDivider(paneId, deltaPx)` -> `[newWidth < MIN_PANE_WIDTH?]` --yes--> `width = MIN_PANE_WIDTH`. This is not a new stage in the flow already established by SEQ-019 (`<SplitContainer onResize={...}/> -> PaneManager.resizeDivider -> panes[].width updated`) — it's a refinement of that same single arrow's leaf stage, so this addition extends Step 8 in place rather than adding a new step, following the same in-place-revision convention Steps 31-32 of the sibling plan used when SEQ-016/SEQ-017 extended SEQ-015's already-holed `closeTab`.
- **Open design point: `MIN_PANE_WIDTH` value.** Neither REQ-020 nor CMP-009 fixes a number (same gap SEQ-019 had for `DEFAULT_PANE_WIDTH`). This plan adds a second module constant, `MIN_PANE_WIDTH = 20`, alongside the existing `DEFAULT_PANE_WIDTH = 50` — chosen only so it sits comfortably below the default (the clamp stays inert for ordinary resizes and only engages once a pane is dragged well past its starting width) — provisional, same as `DEFAULT_PANE_WIDTH`, flagged for whichever later pass wants to tune it.
- **Verified against the real arithmetic SEQ-019 wrote, not assumed.** Step 8's existing body computes `pane.width = (pane.width ?? DEFAULT_PANE_WIDTH) + deltaPx` and `neighbor.width = (neighbor.width ?? DEFAULT_PANE_WIDTH) - deltaPx` — today the full requested `deltaPx` always moves both sides symmetrically, with no floor. Naively clamping only `pane.width` after the fact (a post-hoc `Math.max`) would break the total-width conservation SEQ-020's own Sequence step 3 requires ("the other pane's width is adjusted complementarily so the total remains consistent") — the neighbor would still subtract the *full* `deltaPx`, absorbing more than pane actually gave up, quietly shrinking the pair's combined width, and repeated over-the-floor calls would keep marching the neighbor down indefinitely (violating AC2). The fix instead derives an `appliedDelta` — capped to whatever pane or neighbor can actually give up before hitting `MIN_PANE_WIDTH` — and applies that same `appliedDelta` symmetrically to both sides, so the pair's combined width is exactly conserved and, once a side is pinned at `MIN_PANE_WIDTH`, `appliedDelta` computes to `0` on every further call past the clamp (AC2 — no oscillation, no negative width).
- Build order: no new step — Step 7 (test) gains new scenarios and Step 8 (impl) is revised in place; no other file changes.

### SEQ-021 addition: Collapse to single pane when one pane closes
- Design unit: SEQ-021 "Collapse to single pane when one pane closes" (REQ-021, CMP-011 SplitContainer — adds a close control per pane and its `onClosePane` wiring, CMP-009 PaneManager — adds `closePane(paneId): void`). Revising this file in place, same as the SEQ-019/SEQ-020 additions above — CMP-011's own `Used By` list already named SEQ-021 alongside SEQ-018/019/022.
- Flow (per `SEQ-021.md`):
  ```
  <SplitContainer onClosePane={paneId} />
    |
    v
  PaneManager.closePane(paneId): void
    |
    v
  panes.length === 1, width = 100%
  ```
- Build order: same leaf-first convention as SEQ-018/019 — `PaneManager.closePane` (Step 14, the flow's leaf stage) is built before `SplitContainer`'s close-control skeleton and click wiring (Steps 16, 18, the flow's entry point).
- **Open design point: full-width value.** Neither REQ-021 nor CMP-009 fixes a number for "full width" — same gap SEQ-019/020 had for `DEFAULT_PANE_WIDTH`/`MIN_PANE_WIDTH`. This plan adds a third module constant, `FULL_PANE_WIDTH = 100`, matching the same percentage-of-container scheme the other two constants already established (50/50 default split, floor at 20) — 100 is the natural "whole container" value in that same scheme, not a new unit.
- **Which pane remains — read from the design, not assumed.** SEQ-021's own Sequence step 3 and CMP-009's interface line both describe `closePane` acting on the *closed* pane's id, collapsing whatever's left — not a "the other one, hardcoded" special case. `closePane(paneId)` removes the entry matching `paneId` and, if exactly one entry remains afterward, sets that one entry's width to `FULL_PANE_WIDTH`. This reads correctly regardless of which of the two panes (left or right) the user closes, and needs no new lookup beyond the filter already required to remove the entry.
- **AC2 verification lives at the `PaneManager` state layer, not in `SplitContainer`'s DOM** — same reasoning already established for SEQ-019's AC2 above. `closePane` only ever removes an array entry and writes `.width`; it never touches `.tabManager`. The test (Step 13) asserts this the same way Step 7 did for `resizeDivider`: capture the surviving pane's `tabManager` by reference before calling `closePane`, then assert it's still the same reference afterward, plus its `tabs`/`activeTabId` are unchanged — proving the closure didn't rebuild or reset the surviving pane's tab state.
- **`SplitContainer`'s close-control wiring is this component's third instance of the same "receive a prop callback, call it with `pane.id` on a UI event" pattern.** `onSplit` (Step 6: click -> `await onSplit(pane.id)`, plus the pending-state guard that's genuinely new) and `onResize` (Step 12: drag-move -> `onResize(paneId, deltaPx)`) each holed this pattern once, teaching first the guarded/awaited form and then the plain event-argument form. `onClosePane` needs neither guard nor event-derived argument — it's `onClick={() => onClosePane(pane.id)}`, the simplest form of a pattern already taught twice. Per this plan's own precedent for the sibling plan's Step 25 (`Pane`'s third status-branch occurrence, demoted to working because the first two occurrences already taught the pattern as both working and hole), this wiring is written as working code, not a third hole — holing it again would not teach the human anything the first two occurrences didn't already cover, and would push the whole-plan ratio further past budget for no teaching value.

### SEQ-022 addition: Prevent duplicate pane rendering on rapid double-split
- Design unit: SEQ-022 "Prevent duplicate pane rendering on rapid double-split" (REQ-022, CMP-011 SplitContainer — verified, no new behavior; CMP-009 PaneManager — verified, no new behavior). No new component, no new method, no new file: this SEQ's own Requirement restates, almost verbatim, the guard Step 6 already built during the SEQ-018 pass (CMP-011's own Responsibility line already promises "disabling its split trigger while a `splitRight()` call is in flight"; REQ-022's Interface line asks for exactly that — "a second split/render-triggering call cannot start before the first pane-render completes"). Revising this file in place, per the same convention the SEQ-019/020/021 additions above already established.
- Flow: unchanged from SEQ-018's own Flow (`<SplitContainer onSplit={sourcePaneId} /> -> PaneManager.splitRight(sourcePaneId) -> panes.length === 2`) — SEQ-022 adds no new arrow, only a stronger proof of the same arrow's existing guard under a rapid-repeat trigger.
- **Revision note (SEQ-022 check, this run): genuine test gap found, closed with one new test, no new implementation or hole — mirrors the SEQ-013/SEQ-017 pattern in the sibling plan.** Checked Step 5's existing test line by line against SEQ-022's own two Acceptance Criteria:
  - AC1 ("two split triggers in rapid succession -> `panes.length === 2`, never more"): Step 5 fires exactly *one* click, then asserts `onSplit` was called once and the button is disabled — it never fires a second click while the first promise is still pending, so it proves the disabled *attribute* appears, but never proves that attribute actually stops a second click from reaching `onSplit` a second time. That is a real, unproven claim, not a missing implementation: Step 6's handler (`disabled={pendingPaneId === pane.id}` plus the awaited `onClick`) already sets `disabled` synchronously, before `await onSplit(pane.id)` suspends — React 18 flushes that state update to the DOM synchronously within the same `fireEvent.click` call, the same synchronicity Step 5's own assertion (checking `.toBeDisabled()` immediately after the click, with no `waitFor`) already relies on. A `disabled` DOM button does not dispatch `click` events at all (native browser/jsdom behavior, not React-specific — this is exactly why testing-library's own `fireEvent.click` is a documented no-op against a disabled element), so a second `fireEvent.click` on the same node before `resolveSplit()` is called should already be inert. Closed with a new proving test, Step 19 below, rather than a new implementation line.
  - AC2 ("the rendered pane container has exactly as many DOM pane elements as `panes.length`, no duplicated nodes"): structurally guaranteed by CMP-011's own stated shape ("Stateless (props-driven) React component") plus Step 4's actual skeleton (`panes.map((pane) => (<div key={pane.id} className="split-pane">...</div>))`). `SplitContainer` never owns or mutates a `panes` array itself — it only ever renders whatever array its parent passes as a prop, one `<div className="split-pane">` per entry, via React's own keyed reconciliation. There is no manual DOM append/clear step anywhere in this component (unlike the prototype's imperative `renderPanes()`) for two overlapping calls to race on, so AC2 reduces entirely to "does `panes` (the array) ever gain a duplicate/extra entry" — which is AC1's own concern, not a separate DOM-layer risk. No separate test or code is needed for AC2 beyond AC1's own proof.
- **Verified: the prototype's specific missing-`await`-before-`renderPanes()` bug (SEQ-022 Sequence step 3) is structurally inapplicable to this codebase's actual architecture — checked the real code, not assumed.** `PaneManager.splitRight` (Step 2) is `async` but its body has zero internal `await` points: `findIndex`, an object literal, and `splice` are all synchronous. Because JavaScript is single-threaded with run-to-completion semantics for synchronous code, once `splitRight` starts executing it runs every one of those lines, including the `splice` mutation, before it can yield control back to any caller — there is no `await`-shaped gap inside the method itself for a second, overlapping call to interleave into, the way the prototype's `renderPanes()` (an un-awaited call sitting *inside* `splitRight`, itself apparently doing async DOM work) allowed. Separately, this codebase has no `renderPanes()`-equivalent function at all: rendering is React's own declarative reconciliation over the `panes` prop (see the AC2 note above), not an imperative function `PaneManager` calls and could fail to await. So SEQ-022 Sequence step 2's "internally awaits its own pane-list update and re-render step fully before resolving" is satisfied vacuously by `splitRight`'s existing, unchanged body — there is no additional render call inside it left to await, and no implementation change is needed here.
- Net effect: zero new implementation lines, zero new holes. One new test-only step (Step 19) closes the one real gap (AC1's rapid-repeat-click proof). The Hole/Working Tally's holed/working line counts are unchanged; only the step count grows, by a test-only row that (per `todo-hole.md`/this plan's own convention — see Steps 4, 10, 16 for skeleton-only steps and the sibling plan's Steps 4/13/24/26 for test-only steps) contributes no tally row.

## Action Sequence

- **Step 1 (test).** Write failing test in `web/src/panes/PaneManager.test.js` (existing file, reusing its existing `fakeFileHandle` helper): construct `const pm = new PaneManager(['pane-1']);`, call `await pm.openFile('pane-1', fakeFileHandle('notes.md', '# Hi'));` (gives the source pane a real tab, so the new pane's independence is proven with actual data, not just instance identity), then `await pm.splitRight('pane-1');`. Assert `pm.panes.length` is `2` (SEQ-018 AC1); destructuring `const [sourcePane, newPane] = pm.panes;`, assert `newPane.id` is not `'pane-1'`, `newPane.tabManager.tabs.length` is `0` (SEQ-018 AC2), and `sourcePane.tabManager.tabs.length` is still `1` (the source pane's own tabs are untouched by the split).

- **Step 2 (impl).** Implement `splitRight(sourcePaneId)` in `web/src/panes/PaneManager.js`, alongside the existing `openFile`: `async splitRight(sourcePaneId) { const sourceIndex = this._panes.findIndex((p) => p.id === sourcePaneId); const newPane = { id: \`pane-${this._panes.length + 1}\`, tabManager: /* */ }; this._panes.splice(sourceIndex + 1, 0, newPane); }`, so Step 1 passes.
  - **Working:** `const sourceIndex = this._panes.findIndex((p) => p.id === sourcePaneId);` (a fixed lookup within the existing array, not itself a decision — same reasoning as `openFile`'s own `this._panes.find(...)` lookup), the `id` template string (mechanical id generation, not a per-call decision — see the open design point above), and `this._panes.splice(sourceIndex + 1, 0, newPane);` (mechanical insertion of an already-constructed entry — once `newPane` exists, placing it in the array is not itself a decision, same precedent as `TabManager.openTab`'s `this._tabs.push(...)` being working once its own dedup hole is resolved).
  - **Hole:** The flow-connecting call — this is exactly the SEQ-018 Flow diagram's one arrow (`PaneManager.splitRight(sourcePaneId)` -> "new TabManager instance (second pane)"), the line where `splitRight` calls into `TabManager`'s constructor and uses the result to build the second pane's entry. TODO (per `todo-hole.md`):
    ```javascript
    // TODO:
    // 1. A pane entry pairs an id with its own TabManager instance (same shape
    //    the constructor already builds for every pane: { id, tabManager }).
    // 2. Construct a fresh TabManager for the new pane — it must start with no
    //    tabs of its own, independent of sourcePaneId's tabs.
    // e.g. this._panes.length === 2 (two panes already exist), splitRight
    //      called again -> new TabManager() -> a TabManager whose .tabs is []
    //      and .activeTabId is null, paired with the new id above
    const newPane = { id: `pane-${this._panes.length + 1}`, tabManager: new TabManager() };
    ```

- **Step 3 (test).** Write failing test in `web/src/components/SplitContainer.test.jsx` (new file, styled like `Pane.test.jsx`: `describe`/`it`/`vi` from `vitest`, `render`/`screen` from `@testing-library/react`): `const panes = [{ id: 'pane-1', tabManager: {} }, { id: 'pane-2', tabManager: {} }];`, `render(<SplitContainer panes={panes} onSplit={() => {}} onResize={() => {}} onClosePane={() => {}} />);`, assert `screen.getByRole('button', { name: 'Split pane-1' })` and `screen.getByRole('button', { name: 'Split pane-2' })` are both in the document — proving one split trigger renders per entry in `panes`, ahead of wiring any click in Step 5.

- **Step 4 (impl).** Implement the skeleton of `SplitContainer` in `web/src/components/SplitContainer.jsx`: `import { useState } from 'react';`, `export default function SplitContainer({ panes, onSplit, onResize, onClosePane }) { const [pendingPaneId, setPendingPaneId] = useState(null); return (<div className="split-container">{panes.map((pane) => (<div key={pane.id} className="split-pane"><button aria-label={\`Split ${pane.id}\`}>Split right</button></div>))}</div>); }` (no `disabled`/`onClick` yet — added in Step 6), so Step 3 passes.
  - **Working:** Entire step — the `pendingPaneId` state declaration (unused until Step 6), the `<div className="split-container">` wrapper, the `panes.map` iteration, each `<div className="split-pane">` wrapper, and the button's static label/`aria-label`. Mirrors the sibling plan's own precedent for a first-pass component skeleton (e.g. `TabManager`'s base state, `Pane`'s tab-bar row) — no decision yet, nothing to hole.

- **Step 5 (test).** Write failing test in `SplitContainer.test.jsx` (this is REQ-018's own trigger and CMP-011's defining "disable while in flight" behavior — SEQ-018 Sequence steps 1-2): `let resolveSplit; const onSplit = vi.fn(() => new Promise((resolve) => { resolveSplit = resolve; }));`, `const panes = [{ id: 'pane-1', tabManager: {} }];`, render `<SplitContainer panes={panes} onSplit={onSplit} onResize={() => {}} onClosePane={() => {}} />`, `fireEvent.click(screen.getByRole('button', { name: 'Split pane-1' }));`; assert `onSplit` was called exactly once with `'pane-1'`, and the button `.toBeDisabled()` immediately (before the promise settles). Then call `resolveSplit();` and `await waitFor(() => expect(screen.getByRole('button', { name: 'Split pane-1' })).not.toBeDisabled());` (needs `waitFor` added to the `@testing-library/react` import).

- **Step 6 (impl).** Extend Step 4's button in `SplitContainer.jsx` with `disabled={pendingPaneId === pane.id}` and `onClick={async () => { setPendingPaneId(pane.id); await onSplit(pane.id); setPendingPaneId(null); }}`, so Step 5 passes.
  - **Working:** `setPendingPaneId(pane.id)` and `setPendingPaneId(null)` (the two state-bookkeeping lines around the call — mechanical once the surrounding decision below is understood, same "compute/apply" split this codebase's own `TabManager.closeTab` used for its `newIndex` hole).
  - **Hole:** The two lines that are this SEQ's own defining decision (CMP-011: "disabling its split trigger while a `splitRight()` call is in flight"; SEQ-018 Sequence step 2: "awaits PaneManager's `splitRight`") — whether this pane's trigger is currently disabled, and the awaited call itself that the disabling exists to guard. TODO (per `todo-hole.md`):
    ```jsx
    // TODO:
    // 1. pane is the current pane in this panes.map iteration; pane.id
    //    identifies which pane's trigger this button is.
    // 2. disabled should be true exactly while this pane's own split is
    //    pending — compare pendingPaneId (set just above the await) to
    //    pane.id, not to some other pane's id.
    // 3. onSplit is the prop SplitContainer received — await its call with
    //    pane.id so the button stays disabled until PaneManager.splitRight
    //    actually resolves, not just until the click handler returns.
    // e.g. pane.id="pane-2" is clicked -> setPendingPaneId("pane-2")
    //      -> disabled={pendingPaneId === "pane-2"} -> true (this button)
    //      -> disabled={pendingPaneId === "pane-1"} -> false (a different
    //      pane's button, unaffected) -> await onSplit("pane-2") resolves
    //      -> setPendingPaneId(null) -> both buttons enabled again
    disabled={pendingPaneId === /* */}
    onClick={async () => {
      setPendingPaneId(pane.id);
      await onSplit(/* */);
      setPendingPaneId(null);
    }}
    ```

### SEQ-019 steps

- **Step 7 (test, SEQ-019, revised for SEQ-020).** Write failing tests in `web/src/panes/PaneManager.test.js`, four scenarios, each constructing its own fresh `pm`:
  1. *(SEQ-019, unchanged)* `const pm = new PaneManager(['pane-1']);`, `await pm.openFile('pane-1', fakeFileHandle('notes.md', '# Hi'));`, `await pm.splitRight('pane-1');`, then `const [paneA, paneB] = pm.panes;` and capture `const tabManagerABefore = paneA.tabManager;` / `const tabManagerBBefore = paneB.tabManager;` before resizing. Call `pm.resizeDivider('pane-1', 20);`. Assert `paneA.width` is `70` and `paneB.width` is `30` (default 50 each, `+20`/`-20`), `paneA.tabManager`/`paneB.tabManager` are still `tabManagerABefore`/`tabManagerBBefore` by reference, and `paneA.tabManager.tabs` still has length `1` with `activeTabId` still `'notes.md'`.
  2. *(new, SEQ-020, pane-side clamp, AC1)* `const pm = new PaneManager(['pane-1']);`, `await pm.splitRight('pane-1');`, `pm.resizeDivider('pane-1', -1000);` (a deliberately oversized shrink request). Assert `pm.panes[0].width` is `20` (pinned at `MIN_PANE_WIDTH`, not negative) and `pm.panes[1].width` is `80` — the neighbor absorbs only the `-30` actually applied (`50 -> 20`), not the full `-1000` requested, so `20 + 80 === 100`, the original combined width.
  3. *(new, SEQ-020, neighbor-side clamp, AC1)* Same setup, `pm.resizeDivider('pane-1', 1000);` (a deliberately oversized grow request, which shrinks the neighbor). Assert `pm.panes[1].width` is `20` (the neighbor pinned at `MIN_PANE_WIDTH` this time) and `pm.panes[0].width` is `80` — symmetric proof the clamp applies to either side of the divider, not just the pane named in the call.
  4. *(new, SEQ-020, repeated-calls-pinned, AC2)* Same setup, `pm.resizeDivider('pane-1', -1000);` once (as in scenario 2, landing at `20`/`80`), then `pm.resizeDivider('pane-1', -50);` again. Assert `pm.panes[0].width` is still `20` and `pm.panes[1].width` is still `80`, unchanged by the second call — proving repeated calls past the clamp point stay pinned rather than oscillating or drifting negative.

- **Step 8 (impl, SEQ-019, revised for SEQ-020).** Implement `resizeDivider(paneId, deltaPx)` in `web/src/panes/PaneManager.js`, alongside `splitRight`, with module-level `const DEFAULT_PANE_WIDTH = 50;` and `const MIN_PANE_WIDTH = 20;`:
    ```javascript
    resizeDivider(paneId, deltaPx) {
      const index = this._panes.findIndex((p) => p.id === paneId);
      const pane = this._panes[index];
      const neighbor = this._panes[index + 1];
      const currentPaneWidth = pane.width ?? DEFAULT_PANE_WIDTH;
      const currentNeighborWidth = neighbor.width ?? DEFAULT_PANE_WIDTH;
      let appliedDelta = deltaPx;
      if (currentPaneWidth + appliedDelta < MIN_PANE_WIDTH) {
        appliedDelta = /* */;
      } else if (currentNeighborWidth - appliedDelta < MIN_PANE_WIDTH) {
        appliedDelta = /* */;
      }
      pane.width = currentPaneWidth + appliedDelta;
      neighbor.width = currentNeighborWidth - appliedDelta;
    }
    ```
    so all four of Step 7's scenarios pass.
  - **Working:** `const index = ...` / `const pane = ...` / `const neighbor = ...` (unchanged lookups, same reasoning as before); `const currentPaneWidth = pane.width ?? DEFAULT_PANE_WIDTH;` and `const currentNeighborWidth = neighbor.width ?? DEFAULT_PANE_WIDTH;` (new in this revision — the same mechanical default-substitution the old inline `pane.width ?? DEFAULT_PANE_WIDTH` already did, just captured in a local so both the clamp check and the final assignment can reuse the one value without re-reading a field that's about to be overwritten); `let appliedDelta = deltaPx;` (mechanical starting point for the hole below, not itself a decision); and — **superseding the SEQ-019 hole below** — `pane.width = currentPaneWidth + appliedDelta;` / `neighbor.width = currentNeighborWidth - appliedDelta;`. These are the same two lines SEQ-019 holed (then as `... + deltaPx` / `... - deltaPx`), but the decision they used to carry — "grow one side, shrink the other by the same amount" — has now moved entirely into computing `appliedDelta` below; once `appliedDelta` exists, applying it symmetrically is mechanical, the same "compute the key value, leave its application working" split this file already used for `splitRight`'s `newPane` and the sibling plan's own `TabManager.closeTab` (`newIndex` computed as a hole, `this._tabs[newIndex].fileId` assigned as working).
  - **Hole:** *(new, SEQ-020)* The clamp computation — deriving the *actually-applied* delta once one side would cross `MIN_PANE_WIDTH`, so the other side's complementary adjustment matches (SEQ-020 Sequence steps 2-3; AC1/AC2). Both branches are one decision, holed together, same precedent as this file's own Step 6 pairing. TODO (per `todo-hole.md`):
    ```javascript
    // TODO:
    // 1. currentPaneWidth/currentNeighborWidth are this call's starting widths
    //    (already defaulted above); appliedDelta starts equal to deltaPx and
    //    only needs correcting if the full requested change would cross
    //    MIN_PANE_WIDTH on either side.
    // 2. If pane's own new width (currentPaneWidth + appliedDelta) would fall
    //    below MIN_PANE_WIDTH, shrink appliedDelta down to exactly the amount
    //    that lands pane at MIN_PANE_WIDTH: appliedDelta = MIN_PANE_WIDTH -
    //    currentPaneWidth (smaller in magnitude than deltaPx, so neighbor only
    //    absorbs that same reduced amount below).
    // 3. Otherwise, if neighbor's new width (currentNeighborWidth -
    //    appliedDelta) would fall below MIN_PANE_WIDTH instead, symmetrically
    //    cap it there: appliedDelta = currentNeighborWidth - MIN_PANE_WIDTH.
    // 4. Otherwise deltaPx already fits within both floors — appliedDelta
    //    stays deltaPx, unchanged.
    // e.g. currentPaneWidth=50, currentNeighborWidth=50, MIN_PANE_WIDTH=20,
    //      resizeDivider(paneId, -45) is called -> appliedDelta starts at -45
    //      -> 50 + (-45) = 5, which is < 20 -> appliedDelta = 20 - 50 = -30
    //      -> pane.width = 50 + (-30) = 20 (pinned at the minimum)
    //      -> neighbor.width = 50 - (-30) = 80 (absorbs only the -30 actually
    //      applied, not the full -45 requested)
    let appliedDelta = deltaPx;
    if (currentPaneWidth + appliedDelta < MIN_PANE_WIDTH) {
      appliedDelta = /* */;
    } else if (currentNeighborWidth - appliedDelta < MIN_PANE_WIDTH) {
      appliedDelta = /* */;
    }
    ```

- **Step 9 (test).** Write failing test in `web/src/components/SplitContainer.test.jsx`: `const panes = [{ id: 'pane-1', tabManager: {} }, { id: 'pane-2', tabManager: {} }];`, render `<SplitContainer panes={panes} onSplit={() => {}} onResize={() => {}} onClosePane={() => {}} />`. Assert `screen.getByRole('separator', { name: 'Resize pane-1' })` is in the document, and `screen.queryByRole('separator', { name: 'Resize pane-2' })` is `null` — proving exactly one divider renders, between the pair, not one per pane.

- **Step 10 (impl).** Extend `SplitContainer.jsx`'s `panes.map` from Step 4 to also render a divider between adjacent entries: `{panes.map((pane, i) => (<div key={pane.id} className="split-pane"><button aria-label={\`Split ${pane.id}\`} disabled={pendingPaneId === pane.id} onClick={...}>Split right</button>{i < panes.length - 1 && (<div role="separator" aria-label={\`Resize ${pane.id}\`} className="divider" />)}</div>))}`, so Step 9 passes (no `onMouseDown` yet — added in Step 12).
  - **Working:** Entire step — the `i < panes.length - 1` guard and the divider `<div role="separator" ...>` skeleton, same precedent as Step 4's own skeleton (a `.map` plus static structure, no decision yet).

- **Step 11 (test).** Write failing test in `SplitContainer.test.jsx` (REQ-019's own trigger and SEQ-019 Sequence steps 1-2): `const onResize = vi.fn();`, render with `panes = [{ id: 'pane-1', tabManager: {} }, { id: 'pane-2', tabManager: {} }]` and that `onResize`. `const divider = screen.getByRole('separator', { name: 'Resize pane-1' });`. `fireEvent.mouseDown(divider);` then `fireEvent.mouseMove(window, { movementX: 15 });` — assert `onResize` was called with `('pane-1', 15)`. `fireEvent.mouseMove(window, { movementX: -5 });` — assert it was also called with `('pane-1', -5)` and has now been called exactly twice. Then `fireEvent.mouseUp(window);` and `fireEvent.mouseMove(window, { movementX: 100 });` — assert the call count is still `2` (listeners cleaned up, no call after mouseup).

- **Step 12 (impl).** Add drag wiring in `SplitContainer.jsx`: a `handleDividerMouseDown(paneId)` function attached to each divider's `onMouseDown`, that installs `window` listeners for the drag: `const handleDividerMouseDown = (paneId) => { const handleMouseMove = (e) => onResize(/* */, e.movementX); const handleMouseUp = () => { window.removeEventListener('mousemove', handleMouseMove); window.removeEventListener('mouseup', handleMouseUp); }; window.addEventListener('mousemove', handleMouseMove); window.addEventListener('mouseup', handleMouseUp); };`, and the divider's `onMouseDown={() => handleDividerMouseDown(pane.id)}`, so Step 11 passes.
  - **Working:** The `handleMouseUp` body (the two `removeEventListener` calls — mechanical cleanup, not a decision), both `addEventListener` calls (mechanical setup once `handleMouseMove`/`handleMouseUp` exist), and the divider's `onMouseDown={() => handleDividerMouseDown(pane.id)}` wiring (passing `pane.id` along is mechanical, same precedent as Step 6's `setPendingPaneId(pane.id)`).
  - **Hole:** The flow-connecting call — the one line where a drag-move event actually reaches `PaneManager.resizeDivider` (via the `onResize` prop), exactly the SEQ-019 Flow diagram's one arrow. TODO (per `todo-hole.md`):
    ```jsx
    // TODO:
    // 1. paneId is the argument handleDividerMouseDown was called with when
    //    this divider's mousedown fired — it identifies which pane's width
    //    this drag is resizing.
    // 2. e.movementX is the browser's own per-move delta in pixels (how far
    //    the pointer moved since the previous mousemove event) — already
    //    computed for you, pass it straight through as deltaPx.
    // e.g. handleDividerMouseDown("pane-2") captured paneId="pane-2" -> user
    //      drags 3px left -> a mousemove event fires with movementX=-3
    //      -> onResize("pane-2", -3)
    const handleMouseMove = (e) => onResize(/* */, e.movementX);
    ```

### SEQ-021 steps

- **Step 13 (test, SEQ-021).** Write failing test in `web/src/panes/PaneManager.test.js`: `const pm = new PaneManager(['pane-1']);`, `await pm.openFile('pane-1', fakeFileHandle('notes.md', '# Hi'));`, `await pm.splitRight('pane-1');`, `const [paneA] = pm.panes;`, capture `const tabManagerBefore = paneA.tabManager;` before closing. Call `pm.closePane('pane-2');` (close the empty pane created by the split, keeping `pane-1` and its real tab data). Assert `pm.panes.length` is `1` (SEQ-021 AC1 / REQ-021 AC1); `pm.panes[0].id` is `'pane-1'`; `pm.panes[0].tabManager` is still `tabManagerBefore` by reference (AC2); `pm.panes[0].tabManager.tabs.length` is `1` and `activeTabId` is `'notes.md'`, unchanged (AC2); and `pm.panes[0].width` is `100` (Sequence step 3, "remaining pane's width set to the full available width").

- **Step 14 (impl, SEQ-021).** Implement `closePane(paneId)` in `web/src/panes/PaneManager.js`, alongside `splitRight`/`resizeDivider`, with a new module-level `const FULL_PANE_WIDTH = 100;`:
    ```javascript
    closePane(paneId) {
      this._panes = this._panes.filter((p) => p.id !== paneId);
      if (this._panes.length === 1) {
        this._panes[0].width = /* */;
      }
    }
    ```
    so Step 13 passes.
  - **Working:** `this._panes = this._panes.filter((p) => p.id !== paneId);` (a mechanical rebuild excluding the matching entry — the same "filter, no per-SEQ branching" reasoning the sibling plan's own `TabManager.closeTab` already established for its own removal line).
  - **Hole:** The `if` check and the width assignment together — this is SEQ-021's and REQ-021's whole reason for existing (the Flow diagram's final box, "panes.length === 1, width = 100%"; REQ-021's own Interface line, "the remaining pane rendered at full width"), not a lookup or a mechanical rebuild. Both lines are one decision, holed together, the same "both branches, one decision" precedent as this file's own Step 8 clamp. TODO (per `todo-hole.md`):
    ```javascript
    // TODO:
    // 1. this._panes has already had the closed pane's entry removed by the
    //    filter above; if exactly one pane is left, that's the surviving
    //    pane REQ-021 says should now take up the full available width.
    // 2. Set that surviving pane's width to FULL_PANE_WIDTH.
    // e.g. this._panes had 2 entries, filter removes 'pane-2' -> this._panes
    //      now has length 1 -> this._panes[0].width = FULL_PANE_WIDTH (100)
    if (this._panes.length === 1) {
      this._panes[0].width = /* */;
    }
    ```

- **Step 15 (test, SEQ-021).** Write failing test in `SplitContainer.test.jsx`: `const panes = [{ id: 'pane-1', tabManager: {} }, { id: 'pane-2', tabManager: {} }];`, render with all four props (`onSplit`, `onResize`, `onClosePane` all no-ops). Assert `screen.getByRole('button', { name: 'Close pane-1' })` and `screen.getByRole('button', { name: 'Close pane-2' })` are both in the document — one close control per pane, ahead of wiring any click in Step 17.

- **Step 16 (impl, SEQ-021).** Extend Step 4/10's `panes.map` in `SplitContainer.jsx` with one more sibling element per pane: `<button aria-label={\`Close ${pane.id}\`}>Close</button>` (no `onClick` yet — added in Step 18), so Step 15 passes.
  - **Working:** Entire step — one more static, labeled button per iteration, same precedent as Step 4's own skeleton (a `.map` addition with no branching decision).

- **Step 17 (test, SEQ-021).** Write failing test in `SplitContainer.test.jsx` (SEQ-021 Sequence steps 1-2, REQ-021's own trigger): `const onClosePane = vi.fn();`, render with `panes = [{ id: 'pane-1', tabManager: {} }, { id: 'pane-2', tabManager: {} }]` and that `onClosePane`. `fireEvent.click(screen.getByRole('button', { name: 'Close pane-2' }));` — assert `onClosePane` was called exactly once, with `'pane-2'`.

- **Step 18 (impl, SEQ-021).** Add `onClick={() => onClosePane(pane.id)}` to Step 16's button, so Step 17 passes.
  - **Working:** Entire step, not holed — see the addition note above: this is the third instance of `SplitContainer`'s "prop callback wired to a UI event, called with `pane.id`" pattern (after Step 6's guarded/awaited form and Step 12's event-argument form), and per this plan's own precedent for demoting an already-twice-taught pattern (the sibling plan's Step 25), a third occurrence is written as working code rather than re-holed.

### SEQ-022 steps

- **Step 19 (test, SEQ-022).** Write a new test in `web/src/components/SplitContainer.test.jsx`, in the same `describe` block as Step 5 (a rapid-repeat scenario alongside Step 5's single-click scenario, not a revision of it — SEQ-022 AC1's own trigger): `let resolveSplit; const onSplit = vi.fn(() => new Promise((resolve) => { resolveSplit = resolve; }));`, `const panes = [{ id: 'pane-1', tabManager: {} }];`, render `<SplitContainer panes={panes} onSplit={onSplit} onResize={() => {}} onClosePane={() => {}} />`, `const button = screen.getByRole('button', { name: 'Split pane-1' });`, then `fireEvent.click(button); fireEvent.click(button);` — two rapid clicks, back to back, before the promise resolves. Assert `onSplit` was called exactly once (`expect(onSplit).toHaveBeenCalledTimes(1);`) — the second click must not reach `onSplit` a second time, since `PaneManager.splitRight` is what actually grows `panes.length`, and a second real call would grow it to 3 (not hold it at 2, per SEQ-022 AC1). Then `resolveSplit();` and `await waitFor(() => expect(button).not.toBeDisabled());`, confirming re-enabling still works after the rapid-click sequence, not just after Step 5's single click. This is a pure proving test, expected to already pass with no further implementation change — see the SEQ-022 addition's revision note above; if it fails, either Step 6's `disabled={pendingPaneId === pane.id}` stopped being applied synchronously before the awaited call suspends, or something changed how disabled buttons dispatch click events.

## Hole / Working Tally
| Step | Implementation lines | Hole | Working |
|---|---|---|---|
| 2 — `PaneManager.splitRight` (new pane construction) | 3 | 1 | 2 |
| 4 — `SplitContainer` skeleton (one trigger per pane) | 5 | 0 | 5 |
| 6 — `SplitContainer` pending-state / `onSplit` wiring | 4 | 2 | 2 |
| 8 — `PaneManager.resizeDivider` (width-update arithmetic + minimum-width clamp) | 10 | 2 | 8 |
| 10 — `SplitContainer` divider skeleton | 2 | 0 | 2 |
| 12 — `SplitContainer` drag wiring (`onResize` call) | 6 | 1 | 5 |
| 14 — `PaneManager.closePane` (remove entry + collapse width) | 3 | 2 | 1 |
| 16 — `SplitContainer` close-control skeleton | 1 | 0 | 1 |
| 18 — `SplitContainer` close click wiring (`onClosePane` call, third-repeat demotion) | 1 | 0 | 1 |
| **Total** | **35** | **8 (23%)** | **27 (77%)** |

- Slightly under the 30% target, in the direction opposite the sibling plan's own small-flow SEQs (which ran a few points over); across SEQ-018, SEQ-019 and SEQ-020 this stays a short, sharply-defined flow with one or two genuine decision points per step, leaving no low-value filler to invent just to hit the number.
- The SEQ-020 addition moves the total further under 30% (24% -> 20%) rather than closer to it: it adds 5 new lines to Step 8, but only 2 of them are the new hole (the clamp computation) — the other 3 (`currentPaneWidth`/`currentNeighborWidth` capture, `appliedDelta` init) are mechanical bookkeeping the clamp needs, and the 2 lines that *used* to be Step 8's hole (the final `pane.width`/`neighbor.width` assignments) flip to working now that `appliedDelta` already carries the decision. Per the budget guidance's own "some steps may carry more/less, as long as the total lands near 30/70" allowance, this is the same judgment call the plan already made for Step 8 pre-SEQ-020 (holing the one genuine decision, not padding the surrounding mechanics to hit a number) — just applied again to a step that grew.
- Step 2 (33% holed) is `splitRight`'s one defining decision (constructing the new pane's `TabManager`, the exact arrow SEQ-018's Flow diagram names) — the lookup and insertion around it are mechanical once that value exists, same "compute the key value, leave its application working" split this file's own `TabManager.closeTab` (built by the sibling plan) already established for its `newIndex` hole.
- Step 4 is entirely working, by the same precedent the sibling plan used for `TabManager`'s base state and `Pane`'s tab-bar row: a first-pass skeleton with a `.map` and no branching decision gets no hole.
- Step 6 (50% holed) is CMP-011's whole reason for existing as a component beyond a dumb button list — the disabled-while-pending behavior — so both of its lines (the comparison and the awaited call) are holed together as one decision, not split into a "safer" partial hole; the two `setPendingPaneId` bookkeeping lines around it stay working, mirroring `TabManager.closeTab`'s split between its holed comparison/formula and its working state assignments.
- Step 8 (20% holed, revised for SEQ-020) originally holed `resizeDivider`'s grow/shrink arithmetic directly on `deltaPx` (SEQ-019's own Flow diagram arrow, REQ-019's "updated width values for both panes"); SEQ-020 factors that same decision one level deeper, into computing `appliedDelta` — the clamp check that caps how much of `deltaPx` can actually be applied before either side crosses `MIN_PANE_WIDTH` (SEQ-020's Sequence steps 2-3, AC1/AC2). The final `pane.width`/`neighbor.width` assignments, once holed, are now mechanical (applying an already-decided `appliedDelta`) and move to Working; the array lookups and default-width fallbacks stay Working as before, same "lookup/fallback stays working" precedent as `splitRight`'s `sourceIndex`.
- Step 10 is entirely working, extending Step 4's own precedent: adding a sibling skeleton element (the divider) with a fixed rendering condition and no branching decision.
- Step 12 (17% holed) holes only the single line where a drag-move event reaches `onResize` — the one arrow SEQ-019's Flow diagram names — while the listener setup/teardown around it (`addEventListener`/`removeEventListener` pairs, the `pane.id` pass-through) stays working, mirroring Step 6's own split between its holed decision and its working bookkeeping.
- The SEQ-021 addition moves the total further under the 30% target (24% -> 23%) despite Step 14 itself running well over budget: Step 14 alone is 67% holed (2 of 3 lines — the collapse-width decision, `closePane`'s whole reason for existing), but Steps 16 and 18 are both fully working, so the net effect across the three new steps is 2 holed / 3 working (5 new lines total, 40% holed) — still above the plan-wide average, but Steps 16/18 pull the new-lines ratio down from what a third hole at Step 18 would have produced, and the whole-plan total stays comfortably under 30% either way. Step 18 in particular is written as working rather than re-holed a third time — see the addition note above — which is what keeps the whole-plan ratio moving down rather than up, consistent with this plan's own established practice (Step 4, Step 10) of not holing a step with no genuine new decision.
- Step 14 (67% holed) holes the `if (this._panes.length === 1)` check and the `FULL_PANE_WIDTH` assignment together as one decision — the exact box SEQ-021's own Flow diagram ends on, and REQ-021's entire defining behavior (collapsing to full width). The filter above it stays working, the same "removal is mechanical once you have the predicate" reasoning already applied throughout this file (`splitRight`'s `findIndex`+`splice`, `resizeDivider`'s lookups) and the sibling plan's own `TabManager.closeTab`.
- Steps 16/18 are entirely working: Step 16 by the same "first-pass skeleton, no branching" precedent as Steps 4/10; Step 18 by the third-repeat demotion explained in the SEQ-021 addition note above — `onSplit` (Step 6) and `onResize` (Step 12) already taught this component's "wire a prop callback to a UI event" pattern once each, so a third, simpler instance (`onClosePane`, no guard, no event-derived argument) teaches nothing new and is demoted rather than padded in just to chase the budget number.
- **The SEQ-022 addition leaves the total exactly as it was (23% holed / 77% working) — no new implementation line, no new hole.** Step 19 (SEQ-022) adds no row: it is a test-only step with no accompanying implementation step, same treatment as Steps 4/13/24/26 in the sibling plan and this plan's own skeleton-only Steps 4/10/16. SEQ-022's two Acceptance Criteria were checked line by line against the existing Steps 5/6 and Step 2 (see the SEQ-022 addition's revision note above): AC1 (rapid double-split still yields `panes.length === 2`) is already enforced by Step 6's disable-while-pending guard, which Step 5's test only proved partially (disabled-attribute state after one click, not that a second click is actually blocked) — closed with Step 19's new rapid-double-click proving test, not a code change. AC2 (no duplicated DOM nodes) is structurally guaranteed by `SplitContainer` being a stateless, props-driven `.map()` render (Step 4) with no manual DOM append/clear step to race on, and by `PaneManager.splitRight` (Step 2) having zero internal `await` points — so the prototype's specific un-awaited-`renderPanes()` bug (SEQ-022 Sequence step 3) has no equivalent code path in this codebase to reproduce.

## Recommended Human Work Order
Every holed step above, reordered top-down along the flow (entry point -> leaf) instead of build order. Steps 4, 10, 16, and 18 are omitted — no hole, already complete. Grouped by the SEQ whose flow they belong to; all three flows share the same entry-point component (`SplitContainer`) but wire different props (`onSplit`, `onResize`, `onClosePane`) through it.

**SEQ-018 flow (split):**
- **Step 6**: `SplitContainer`'s pending-state / `onSplit` wiring — `web/src/components/SplitContainer.jsx`, function `SplitContainer` — the flow's entry point per SEQ-018's Flow diagram (`<SplitContainer onSplit={sourcePaneId} />`); start here to see the user-triggered split, and the in-flight disabling it guards, before descending into what it calls.
- **Step 2**: `PaneManager.splitRight` (new pane construction) — `web/src/panes/PaneManager.js`, method `PaneManager.splitRight` — one level down, the flow's next (and only remaining) stage; where the second pane and its fresh, independent `TabManager` are actually created, and where `panes.length` becomes `2`.

**SEQ-019 flow (resize):**
- **Step 12**: `SplitContainer`'s drag wiring (`onResize` call) — `web/src/components/SplitContainer.jsx`, function `handleDividerMouseDown` inside `SplitContainer` — the flow's entry point per SEQ-019's Flow diagram (`<SplitContainer onResize={paneId, deltaPx} />`); start here to see each drag-move event turned into a call, before descending into what it calls.
- **Step 8**: `PaneManager.resizeDivider` (width-update arithmetic, now with the minimum-width clamp) — `web/src/panes/PaneManager.js`, method `PaneManager.resizeDivider` — one level down, the flow's next (and only remaining) stage; where `deltaPx` actually becomes a new `width` for both panes on either side of the divider, now via an `appliedDelta` that's shrunk in magnitude whenever the full request would push either side below `MIN_PANE_WIDTH` (SEQ-020).

**SEQ-020 flow (clamp):**
- No separate entry point — SEQ-020 adds no new component, and its Flow diagram (`resizeDivider` -> `[newWidth < MIN_PANE_WIDTH?]` -> clamp) is a refinement of the same `resizeDivider` leaf stage named above, not a new arrow. See **Step 8** above — its Hole now includes the clamp computation alongside the (superseded) SEQ-019 decision it replaces.

**SEQ-021 flow (close):**
- **Step 14**: `PaneManager.closePane` (remove entry + collapse width) — `web/src/panes/PaneManager.js`, method `PaneManager.closePane` — the flow's only holed step. Unlike SEQ-018/SEQ-019, SEQ-021's entry point (`SplitContainer`'s close-control wiring, Step 18) carries no hole this time — it's a third repeat of an already-taught wiring pattern, demoted to working code (see the SEQ-021 addition note above) — so this is the one place to look to understand what closing a pane actually changes: which entry disappears from `panes`, and how the survivor's width becomes `FULL_PANE_WIDTH`.

**SEQ-022 flow (race-safety):**
- No separate entry point, and no new holed step. SEQ-022 adds no new component and no new method — its Flow is the same arrow as SEQ-018's own (`<SplitContainer onSplit={...}/> -> PaneManager.splitRight -> panes.length`), and both of its Acceptance Criteria are already covered by code holed under SEQ-018: **Step 6** (`SplitContainer`'s pending-state/`onSplit` wiring, already listed under "SEQ-018 flow" above) is the guard AC1 depends on, and **Step 2** (`PaneManager.splitRight`, also listed above) is verified to have no internal `await` gap for a bypassing second call to interleave into. This SEQ's only contribution is Step 19, a proving test with no hole of its own — see the SEQ-022 addition's revision note earlier in this document for why no new implementation or hole was needed.

## Closeout
- [x] Test — all 14 tests pass (8 PaneManager + 6 SplitContainer)
- [ ] Review — ready for human review of the filled holes
