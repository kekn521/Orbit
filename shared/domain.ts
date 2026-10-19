import { z } from 'zod';

export const categories = [
  'Research',
  'Development',
  'University',
  'Personal',
  'Miscellaneous',
] as const;
export const expenseCategories = [
  'Food',
  'Drinks',
  'Transportation',
  'Shopping',
  'Subscriptions',
  'Entertainment',
  'Other',
] as const;
export const priorities = ['Urgent', 'High', 'Medium', 'Low'] as const;
export const statuses = ['Backlog', 'In progress', 'Done'] as const;
const text = z.string().trim().min(1).max(200);
const notes = z.string().max(12000).default('');
export const dateKey = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((v) => {
    const d = new Date(v + 'T12:00:00Z');
    return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
  }, 'Enter a real calendar date');
const optionalDate = z.union([dateKey, z.literal('')]).default('');
const link = z
  .union([
    z
      .string()
      .url()
      .refine((v) => /^https?:\/\//.test(v), 'Use an http(s) URL'),
    z.literal(''),
  ])
  .default('');
const id = z.string().max(100).default('');
const timestamp = z
  .string()
  .datetime()
  .transform((value) => new Date(value).toISOString());
export const exerciseSchema = z
  .object({
    name: text,
    sets: z.number().int().min(1).max(100),
    reps: z.number().int().min(1).max(1000),
    weight: z.number().min(0).max(2000),
  })
  .strict();
export const schemas = {
  projects: z
    .object({
      name: text,
      description: notes,
      category: z.enum(categories).default('Personal'),
      color: z.enum(['violet', 'blue', 'green', 'amber', 'rose']).default('violet'),
      repository: link,
      blocker: notes,
      nextStep: notes,
      dueDate: optionalDate,
    })
    .strict(),
  tasks: z
    .object({
      title: text,
      description: notes,
      status: z.enum(statuses).default('Backlog'),
      priority: z.enum(priorities).default('Medium'),
      dueDate: optionalDate,
      projectId: id,
      parentId: id,
      dependencyIds: z.array(z.string().min(1).max(100)).max(50).default([]),
      tags: z.array(z.string().trim().min(1).max(40)).max(12).default([]),
      milestone: z.boolean().default(false),
    })
    .strict(),
  events: z
    .object({
      title: text,
      start: timestamp,
      end: timestamp,
      location: z.string().max(300).default(''),
      description: notes,
      taskId: id,
    })
    .strict()
    .refine((v) => Date.parse(v.end) > Date.parse(v.start), {
      message: 'End must be after start',
      path: ['end'],
    }),
  expenses: z
    .object({
      description: text,
      amountMinor: z.number().int().positive().max(100000000000),
      currency: z.enum(['TWD', 'USD', 'EUR', 'JPY']).default('TWD'),
      date: dateKey,
      category: z.enum(expenseCategories),
      recurring: z.enum(['None', 'Monthly', 'Yearly']).default('None'),
    })
    .strict(),
  workouts: z
    .object({
      name: text,
      date: dateKey,
      duration: z.number().int().min(1).max(1440),
      routineId: id,
      exercises: z.array(exerciseSchema).min(1).max(50),
      notes,
    })
    .strict(),
  routines: z.object({ name: text, exercises: z.array(exerciseSchema).min(1).max(50) }).strict(),
  habits: z
    .object({
      name: text,
      description: z.string().max(500).default(''),
      color: z.enum(['violet', 'blue', 'green', 'amber', 'rose']).default('green'),
    })
    .strict(),
  checkins: z.object({ habitId: z.string().min(1).max(100), date: dateKey }).strict(),
  notes: z
    .object({
      title: text,
      content: notes,
      projectId: id,
      url: link,
      kind: z.enum(['Note', 'Paper', 'Experiment', 'Progress report']).default('Note'),
      status: z.enum(['Idea', 'Running', 'Complete', 'Blocked']).default('Idea'),
    })
    .strict(),
  budgets: z
    .object({
      category: z.enum(expenseCategories),
      amountMinor: z.number().int().positive().max(100000000000),
      currency: z.enum(['TWD', 'USD', 'EUR', 'JPY']).default('TWD'),
    })
    .strict(),
  settings: z
    .object({
      name: text,
      theme: z.enum(['dark', 'light']),
      currency: z.enum(['TWD', 'USD', 'EUR', 'JPY']),
    })
    .strict(),
};
export type Resource = keyof typeof schemas;
export type Values<K extends Resource> = z.infer<(typeof schemas)[K]>;
export type Entry<K extends Resource> = Values<K> & {
  id: string;
  createdAt: string;
  updatedAt: string;
  demo: boolean;
  completedAt?: string;
};
export type DashboardData = { [K in Resource]: Entry<K>[] };
export const resources = Object.keys(schemas) as Resource[];
export type AnyEntry = Entry<Resource>;
export function isResource(value: string): value is Resource {
  return Object.hasOwn(schemas, value);
}
