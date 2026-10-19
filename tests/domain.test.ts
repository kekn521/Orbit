import { test } from 'node:test';
import assert from 'node:assert/strict';
import { schemas } from '../shared/domain.ts';
import { addDays, csvCell, streak, weekDays, eventOnDay } from '../shared/analytics.ts';

test('invalid and reversed dates are rejected', () => {
  assert.equal(
    schemas.expenses.safeParse({
      description: 'Lunch',
      amountMinor: 100,
      category: 'Food',
      date: '2026-02-30',
    }).success,
    false,
  );
  assert.equal(
    schemas.events.safeParse({
      title: 'Meeting',
      start: '2026-10-16T12:00:00Z',
      end: '2026-10-16T11:00:00Z',
    }).success,
    false,
  );
});
test('money must be positive integer minor units and unknown fields are rejected', () => {
  for (const amountMinor of [-100, 0, 1.5, Infinity])
    assert.equal(
      schemas.expenses.safeParse({
        description: 'Lunch',
        amountMinor,
        category: 'Food',
        date: '2026-10-16',
      }).success,
      false,
    );
  assert.equal(schemas.tasks.safeParse({ title: 'Task', admin: true }).success, false);
});
test('calendar arithmetic crosses month boundaries and weeks start Monday', () => {
  assert.equal(addDays('2026-03-01', -1), '2026-02-28');
  assert.equal(weekDays('2026-10-18')[0], '2026-10-12');
});
test('streak tolerates today not checked and ignores duplicate entries', () => {
  assert.equal(streak(['2026-10-14', '2026-10-15', '2026-10-15'], '2026-10-16'), 2);
  assert.equal(streak(['2026-10-14'], '2026-10-16'), 0);
});
test('CSV escapes formulas, quotes and newlines', () => {
  assert.equal(csvCell('=SUM(A1)'), '"\'=SUM(A1)"');
  assert.equal(csvCell('a"b\nc'), '"a""b\nc"');
});
test('event timestamps compare instants rather than string formatting', () => {
  assert.equal(
    schemas.events.safeParse({
      title: 'Zero duration',
      start: '2026-10-16T10:00:00.000Z',
      end: '2026-10-16T10:00:00Z',
    }).success,
    false,
  );
  const parsed = schemas.events.parse({
    title: 'Meeting',
    start: '2026-10-16T10:00:00Z',
    end: '2026-10-16T11:00:00Z',
  });
  assert.equal(parsed.start, '2026-10-16T10:00:00.000Z');
});
test('events ending at midnight are excluded from the following day', () => {
  const event = {
    start: new Date('2026-10-16T23:00:00').toISOString(),
    end: new Date('2026-10-17T00:00:00').toISOString(),
  };
  assert.equal(eventOnDay(event, '2026-10-16'), true);
  assert.equal(eventOnDay(event, '2026-10-17'), false);
});
