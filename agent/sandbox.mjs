import { copyFile, mkdir, readFile, chmod, lstat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { command, checked } from './process.mjs';

export async function buildSandbox(workspace, tag) {
  await copyFile(fileURLToPath(new URL('./Sandbox.Dockerfile', import.meta.url)), path.join(workspace, 'Dockerfile'));
  await checked('docker', ['build', '--tag', tag, workspace], { timeout: 600_000 });
}
export async function verify(workspace, image, resultsDir, label) {
  const results = {};
  for (const side of ['backend', 'frontend']) {
    const out = path.join(resultsDir, `${label}-${side}`);
    await mkdir(out, { recursive: true }); await chmod(out, 0o777);
    const name = `taskly-${process.pid}-${label}-${side}`;
    const script = `set -eu
cp -R /source/${side} /tmp/app
cp -R /opt/${side}/node_modules /tmp/app/node_modules
cd /tmp/app
${side === 'backend' ? './node_modules/.bin/prisma generate\n' : ''}
./node_modules/.bin/tsc --noEmit
./node_modules/.bin/vitest run --coverage --coverage.reporter=text --coverage.reporter=json-summary --coverage.reporter=json
cp coverage/coverage-summary.json /results/coverage.json
cp coverage/coverage-final.json /results/coverage-details.json`;
    try {
      const result = await command('docker', ['run', '--name', name, '--rm', '--network=none', '--read-only',
        '--cap-drop=ALL', '--security-opt=no-new-privileges', '--pids-limit=128', '--memory=4g', '--cpus=2',
        '--tmpfs=/tmp:rw,exec,size=2147483648,mode=1777',
        '--mount', `type=bind,source=${workspace},target=/source,readonly`,
        '--mount', `type=bind,source=${out},target=/results`,
        '-e', 'DATABASE_URL=postgresql://test:test@localhost:5432/test', '-e', 'CI=true',
        image, 'sh', '-c', script], { timeout: 180_000 });
      let coverage = null;
      let coverageByFile = {};
      let uncovered = {};
      if (result.code === 0) {
        const reportPath = path.join(out, 'coverage.json');
        const stat = await lstat(reportPath);
        if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 500_000) throw new Error('Unsafe coverage report');
        const text = await readFile(reportPath, 'utf8');
        if (text.length > 500_000) throw new Error('Coverage report too large');
        const parsed = JSON.parse(text);
        coverage = parsed.total;
        coverageByFile = Object.fromEntries(Object.entries(parsed)
          .filter(([file]) => file.startsWith('/tmp/app/src/'))
          .map(([file, metrics]) => [`${side}/${file.slice('/tmp/app/'.length)}`, metrics]));
        const detailsPath = path.join(out, 'coverage-details.json');
        const detailsStat = await lstat(detailsPath);
        if (!detailsStat.isFile() || detailsStat.isSymbolicLink() || detailsStat.size > 2_000_000) throw new Error('Unsafe detailed coverage report');
        uncovered = uncoveredLocations(JSON.parse(await readFile(detailsPath, 'utf8')), side);
        for (const metric of ['lines', 'statements', 'branches', 'functions']) {
          if (!Number.isFinite(coverage?.[metric]?.pct)) throw new Error('Invalid coverage report');
        }
      }
      results[side] = { passed: result.code === 0, exitCode: result.code, coverage, coverageByFile, uncovered, log: result.output.slice(-14000) };
    } finally {
      // Also stop containers when the client times out, not just the docker client process.
      await command('docker', ['rm', '--force', name]);
    }
  }
  return results;
}

export function uncoveredLocations(details, side) {
  return Object.fromEntries(Object.entries(details)
    .filter(([file]) => file.startsWith('/tmp/app/src/'))
    .map(([file, data]) => {
      const lines = new Set();
      for (const [id, count] of Object.entries(data.s ?? {})) {
        if (count === 0) lines.add(data.statementMap?.[id]?.start?.line);
      }
      for (const [id, count] of Object.entries(data.f ?? {})) {
        if (count === 0) lines.add(data.fnMap?.[id]?.loc?.start?.line);
      }
      return [`${side}/${file.slice('/tmp/app/'.length)}`, [...lines].filter(line => Number.isSafeInteger(line) && line > 0).sort((a, b) => a - b)];
    }));
}
export function passes(results, baseline) {
  return ['backend', 'frontend'].every((side) => results[side].passed && (!baseline ||
    ['lines', 'statements', 'branches', 'functions'].every((metric) => results[side].coverage[metric].pct >= baseline[side].coverage[metric].pct)));
}

export function coverageImproved(results, baseline) {
  return ['backend', 'frontend'].some(side =>
    ['lines', 'statements', 'branches', 'functions'].some(metric =>
      results[side].coverage[metric].covered > baseline[side].coverage[metric].covered));
}
