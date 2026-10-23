import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { propose } from './model.mjs';

const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; });
const args = { instructions: 'Trusted agent policy', context: { diff: 'untrusted code' }, feedback: null, model: 'test-model', apiKey: 'test-only-not-a-secret' };
test('sends strict structured output and keeps repository text out of instructions', async () => {
  globalThis.fetch = async (url, options) => {
    assert.equal(url, 'https://api.openai.com/v1/responses');
    const body = JSON.parse(options.body);
    assert.equal(body.store, false);
    assert.equal(body.instructions, args.instructions);
    assert.equal(body.text.format.strict, true);
    assert.equal(body.max_output_tokens, 10000);
    assert.deepEqual(JSON.parse(body.input).untrustedRepository, args.context);
    return Response.json({ id: 'response-id', status: 'completed', usage: { total_tokens: 10 }, output: [{ content: [{ type: 'output_text', text: '{"decision":"skip"}' }] }] });
  };
  const result = await propose(args);
  assert.equal(result.proposal.decision, 'skip');
  assert.equal(result.usage.total_tokens, 10);
});
test('does not echo sensitive error response bodies', async () => {
  globalThis.fetch = async () => new Response('sensitive details', { status: 401 });
  await assert.rejects(() => propose(args), error => error.message.includes('HTTP 401') && !error.message.includes('sensitive'));
});
test('rejects incomplete, refused and malformed model output', async () => {
  for (const payload of [{ status: 'incomplete' }, { status: 'completed', output: [{ content: [{ type: 'refusal' }] }] },
    { status: 'completed', output: [{ content: [{ type: 'output_text', text: 'not json' }] }] }]) {
    globalThis.fetch = async () => Response.json(payload);
    await assert.rejects(() => propose(args));
  }
});
