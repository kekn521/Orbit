import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Store } from '../server/database.ts';
import { schemas } from '../shared/domain.ts';
import { snapshot } from '../shared/analytics.ts';
import { seed } from '../server/seed.ts';

test('records persist across reopening, updates are audited, unlinking preserves tasks', () => {
  const folder = mkdtempSync(join(tmpdir(), 'orbit-test-'));
  const file = join(folder, 'test.sqlite');
  let db = new Store(file);
  try {
    const p = db.create('projects', { name: 'Research' });
    const t = db.create('tasks', { title: 'Read paper', projectId: p.id });
    db.update('tasks', t.id, { title: 'Read two papers', projectId: p.id, status: 'Done' });
    db.close();
    db = new Store(file);
    assert.equal(db.get('tasks', t.id).title, 'Read two papers');
    assert.ok(db.get('tasks', t.id).completedAt);
    db.remove('projects', p.id);
    assert.equal(db.get('tasks', t.id).projectId, '');
    assert.equal(
      db.db.prepare('SELECT COUNT(*) AS n FROM audit_log WHERE record_id=?').get(t.id)?.n,
      3,
    );
  } finally {
    db.close();
    rmSync(folder, { recursive: true, force: true });
  }
});
test('dependency cycles, parent cycles and incomplete prerequisites are rejected', () => {
  const db = new Store(':memory:');
  try {
    const a = db.create('tasks', { title: 'A' });
    const b = db.create('tasks', { title: 'B', dependencyIds: [a.id] });
    assert.throws(() => db.update('tasks', a.id, { title: 'A', dependencyIds: [b.id] }), /cycle/);
    assert.throws(
      () => db.update('tasks', b.id, { title: 'B', dependencyIds: [a.id], status: 'Done' }),
      /dependencies/,
    );
    db.update('tasks', a.id, { title: 'A', parentId: b.id });
    assert.throws(() => db.update('tasks', b.id, { title: 'B', parentId: a.id }), /cycle/);
    assert.throws(() => db.create('tasks', { title: 'C', projectId: 'missing' }), /not found/);
  } finally {
    db.close();
  }
});
test('habit check-ins are unique, habit deletion removes check-ins', () => {
  const db = new Store(':memory:');
  try {
    const h = db.create('habits', { name: 'Walk' });
    db.create('checkins', { habitId: h.id, date: '2026-10-16' });
    assert.throws(() => db.create('checkins', { habitId: h.id, date: '2026-10-16' }), /Already/);
    db.remove('habits', h.id);
    assert.equal(db.list('checkins').length, 0);
  } finally {
    db.close();
  }
});
test('totals separate currencies and count this calendar week', () => {
  const db = new Store(':memory:');
  try {
    db.create('expenses', {
      description: 'Lunch',
      amountMinor: 15000,
      currency: 'TWD',
      category: 'Food',
      date: '2026-10-16',
    });
    db.create('expenses', {
      description: 'Subscription',
      amountMinor: 1000,
      currency: 'USD',
      category: 'Subscriptions',
      date: '2026-10-16',
    });
    assert.equal(snapshot(db.dashboard(), '2026-10-16', 'TWD').weekSpending, 15000);
    assert.throws(() =>
      db.create('expenses', {
        description: 'Bad',
        amountMinor: -1,
        category: 'Food',
        date: '2026-10-16',
      }),
    );
    assert.equal(db.list('expenses').length, 2);
  } finally {
    db.close();
  }
});
test('seed is explicit, labeled and idempotent; all entries satisfy schemas', () => {
  const db = new Store(':memory:');
  try {
    assert.equal(db.list('tasks').length, 0);
    assert.equal(seed(db), true);
    const count = db.list('tasks').length;
    assert.equal(seed(db), false);
    assert.equal(db.list('tasks').length, count);
    assert.ok(db.list('tasks').every((t) => t.demo));
    for (const [resource, items] of Object.entries(db.dashboard()))
      for (const item of items) {
        const {
          id: _id,
          createdAt: _created,
          updatedAt: _updated,
          demo: _demo,
          completedAt: _completed,
          ...data
        } = item;
        assert.ok(schemas[resource as keyof typeof schemas].safeParse(data).success, resource);
      }
  } finally {
    db.close();
  }
});
