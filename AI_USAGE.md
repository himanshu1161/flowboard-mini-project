# AI usage log

## Tools

- **Claude**, used as a coding assistant in the editor for code generation, test drafting and debugging.
- No other AI tools were used.

## Key decisions

| Area | Decision | Reasoning |
| --- | --- | --- |
| State management | Redux Toolkit, over the suggested Zustand | Normalized entity slices, memoized selectors with `createSelector`, and thunks as a typed "API" layer make the store boundary explicit |
| Architecture | MVC: pure model in `models/`, store in `store/`, custom hooks as controllers, presentational views | Keeps permissions and validation out of components, as the guidelines require |
| Mutations | Pure `plan*` functions return entity patches; one `patchApplied` reducer applies them | Rules are testable without React, and optimistic rollback is a generic `invertPatch` |
| Error contract | Every store call resolves to `{ data } \| { error: { code, message, status } }` and never throws | One consistent error shape, as required, and one place to map errors to UI feedback |
| Failure simulation | Configurable latency and failure rate in the service layer | Without a backend, rollback, Retry, error and loading states could never be exercised |
| List view | Flat table: title, status, assignees, priority, due date | Matches the brief's spec. I tried grouping by status and reverted it |
| Scope | Two stretch goals (optimistic drag-and-drop with rollback, and search); subtasks one level deep | Prioritize a stable MVP, as the guidelines ask |


## Issues found and fixed

| Issue | Found via | Root cause | Fix |
| --- | --- | --- | --- |
| Type error in the Vitest config | `tsc -b` | Vitest 3 types don't support Vite 8's config | Upgraded to Vitest 5 |
| Extra re-renders | React-Redux dev warning | Parametric selectors returned a new object on every call | Memoized them with `createSelector` |
| Nested interactive elements in tree rows and cards | Playwright locator conflicts | The `role="button"` wrapper contained the action buttons | Separate drag activator (`setActivatorNodeRef`) with sibling action buttons |
| Danger menu items in the wrong color | Screenshot review | Two `text-*` utilities on one element; CSS order decided which won | Dedicated danger item variant |
| Form errors shown twice (inline and as a toast) | Screenshot review | The mutation runner toasted every error | `inlineErrors` opt-out for codes the form renders itself |
| Title flickered back while saving | oxlint `set-state-in-effect` and manual test | The draft was synced from props in `useEffect` | Adjust state during render; revert only when a save fails |
| False `CONFLICT` on rapid drawer edits | Version-check review and browser test | The second request carried a stale `updatedAt` | Edits are queued and read the current version when sent |
| Rollback hard to notice | Browser test at a 100% failure rate | The optimistic revert was silent | Shake on the rolled-back card and a "rolled back" toast |
| Sidebar ⋯ menu flickered | My manual review | Actions were `display: none` once hover left the row, but the menu is rendered outside the row | Keep the actions visible while a menu is open (`has-[[data-open]]:flex`) |
| Toast text not vertically centered | My manual review | `items-start` with elements of different heights | One 28px header row; title-only toasts are centered |
| Inline "Add task" stayed open with no feedback | My manual review | The composer was built for adding many tasks in a row, and success was silent | Close on success and show a "… created / Open" toast |
| No direct way back from a subtask | My manual review | The parent was reachable only from the breadcrumb | **← Back** button in the drawer header |
| Due-date field looked out of place | My manual review | `<input type="date">` renders a browser-native control that Tailwind can't style | Custom date picker: Headless UI Popover with a Tailwind month grid, quick picks and keyboard navigation (no new dependency) |
| Date picker lost focus and state when reopened quickly | Component test | The calendar only initialized on mount, and the panel stays mounted during its close animation | Reset state and refocus the selected day on every open |

## Rejected approaches

- **Toast library:** most ship their own CSS, which conflicts with the Tailwind-only rule. Replaced with a small toaster driven by the `ui` slice.
- **Callbacks in Redux state:** they aren't serializable. Retry and Undo handlers live in a controller-level registry instead.
- **Inline width for the progress bar:** it breaks the no-`style=` rule. Replaced with a segmented bar.
- **Re-parenting containers by drag:** too many edge cases for this scope. Reordering stays among siblings.
- **Raising the bundle-size warning limit:** vendor code was split into chunks instead.

## Verification

- `tsc -b`, `vite build` and `oxlint` are clean.
- 48 Vitest tests pass: permission unit tests, store tests and component tests.
- A clean `npm ci` install works.
- The main flows were checked in the browser, including the rollback paths with failure simulation at 100%.
