import type { Store } from './database.ts';
import { dayKey, addDays } from '../shared/analytics.ts';

export function seed(store: Store): boolean {
  // Explicit seed only, idempotent; never inject demo records into an existing workspace.
  if (
    store.list('projects').length ||
    store.list('tasks').length ||
    store.list('expenses').length ||
    store.list('habits').length ||
    store.list('events').length ||
    store.list('notes').length ||
    store.list('workouts').length ||
    store.list('routines').length ||
    store.list('budgets').length
  )
    return false;
  const today = dayKey();
  const research = store.create(
    'projects',
    {
      name: 'VLA Visual Analytics',
      description: 'Explore how vision-language-action models see, reason, and act.',
      category: 'Research',
      color: 'violet',
      nextStep: 'Compare attention patterns across successful and failed rollouts.',
      dueDate: addDays(today, 14),
    },
    true,
  );
  const dev = store.create(
    'projects',
    {
      name: 'Personal command center',
      description: 'A quieter home for everything that matters.',
      category: 'Development',
      color: 'blue',
    },
    true,
  );
  const uni = store.create(
    'projects',
    {
      name: 'Fall semester',
      description: 'Coursework, reading, and research meetings.',
      category: 'University',
      color: 'amber',
    },
    true,
  );
  const task = store.create(
    'tasks',
    {
      title: 'Compare attention maps across rollouts',
      projectId: research.id,
      priority: 'High',
      dueDate: today,
      status: 'In progress',
      tags: ['analysis', 'VLA'],
    },
    true,
  );
  store.create(
    'tasks',
    {
      title: 'Prepare weekly research update',
      projectId: research.id,
      priority: 'High',
      dueDate: addDays(today, 1),
      milestone: true,
    },
    true,
  );
  store.create(
    'tasks',
    {
      title: 'Review robotics paper annotations',
      projectId: uni.id,
      priority: 'Medium',
      dueDate: today,
      tags: ['reading'],
    },
    true,
  );
  store.create(
    'tasks',
    {
      title: 'Refine experiment comparison layout',
      projectId: dev.id,
      priority: 'Medium',
      dueDate: addDays(today, 2),
    },
    true,
  );
  store.create(
    'tasks',
    { title: 'Organize experiment notes', projectId: research.id, status: 'Done', priority: 'Low' },
    true,
  );
  store.create(
    'tasks',
    { title: 'Plan next week’s training', priority: 'Low', dueDate: addDays(today, 3) },
    true,
  );
  const time = (hour: number) =>
    new Date(`${today}T${String(hour).padStart(2, '0')}:00:00`).toISOString();
  store.create(
    'events',
    {
      title: 'Deep work · VLA analysis',
      start: time(9),
      end: time(11),
      location: 'Home workspace',
      taskId: task.id,
    },
    true,
  );
  store.create(
    'events',
    { title: 'Research sync', start: time(14), end: time(15), location: 'Lab meeting room' },
    true,
  );
  store.create(
    'events',
    { title: 'Evening training', start: time(18), end: time(19), location: 'Gym' },
    true,
  );
  for (let i = 0; i < 10; i++)
    store.create(
      'expenses',
      {
        description: [
          'Lunch at campus',
          'Coffee & reading',
          'Metro commute',
          'Groceries',
          'Notebook',
        ][i % 5],
        amountMinor: [15000, 9500, 4000, 62000, 18000][i % 5],
        date: addDays(today, -i),
        category: ['Food', 'Drinks', 'Transportation', 'Food', 'Shopping'][i % 5],
      },
      true,
    );
  store.create('budgets', { category: 'Food', amountMinor: 800000, currency: 'TWD' }, true);
  store.create('budgets', { category: 'Drinks', amountMinor: 200000, currency: 'TWD' }, true);
  for (const name of ['Read for 20 minutes', 'Move your body', 'Plan tomorrow']) {
    const habit = store.create('habits', { name }, true);
    for (let i = 1; i <= 4; i++)
      store.create('checkins', { habitId: habit.id, date: addDays(today, -i) }, true);
  }
  for (const [name, exercises] of [
    ['Push', ['Bench press', 'Overhead press', 'Triceps pushdown']],
    ['Pull', ['Lat pulldown', 'Barbell row', 'Biceps curl']],
    ['Legs', ['Squat', 'Romanian deadlift', 'Calf raise']],
  ] as const)
    store.create(
      'routines',
      { name, exercises: exercises.map((name) => ({ name, sets: 3, reps: 10, weight: 0 })) },
      true,
    );
  store.create(
    'workouts',
    {
      name: 'Push day',
      date: addDays(today, -1),
      duration: 55,
      exercises: [
        { name: 'Bench press', sets: 3, reps: 8, weight: 50 },
        { name: 'Overhead press', sets: 3, reps: 10, weight: 25 },
      ],
    },
    true,
  );
  store.create(
    'notes',
    {
      title: 'Attention alignment experiment',
      projectId: research.id,
      kind: 'Experiment',
      status: 'Running',
      content:
        'DEMO: Compare patch attention for successful and failed grasp attempts. Next: annotate a small evaluation set. No test results or repository activity have been imported.',
    },
    true,
  );
  store.create(
    'notes',
    {
      title: 'Weekly research journal',
      projectId: research.id,
      kind: 'Progress report',
      content:
        'DEMO: Set up the qualitative review checklist. Open question: which attention layers best correlate with action selection?',
    },
    true,
  );
  return true;
}
