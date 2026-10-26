import { parseChanges, mapTests } from './change-analysis.mjs'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { checked } from './process.mjs'
import { isTest, safePath, limits } from './policy.mjs'

export function requireSha(value) {
  if (!/^[a-f0-9]{40}$/.test(value ?? ''))
    throw new Error('Expected a full immutable commit SHA')
  return value
}
export async function collect(base, head, destination) {
  requireSha(base)
  requireSha(head)
  const changes = parseChanges(
    await checked('git', [
      'diff',
      '--name-status',
      '-z',
      '--find-renames',
      `${base}...${head}`,
      '--',
      'frontend/src',
      'backend/src',
    ]),
  )
  const names = [
    ...new Set(changes.flatMap((change) => [change.before, change.after])),
  ]
  if (names.length > 15)
    throw new Error('PR too large: split into at most 15 changed source files')
  const entries = (
    await checked('git', ['ls-tree', '-r', head, '--', 'frontend', 'backend'])
  )
    .trim()
    .split('\n')
  const files = new Map()
  let total = 0
  for (const entry of entries) {
    if (!entry) continue
    const match = /^(\d+) blob ([a-f0-9]{40})\t(.+)$/.exec(entry)
    if (
      !match ||
      !['100644', '100755'].includes(match[1]) ||
      !safePath(match[3])
    )
      throw new Error(
        'Only regular files with portable paths are accepted (no symlinks/submodules)',
      )
    const file = match[3]
    if (
      file
        .split('/')
        .some((part) => ['.git', '.env', 'node_modules'].includes(part))
    )
      throw new Error('Forbidden workspace entry')
    const content = await checked('git', ['cat-file', 'blob', match[2]], {
      maxBytes: 2_000_000,
    })
    total += Buffer.byteLength(content)
    if (total > 5_000_000) throw new Error('Workspace exceeds 5 MB limit')
    files.set(file, content)
    await mkdir(path.dirname(path.join(destination, file)), { recursive: true })
    await writeFile(path.join(destination, file), content)
  }
  const ancestor = (await checked('git', ['merge-base', base, head])).trim()
  requireSha(ancestor)
  const previousFiles = new Map()
  const previousEntries = (
    await checked('git', [
      'ls-tree',
      '-r',
      ancestor,
      '--',
      'frontend',
      'backend',
    ])
  )
    .trim()
    .split('\n')
  for (const entry of previousEntries) {
    const match =
      /^(100644|100755) blob ([a-f0-9]{40})\t(.+\.(?:ts|tsx))$/.exec(entry)
    if (match && safePath(match[3]))
      previousFiles.set(
        match[3],
        await checked('git', ['cat-file', 'blob', match[2]], {
          maxBytes: 2_000_000,
        }),
      )
  }
  const allowedTests = mapTests(changes, files, previousFiles)
  const contextFiles = [...files].filter(([name]) => {
    if (
      !/\.(ts|tsx|json)$/.test(name) ||
      /package-lock|openapi|\.stories\.|\/\.storybook\//.test(name)
    )
      return false
    if (isTest(name)) return allowedTests.has(name)
    // Source and fixtures supply real imports; unrelated test suites are omitted.
    return true
  })
  // Changed files and nearby tests come first; do not silently truncate a review.
  contextFiles.sort(
    ([a], [b]) => Number(names.includes(b)) - Number(names.includes(a)),
  )
  const context = {
    changes,
    changed: names,
    allowedTests: [...allowedTests],
    files: Object.fromEntries(contextFiles),
    diff: await checked(
      'git',
      [
        'diff',
        '--no-ext-diff',
        '--unified=3',
        `${base}...${head}`,
        '--',
        ...names,
      ],
      { maxBytes: limits.contextBytes },
    ),
  }
  if (Buffer.byteLength(JSON.stringify(context)) > limits.contextBytes)
    throw new Error('Context too large; split the PR')
  return { context, files, allowedTests }
}
