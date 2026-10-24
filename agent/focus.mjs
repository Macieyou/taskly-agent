import { importsOf, mapTests } from './change-analysis.mjs';
import { isTest } from './policy.mjs';

/** Bound generation context around measured gaps; verification still runs both full suites. */
export function focusContext(context, baseline) {
  const files = new Map(Object.entries(context.files));
  const targets = ['frontend', 'backend'].flatMap(side => {
    const candidates = Object.entries(baseline[side].coverageByFile ?? {})
      .filter(([file]) => context.changed.includes(file) && files.has(file))
      .map(([file, metrics]) => ({ file, gap: Math.max(...['statements', 'branches', 'functions'].map(metric => 100 - metrics[metric].pct)) }))
      .filter(candidate => candidate.gap > 0)
      .sort((a, b) => b.gap - a.gap || a.file.localeCompare(b.file));
    return candidates.length ? [candidates[0].file] : [];
  });
  if (!targets.length) return context;
  const targetSet = new Set(targets);
  const allowed = new Set();
  for (const target of targets) {
    for (const file of mapTests([{ status: 'M', before: target, after: target }], files)) {
      if (!files.has(file) || importsOf(file, files.get(file), files).some(dependency => targetSet.has(dependency))) allowed.add(file);
    }
  }
  const selected = new Set([...targets, ...allowed]);
  // Configuration and fixtures explain the execution environment; dependency
  // closure supplies real providers without unrelated application/test suites.
  for (const file of files.keys()) {
    if (/\/(?:package|tsconfig)\.json$/.test(file) || /\/src\/test\//.test(file) || /\/(?:vite|vitest)\.config\./.test(file)) selected.add(file);
  }
  const queue = [...selected];
  for (let index = 0; index < queue.length; index += 1) {
    const file = queue[index];
    for (const dependency of importsOf(file, files.get(file) ?? '', files)) {
      if (!selected.has(dependency) && !isTest(dependency)) {
        selected.add(dependency); queue.push(dependency);
      }
    }
  }
  return { ...context, allChanged: context.changed, changed: targets,
    changes: context.changes?.filter(change => targetSet.has(change.before) || targetSet.has(change.after)),
    focusTargets: targets, allowedTests: [...allowed],
    files: Object.fromEntries([...files].filter(([file]) => selected.has(file))) };
}
