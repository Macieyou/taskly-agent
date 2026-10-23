import { proposalSchema } from './policy.mjs';

export async function propose({ instructions, context, feedback, model, apiKey }) {
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST', signal: AbortSignal.timeout(180_000),
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, store: false, max_output_tokens: 10000,
      instructions, input: JSON.stringify({ untrustedRepository: context, untrustedFeedback: feedback }),
      text: { format: { type: 'json_schema', name: 'test_proposal', strict: true, schema: proposalSchema } } }),
  });
  if (!response.ok) {
    // Do not print raw server messages that may echo secrets or input.
    throw new Error(`OpenAI request failed: HTTP ${response.status}; request ID ${response.headers.get('x-request-id') ?? 'unavailable'}`);
  }
  const payload = await response.json();
  if (payload.status !== 'completed') throw new Error(`OpenAI response was ${payload.status ?? 'invalid'}`);
  const text = payload.output?.flatMap((item) => item.content ?? []).filter((item) => item.type === 'output_text').map((item) => item.text).join('');
  if (!text) throw new Error('Model refused or returned no structured proposal');
  return { proposal: JSON.parse(text), usage: payload.usage, responseId: payload.id };
}
