import { test } from 'node:test'
import assert from 'node:assert/strict'
import { validateTestIntegrity } from './test-integrity.mjs'
const original =
  "import { it, expect } from 'vitest'; it('contract', () => { expect(actual).toEqual({ valid: true }); });"
test('permits formatting changes and additive regression cases', () => {
  assert.doesNotThrow(() =>
    validateTestIntegrity(
      'x.test.ts',
      original.replaceAll(';', ';\n') +
        "it('edge',()=>expect(empty).toEqual([]));",
      original,
    ),
  )
})
test('rejects deleting or weakening an existing assertion or its setup', () => {
  for (const content of [
    original.replace('{ valid: true }', '{}'),
    original.replace('expect(actual).toEqual({ valid: true });', ''),
    original.replace("'contract'", "'changed'"),
  ]) {
    assert.throws(() => validateTestIntegrity('x.test.ts', content, original))
  }
})
test('rejects focused, conditional and skipped execution, any and assertion-free tests', () => {
  for (const content of [
    "test.skipIf(true)('x',()=>expect(1).toBe(1));",
    "describe.only('x',()=>expect(1).toBe(1));",
    'const x: any = 1; expect(x).toBe(1);',
    "it('empty',()=>{});",
    'it(',
  ]) {
    assert.throws(() => validateTestIntegrity('x.test.ts', content))
  }
})

test('rejects type-check bypasses but accepts const assertions and satisfies', () => {
  for (const content of [
    'const x = input as unknown as User; expect(x).toBeDefined();',
    'const x = <User>input; expect(x).toBeDefined();',
    'expect(input!.id).toBe(1);',
  ]) {
    assert.throws(() => validateTestIntegrity('x.test.ts', content))
  }
  for (const content of [
    "const x = { status: 'open' } as const; expect(x.status).toBe('open');",
    'const x = { id: 1 } satisfies User; expect(x.id).toBe(1);',
  ]) {
    assert.doesNotThrow(() => validateTestIntegrity('x.test.ts', content))
  }
})
