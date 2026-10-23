---
name: frontend-unit-tests
description: Create regression tests for Taskly React components, hooks and browser-side logic using Vitest, Testing Library and MSW.
---

Read the changed implementation, its consumers, closest tests and fixture. Identify user-visible behavior and boundary cases before choosing assertions.

- Co-locate `.test.ts` or `.test.tsx` under `frontend/src`. Use `.tsx` when the wrapper contains JSX.
- Pure functions: table-driven boundaries, immutable input, sorting ties and frozen time for calendar behavior.
- Hooks: `renderHook`, real providers, a fresh QueryClient with retries disabled, cache cleanup; await state with `waitFor`.
- Components: real design-system ThemeProvider, accessible role/label queries, `userEvent.setup()`. Test keyboard and error/retry behavior when relevant. Do not mock owned hooks or components.
- HTTP: MSW 3 `setupServer`, explicit handlers, `server.listen({ onUnhandledFrame: 'error' })`, reset between tests. For testing the HTTP transport itself, a stub of the external `fetch` boundary is acceptable, including cancellation and invalid response bodies.
- Use short Given/When/Then sections where they clarify a nontrivial test. Restore mocks, timers and globals after each case.
- Run the whole frontend suite and type check; do not assume passing the new test alone is sufficient.
