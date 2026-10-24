import { setTimeout } from 'node:timers/promises';

/** Retry explicit service-unavailable responses only; never retry ambiguous timeouts or quota errors. */
export async function requestWithRetry(url, options, { sleep = setTimeout } = {}) {
  for (let attempt = 0; ; attempt += 1) {
    const response = await fetch(url, { ...options, signal: AbortSignal.timeout(180_000) });
    if (response.status !== 503 || attempt === 2) return response;
    await response.body?.cancel();
    await sleep(2_000 * 2 ** attempt);
  }
}
