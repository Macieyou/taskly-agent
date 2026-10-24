# Verified example: task progress summary

[Feature PR #12](https://github.com/Macieyou/taskly-agent/pull/12) adds a task progress panel and a `GET /api/todos/summary` endpoint. The PR intentionally began without direct tests of the new summary function/component, allowing the custom agent to demonstrate its behavior.

## Reproducible evidence

- [Successful automatic run 39933368909](https://github.com/Macieyou/taskly-agent/actions/runs/39933368909), 23 October 2026.
- Evaluated head: `d9ff6dcd4287dc8091508f73f3f98b697dc9c3e7`.
- Model: `gemini-3.1-flash-lite`; one proposal, no repair needed in this run.
- Decision: add backend calculation tests and a frontend progress component test.
- Loaded skills: `pr-test-review`, `frontend-unit-tests`, `backend-unit-tests`. The model reported using the two package testing skills.
- [PR report comment](https://github.com/Macieyou/taskly-agent/pull/12#issuecomment-6361153505) is updated by later runs; the archived evidence below preserves this exact result.
- [Unmodified controller report](evidence/run-39933368909.json) and [unmodified generated patch](evidence/run-39933368909.patch) remain available after the 14-day Actions artifact expires.

| Package | Baseline tests | Generated-result tests | Statement coverage before | After |
|---|---:|---:|---:|---:|
| Backend | 73 | 74 | 74.62% | 76.86% |
| Frontend | 53 | 54 | 95.13% | 95.13% |

Both complete suites and TypeScript checks passed in isolated network-disabled containers. None of the four coverage metrics regressed. The frontend's existing integration test already exercised the component; the generated focused test added assertions without increasing aggregate coverage.

## Review and application

Commit `63312b9` applies the generated patch unchanged. A separate review commit replaces partial fixture casts and `any` with complete typed fixtures, removes a redundant module mock, expands empty/all/mixed/rounding cases, checks input immutability and accessible progress, and covers HTTP summary routing. These review improvements are implementation work, not falsely attributed to the autonomous run.

Earlier runs are retained in Actions history: provider unavailability/timeouts and a model-endpoint 404 prevented generation; later proposals failed import/theme/query checks. No patch was published from those failures. The failures informed reusable import/UI guidance and a tested controller fix that retains earlier file proposals during targeted repairs. A green run proves executable tests, not exhaustive test quality; review is deliberately part of the workflow.

## Autonomous frontend coverage improvement, 24 October

[Run 40091084538](https://github.com/Macieyou/taskly-agent/actions/runs/40091084538) evaluated head `6fc1d5bf6b0e2004c497d33d2aff714e9adb9b42` with Gemini 3.1 Flash Lite. All three skills were loaded; the model selected `frontend-unit-tests`. The controller selected TodoForm from measured gaps and supplied its dependencies, direct tests and exact uncovered source lines.

The first proposal repeated an existing test. The controller detected that no new assertions were added and supplied refinement feedback. The second proposal added real description/date input interactions and asserted the values passed to the submit callback. Both complete suites and type checks passed: 79 backend tests and 61 frontend tests. No production source, coverage denominator or exclusion changed during generation.

| Frontend metric | Before | After |
|---|---:|---:|
| Statements | 179/188 (95.21%) | 181/188 (96.27%) |
| Lines | 166/171 (97.07%) | 168/171 (98.24%) |
| Functions | 86/92 (93.47%) | 88/92 (95.65%) |
| Branches | 125/141 (88.65%) | 126/141 (89.36%) |

Backend statement coverage remained 77.61%, with no metric regression. TodoForm statement/function/line coverage reached 100%; its branch coverage remains 72.72%, so this is not a claim of exhaustive testing.

[Unmodified report](evidence/run-40091084538.json) and [unmodified patch](evidence/run-40091084538.patch) preserve the result after artifact expiry. Commit `9bcf78f` applies this patch unchanged; subsequent formatting is recorded separately. Two earlier verified focus tests were selectively applied in `03adc1b`, then formatted in `14d3a27`; those tests did not increase aggregate coverage and are not credited with this gain.
