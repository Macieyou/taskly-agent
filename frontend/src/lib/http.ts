export async function request(
  path: string,
  init?: RequestInit,
): Promise<unknown> {
  let response: Response
  try {
    response = await fetch(`/api${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...init?.headers },
    })
  } catch (error) {
    if (init?.signal?.aborted) throw error
    throw new Error('Cannot connect to the server. Please try again.', {
      cause: error,
    })
  }
  if (!response.ok) {
    const body: unknown = await response.json().catch(() => null)
    if (response.status === 422)
      throw new Error(
        'Check the task details: title up to 120 characters, description up to 2000 characters, and a valid due date.',
      )
    throw new Error(
      typeof body === 'object' &&
        body !== null &&
        'detail' in body &&
        typeof body.detail === 'string'
        ? body.detail
        : 'The operation failed. Please try again.',
    )
  }
  if (response.status === 204) return undefined
  const body: unknown = await response.json()
  return body
}
