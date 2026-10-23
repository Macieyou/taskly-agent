---
name: pr-test-review
description: Decide whether a Taskly PR needs tests and evaluate generated tests against baseline, isolation and coverage requirements.
---

Map changed production files to behavior and existing tests. Documentation-only, style-only and already-covered changes may be skipped with a concrete reason. Never claim verification for a skipped or failed run.

For changes that need tests, select the frontend/backend skill, keep existing tests, and add regression cases that would fail if the behavior regressed. Use test feedback to repair syntax, imports or mistaken fixtures once. Surface product defects instead of encoding them as correct behavior.

The controller runs type checks and both full suites before and after generation. Report the exact PR head SHA, model, loaded skills, decision, attempts, baseline/final coverage and validation results. Only a verified proposal becomes a downloadable patch; a human reviews and applies it. A passing suite is evidence, not proof of assertion quality.
