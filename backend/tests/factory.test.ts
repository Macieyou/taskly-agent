import request from 'supertest';
import { afterEach, expect, it, vi } from 'vitest';
import { createApp } from '../src/factory.js';
import { createDatabase } from '../src/core/database.js';
import { record } from './fixture.js';

afterEach(() => vi.restoreAllMocks());
function setup() {
  const database = createDatabase('postgresql://test:test@localhost:5432/test');
  return { database, app: createApp(database) };
}
it('checks database readiness and does not expose Express headers', async () => {
  const { app, database } = setup();
  const probe = vi.spyOn(database.todo, 'findFirst').mockResolvedValue(null);
  const response = await request(app).get('/api/health');
  expect(response.status).toBe(200);
  expect(response.body).toEqual({ status: 'ok' });
  expect(response.headers['x-powered-by']).toBeUndefined();
  expect(probe).toHaveBeenCalledWith({ select: { id: true } });
});
it('sanitizes database failures and records the internal error', async () => {
  const { app, database } = setup();
  const failure = new Error('secret connection details');
  vi.spyOn(database.todo, 'findFirst').mockRejectedValue(failure);
  const log = vi.spyOn(console, 'error').mockImplementation(() => {});
  const response = await request(app).get('/api/health');
  expect(response.status).toBe(500);
  expect(response.body).toEqual({ detail: 'Internal Server Error' });
  expect(response.text).not.toContain('secret');
  expect(log).toHaveBeenCalledWith(failure);
});
it('returns a JSON 404 for unknown routes', async () => {
  const { app } = setup();
  expect((await request(app).get('/unknown')).body).toEqual({ detail: 'Not Found' });
  expect((await request(app).get('/unknown')).status).toBe(404);
});
it('rejects malformed JSON before persistence', async () => {
  const { app, database } = setup();
  const create = vi.spyOn(database.todo, 'create');
  const response = await request(app).post('/api/todos').set('Content-Type', 'application/json').send('{');
  expect(response.status).toBe(422);
  expect(response.body).toEqual({ detail: 'Invalid JSON.' });
  expect(create).not.toHaveBeenCalled();
});
it('rejects oversized JSON bodies', async () => {
  const { app } = setup();
  const response = await request(app).post('/api/todos').send({ title: 'x'.repeat(110000) });
  expect(response.status).toBe(413);
  expect(response.body).toEqual({ detail: 'Request body too large.' });
});
it('serves the OpenAPI specification', async () => {
  const { app } = setup();
  const response = await request(app).get('/openapi.json');
  expect(response.status).toBe(200);
  expect(response.body.paths).toHaveProperty('/api/todos');
});
it('routes a task through the actual repository and response mapper', async () => {
  const { app, database } = setup();
  vi.spyOn(database.todo, 'findUnique').mockResolvedValue(record);
  const response = await request(app).get('/api/todos/1');
  expect(response.status).toBe(200);
  expect(response.body).toMatchObject({ id: 1, due_date: '2026-10-15' });
});
