import path from 'node:path'
import { isSource, isTest, safePath } from './policy.mjs'

export function parseChanges(output) {
  const fields = output.split('\0')
  const changes = []
  for (let index = 0; index < fields.length && fields[index];) {
    const status = fields[index++]
    const before = fields[index++]
    const after = /^[RC]/.test(status) ? fields[index++] : before
    if (!safePath(before) || !safePath(after))
      throw new Error('Unsafe changed path')
    if (isSource(before) || isSource(after))
      changes.push({ status: status[0], before, after })
  }
  return changes
}

export function importsOf(file, content, files) {
  const imports = []
  const expression =
    /(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s*)['"]([^'"]+)['"]/g
  for (const match of content.matchAll(expression)) {
    if (!match[1].startsWith('.')) continue
    const target = path.posix.normalize(
      path.posix.join(path.posix.dirname(file), match[1]),
    )
    const stem = target.replace(/\.(?:js|jsx|ts|tsx)$/, '')
    const candidates = [
      target,
      `${stem}.ts`,
      `${stem}.tsx`,
      `${target}/index.ts`,
      `${target}/index.tsx`,
    ]
    imports.push(...candidates.filter((candidate) => files.has(candidate)))
  }
  return imports
}

export function mapTests(changes, files, previousFiles = new Map()) {
  // Traverse relative imports through consumers/barrels, including deleted source from the base.
  const combined = new Map([...previousFiles, ...files])
  const affected = new Set(
    changes.flatMap((change) => [change.before, change.after]),
  )
  const imports = new Map(
    [...combined]
      .filter(([file]) => /\.[cm]?[jt]sx?$/.test(file))
      .map(([file, content]) => [
        file,
        [
          ...importsOf(file, content, combined),
          ...importsOf(file, previousFiles.get(file) ?? '', combined),
        ],
      ]),
  )
  let expanded
  do {
    expanded = false
    for (const [file, dependencies] of imports) {
      if (
        !affected.has(file) &&
        dependencies.some((dependency) => affected.has(dependency))
      ) {
        affected.add(file)
        expanded = true
      }
    }
  } while (expanded)
  const allowed = new Set(
    [...files.keys()].filter((file) => isTest(file) && affected.has(file)),
  )
  for (const change of changes) {
    if (change.status === 'D' || !isSource(change.after)) continue
    const source = change.after
    const stem = source.replace(/\.tsx?$/, '')
    if (source.startsWith('frontend/')) {
      allowed.add(`${stem}.test.${source.endsWith('.tsx') ? 'tsx' : 'ts'}`)
      // Hooks can need a JSX provider even when their source is plain TypeScript.
      allowed.add(`${stem}.test.tsx`)
      allowed.add(`${stem}.regression.test.tsx`)
    } else {
      const basename = path.posix.basename(stem)
      const collisions = [...files.keys()].filter(
        (file) =>
          isSource(file) &&
          file.startsWith('backend/') &&
          path.posix.basename(file).replace(/\.ts$/, '') === basename,
      )
      allowed.add(
        collisions.length > 1
          ? `${stem.replace('backend/src/', 'backend/tests/')}.test.ts`
          : `backend/tests/${basename}.test.ts`,
      )
    }
  }
  return allowed
}
