import { test } from 'node:test'
import assert from 'node:assert/strict'
import { focusContext } from './focus.mjs'

test('focuses measured gaps, retains dependencies and direct tests, excludes unrelated suites', () => {
  const target = 'frontend/src/Form.tsx'
  const context = {
    changed: [target, 'frontend/src/Summary.tsx'],
    allowedTests: [],
    files: {
      [target]: "import { Input } from './Input'; export const Form = Input",
      'frontend/src/Input.tsx': 'export const Input = 1',
      'frontend/src/Form.test.tsx': "import { Form } from './Form'",
      'frontend/src/Summary.tsx': 'export const Summary = 1',
      'frontend/src/Summary.test.tsx': "import { Summary } from './Summary'",
      'frontend/package.json': '{}',
      'frontend/src/test/setup.ts': '',
    },
  }
  const metrics = (pct) => ({
    statements: { pct },
    functions: { pct },
    branches: { pct },
  })
  const baseline = {
    frontend: {
      coverageByFile: {
        [target]: metrics(80),
        'frontend/src/Summary.tsx': metrics(100),
      },
    },
    backend: {},
  }
  const result = focusContext(context, baseline)
  assert.deepEqual(result.focusTargets, [target])
  assert.deepEqual(result.changed, [target])
  assert.deepEqual(result.allChanged, context.changed)
  assert.ok(result.files['frontend/src/Input.tsx'])
  assert.ok(result.files['frontend/package.json'])
  assert.ok(result.allowedTests.includes('frontend/src/Form.test.tsx'))
  assert.ok(!result.allowedTests.includes('frontend/src/Summary.test.tsx'))
  assert.ok(!('frontend/src/Summary.tsx' in result.files))
  assert.ok('frontend/src/Summary.tsx' in context.files)
})

test('retains ordinary PR context when changed modules have no measured coverage gaps', () => {
  const context = { changed: [], files: {}, allowedTests: [] }
  assert.equal(focusContext(context, { frontend: {}, backend: {} }), context)
})
