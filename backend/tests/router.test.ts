import express from 'express'
import request from 'supertest'
import { it, expect, vi } from 'vitest'
import { createTodosRouter } from '../src/features/todos/router.ts'
import { todo } from './fixture.ts'

function setup() {
  const repository = {
    list: vi.fn().mockResolvedValue([todo]),
    create: vi.fn().mockResolvedValue(todo),
    get: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  }
  const app = express()
  app.use(express.json())
  app.use('/api/todos', createTodosRouter(repository))
  return { app, repository }
}
it('lists tasks from the repository', async () => {
  const { app, repository } = setup()
  const response = await request(app).get('/api/todos')
  expect(response.status).toBe(200)
  expect(response.body).toEqual([todo])
  expect(repository.list).toHaveBeenCalledOnce()
})
it('creates tasks with trimmed input and defaults', async () => {
  const { app, repository } = setup()
  const response = await request(app)
    .post('/api/todos')
    .send({ title: '  Plan the sprint  ', priority: 'high' })
  expect(response.status).toBe(201)
  expect(response.body).toEqual(todo)
  expect(repository.create).toHaveBeenCalledWith({
    title: 'Plan the sprint',
    description: '',
    priority: 'high',
    due_date: null,
    completed: false,
  })
})
it.each([
  { title: '  ' },
  { title: 'x'.repeat(121) },
  { title: 'Task', priority: 'urgent' },
  { title: 'Task', due_date: '2026-02-30' },
])(
  'rejects invalid create input without calling the repository: %j',
  async (payload) => {
    const { app, repository } = setup()
    expect((await request(app).post('/api/todos').send(payload)).status).toBe(
      422,
    )
    expect(repository.create).not.toHaveBeenCalled()
  },
)

it.each(['0', '-1', 'abc', '1.5', '9007199254740992'])(
  'rejects invalid IDs: %s',
  async (id) => {
    const { app, repository } = setup()
    expect((await request(app).get(`/api/todos/${id}`)).status).toBe(422)
    expect(repository.get).not.toHaveBeenCalled()
  },
)
it('gets an existing task and returns 404 for a missing task', async () => {
  const { app, repository } = setup()
  repository.get.mockResolvedValueOnce(todo).mockResolvedValueOnce(null)
  expect((await request(app).get('/api/todos/1')).body).toEqual(todo)
  expect((await request(app).get('/api/todos/2')).status).toBe(404)
  expect(repository.get).toHaveBeenCalledWith(2)
})
it('updates only validated fields and returns the saved task', async () => {
  const { app, repository } = setup()
  repository.update.mockResolvedValue({ ...todo, completed: true })
  const response = await request(app)
    .patch('/api/todos/1')
    .send({ completed: true })
  expect(response.status).toBe(200)
  expect(response.body).toHaveProperty('completed', true)
  expect(repository.update).toHaveBeenCalledWith(1, { completed: true })
})
it('rejects invalid updates before persistence', async () => {
  const { app, repository } = setup()
  expect(
    (await request(app).patch('/api/todos/1').send({ title: '' })).status,
  ).toBe(422)
  expect(repository.update).not.toHaveBeenCalled()
})
it('returns 404 when updating a missing task', async () => {
  const { app, repository } = setup()
  repository.update.mockResolvedValue(null)
  expect(
    (await request(app).patch('/api/todos/1').send({ title: 'Changed' }))
      .status,
  ).toBe(404)
})
it('deletes a task with an empty response, then reports missing resources', async () => {
  const { app, repository } = setup()
  repository.delete.mockResolvedValueOnce(true).mockResolvedValueOnce(false)
  const deleted = await request(app).delete('/api/todos/1')
  expect(deleted.status).toBe(204)
  expect(deleted.text).toBe('')
  expect((await request(app).delete('/api/todos/1')).status).toBe(404)
})

it('returns the summary route before matching a task ID', async () => {
  const { app, repository } = setup()
  repository.list.mockResolvedValueOnce([
    todo,
    { ...todo, id: 2, completed: true },
  ])
  const response = await request(app).get('/api/todos/summary')
  expect(response.status).toBe(200)
  expect(response.body).toEqual({
    total: 2,
    active: 1,
    completed: 1,
    completionPercent: 50,
  })
  expect(repository.list).toHaveBeenCalledOnce()
  expect(repository.get).not.toHaveBeenCalled()
})
