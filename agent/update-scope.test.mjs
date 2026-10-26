import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { checked } from './process.mjs'
import { isDocumentationUpdate } from './update-scope.mjs'

test('documentation updates skip generation but code, instructions and rebases do not', async () => {
  const cwd = await mkdtemp(path.join(tmpdir(), 'taskly-update-test-'))
  const git = (...args) => checked('git', args, { cwd })
  const commit = async (file, content) => {
    await writeFile(path.join(cwd, file), content)
    await git('add', '--', file)
    await git(
      '-c',
      'user.name=Test',
      '-c',
      'user.email=test@example.invalid',
      'commit',
      '-qm',
      'fixture',
    )
    return (await git('rev-parse', 'HEAD')).trim()
  }
  const classify = (before, after, extra = {}) =>
    isDocumentationUpdate(
      { action: 'synchronize', before, after, ...extra },
      after,
      cwd,
    )
  try {
    await git('init', '--quiet')
    const base = await commit('app.ts', 'export const value = 1\n')
    const feature = await commit('app.ts', 'export const value = 2\n')
    const docs = await commit('README.md', '# Updated documentation\n')
    assert.equal(await classify(feature, docs), true)
    assert.equal(
      await classify(base, docs),
      false,
      'a mixed update must not skip',
    )
    assert.equal(await classify(feature, docs, { action: 'opened' }), false)
    assert.equal(await classify(feature, docs, { after: base }), false)
    assert.equal(await classify(docs, docs), false)
    assert.equal(await classify('0'.repeat(40), docs), false)
    assert.equal(await classify('--invalid', docs), false)
    assert.equal(
      await classify(docs, feature),
      false,
      'rewritten histories must be analyzed',
    )
    const instructions = await commit('AGENTS.md', '# New instructions\n')
    assert.equal(await classify(docs, instructions), false)
    await git('mv', 'README.md', 'app.test.ts')
    await git(
      '-c',
      'user.name=Test',
      '-c',
      'user.email=test@example.invalid',
      'commit',
      '-qm',
      'rename fixture',
    )
    const renamed = (await git('rev-parse', 'HEAD')).trim()
    assert.equal(
      await classify(instructions, renamed),
      false,
      'both sides of renames are checked',
    )
  } finally {
    await rm(cwd, { recursive: true, force: true })
  }
})
