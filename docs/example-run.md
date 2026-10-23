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
