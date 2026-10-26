import { command } from './process.mjs'

// Only prose and static documentation images qualify. Agent instructions,
// workflow files, dependencies and tests must still receive normal analysis.
export async function isDocumentationUpdate(event, head, cwd) {
  if (
    event?.action !== 'synchronize' ||
    !/^[a-f0-9]{40}$/.test(event.before ?? '') ||
    event.after !== head ||
    !/^[a-f0-9]{40}$/.test(head ?? '') ||
    event.before === head
  )
    return false
  const ancestor = await command(
    'git',
    ['merge-base', '--is-ancestor', event.before, head],
    { cwd },
  )
  if (ancestor.code !== 0) return false
  const diff = await command(
    'git',
    [
      'diff',
      '--no-ext-diff',
      '--no-renames',
      '--name-only',
      '-z',
      event.before,
      head,
      '--',
    ],
    { cwd },
  )
  if (diff.code !== 0) return false
  const paths = diff.output.split('\0').filter(Boolean)
  return (
    paths.length > 0 &&
    paths.every(
      (file) =>
        /^(README|SOLUTION)\.md$/.test(file) ||
        /^docs\/[\w./-]+\.(md|png|jpg|jpeg|webp)$/.test(file),
    )
  )
}
