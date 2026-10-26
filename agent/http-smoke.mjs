import assert from 'node:assert/strict'
const base = 'http://127.0.0.1:8080'
const request = (url, options = {}) =>
  fetch(base + url, { ...options, signal: AbortSignal.timeout(10000) })
const json = (body) => ({
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
})
assert.equal((await request('/')).status, 200)
assert.equal((await request('/api/health')).status, 200)
let id
try {
  const created = await request('/api/todos', {
    method: 'POST',
    ...json({ title: 'Container smoke test', priority: 'high' }),
  })
  assert.equal(created.status, 201)
  const todo = await created.json()
  id = todo.id
  assert.ok(Number.isSafeInteger(id))
  assert.equal(todo.title, 'Container smoke test')
  const updated = await request(`/api/todos/${id}`, {
    method: 'PATCH',
    ...json({ completed: true }),
  })
  assert.equal(updated.status, 200)
  assert.equal((await updated.json()).completed, true)
  const list = await (await request('/api/todos')).json()
  assert.ok(list.some((item) => item.id === id && item.completed))
  assert.equal(
    (await request('/api/todos', { method: 'POST', ...json({ title: ' ' }) }))
      .status,
    422,
  )
} finally {
  if (id !== undefined)
    assert.equal(
      (await request(`/api/todos/${id}`, { method: 'DELETE' })).status,
      204,
    )
}
assert.equal((await request(`/api/todos/${id}`)).status, 404)
console.log(
  'Production containers: HTML, health, PostgreSQL create/read/update/delete and validation passed.',
)
