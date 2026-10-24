# Taskly test agent

## Design

The custom Node.js controller in `agent/run.mjs` reads the immutable PR diff, loads `agent/AGENT.md` and three reusable skills from `agent/skills/`, asks Gemini for a structured test proposal, and verifies it. It can explicitly skip already-covered changes or repair a failed proposal once. The controller uses standard Node APIs and a pinned TypeScript parser for test-integrity checks, with no agent framework dependency: the state transitions and trust boundaries remain easy to audit.

Skills are executable workflow inputs, not decorative documentation. `pr-test-review` guides test selection; `frontend-unit-tests` covers React, real query providers and MSW; `backend-unit-tests` covers Express, validation and Prisma IO. All three are supplied as trusted instructions, and each model decision records which it used. The agent only writes allowlisted test files. Product code, dependency manifests and coverage configuration are immutable during generation.

## Run

Use Node **24.22.1 LTS** (`.nvmrc`). On Windows with NVM: `nvm install 24.22.1`, then `nvm use 24.22.1`. Run `npm ci`, `npm run typecheck`, `npm run test:coverage`, and `npm run build` in each of `backend/` and `frontend/`. No PostgreSQL is required for unit tests. Install trusted controller dependencies with `npm ci --prefix agent --ignore-scripts`, then run controller tests with `node --test agent/*.test.mjs`. Frontend formatting is enforced by CI.

Set the repository Actions secret `GEMINI_API_KEY` on GitHub. The optional repository variable `GEMINI_MODEL` defaults to `gemini-3.1-flash-lite`. Use a project on the free tier if no charges are desired; quotas and model availability apply. The workflow never enables billing or falls back to another provider. Open or update a non-draft PR from a branch in this repository. Changes to production TypeScript trigger generation automatically; documentation-only changes skip without a model call. Fork/Dependabot PRs run ordinary CI but do not receive model credentials.

The Actions run provides `report.json`, execution logs, per-package before/after coverage and, only after verification, `tests.patch`. A single bot comment on the PR links to the run and is updated on subsequent runs. Review the patch and apply it on its recorded head with `git apply --check tests.patch`, then `git apply tests.patch`. No automatic commit, push or merge is performed.

For local reproduction on a Linux Docker host: set `PR_BASE` and `PR_HEAD` to full fetched commit SHAs and `GEMINI_API_KEY` in the process environment, then run `node agent/run.mjs`. This runs tests inside Docker, not on the host. The complete controller is exercised by the GitHub example run; deterministic controller tests need neither Docker nor an API key.

## Security and reliability

- `pull_request_target` checks out the **base SHA**, never executes PR tooling on the host, and only admits same-repository PRs by trusted contributors. PR files are read as Git blobs, rejecting symlinks/submodules and nonportable paths. Source, model output and logs remain untrusted data.
- Dependency installation runs in Docker with lifecycle scripts disabled. Test execution uses an unprivileged container with no network, no credentials, no Docker socket, read-only root/source, dropped capabilities, memory/CPU/PID limits and a wall timeout. A failed or timed-out container is forcibly removed. Prisma generation and test/typecheck commands are fixed by trusted tooling.
- The model key is available only to the controller step. The separate comment job has PR-write permission but never runs project code. No job has repository-write permission. Actions are pinned to commit SHAs.
- Both complete suites and type checks must pass before generation and after each proposal. Coverage may not regress in any of the four metrics. Existing coverage exclusions are preserved, not expanded. No patch is published on failure. Existing test statements must remain structurally unchanged and in order; new cases may be appended. TypeScript AST checks reject removed/rewritten assertions, conditional skips, assertion-free files and `any`. This does not prove the quality of newly added assertions or prevent every semantic interaction. Policy/model tests cover path escapes, unexpected writes, suppressed tests, malformed responses, API errors and coverage regression.
- At most 15 changed production files, 200 KB context, six test edits, two model calls, 10,000 output tokens per call and a 25-minute workflow timeout. Oversized work fails clearly instead of silently truncating context. Concurrent obsolete runs are canceled; publication checks the live PR head SHA.

## Evidence and scope

Original upstream commit: `22be6e3bcf54fd012104fe233ef6652dd01941ff`.

| Package | Original tests | Original statement coverage | Added coverage areas |
|---|---:|---:|---|
| Backend | 48 | 30.23% | Config precedence/escaping, real app HTTP handling, invalid IDs, update/delete, readiness failures |
| Frontend | 18 | 46.42% | HTTP errors/cancellation, real query/mutation cache behavior, sorting/date boundaries, filter hooks |

Baseline improvements are reviewed tests authored during implementation. The example PR separately demonstrates tests generated by the custom agent; its run report records the actual decisions, skills and outcomes. See [the verified example run](docs/example-run.md): Gemini generated tests for both packages in run [39933368909](https://github.com/Macieyou/taskly-agent/actions/runs/39933368909); all 74 backend and 54 frontend tests passed, with backend statement coverage increasing from 74.62% to 76.86%. The original report/patch are archived, and subsequent review changes are identified separately.

## Assumptions, limitations and production work

Taskly is a small public demonstration repository. Sending its bounded public source context to Gemini is intentional. Free-tier provider terms may allow data use for product improvement. An optional OpenAI adapter is retained for local use with `AGENT_PROVIDER=openai`, `AGENT_MODEL` and `OPENAI_API_KEY`; GitHub only injects the Gemini key. Existing repository members are trusted to propose changes; fork automation requires a separately designed approval policy. Containers reduce risk but are not a strong multi-tenant sandbox against kernel vulnerabilities. Dependency installation needs registry network access, though it has no API/GitHub secrets and disables install hooks.

Passing tests and nondecreasing coverage do not prove good assertions. Model-produced patches always require human review; a malicious test could falsify its own assertions or coverage output. Existing broad mocks in upstream tests are retained; new tests exercise real application layers. Database unit tests mock Prisma IO and do not establish PostgreSQL integration correctness. UI coverage retains upstream design-system exclusions.

For production: use disposable VM/microVM workers and an allowlisted dependency proxy, extend structural test preservation with mutation testing and semantic review, maintain an adversarial agent evaluation set, add real PostgreSQL integration tests and browser accessibility/performance checks, track cost/latency and enforce a monetary budget, and use an approved GitHub App for optional test commits with explicit review. Keep model/runtime/image updates scheduled and verified. Security patches are applied here without unrelated major framework migrations; Prisma release candidates are intentionally excluded.

Change analysis includes deletions and renames, tracks relative imports through consumers and barrels, maps existing .test/.spec files and avoids backend basename collisions. Removed modules are not assigned new test files. Dynamic aliases and arbitrary runtime dependency injection still require human review; unsupported or oversized context fails explicitly.
