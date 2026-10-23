import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resolveDatabaseUrl } from '../src/core/config.js';

const names = ['DATABASE_URL', 'POSTGRES_USER', 'POSTGRES_PASSWORD', 'POSTGRES_HOST', 'DB_PORT', 'POSTGRES_DB'];
beforeEach(() => { for (const name of names) vi.stubEnv(name, undefined); });
afterEach(() => vi.unstubAllEnvs());

describe('database URL resolution', () => {
  it('prioritizes an explicit URL and normalizes the legacy driver prefix', () => {
    vi.stubEnv('DATABASE_URL', 'postgresql://environment/db');
    expect(resolveDatabaseUrl('postgresql+psycopg://explicit/db')).toBe('postgresql://explicit/db');
  });
  it('uses the configured URL when no override is supplied', () => {
    vi.stubEnv('DATABASE_URL', 'postgresql://environment/db');
    expect(resolveDatabaseUrl()).toBe('postgresql://environment/db');
  });
  it.each(names.slice(1))('identifies a missing component: %s', (missing) => {
    for (const name of names.slice(1)) vi.stubEnv(name, 'value');
    vi.stubEnv(missing, undefined);
    expect(() => resolveDatabaseUrl()).toThrow(`Missing environment variable: ${missing}`);
  });
  it('escapes credentials and database names without changing the host', () => {
    vi.stubEnv('POSTGRES_USER', 'user@team');
    vi.stubEnv('POSTGRES_PASSWORD', 'p@ss:/word');
    vi.stubEnv('POSTGRES_HOST', 'localhost');
    vi.stubEnv('DB_PORT', '5432');
    vi.stubEnv('POSTGRES_DB', 'task database');
    const url = new URL(resolveDatabaseUrl());
    expect(decodeURIComponent(url.username)).toBe('user@team');
    expect(decodeURIComponent(url.password)).toBe('p@ss:/word');
    expect(url.hostname).toBe('localhost');
    expect(url.port).toBe('5432');
    expect(decodeURIComponent(url.pathname)).toBe('/task database');
  });
});
