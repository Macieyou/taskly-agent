---
name: backend-unit-tests
description: Test Express request contracts, Zod validation, Prisma boundaries and Node lifecycle/configuration behavior without a live database.
---

Place tests in `backend/tests/*.test.ts`. Read the router, repository, schemas and existing fixture together. Keep unit tests independent of PostgreSQL and process-wide configuration.

- Validation: empty/trimmed input, length bounds, calendar validity, unknown fields and unsafe IDs; assert rejected input never reaches persistence.
- HTTP: Supertest with real Express routing; verify success, missing resources, malformed JSON, oversized bodies and sanitized failures. Avoid listening on fixed ports.
- Persistence: construct the real Prisma delegate and spy on its IO methods. Exercise the real repository and mappers. Cover missing records and rejected operations. Restore spies after each test.
- Config/time: stub only named environment variables; restore them. Freeze clocks for exact timestamps, never assert against wall-clock timing.
- Lifecycle: inject dependencies when needed for controllability; assert shutdown and cleanup behavior without exiting the test process. Do not mock application logic merely to increase coverage.
- Run backend type checks and the full suite. A database integration test is a separate layer, not a substitute for deterministic unit tests.
