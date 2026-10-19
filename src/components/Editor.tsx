import { useState } from 'react';
import { ZodError } from 'zod';
import { Plus, Trash2, LoaderCircle } from 'lucide-react';
import {
  categories,
  expenseCategories,
  priorities,
  statuses,
  schemas,
} from '../../shared/domain.ts';
import type { Resource, Entry, DashboardData, Values } from '../../shared/domain.ts';
import { dayKey } from '../../shared/analytics.ts';
import { api } from '../api.ts';
import { Modal } from './ui.tsx';

export type EditTarget = {
  resource: Resource;
  record?: Entry<Resource>;
  initial?: Record<string, unknown>;
};
const names: Record<Resource, string> = {
  tasks: 'task',
  projects: 'project',
  events: 'event',
  expenses: 'expense',
  workouts: 'workout',
  routines: 'routine',
  habits: 'habit',
  checkins: 'check-in',
  notes: 'research note',
  budgets: 'budget',
  settings: 'settings',
};
function localTime(value: string) {
  const d = new Date(value);
  return `${dayKey(d)}T${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(
    2,
    '0',
  )}`;
}
function defaults(resource: Resource): Record<string, unknown> {
  const base: Record<string, unknown> = {
    title: '',
    name: '',
    description: '',
    category: 'Personal',
    color: 'violet',
    priority: 'Medium',
    status: 'Backlog',
    dueDate: '',
    date: dayKey(),
    projectId: '',
    taskId: '',
    parentId: '',
    dependencyIds: [],
    tags: [],
    milestone: false,
    repository: '',
    blocker: '',
    nextStep: '',
    location: '',
    currency: 'TWD',
    recurring: 'None',
    amountMinor: 0,
    routineId: '',
    duration: 45,
    exercises: [{ name: '', sets: 3, reps: 10, weight: 0 }],
    notes: '',
    content: '',
    url: '',
    kind: 'Note',
  };
  if (resource === 'expenses' || resource === 'budgets') base.category = 'Food';
  if (resource === 'notes') base.status = 'Idea';
  if (resource === 'events') {
    const start = new Date();
    start.setMinutes(0, 0, 0);
    start.setHours(start.getHours() + 1);
    base.start = start.toISOString();
    base.end = new Date(start.getTime() + 3600000).toISOString();
  }
  return base;
}
export function Editor({
  target,
  data,
  close,
  saved,
}: {
  target: EditTarget;
  data: DashboardData;
  close: () => void;
  saved: () => Promise<void>;
}) {
  const { resource, record } = target;
  const [form, setForm] = useState<Record<string, unknown>>({
    ...defaults(resource),
    currency: data.settings[0].currency,
    ...record,
    ...target.initial,
  });
  const [tagInput, setTagInput] = useState((form.tags as string[]).join(', '));
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (key: string, value: unknown) => setForm((f) => ({ ...f, [key]: value }));
  const str = (key: string) => String(form[key] ?? '');
  function field(label: string, key: string, type = 'text', required = false) {
    return (
      <label className={type === 'textarea' ? 'field full' : 'field'} key={key}>
        <span>
          {label}
          {required && ' *'}
        </span>
        {type === 'textarea' ? (
          <textarea
            aria-label={label}
            value={str(key)}
            onChange={(e) => set(key, e.target.value)}
            rows={3}
          />
        ) : (
          <input
            aria-label={label}
            type={type}
            value={str(key)}
            required={required}
            maxLength={type === 'text' ? 200 : undefined}
            onChange={(e) => set(key, e.target.value)}
          />
        )}
      </label>
    );
  }
  function select(
    label: string,
    key: string,
    options: readonly string[] | { value: string; label: string }[],
    multiple = false,
  ) {
    return (
      <label className="field" key={key}>
        <span>{label}</span>
        <select
          aria-label={label}
          multiple={multiple}
          value={multiple ? (form[key] as string[]) : str(key)}
          onChange={(e) =>
            set(
              key,
              multiple ? Array.from(e.target.selectedOptions).map((o) => o.value) : e.target.value,
            )
          }
        >
          {options.map((o) =>
            typeof o === 'string' ? (
              <option key={o}>{o}</option>
            ) : (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ),
          )}
        </select>
        {multiple && <small>Hold Ctrl / ⌘ to select multiple.</small>}
      </label>
    );
  }
  const project = () =>
    select('Project', 'projectId', [
      { value: '', label: 'No project' },
      ...data.projects.map((p) => ({ value: p.id, label: p.name })),
    ]);
  const exercises = form.exercises as Values<'workouts'>['exercises'];
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      // Pick only schema-owned fields. Metadata and defaults for other forms never reach the API.
      const schema = schemas[resource];
      const shape = 'shape' in schema ? schema.shape : schema.innerType().shape;
      const payload = Object.fromEntries(Object.keys(shape).map((key) => [key, form[key]]));
      if ('duration' in payload) payload.duration = Number(payload.duration);
      if (resource === 'tasks')
        payload.tags = tagInput
          .split(',')
          .map((tag) => tag.trim())
          .filter(Boolean);
      const parsed = schema.parse(payload) as Values<typeof resource>;
      await api.save(resource, parsed, record?.id);
      await saved();
      close();
    } catch (err) {
      setError(
        err instanceof ZodError
          ? err.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('\n')
          : err instanceof Error
          ? err.message
          : 'Could not save this record',
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title={`${record ? 'Edit' : 'New'} ${names[resource]}`}
      close={() => {
        if (!busy) close();
      }}
      wide={resource === 'workouts' || resource === 'routines'}
    >
      <form onSubmit={submit} className="editor">
        <div className="form-grid">
          {['tasks', 'events', 'notes'].includes(resource)
            ? field('Title', 'title', 'text', true)
            : !['expenses', 'budgets'].includes(resource) && field('Name', 'name', 'text', true)}
          {resource === 'tasks' && (
            <>
              {project()}
              {select('Status', 'status', statuses)}
              {select('Priority', 'priority', priorities)}
              {field('Due date', 'dueDate', 'date')}
              {field('Description', 'description', 'textarea')}
              <label className="field">
                <span>Tags (comma separated)</span>
                <input value={tagInput} onChange={(e) => setTagInput(e.target.value)} />
              </label>
              {select('Parent task', 'parentId', [
                { value: '', label: 'None' },
                ...data.tasks
                  .filter((t) => t.id !== record?.id)
                  .map((t) => ({ value: t.id, label: t.title })),
              ])}
              {select(
                'Depends on',
                'dependencyIds',
                data.tasks
                  .filter((t) => t.id !== record?.id)
                  .map((t) => ({ value: t.id, label: t.title })),
                true,
              )}
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={Boolean(form.milestone)}
                  onChange={(e) => set('milestone', e.target.checked)}
                />
                Project milestone
              </label>
            </>
          )}
          {resource === 'projects' && (
            <>
              {select('Category', 'category', categories)}
              {field('Description', 'description', 'textarea')}
              {field('Deadline', 'dueDate', 'date')}
              {select('Color', 'color', ['violet', 'blue', 'green', 'amber', 'rose'])}
              {field('Repository link', 'repository', 'url')}
              {field('Current blocker', 'blocker', 'textarea')}
              {field('Next step', 'nextStep', 'textarea')}
            </>
          )}
          {resource === 'events' && (
            <>
              {['start', 'end'].map((key) => (
                <label key={key} className="field">
                  <span>{key === 'start' ? 'Starts' : 'Ends'} (local time) *</span>
                  <input
                    type="datetime-local"
                    required
                    value={str(key) ? localTime(str(key)) : ''}
                    onChange={(e) =>
                      set(key, e.target.value ? new Date(e.target.value).toISOString() : '')
                    }
                  />
                </label>
              ))}
              {field('Location', 'location')}
              {select('Linked task', 'taskId', [
                { value: '', label: 'None' },
                ...data.tasks.map((t) => ({ value: t.id, label: t.title })),
              ])}
              {field('Notes', 'description', 'textarea')}
            </>
          )}
          {(resource === 'expenses' || resource === 'budgets') && (
            <>
              {resource === 'expenses' && field('Description', 'description', 'text', true)}
              <label className="field">
                <span>{resource === 'budgets' ? 'Monthly budget' : 'Amount'} *</span>
                <input
                  type="number"
                  min="0.01"
                  max="1000000000"
                  step="0.01"
                  required
                  value={Number(form.amountMinor) ? Number(form.amountMinor) / 100 : ''}
                  onChange={(e) => set('amountMinor', Math.round(Number(e.target.value) * 100))}
                />
              </label>
              {select('Currency', 'currency', ['TWD', 'USD', 'EUR', 'JPY'])}
              {select('Category', 'category', expenseCategories)}
              {resource === 'expenses' && (
                <>
                  {field('Date', 'date', 'date', true)}
                  {select('Recurrence label', 'recurring', ['None', 'Monthly', 'Yearly'])}
                  <p className="form-help full">
                    Recurrence is a reminder label. It does not automatically create transactions.
                  </p>
                </>
              )}
            </>
          )}
          {resource === 'habits' && (
            <>
              {field('Why it matters', 'description', 'textarea')}
              {select('Color', 'color', ['violet', 'blue', 'green', 'amber', 'rose'])}
            </>
          )}
          {resource === 'notes' && (
            <>
              {project()}
              {select('Type', 'kind', ['Note', 'Paper', 'Experiment', 'Progress report'])}
              {select('Status', 'status', ['Idea', 'Running', 'Complete', 'Blocked'])}
              {field('Reference URL', 'url', 'url')}
              {field('Content / observations', 'content', 'textarea')}
            </>
          )}
          {(resource === 'workouts' || resource === 'routines') && (
            <>
              {resource === 'workouts' && (
                <>
                  {field('Date', 'date', 'date', true)}
                  {field('Duration (minutes)', 'duration', 'number', true)}
                  <label className="field">
                    <span>Load routine</span>
                    <select
                      value={str('routineId')}
                      onChange={(e) => {
                        const routine = data.routines.find((r) => r.id === e.target.value);
                        setForm((f) => ({
                          ...f,
                          routineId: e.target.value,
                          ...(routine
                            ? { name: routine.name + ' session', exercises: routine.exercises }
                            : {}),
                        }));
                      }}
                    >
                      <option value="">Custom workout</option>
                      {data.routines.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name}
                        </option>
                      ))}
                    </select>
                  </label>
                </>
              )}
              <div className="full exercise-list">
                <div className="exercise-labels">
                  <span>Exercise</span>
                  <span>Sets</span>
                  <span>Reps</span>
                  <span>kg</span>
                  <span />
                </div>
                {exercises.map((exercise, i) => (
                  <div key={i} className="exercise-row">
                    {(['name', 'sets', 'reps', 'weight'] as const).map((key) => (
                      <input
                        key={key}
                        aria-label={`Exercise ${i + 1} ${key}`}
                        required
                        type={key === 'name' ? 'text' : 'number'}
                        min={key === 'weight' ? 0 : 1}
                        step={key === 'weight' ? 0.5 : 1}
                        placeholder={key === 'name' ? 'Exercise name' : undefined}
                        value={exercise[key]}
                        onChange={(e) =>
                          set(
                            'exercises',
                            exercises.map((x, n) =>
                              n === i
                                ? {
                                    ...x,
                                    [key]: key === 'name' ? e.target.value : Number(e.target.value),
                                  }
                                : x,
                            ),
                          )
                        }
                      />
                    ))}
                    <button
                      type="button"
                      className="icon-button"
                      disabled={exercises.length === 1}
                      aria-label={`Remove exercise ${i + 1}`}
                      onClick={() =>
                        set(
                          'exercises',
                          exercises.filter((_, n) => n !== i),
                        )
                      }
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  className="button subtle small"
                  onClick={() =>
                    set('exercises', [...exercises, { name: '', sets: 3, reps: 10, weight: 0 }])
                  }
                >
                  <Plus size={15} />
                  Add exercise
                </button>
              </div>
              {resource === 'workouts' && field('Session notes', 'notes', 'textarea')}
            </>
          )}
        </div>
        {error && (
          <p role="alert" className="error-message">
            {error}
          </p>
        )}
        <footer>
          <button type="button" className="button subtle" onClick={close} disabled={busy}>
            Cancel
          </button>
          <button className="button primary" disabled={busy}>
            {busy && <LoaderCircle size={16} className="spin" />}
            {busy ? 'Saving…' : 'Save ' + names[resource]}
          </button>
        </footer>
      </form>
    </Modal>
  );
}
