import path from 'node:path';

export const limits = Object.freeze({ files: 6, fileBytes: 30_000, contextBytes: 140_000, attempts: 2 });
export const skills = ['pr-test-review', 'frontend-unit-tests', 'backend-unit-tests'];
export function safePath(value) {
  return typeof value === 'string' && /^[a-zA-Z0-9_./-]+$/.test(value)
    && !value.split('/').some((part) => !part || part === '.' || part === '..')
    && !path.posix.isAbsolute(value);
}
export function isSource(file) {
  return safePath(file) && /^(frontend|backend)\/src\/.*\.tsx?$/.test(file)
    && !/\.(test|spec|stories|d)\.tsx?$/.test(file)
    && !/\/(generated|test)\//.test(file);
}
export function isTest(file) {
  return safePath(file) && /^(frontend\/src\/.*\.test\.tsx?|backend\/tests\/.*\.test\.ts)$/.test(file);
}
export function validateProposal(value, allowedTests) {
  if (!value || !['edit', 'skip'].includes(value.decision) || typeof value.summary !== 'string'
    || value.summary.length > 4000 || !Array.isArray(value.skills)
    || !value.skills.every((skill) => skills.includes(skill)) || !Array.isArray(value.files)
    || value.files.length > limits.files) throw new Error('Invalid agent proposal schema');
  if (value.decision === 'skip' && value.files.length !== 0) throw new Error('Skip must not edit files');
  if (value.decision === 'edit' && value.files.length === 0) throw new Error('Edit requires tests');
  const seen = new Set();
  for (const file of value.files) {
    if (!isTest(file.path) || !allowedTests.has(file.path) || seen.has(file.path)) throw new Error('Disallowed or duplicate test path');
    seen.add(file.path);
    if (typeof file.content !== 'string' || !file.content.trim() || Buffer.byteLength(file.content) > limits.fileBytes)
      throw new Error('Invalid test content size');
    if (/\b(?:it|test|describe)\.(?:only|skip|todo)\s*\(|(?:istanbul|v8)\s+ignore|@ts-nocheck/.test(file.content))
      throw new Error('Focused, skipped or suppressed tests are not allowed');
  }
  return value;
}
export const proposalSchema = {
  type: 'object', additionalProperties: false, required: ['decision', 'summary', 'skills', 'files'],
  properties: {
    decision: { type: 'string', enum: ['edit', 'skip'] }, summary: { type: 'string' },
    skills: { type: 'array', items: { type: 'string', enum: skills } },
    files: { type: 'array', items: { type: 'object', additionalProperties: false,
      required: ['path', 'content'], properties: { path: { type: 'string' }, content: { type: 'string' } } } },
  },
};

// Repairs replace named files, retaining successful edits in the other package.
export function mergeRepair(previous, next) {
  if (!previous || next?.decision !== 'edit' || !Array.isArray(next.files)) return next;
  const files = new Map(previous.files.map(file => [file.path, file]));
  // Duplicate entries remain visible to the validator rather than being silently collapsed.
  const paths = next.files.map(file => file.path);
  if (new Set(paths).size !== paths.length) throw new Error('Duplicate repair test path');
  for (const file of next.files) files.set(file.path, file);
  return { ...next, files: [...files.values()], skills: [...new Set([...previous.skills, ...(next.skills ?? [])])] };
}
