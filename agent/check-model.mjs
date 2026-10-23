// Read-only capability check: never log headers, credentials or provider error prose.
const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models?pageSize=1000', {
  headers: { 'x-goog-api-key': process.env.GEMINI_API_KEY }, signal: AbortSignal.timeout(30_000),
});
if (!response.ok) throw new Error(`Gemini model listing failed: HTTP ${response.status}`);
const payload = await response.json();
const names = (payload.models ?? []).filter(model => model.supportedGenerationMethods?.includes('generateContent'))
  .map(model => model.name).filter(name => /^models\/gemini-[a-z0-9.-]+$/.test(name));
console.log('Available generation models:', names.join(', '));
if (!names.includes(`models/${process.env.AGENT_MODEL}`)) throw new Error('Configured Gemini model is unavailable; choose GEMINI_MODEL from the list above');
