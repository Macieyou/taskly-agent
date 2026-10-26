export async function request(
  path: string,
  init?: RequestInit,
): Promise<unknown> {
  const headers = new Headers(init?.headers)
  if (!headers.has('Content-Type'))
    headers.set('Content-Type', 'application/json')
  let response: Response
  try {
    response = await fetch(`/api${path}`, {
      ...init,
      headers,
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
  try {
    const body: unknown = await response.json()
    return body
  } catch (error) {
    if (init?.signal?.aborted) throw error
    throw new Error(
      'The server returned an invalid response. Please try again.',
      {
        cause: error,
      },
    )
  }
}
