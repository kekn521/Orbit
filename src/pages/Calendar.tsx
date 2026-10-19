import { useState } from 'react';
import { Plus, ChevronLeft, ChevronRight, AlertTriangle, Pencil, Trash2 } from 'lucide-react';
import { addDays, dayKey, weekDays, conflicts, eventOnDay } from '../../shared/analytics.ts';
import { PageHeading, Panel, Empty, Tag } from '../components/ui.tsx';
import type { PageProps } from './types.ts';
export function Calendar(p: PageProps) {
  const [view, setView] = useState('week');
  const [date, setDate] = useState(dayKey());
  const monthStart = date.slice(0, 8) + '01';
  const first = weekDays(monthStart)[0];
  const days =
    view === 'day'
      ? [date]
      : view === 'week'
      ? weekDays(date)
      : Array.from({ length: 42 }, (_, i) => addDays(first, i));
  const overlapIds = new Set(conflicts(p.data.events).flat());
  function move(direction: number) {
    if (view !== 'month') setDate(addDays(date, direction * (view === 'week' ? 7 : 1)));
    else {
      const d = new Date(monthStart + 'T12:00:00');
      d.setMonth(d.getMonth() + direction);
      setDate(dayKey(d));
    }
  }
  function addEvent(day: string) {
    p.edit({
      resource: 'events',
      initial: {
        start: new Date(day + 'T09:00:00').toISOString(),
        end: new Date(day + 'T10:00:00').toISOString(),
      },
    });
  }
  const upcoming = p.data.events
    .filter((e) => e.end >= new Date().toISOString())
    .sort((a, b) => a.start.localeCompare(b.start))
    .slice(0, 8);
  return (
    <>
      <PageHeading
        eyebrow="PROTECT YOUR TIME"
        title="Calendar"
        description="A clear view of your commitments and room to focus."
      >
        <Tag color="green">Local calendar</Tag>
        <button className="button primary" onClick={() => addEvent(date)}>
          <Plus size={16} />
          New event
        </button>
      </PageHeading>
      <div className="toolbar">
        <div className="calendar-nav">
          <button className="icon-button" aria-label="Previous period" onClick={() => move(-1)}>
            <ChevronLeft size={19} />
          </button>
          <button className="icon-button" aria-label="Next period" onClick={() => move(1)}>
            <ChevronRight size={19} />
          </button>
          <h2>
            {new Date(date + 'T12:00:00').toLocaleDateString('en-US', {
              month: 'long',
              year: 'numeric',
            })}
          </h2>
          <button className="button subtle small" onClick={() => setDate(dayKey())}>
            Today
          </button>
        </div>
        <div className="segmented">
          {['day', 'week', 'month'].map((v) => (
            <button className={v === view ? 'active' : ''} key={v} onClick={() => setView(v)}>
              {v[0].toUpperCase() + v.slice(1)}
            </button>
          ))}
        </div>
      </div>
      {overlapIds.size > 0 && (
        <div className="notice warning">
          <AlertTriangle size={17} />
          {overlapIds.size} events overlap. Review the highlighted events to resolve scheduling
          conflicts.
        </div>
      )}
      <Panel className="calendar-panel">
        <div className={`calendar-grid ${view}`}>
          {days.map((day) => (
            <div
              key={day}
              className={`calendar-cell ${day === dayKey() ? 'current-day' : ''} ${
                day.slice(0, 7) !== date.slice(0, 7) && view === 'month' ? 'other-month' : ''
              }`}
            >
              <button
                className="day-heading"
                onClick={() => addEvent(day)}
                aria-label={`Add event on ${day}`}
              >
                <span>
                  {new Date(day + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short' })}
                </span>
                <b>{Number(day.slice(-2))}</b>
                <Plus size={13} />
              </button>
              {p.data.events
                .filter((e) => eventOnDay(e, day))
                .sort((a, b) => a.start.localeCompare(b.start))
                .map((e) => (
                  <button
                    key={e.id}
                    className={`calendar-event ${overlapIds.has(e.id) ? 'conflict' : ''}`}
                    onClick={() => p.edit({ resource: 'events', record: e })}
                  >
                    <small>
                      {new Date(e.start).toLocaleTimeString('en-US', {
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </small>
                    <strong>{e.title}</strong>
                    {view !== 'month' && <span>{e.location}</span>}
                  </button>
                ))}
              {p.data.tasks
                .filter((t) => t.dueDate === day && t.status !== 'Done')
                .map((t) => (
                  <button
                    key={t.id}
                    className="calendar-deadline"
                    onClick={() => p.edit({ resource: 'tasks', record: t })}
                  >
                    ◇ {t.title}
                  </button>
                ))}
            </div>
          ))}
        </div>
      </Panel>
      <div className="two-columns section-gap">
        <Panel title="Coming up">
          {upcoming.map((e) => (
            <div key={e.id} className="record-row">
              <div>
                <h3>{e.title}</h3>
                <p>
                  {new Date(e.start).toLocaleString()} · {e.location || 'Local event'}
                </p>
              </div>
              <div className="row-actions">
                <button
                  className="icon-button"
                  aria-label={`Edit ${e.title}`}
                  onClick={() => p.edit({ resource: 'events', record: e })}
                >
                  <Pencil size={15} />
                </button>
                <button
                  className="icon-button danger"
                  aria-label={`Delete ${e.title}`}
                  onClick={() => p.remove('events', e)}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
          {!upcoming.length && (
            <Empty
              title="Your calendar is open"
              detail="Add a meeting, a deadline, or time for yourself."
            />
          )}
        </Panel>
        <Panel title="A little breathing room">
          <div className="padded">
            <p className="muted">
              Keep a 50-minute block for your highest-priority work. Review your calendar before
              saving; suggested blocks are not automatically booked.
            </p>
            <button
              className="button subtle"
              onClick={() =>
                p.edit({
                  resource: 'events',
                  initial: {
                    title: 'Focus time',
                    start: new Date(date + 'T10:00:00').toISOString(),
                    end: new Date(date + 'T10:50:00').toISOString(),
                  },
                })
              }
            >
              <Plus size={16} />
              Plan a focus block
            </button>
          </div>
        </Panel>
      </div>
    </>
  );
}
