import { proposalSchema } from './policy.mjs';
import { requestWithRetry } from './request.mjs';

export async function propose({ instructions, context, feedback, model, apiKey, provider = 'openai' }) {
  if (provider === 'gemini') return proposeGemini({ instructions, context, feedback, model, apiKey });
  if (provider !== 'openai') throw new Error('Unsupported model provider');
  const response = await requestWithRetry('https://api.openai.com/v1/responses', {
    method: 'POST',
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

async function proposeGemini({ instructions, context, feedback, model, apiKey }) {
  if (!/^gemini-[a-z0-9.-]+$/.test(model)) throw new Error('Invalid Gemini model identifier');
  const response = await requestWithRetry(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: 'POST',
    headers: { 'x-goog-api-key': apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: instructions }] },
      contents: [{ role: 'user', parts: [{ text: JSON.stringify({ untrustedRepository: context, untrustedFeedback: feedback }) }] }],
      generationConfig: { maxOutputTokens: 10000, responseMimeType: 'application/json', responseJsonSchema: proposalSchema },
    }),
  });
  if (!response.ok) {
    // Only expose allowlisted machine-readable statuses, never server prose or request contents.
    const payload = await response.json().catch(() => null);
    const status = ['RESOURCE_EXHAUSTED', 'PERMISSION_DENIED', 'UNAUTHENTICATED', 'INVALID_ARGUMENT', 'NOT_FOUND', 'UNAVAILABLE'].includes(payload?.error?.status)
      ? payload.error.status : 'unknown';
    throw new Error(`Gemini request failed: HTTP ${response.status}; status ${status}`);
  }
  const payload = await response.json();
  const candidate = payload.candidates?.[0];
  if (candidate?.finishReason !== 'STOP') throw new Error('Gemini response was incomplete or blocked');
  const text = candidate.content?.parts?.filter(part => !part.thought && typeof part.text === 'string').map(part => part.text).join('');
  if (!text) throw new Error('Model returned no structured proposal');
  return { proposal: JSON.parse(text), usage: payload.usageMetadata, responseId: payload.responseId };
}
