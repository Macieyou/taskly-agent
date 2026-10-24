---
name: frontend-unit-tests
description: Create regression tests for Taskly React components, hooks and browser-side logic using Vitest, Testing Library and MSW.
---

Read the changed implementation, its consumers, closest tests and fixture. Identify user-visible behavior and boundary cases before choosing assertions.

- Co-locate `.test.ts` or `.test.tsx` under `frontend/src`. Use `.tsx` when the wrapper contains JSX.
- Frontend uses bundler resolution: follow existing extensionless imports. Do not apply backend NodeNext import conventions here. Test empty and non-empty component data, accessible names and displayed values, not only component existence.
- Pure functions: table-driven boundaries, immutable input, sorting ties and frozen time for calendar behavior.
- Hooks: `renderHook`, real providers, a fresh QueryClient with retries disabled, cache cleanup; await state with `waitFor`.
- Styled components MUST be rendered through the existing test render helper in `frontend/src/test` (read its exports) or an actual ThemeProvider with the existing theme. Missing theme context causes runtime failure.
- When present, import `renderWithTheme` from `frontend/src/test/renderWithTheme.tsx` using the correct relative path and use it instead of bare `render`. For query hooks use `AppProviders` with a fresh QueryClient instead. Never copy a nearby test's design-system mock: it removes real labels, error attributes and focus behavior.
- For Drawer tests, jsdom needs spies for the browser boundary: `vi.spyOn(HTMLDialogElement.prototype, 'showModal').mockImplementation(function () { this.open = true })` and the equivalent `close` setting `this.open = false`. Restore spies after each test. These shims do not prove native focus trapping; check that in the browser separately. A theme provider is still required.
- Repeated text: never use singular `getByText` for counts that can occur multiple times. Scope assertions to the labelled group with `within`, assert the matching term/value pair, or use an explicit `getAllByText` count. Verify the accessible progressbar value where applicable.
- Components: real design-system ThemeProvider, accessible role/label queries, `userEvent.setup()`. Test keyboard and error/retry behavior when relevant. Do not mock owned hooks or components.
- HTTP: MSW 3 `setupServer`, explicit handlers, `server.listen({ onUnhandledFrame: 'error' })`, reset between tests. For testing the HTTP transport itself, a stub of the external `fetch` boundary is acceptable, including cancellation and invalid response bodies.
- Use short Given/When/Then sections where they clarify a nontrivial test. Restore mocks, timers and globals after each case.
- Run the whole frontend suite and type check; do not assume passing the new test alone is sufficient.

If the original test file mocks owned components or hooks, preserve it and add a separate allowlisted .regression.test.tsx file using real providers. Cover changed behavior and previously uncovered validation/error paths. Prefer complete fixtures and specific accessible assertions.
