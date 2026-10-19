import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer, request as httpRequest } from 'node:http';
import { Store } from '../server/database.ts';
import { apiHandler } from '../server/http.ts';

test('HTTP CRUD, local boundary, confirmation, CSV and deterministic assistant', async () => {
  const store = new Store(':memory:');
  const server = createServer(apiHandler(store));
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  const base = `http://127.0.0.1:${address.port}/api/`;
  const request = (
    path: string,
    method = 'GET',
    body?: unknown,
    headers?: Record<string, string>,
  ) =>
    fetch(base + path, {
      method,
      headers: { 'Content-Type': 'application/json', ...headers },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  try {
    assert.equal((await request('dashboard')).status, 200);
    assert.equal(
      (await request('dashboard', 'GET', undefined, { Origin: 'https://evil.example' })).status,
      403,
    );
    const hostileHostStatus = await new Promise<number | undefined>((resolve, reject) => {
      const req = httpRequest(base + 'dashboard', { headers: { Host: 'evil.example' } }, (res) => {
        res.resume();
        resolve(res.statusCode);
      });
      req.on('error', reject);
      req.end();
    });
    assert.equal(hostileHostStatus, 403);
    const create = await request('tasks', 'POST', { title: 'Write test', priority: 'High' });
    assert.equal(create.status, 201);
    const task = (await create.json()) as { id: string };
    const update = await request('tasks/' + task.id, 'PUT', {
      title: 'Write test',
      status: 'Done',
    });
    assert.equal(update.status, 200);
    assert.ok(((await update.json()) as { completedAt: string }).completedAt);
    assert.equal((await request('tasks/' + task.id, 'DELETE', {})).status, 400);
    assert.equal((await request('tasks/' + task.id, 'DELETE', { confirm: true })).status, 200);
    assert.equal((await request('tasks/' + task.id)).status, 404);
    assert.equal(
      (
        await request('events', 'POST', {
          title: 'Bad event',
          start: '2026-10-16T10:00:00Z',
          end: '2026-10-16T09:00:00Z',
        })
      ).status,
      400,
    );
    await request('expenses', 'POST', {
      description: '=HYPERLINK("x")',
      amountMinor: 15000,
      currency: 'TWD',
      date: '2026-10-16',
      category: 'Food',
    });
    const csv = await request('export');
    assert.match(await csv.text(), /'=HYPERLINK/);
    const reply = await request('assistant', 'POST', { prompt: 'What should I focus on today?' });
    const result = (await reply.json()) as { generated: boolean; provider: string; text: string };
    assert.equal(result.generated, false);
    assert.equal(result.provider, 'Local rules');
    assert.match(result.text, /calendar commitment/);
    const backup = (await (await request('backup')).json()) as { records: { expenses: unknown[] } };
    assert.equal(backup.records.expenses.length, 1);
    assert.equal((await request('missing')).status, 404);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    store.close();
  }
});
