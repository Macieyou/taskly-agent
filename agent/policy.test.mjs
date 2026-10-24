import { test } from 'node:test';
import assert from 'node:assert/strict';
import { safePath, isSource, validateProposal } from './policy.mjs';
import { requireSha } from './context.mjs';
import { passes, coverageImproved, uncoveredLocations } from './sandbox.mjs';

const file = 'backend/tests/config.test.ts';
const allowed = new Set([file]);
test('extracts uncovered source locations without including covered or external files', () => {
  const data = { s: { 0: 0, 1: 2 }, statementMap: { 0: { start: { line: 12 } }, 1: { start: { line: 20 } } },
    f: { 0: 0, 1: 0 }, fnMap: { 0: { loc: { start: { line: 12 } } }, 1: { loc: { start: { line: 30 } } } } };
  assert.deepEqual(uncoveredLocations({ '/tmp/app/src/Form.tsx': data, '/outside/file.ts': data }, 'frontend'), {
    'frontend/src/Form.tsx': [12, 30]
  });
});
test('coverage refinement detects newly covered branches even when rounded percentages match', () => {
  const baseline = Object.fromEntries(['frontend', 'backend'].map(side => [side, {
    coverage: Object.fromEntries(['lines', 'statements', 'branches', 'functions'].map(metric => [metric, { covered: 100, pct: 95 }]))
  }]));
  const result = structuredClone(baseline);
  assert.equal(coverageImproved(result, baseline), false);
  result.frontend.coverage.branches.covered += 1;
  assert.equal(coverageImproved(result, baseline), true);
  result.frontend.coverage.branches.covered -= 2;
  assert.equal(coverageImproved(result, baseline), false);
});
const proposal = (content = "it('rejects empty config', () => expect(resolve()).toEqual({}))") => ({
  decision: 'edit', summary: 'Validate empty configuration', skills: ['backend-unit-tests'], files: [{ path: file, content }],
});
test('blocks traversal, platform-specific paths and shell metacharacters', () => {
  for (const path of ['../x', '/x', 'a/../b', 'a//b', 'C:/x', 'a\\b', 'a;id', 'a/./b', 'a\nfoo']) assert.equal(safePath(path), false, path);
  assert.equal(safePath(file), true);
});
test('selects production changes but not tests, fixtures, stories or generated clients', () => {
  assert.equal(isSource('frontend/src/App.tsx'), true);
  for (const path of ['frontend/src/App.test.tsx', 'backend/src/generated/client.ts', 'frontend/src/test/setup.ts', 'frontend/src/a.stories.tsx', 'README.md']) assert.equal(isSource(path), false);
});
test('validates immutable revisions', () => {
  assert.equal(requireSha('a'.repeat(40)), 'a'.repeat(40));
  for (const ref of ['main', '--help', 'abc', undefined]) assert.throws(() => requireSha(ref));
});
test('accepts an allowlisted proposal and rejects unexpected write paths', () => {
  assert.equal(validateProposal(proposal(), allowed).decision, 'edit');
  const invalid = proposal(); invalid.files[0].path = 'backend/src/config.ts';
  assert.throws(() => validateProposal(invalid, allowed));
  assert.throws(() => validateProposal(proposal(), new Set()));
});
test('rejects duplicate paths, unknown skills, skipped tests and oversized output', () => {
  const duplicate = proposal(); duplicate.files.push(duplicate.files[0]);
  assert.throws(() => validateProposal(duplicate, allowed));
  assert.throws(() => validateProposal({ ...proposal(), skills: ['shell'] }, allowed));
  for (const content of ["it.only('x', () => {})", "test.skip('x', () => {})", '// @ts-nocheck', 'x'.repeat(30001), ''])
    assert.throws(() => validateProposal(proposal(content), allowed));
});
test('skip is explicit and cannot hide edits', () => {
  assert.throws(() => validateProposal({ ...proposal(), decision: 'skip' }, allowed));
  assert.equal(validateProposal({ ...proposal(), decision: 'skip', files: [] }, allowed).decision, 'skip');
});
test('verification rejects failures and coverage regressions in either package', () => {
  const coverage = Object.fromEntries(['lines', 'statements', 'branches', 'functions'].map((metric) => [metric, { pct: 80 }]));
  const baseline = { backend: { passed: true, coverage }, frontend: { passed: true, coverage } };
  assert.equal(passes(baseline, baseline), true);
  assert.equal(passes({ ...baseline, backend: { passed: false } }, baseline), false);
  assert.equal(passes({ ...baseline, frontend: { passed: true, coverage: { ...coverage, branches: { pct: 79 } } } }, baseline), false);
});

test('repair retains earlier files while replacing corrected content', async () => {
  const { mergeRepair } = await import('./policy.mjs');
  const previous = { decision: 'edit', skills: ['backend-unit-tests'], files: [{ path: 'backend/tests/summary.test.ts', content: 'backend' }, { path: 'frontend/src/a.test.ts', content: 'old' }] };
  const next = { decision: 'edit', skills: ['frontend-unit-tests'], files: [{ path: 'frontend/src/a.test.ts', content: 'fixed' }] };
  const merged = mergeRepair(previous, next);
  assert.deepEqual(merged.files.map(file => file.content), ['backend', 'fixed']);
  assert.deepEqual(merged.skills, ['backend-unit-tests', 'frontend-unit-tests']);
  assert.equal(previous.files[1].content, 'old');
  assert.throws(() => mergeRepair(previous, { ...next, files: [...next.files, ...next.files] }), /Duplicate/);
  assert.equal(mergeRepair(previous, { decision: 'skip' }).decision, 'skip');
});

test('ignores line-ending-only proposals but retains changed assertions and new files', async () => {
  const { changedTestFiles } = await import('./policy.mjs');
  const originals = new Map([['backend/tests/a.test.ts', 'expect(value).toBe(1);\r\n']]);
  assert.equal(changedTestFiles([{ path: 'backend/tests/a.test.ts', content: 'expect(value).toBe(1);' }], originals).length, 0);
  assert.equal(changedTestFiles([{ path: 'backend/tests/a.test.ts', content: 'expect(value).toBe(2);' }], originals).length, 1);
  assert.equal(changedTestFiles([{ path: 'backend/tests/new.test.ts', content: 'test' }], originals).length, 1);
});
