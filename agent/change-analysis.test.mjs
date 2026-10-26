import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseChanges, mapTests } from './change-analysis.mjs'

test('tracks deletions and both sides of renames', () => {
  assert.deepEqual(
    parseChanges(
      'D\0backend/src/old.ts\0R100\0frontend/src/a.ts\0frontend/src/b.ts\0',
    ),
    [
      {
        status: 'D',
        before: 'backend/src/old.ts',
        after: 'backend/src/old.ts',
      },
      { status: 'R', before: 'frontend/src/a.ts', after: 'frontend/src/b.ts' },
    ],
  )
  assert.throws(() => parseChanges('M\0../bad.ts\0'), /Unsafe/)
})
test('finds indirectly importing tests and permits JSX hook tests', () => {
  const files = new Map([
    ['frontend/src/useData.ts', 'export const x = 1'],
    ['frontend/src/index.ts', "export * from './useData'"],
    ['frontend/src/behavior.spec.tsx', "import { x } from './index'"],
  ])
  const result = mapTests(parseChanges('M\0frontend/src/useData.ts\0'), files)
  assert.ok(result.has('frontend/src/behavior.spec.tsx'))
  assert.ok(result.has('frontend/src/useData.test.tsx'))
})
test('deleted sources map to surviving tests without creating tests for missing modules', () => {
  const previous = new Map([
    ['backend/src/old.ts', ''],
    ['backend/src/service.ts', "import './old.js'"],
  ])
  const files = new Map([
    ['backend/src/service.ts', ''],
    ['backend/tests/service.spec.ts', "import '../src/service.js'"],
  ])
  const result = mapTests(
    parseChanges('D\0backend/src/old.ts\0'),
    files,
    previous,
  )
  // The old dependency edge remains relevant even if the consumer no longer imports it.
  assert.ok(result.has('backend/tests/service.spec.ts'))
  assert.ok(!result.has('backend/tests/old.test.ts'))
})
test('same basenames in different backend features get distinct test paths', () => {
  const files = new Map([
    ['backend/src/a/router.ts', ''],
    ['backend/src/b/router.ts', ''],
  ])
  const result = mapTests(
    parseChanges('M\0backend/src/a/router.ts\0M\0backend/src/b/router.ts\0'),
    files,
  )
  assert.deepEqual([...result].sort(), [
    'backend/tests/a/router.test.ts',
    'backend/tests/b/router.test.ts',
  ])
})
