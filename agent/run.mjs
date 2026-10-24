import { validateTestIntegrity } from './test-integrity.mjs';
import { mkdir, readFile, writeFile, mkdtemp, rm, chmod } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { collect, requireSha } from './context.mjs';
import { skills, limits, validateProposal, mergeRepair, changedTestFiles } from './policy.mjs';
import { buildSandbox, verify, passes } from './sandbox.mjs';
import { checked, command } from './process.mjs';
import { propose } from './model.mjs';

const output = path.resolve('agent-output');
await mkdir(output, { recursive: true });
// A failed rerun must never publish an artifact from an earlier successful run.
await rm(path.join(output, 'tests.patch'), { force: true });
const provider = process.env.AGENT_PROVIDER || 'gemini';
const apiKey = provider === 'gemini' ? process.env.GEMINI_API_KEY : process.env.OPENAI_API_KEY;
const report = { status: 'failed', head: process.env.PR_HEAD, base: process.env.PR_BASE,
  provider, model: process.env.AGENT_MODEL || (provider === 'gemini' ? 'gemini-3.1-flash-lite' : 'gpt-5.4-mini'), skillsLoaded: skills, attempts: [],
  summary: '', baseline: null, final: null };
let workspace; let image;
try {
  requireSha(report.head); requireSha(report.base);
  workspace = await mkdtemp(path.join(tmpdir(), 'taskly-agent-'));
  await chmod(workspace, 0o755);
  const { context, files, allowedTests } = await collect(report.base, report.head, workspace);
  report.changed = context.changed;
  if (!context.changed.length) {
    report.status = 'skipped'; report.summary = 'No changed production TypeScript files; no model call or test generation required.';
  } else {
    if (!apiKey) throw new Error('Model API key repository secret is missing');
    const instructions = [await readFile(new URL('./AGENT.md', import.meta.url), 'utf8'),
      ...await Promise.all(skills.map((skill) => readFile(new URL(`./skills/${skill}/SKILL.md`, import.meta.url), 'utf8')))].join('\n\n');
    image = `taskly-test-agent:${process.pid}`;
    await buildSandbox(workspace, image);
    report.baseline = await verify(workspace, image, output, 'baseline');
    if (!passes(report.baseline)) throw new Error('Baseline fails. Fix the PR before generating additional tests.');
    // A fresh local Git index is only used to produce a reviewable patch, never to push.
    await checked('git', ['init', '--quiet'], { cwd: workspace });
    await checked('git', ['add', 'frontend', 'backend'], { cwd: workspace });
    let feedback = null;
    for (let attempt = 1; attempt <= limits.attempts; attempt += 1) {
      console.log(`Agent attempt ${attempt}/${limits.attempts}`);
      const result = await propose({ instructions, context, feedback, model: report.model, apiKey, provider });
      const proposal = validateProposal(mergeRepair(feedback?.previousProposal, result.proposal), allowedTests);
      report.attempts.push({ number: attempt, decision: proposal.decision, summary: proposal.summary,
        skills: proposal.skills, files: proposal.files.map((file) => file.path), usage: result.usage, responseId: result.responseId });
      report.summary = proposal.summary;
      if (proposal.decision === 'skip') {
        // A failed repair is never reclassified as a successful skip.
        if (attempt > 1) throw new Error('Agent abandoned a failed proposal; manual review required');
        report.status = 'skipped'; break;
      }
      if (!changedTestFiles(proposal.files, files).length) {
        if (attempt > 1) throw new Error('Repair produced no effective test changes');
        report.status = 'skipped';
        report.summary = 'Existing tests were returned unchanged apart from line endings or trailing whitespace; no new tests or patch published.';
        break;
      }
      for (const file of changedTestFiles(proposal.files, files)) validateTestIntegrity(file.path, file.content, files.get(file.path));
      // Every attempt starts from the same PR snapshot, not from previous failed output.
      for (const file of allowedTests) {
        if (files.has(file)) await writeFile(path.join(workspace, file), files.get(file));
        else await rm(path.join(workspace, file), { force: true });
      }
      for (const file of proposal.files) {
        await mkdir(path.dirname(path.join(workspace, file.path)), { recursive: true });
        await writeFile(path.join(workspace, file.path), file.content);
        await checked('git', ['add', '--intent-to-add', '--', file.path], { cwd: workspace });
      }
      report.final = await verify(workspace, image, output, `attempt-${attempt}`);
      if (passes(report.final, report.baseline)) {
        const patch = await checked('git', ['diff', '--no-ext-diff', '--binary', '--', 'frontend', 'backend'], { cwd: workspace });
        if (!patch.trim()) throw new Error('Agent proposed no effective changes');
        await writeFile(path.join(output, 'tests.patch'), patch);
        report.status = 'verified'; break;
      }
      feedback = { previousProposal: proposal, validation: report.final,
        instruction: 'Repair failing tests or coverage regression. Keep all existing assertions; do not change source.' };
    }
    if (report.status === 'failed') report.summary = 'Generated tests failed validation after two attempts. No patch published.';
  }
} catch (error) {
  report.status = 'failed'; report.summary = error instanceof Error ? error.message : 'Unexpected agent failure';
  process.exitCode = 1;
} finally {
  if (report.status === 'failed') process.exitCode = 1;
  await writeFile(path.join(output, 'report.json'), JSON.stringify(report, null, 2));
  const summary = `## Taskly test agent: ${report.status}\n\nHead: \`${report.head}\`\n\n${report.summary}\n\nSee the attached report for decisions, skills, attempts and test output.\n`;
  await writeFile(path.join(output, 'summary.md'), summary);
  if (process.env.GITHUB_STEP_SUMMARY) await writeFile(process.env.GITHUB_STEP_SUMMARY, summary);
  if (image) await command('docker', ['image', 'rm', '--force', image]);
  // Workspace contains only a temporary clone assembled by this process.
  if (workspace) await rm(workspace, { recursive: true, force: true });
}
