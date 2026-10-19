import { DatabaseSync } from 'node:sqlite';
import { readFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { randomUUID } from 'node:crypto';
import { schemas, resources } from '../shared/domain.ts';
import type { Resource, Entry, DashboardData, Values } from '../shared/domain.ts';

export class AppError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}
type Row = {
  id: string;
  resource: Resource;
  body: string;
  created_at: string;
  updated_at: string;
  demo: number;
};
export class Store {
  db: DatabaseSync;
  constructor(path: string) {
    if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
    this.db = new DatabaseSync(path);
    this.db.exec('PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;');
    this.db.exec(readFileSync(new URL('./migrations/001-initial.sql', import.meta.url), 'utf8'));
    if (!this.list('settings').length)
      this.create('settings', { name: 'My workspace', theme: 'dark', currency: 'TWD' });
  }
  close() {
    this.db.close();
  }
  transaction<T>(fn: () => T): T {
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const result = fn();
      this.db.exec('COMMIT');
      return result;
    } catch (error) {
      this.db.exec('ROLLBACK');
      throw error;
    }
  }
  decode<K extends Resource>(row: Row): Entry<K> {
    return {
      ...JSON.parse(row.body),
      id: row.id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      demo: Boolean(row.demo),
    };
  }
  list<K extends Resource>(resource: K): Entry<K>[] {
    return (
      this.db
        .prepare('SELECT * FROM records WHERE resource=? ORDER BY created_at DESC, id')
        .all(resource) as Row[]
    ).map((row) => this.decode<K>(row));
  }
  get<K extends Resource>(resource: K, id: string): Entry<K> {
    const row = this.db
      .prepare('SELECT * FROM records WHERE resource=? AND id=?')
      .get(resource, id) as Row | undefined;
    if (!row) throw new AppError('Record not found', 404);
    return this.decode<K>(row);
  }
  dashboard(): DashboardData {
    return Object.fromEntries(resources.map((r) => [r, this.list(r)])) as DashboardData;
  }
  validate<K extends Resource>(resource: K, input: unknown, recordId = ''): Values<K> {
    const data = schemas[resource].parse(input) as Values<K>;
    const value = data as Record<string, unknown>;
    for (const [field, target] of [
      ['projectId', 'projects'],
      ['taskId', 'tasks'],
      ['habitId', 'habits'],
      ['routineId', 'routines'],
    ] as const) {
      if (value[field]) this.get(target, String(value[field]));
    }
    if (resource === 'tasks') {
      const task = data as Values<'tasks'>;
      const tasks = this.list('tasks');
      const dependencies = [...new Set(task.dependencyIds)];
      for (const dep of [...dependencies, ...(task.parentId ? [task.parentId] : [])]) {
        if (dep === recordId) throw new AppError('A task cannot reference itself');
        this.get('tasks', dep);
      }
      const graph = new Map(tasks.map((t) => [t.id, t.dependencyIds]));
      graph.set(recordId, dependencies);
      const visited = new Set<string>();
      const visit = (current: string, path = new Set<string>()) => {
        if (path.has(current)) throw new AppError('Task dependencies cannot form a cycle');
        if (visited.has(current)) return;
        const next = new Set(path).add(current);
        for (const dep of graph.get(current) ?? []) visit(dep, next);
        visited.add(current);
      };
      visit(recordId);
      let parent = task.parentId;
      const seen = new Set([recordId]);
      while (parent) {
        if (seen.has(parent)) throw new AppError('Subtasks cannot form a cycle');
        seen.add(parent);
        parent = tasks.find((t) => t.id === parent)?.parentId ?? '';
      }
      if (
        task.status === 'Done' &&
        dependencies.some((dep) => tasks.find((t) => t.id === dep)?.status !== 'Done')
      )
        throw new AppError('Complete dependencies before completing this task');
      const current = tasks.find((t) => t.id === recordId);
      if (
        current?.status === 'Done' &&
        task.status !== 'Done' &&
        tasks.some((t) => t.status === 'Done' && t.dependencyIds.includes(recordId))
      )
        throw new AppError('Reopen dependent tasks first');
    }
    if (resource === 'checkins') {
      const v = data as Values<'checkins'>;
      if (
        this.list('checkins').some(
          (c) => c.id !== recordId && c.habitId === v.habitId && c.date === v.date,
        )
      )
        throw new AppError('Already checked in for this day', 409);
    }
    if (resource === 'budgets') {
      const v = data as Values<'budgets'>;
      if (
        this.list('budgets').some(
          (b) => b.id !== recordId && b.category === v.category && b.currency === v.currency,
        )
      )
        throw new AppError('A budget already exists for this category and currency', 409);
    }
    return data;
  }
  audit(resource: Resource, id: string, action: string, before: unknown, after: unknown) {
    this.db
      .prepare(
        'INSERT INTO audit_log(resource,record_id,action,before_json,after_json,occurred_at) VALUES (?,?,?,?,?,?)',
      )
      .run(
        resource,
        id,
        action,
        before ? JSON.stringify(before) : null,
        after ? JSON.stringify(after) : null,
        new Date().toISOString(),
      );
  }
  create<K extends Resource>(resource: K, input: unknown, demo = false): Entry<K> {
    return this.transaction(() => {
      if (resource === 'settings' && this.list('settings').length)
        throw new AppError('Settings already exist', 409);
      const id = randomUUID();
      const data = this.validate(resource, input, id);
      const now = new Date().toISOString();
      const body = {
        ...data,
        ...(resource === 'tasks' && (data as Values<'tasks'>).status === 'Done'
          ? { completedAt: now }
          : {}),
      };
      this.db
        .prepare(
          'INSERT INTO records(id,resource,body,created_at,updated_at,demo) VALUES (?,?,?,?,?,?)',
        )
        .run(id, resource, JSON.stringify(body), now, now, Number(demo));
      const result = this.get(resource, id);
      this.audit(resource, id, 'create', null, result);
      return result;
    });
  }
  update<K extends Resource>(resource: K, id: string, input: unknown): Entry<K> {
    return this.transaction(() => {
      const before = this.get(resource, id);
      const data = this.validate(resource, input, id);
      const now = new Date().toISOString();
      const body = {
        ...data,
        ...(resource === 'tasks' && (data as Values<'tasks'>).status === 'Done'
          ? { completedAt: before.completedAt || now }
          : {}),
      };
      this.db
        .prepare('UPDATE records SET body=?, updated_at=? WHERE id=?')
        .run(JSON.stringify(body), now, id);
      const after = this.get(resource, id);
      this.audit(resource, id, 'update', before, after);
      return after;
    });
  }
  remove(resource: Resource, id: string) {
    if (resource === 'settings') throw new AppError('Settings cannot be deleted');
    this.transaction(() => {
      const before = this.get(resource, id);
      for (const r of resources)
        for (const item of this.list(r)) {
          const body = { ...item } as Record<string, unknown>;
          let changed = false;
          for (const [target, key] of [
            ['projects', 'projectId'],
            ['tasks', 'taskId'],
            ['tasks', 'parentId'],
            ['routines', 'routineId'],
          ] as const) {
            if (resource === target && body[key] === id) {
              body[key] = '';
              changed = true;
            }
          }
          if (
            r === 'tasks' &&
            resource === 'tasks' &&
            (body.dependencyIds as string[]).includes(id)
          ) {
            body.dependencyIds = (body.dependencyIds as string[]).filter((d) => d !== id);
            changed = true;
          }
          if (r === 'checkins' && resource === 'habits' && body.habitId === id) {
            this.db.prepare('DELETE FROM records WHERE id=?').run(item.id);
            this.audit(r, item.id, 'delete', item, null);
            continue;
          }
          if (changed) {
            const {
              id: _id,
              createdAt: _created,
              updatedAt: _updated,
              demo: _demo,
              ...clean
            } = body;
            this.db
              .prepare('UPDATE records SET body=?, updated_at=? WHERE id=?')
              .run(JSON.stringify(clean), new Date().toISOString(), item.id);
            this.audit(r, item.id, 'unlink', item, clean);
          }
        }
      this.db.prepare('DELETE FROM records WHERE id=?').run(id);
      this.audit(resource, id, 'delete', before, null);
    });
  }
}
