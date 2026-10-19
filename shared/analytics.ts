import type { DashboardData, Entry } from './domain.ts';

export function dayKey(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate(),
  ).padStart(2, '0')}`;
}
export function addDays(key: string, count: number): string {
  const d = new Date(key + 'T12:00:00');
  d.setDate(d.getDate() + count);
  return dayKey(d);
}
export function weekDays(today = dayKey()): string[] {
  const day = new Date(today + 'T12:00:00').getDay();
  const monday = addDays(today, -(day === 0 ? 6 : day - 1));
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}
export function money(minor: number, currency = 'TWD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: currency === 'JPY' ? 0 : 2,
  }).format(minor / 100);
}
export function conflicts(events: Entry<'events'>[]): [string, string][] {
  const result: [string, string][] = [];
  for (let i = 0; i < events.length; i++)
    for (let j = i + 1; j < events.length; j++) {
      if (
        Date.parse(events[i].start) < Date.parse(events[j].end) &&
        Date.parse(events[j].start) < Date.parse(events[i].end)
      )
        result.push([events[i].id, events[j].id]);
    }
  return result;
}
export function eventOnDay(event: { start: string; end: string }, day: string): boolean {
  return (
    Date.parse(event.start) < new Date(addDays(day, 1) + 'T00:00:00').getTime() &&
    Date.parse(event.end) > new Date(day + 'T00:00:00').getTime()
  );
}
export function streak(dates: string[], today = dayKey()): number {
  const set = new Set(dates);
  let cursor = set.has(today) ? today : addDays(today, -1);
  let count = 0;
  while (set.has(cursor)) {
    count++;
    cursor = addDays(cursor, -1);
  }
  return count;
}
export function projectProgress(data: DashboardData, id: string): number {
  const tasks = data.tasks.filter((t) => t.projectId === id);
  return tasks.length
    ? Math.round((tasks.filter((t) => t.status === 'Done').length / tasks.length) * 100)
    : 0;
}
export function snapshot(data: DashboardData, today = dayKey(), currency = 'TWD') {
  const week = weekDays(today);
  const open = data.tasks.filter((t) => t.status !== 'Done');
  const ranked = [...open].sort(
    (a, b) =>
      ['Urgent', 'High', 'Medium', 'Low'].indexOf(a.priority) -
        ['Urgent', 'High', 'Medium', 'Low'].indexOf(b.priority) ||
      (a.dueDate || '9999').localeCompare(b.dueDate || '9999'),
  );
  return {
    open,
    ranked,
    overdue: open.filter((t) => t.dueDate && t.dueDate < today),
    completed: data.tasks.filter(
      (t) => t.completedAt && week.includes(dayKey(new Date(t.completedAt))),
    ).length,
    weekSpending: data.expenses
      .filter((e) => e.currency === currency && week.includes(e.date))
      .reduce((sum, e) => sum + e.amountMinor, 0),
    events: data.events
      .filter((e) => eventOnDay(e, today))
      .sort((a, b) => a.start.localeCompare(b.start)),
    habitsDone: data.habits.filter((h) =>
      data.checkins.some((c) => c.habitId === h.id && c.date === today),
    ).length,
  };
}
export function briefing(data: DashboardData, today = dayKey()): string {
  const s = snapshot(data, today);
  const clashes = conflicts(s.events);
  return `You have ${s.events.length} calendar commitment${
    s.events.length === 1 ? '' : 's'
  } today and ${s.open.length} open tasks. ${
    s.overdue.length
      ? `${s.overdue.length} overdue task${
          s.overdue.length === 1 ? ' needs' : 's need'
        } attention. `
      : ''
  }${
    s.ranked[0]
      ? `Start with “${s.ranked[0].title}”${
          s.ranked[0].dueDate ? ` (due ${s.ranked[0].dueDate})` : ''
        }. `
      : 'Your task list is clear. '
  }${
    clashes.length
      ? `${clashes.length} calendar overlap${clashes.length === 1 ? '' : 's'} to resolve. `
      : ''
  }${
    s.events.length
      ? 'Look for an open gap between your commitments for a focus block.'
      : 'Your calendar is open: consider reserving a 50-minute focus block.'
  } ${s.habitsDone}/${data.habits.length} habits checked in today.`;
}
export function csvCell(value: string | number): string {
  let str = String(value);
  if (/^[\s]*[=+@-]/.test(str)) str = "'" + str;
  return '"' + str.replaceAll('"', '""') + '"';
}
