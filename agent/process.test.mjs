import { test } from 'node:test';
import assert from 'node:assert/strict';
import { command } from './process.mjs';

test('child processes do not inherit the model key or GitHub token', async () => {
  const previousGeminiKey = process.env.GEMINI_API_KEY;
  process.env.GEMINI_API_KEY = 'unit-test-gemini-key';
  const previousKey = process.env.OPENAI_API_KEY;
  const previousToken = process.env.GITHUB_TOKEN;
  process.env.OPENAI_API_KEY = 'unit-test-key';
  process.env.GITHUB_TOKEN = 'unit-test-token';
  try {
    const result = await command(process.execPath, ['-e', 'console.log(JSON.stringify({gemini:process.env.GEMINI_API_KEY,key:process.env.OPENAI_API_KEY,token:process.env.GITHUB_TOKEN}))']);
    assert.equal(result.code, 0);
    assert.deepEqual(JSON.parse(result.output), {});
  } finally {
    if (previousGeminiKey === undefined) delete process.env.GEMINI_API_KEY; else process.env.GEMINI_API_KEY = previousGeminiKey;
    if (previousKey === undefined) delete process.env.OPENAI_API_KEY; else process.env.OPENAI_API_KEY = previousKey;
    if (previousToken === undefined) delete process.env.GITHUB_TOKEN; else process.env.GITHUB_TOKEN = previousToken;
  }
});
test('enforces output limits and wall time', async () => {
  await assert.rejects(() => command(process.execPath, ['-e', 'console.log("x".repeat(10000))'], { maxBytes: 100 }), /output limit/);
  await assert.rejects(() => command(process.execPath, ['-e', 'setInterval(()=>{},1000)'], { timeout: 100 }), /timed out/);
});
test('arguments remain data instead of shell commands', async () => {
  const argument = 'hello; echo unsafe && $(echo injection)';
  const result = await command(process.execPath, ['-e', 'console.log(process.argv[1])', argument]);
  assert.equal(result.output.trim(), argument);
});
