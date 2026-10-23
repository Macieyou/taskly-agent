// Verify a committed snapshot in the production sandbox without calling a model.
import { mkdtemp, rm, chmod } from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { collect } from './context.mjs';
import { buildSandbox, verify, passes } from './sandbox.mjs';
import { checked, command } from './process.mjs';

const head = (await checked('git', ['rev-parse', 'HEAD'])).trim();
const workspace = await mkdtemp(path.join(tmpdir(), 'taskly-smoke-'));
const image = `taskly-smoke:${process.pid}`;
try {
  await chmod(workspace, 0o755);
  await collect(head, head, workspace);
  await buildSandbox(workspace, image);
  const results = await verify(workspace, image, path.resolve('agent-output/smoke'), 'baseline');
  console.log(JSON.stringify(results, null, 2));
  if (!passes(results)) process.exitCode = 1;
} finally {
  await command('docker', ['image', 'rm', '--force', image]);
  await rm(workspace, { recursive: true, force: true });
}
