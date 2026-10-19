import { useState } from 'react';
import { Plus, Check, Flame, Dumbbell, Pencil, Trash2, Trophy } from 'lucide-react';
import { dayKey, weekDays, streak } from '../../shared/analytics.ts';
import { api } from '../api.ts';
import { PageHeading, Panel, Tag, Empty } from '../components/ui.tsx';
import type { PageProps } from './types.ts';
export function Fitness(p: PageProps) {
  const days = weekDays();
  const [pending, setPending] = useState('');
  const workouts = [...p.data.workouts].sort((a, b) => b.date.localeCompare(a.date));
  const records = new Map<string, number>();
  for (const w of workouts)
    for (const ex of w.exercises)
      records.set(ex.name, Math.max(records.get(ex.name) || 0, ex.weight));
  async function check(habitId: string, date: string) {
    const key = habitId + date;
    if (pending) return;
    setPending(key);
    try {
      const existing = p.data.checkins.find((c) => c.habitId === habitId && c.date === date);
      if (existing) await api.remove('checkins', existing.id);
      else await api.save('checkins', { habitId, date });
      await p.reload();
    } catch (error) {
      p.notify((error as Error).message, true);
    } finally {
      setPending('');
    }
  }
  return (
    <>
      <PageHeading
        eyebrow="SHOW UP FOR YOURSELF"
        title="Fitness & habits"
        description="Consistency over intensity. Every small win counts."
      >
        <button className="button subtle" onClick={() => p.edit({ resource: 'habits' })}>
          <Plus size={16} />
          New habit
        </button>
        <button className="button primary" onClick={() => p.edit({ resource: 'workouts' })}>
          <Dumbbell size={16} />
          Log workout
        </button>
      </PageHeading>
      <div className="stats-grid three">
        <div className="stat-card">
          <div className="stat-top">
            Weekly sessions
            <Dumbbell size={18} />
          </div>
          <strong>{workouts.filter((w) => days.includes(w.date)).length}</strong>
          <small>Workouts logged this week</small>
        </div>
        <div className="stat-card">
          <div className="stat-top">
            Training time
            <Flame size={18} />
          </div>
          <strong>
            {workouts.filter((w) => days.includes(w.date)).reduce((n, w) => n + w.duration, 0)}{' '}
            <em>min</em>
          </strong>
          <small>Time invested this week</small>
        </div>
        <div className="stat-card">
          <div className="stat-top">
            Habit consistency
            <Check size={18} />
          </div>
          <strong>
            {p.data.habits.length
              ? Math.round(
                  (p.data.checkins.filter((c) => days.includes(c.date)).length /
                    (p.data.habits.length * days.filter((d) => d <= dayKey()).length)) *
                    100,
                )
              : 0}
            %
          </strong>
          <small>Check-ins through today this week</small>
        </div>
      </div>
      <Panel title="Small rituals, lasting change" meta={<Tag>This week</Tag>}>
        <div className="habit-table">
          <div className="habit-row habit-header">
            <span>DAILY HABITS</span>
            {days.map((d) => (
              <span key={d} className={d === dayKey() ? 'accent-text' : ''}>
                {new Date(d + 'T12:00:00')
                  .toLocaleDateString('en-US', { weekday: 'short' })
                  .slice(0, 1)}
              </span>
            ))}
            <span>STREAK</span>
            <span />
          </div>
          {p.data.habits.map((h) => (
            <div className="habit-row" key={h.id}>
              <div>
                <h3>{h.name}</h3>
                <small>{h.description || 'One day at a time'}</small>
              </div>
              {days.map((d) => {
                const done = p.data.checkins.some((c) => c.habitId === h.id && c.date === d);
                return (
                  <button
                    key={d}
                    aria-label={`${done ? 'Uncheck' : 'Check'} ${h.name} on ${d}`}
                    aria-pressed={done}
                    disabled={Boolean(pending) || d > dayKey()}
                    className={`habit-check ${done ? 'checked' : ''} ${
                      d === dayKey() ? 'today' : ''
                    }`}
                    onClick={() => void check(h.id, d)}
                  >
                    {done ? <Check size={16} /> : <span />}
                  </button>
                );
              })}
              <span className="streak">
                <Flame size={15} />
                {streak(p.data.checkins.filter((c) => c.habitId === h.id).map((c) => c.date))}
              </span>
              <div className="row-actions">
                <button
                  className="icon-button"
                  aria-label={`Edit ${h.name}`}
                  onClick={() => p.edit({ resource: 'habits', record: h })}
                >
                  <Pencil size={14} />
                </button>
                <button
                  className="icon-button"
                  aria-label={`Delete ${h.name}`}
                  onClick={() => p.remove('habits', h)}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
        {!p.data.habits.length && (
          <Empty
            title="Build a little momentum"
            action={() => p.edit({ resource: 'habits' })}
            label="Create a habit"
          />
        )}
      </Panel>
      <div className="two-columns section-gap">
        <Panel title="Workout history" meta={<Tag>{workouts.length} sessions</Tag>}>
          {workouts.map((w) => (
            <div className="workout-card" key={w.id}>
              <div className="card-top">
                <span className="project-symbol blue">
                  <Dumbbell size={18} />
                </span>
                <div>
                  <h3>{w.name}</h3>
                  <small>
                    {w.date} · {w.duration} min {w.demo && '· Demo'}
                  </small>
                </div>
                <div className="row-actions">
                  <button
                    className="icon-button"
                    aria-label={`Edit ${w.name}`}
                    onClick={() => p.edit({ resource: 'workouts', record: w })}
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    className="icon-button"
                    aria-label={`Delete ${w.name}`}
                    onClick={() => p.remove('workouts', w)}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
              {w.exercises.map((e, i) => (
                <div className="exercise-summary" key={i}>
                  <span>{e.name}</span>
                  <span>
                    {e.sets} × {e.reps} <b>{e.weight} kg</b>
                  </span>
                </div>
              ))}
              {w.notes && <p className="muted">{w.notes}</p>}
            </div>
          ))}
          {!workouts.length && (
            <Empty
              title="Your next session starts here"
              action={() => p.edit({ resource: 'workouts' })}
              label="Log workout"
            />
          )}
        </Panel>
        <div className="stack">
          <Panel
            title="Your routines"
            meta={
              <button className="text-link" onClick={() => p.edit({ resource: 'routines' })}>
                <Plus size={15} />
                New
              </button>
            }
          >
            {p.data.routines.map((r) => (
              <div className="record-row" key={r.id}>
                <div>
                  <h3>{r.name}</h3>
                  <small>{r.exercises.map((e) => e.name).join(' · ')}</small>
                </div>
                <div className="row-actions">
                  <button
                    className="button subtle small"
                    onClick={() =>
                      p.edit({
                        resource: 'workouts',
                        initial: {
                          name: r.name + ' session',
                          routineId: r.id,
                          exercises: r.exercises,
                        },
                      })
                    }
                  >
                    Log
                  </button>
                  <button
                    className="icon-button"
                    aria-label={`Edit ${r.name}`}
                    onClick={() => p.edit({ resource: 'routines', record: r })}
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    className="icon-button"
                    aria-label={`Delete ${r.name}`}
                    onClick={() => p.remove('routines', r)}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
            {!p.data.routines.length && (
              <p className="padded muted">
                Create a Push, Pull, or Legs routine with your own exercises.
              </p>
            )}
          </Panel>
          <Panel title="Personal records" meta={<Trophy size={17} className="amber" />}>
            {[...records].map(([name, weight]) => (
              <div className="record-row" key={name}>
                <span>{name}</span>
                <strong>
                  {weight} <small>kg</small>
                </strong>
              </div>
            ))}
            {!records.size && (
              <p className="muted padded">
                Your highest logged weight for each exercise appears here.
              </p>
            )}
          </Panel>
        </div>
      </div>
    </>
  );
}
