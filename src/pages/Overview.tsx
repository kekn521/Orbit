import { useState } from 'react';
import {
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  CheckCheck,
  Clock3,
  Dumbbell,
  Flame,
  Plus,
  Sparkles,
  Wallet,
  FileText,
  Target,
} from 'lucide-react';
import {
  briefing,
  dayKey,
  money,
  projectProgress,
  snapshot,
  weekDays,
} from '../../shared/analytics.ts';
import { Panel, PageHeading, Progress, Empty, Tag } from '../components/ui.tsx';
import { TaskRow } from '../components/TaskRow.tsx';
import type { PageProps } from './types.ts';
export function Overview(p: PageProps & { focus: () => void }) {
  const { data, edit, navigate } = p;
  const today = dayKey();
  const s = snapshot(data, today, data.settings[0].currency);
  const [taskScope, setTaskScope] = useState<'priority' | 'today'>('priority');
  const todayTasks = s.open.filter((task) => task.dueDate === today);
  const visibleTasks = taskScope === 'priority' ? s.ranked.slice(0, 3) : todayTasks;
  const followups = s.open.filter((task) => task.tags.includes('follow-up'));
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const days = weekDays();
  const completed = days.map(
    (day) =>
      data.tasks.filter((t) => t.completedAt && dayKey(new Date(t.completedAt)) === day).length,
  );
  const due = s.open
    .filter((t) => t.dueDate)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    .slice(0, 3);
  return (
    <>
      <PageHeading
        eyebrow={new Date().toLocaleDateString('en-US', {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
          year: 'numeric',
        })}
        title={`${greeting}, ${
          data.settings[0].name === 'My workspace' ? 'Ken' : data.settings[0].name
        }.`}
        description="A little clarity. A lot of possibility."
      >
        <button className="button subtle" onClick={p.focus}>
          <Clock3 size={16} />
          Focus session
        </button>
        <button className="button primary" onClick={() => edit({ resource: 'tasks' })}>
          <Plus size={17} />
          New task
        </button>
      </PageHeading>
      <div className="overview-top">
        <section className="briefing-card">
          <div className="briefing-top">
            <span className="sparkle-box">
              <Sparkles size={19} />
            </span>
            <span>YOUR DAILY BRIEFING</span>
            <Tag>On-device · rules based</Tag>
          </div>
          <h2>Make room for what matters.</h2>
          <p>{briefing(data)}</p>
          <button className="text-link" onClick={() => navigate('assistant')}>
            Explore your day <ArrowRight size={15} />
          </button>
          <div className="orbit-art" aria-hidden="true">
            <i />
            <i />
            <i />
            <b>✦</b>
          </div>
        </section>
        <section className="quick-card">
          <div className="panel-heading">
            <h2>Quick capture</h2>
            <span className="muted">Clear your mind</span>
          </div>
          <div className="quick-grid">
            {[
              { label: 'Add task', icon: Plus, resource: 'tasks' },
              { label: 'Log expense', icon: Wallet, resource: 'expenses' },
              { label: 'Log workout', icon: Dumbbell, resource: 'workouts' },
              { label: 'Add note', icon: FileText, resource: 'notes' },
            ].map((a) => (
              <button
                key={a.label}
                onClick={() =>
                  edit({ resource: a.resource as 'tasks' | 'expenses' | 'workouts' | 'notes' })
                }
              >
                <a.icon size={20} />
                <span>{a.label}</span>
              </button>
            ))}
          </div>
        </section>
      </div>
      <div className="stats-grid">
        <Stat
          label="Tasks completed"
          value={String(s.completed)}
          detail="this calendar week"
          icon={<CheckCheck size={17} />}
          color="violet"
        />
        <Stat
          label="Active projects"
          value={String(data.projects.filter((pr) => projectProgress(data, pr.id) < 100).length)}
          detail={`${s.overdue.length} overdue task${s.overdue.length === 1 ? '' : 's'}`}
          icon={<Target size={17} />}
          color="blue"
        />
        <Stat
          label="Weekly spending"
          value={money(s.weekSpending, data.settings[0].currency)}
          detail={`${data.settings[0].currency} · recorded expenses`}
          icon={<Wallet size={17} />}
          color="amber"
        />
        <Stat
          label="Daily habits"
          value={`${s.habitsDone} / ${data.habits.length}`}
          detail="Small steps, every day"
          icon={<Flame size={17} />}
          color="green"
        />
      </div>
      <div className="dashboard-columns">
        <div className="stack">
          <Panel
            title={taskScope === 'priority' ? 'Your priorities' : "Today's tasks"}
            meta={
              <button className="text-link muted" onClick={() => navigate('tasks')}>
                All tasks <ArrowUpRight size={14} />
              </button>
            }
          >
            <div className="priority-tabs">
              <button
                aria-pressed={taskScope === 'priority'}
                onClick={() => setTaskScope('priority')}
              >
                Top 3 priorities
              </button>
              <button aria-pressed={taskScope === 'today'} onClick={() => setTaskScope('today')}>
                Due today · {todayTasks.length}
              </button>
            </div>
            {visibleTasks.length ? (
              visibleTasks.map((t) => (
                <TaskRow
                  compact
                  key={t.id}
                  task={t}
                  data={data}
                  toggle={() => p.toggleTask(t)}
                  edit={() => edit({ resource: 'tasks', record: t })}
                />
              ))
            ) : (
              <Empty
                title="A clear runway"
                action={() => edit({ resource: 'tasks' })}
                label="Add a task"
              />
            )}
            <button className="add-inline" onClick={() => edit({ resource: 'tasks' })}>
              <Plus size={16} />
              Add a task
            </button>
          </Panel>
          <Panel
            title="Projects in motion"
            meta={
              <button className="text-link muted" onClick={() => navigate('tasks')}>
                View projects <ArrowUpRight size={14} />
              </button>
            }
          >
            <div className="project-mini-grid">
              {data.projects.slice(0, 3).map((project) => (
                <button
                  key={project.id}
                  className="project-mini"
                  onClick={() => edit({ resource: 'projects', record: project })}
                >
                  <div>
                    <span className={`project-symbol ${project.color}`}>
                      <Target size={17} />
                    </span>
                    <ArrowUpRight size={15} className="muted" />
                  </div>
                  <h3>{project.name}</h3>
                  <span className="muted">{project.category}</span>
                  <div className="progress-label">
                    <span>
                      {
                        data.tasks.filter((t) => t.projectId === project.id && t.status === 'Done')
                          .length
                      }{' '}
                      / {data.tasks.filter((t) => t.projectId === project.id).length} tasks
                    </span>
                    <b>{projectProgress(data, project.id)}%</b>
                  </div>
                  <Progress value={projectProgress(data, project.id)} color={project.color} />
                </button>
              ))}
            </div>
            {!data.projects.length && (
              <Empty
                title="Give your ideas a home"
                action={() => edit({ resource: 'projects' })}
                label="Create project"
              />
            )}
          </Panel>
          <Panel title="This week, in focus" meta={<Tag>{s.completed} completed</Tag>}>
            <div
              className="bar-chart"
              role="img"
              aria-label={`Completed tasks this week: ${completed.join(', ')}`}
            >
              {days.map((d, i) => (
                <div className={`bar-column ${d === today ? 'today' : ''}`} key={d}>
                  <span className="bar-number">{completed[i] || ''}</span>
                  <div className="bar-track">
                    <div
                      style={{
                        height: `${Math.max(3, (completed[i] / Math.max(1, ...completed)) * 100)}%`,
                      }}
                    />
                  </div>
                  <span>
                    {new Date(d + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short' })}
                  </span>
                </div>
              ))}
            </div>
          </Panel>
        </div>
        <div className="stack">
          <Panel title="Today's schedule" meta={<CalendarDays size={17} className="muted" />}>
            <div className="agenda">
              {s.events.length ? (
                s.events.map((event, i) => (
                  <button
                    key={event.id}
                    className="agenda-item"
                    onClick={() => edit({ resource: 'events', record: event })}
                  >
                    <div className="agenda-time">
                      {new Date(event.start).toLocaleTimeString('en-US', {
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </div>
                    <span className={`agenda-line bg-${['violet', 'blue', 'green'][i % 3]}`} />
                    <div>
                      <h3>{event.title}</h3>
                      <p>{event.location || 'Local calendar'}</p>
                      <small>
                        {Math.round(
                          (new Date(event.end).getTime() - new Date(event.start).getTime()) / 60000,
                        )}{' '}
                        min {event.demo && '· Demo'}
                      </small>
                    </div>
                  </button>
                ))
              ) : (
                <Empty title="Space to focus" detail="No events scheduled for today." />
              )}
              <button
                className="button subtle full-width small"
                onClick={() => navigate('calendar')}
              >
                Open calendar <ArrowRight size={14} />
              </button>
            </div>
          </Panel>
          <Panel title="On the horizon" meta={<span className="tiny-label">DEADLINES</span>}>
            <div className="deadline-list">
              {due.map((t) => (
                <button key={t.id} onClick={() => edit({ resource: 'tasks', record: t })}>
                  <span className={`deadline-date ${t.dueDate < today ? 'overdue' : ''}`}>
                    <b>{new Date(t.dueDate + 'T12:00:00').getDate()}</b>
                    {new Date(t.dueDate + 'T12:00:00').toLocaleDateString('en-US', {
                      month: 'short',
                    })}
                  </span>
                  <span>
                    {t.title}
                    <small>
                      {data.projects.find((pr) => pr.id === t.projectId)?.name || 'Personal'}
                    </small>
                  </span>
                </button>
              ))}
              {!due.length && <p className="muted">No upcoming deadlines.</p>}
            </div>
          </Panel>
          <Panel title="Pending follow-ups" meta={<Tag>{followups.length}</Tag>}>
            {followups.slice(0, 3).map((task) => (
              <button
                key={task.id}
                className="record-row full-width"
                onClick={() => edit({ resource: 'tasks', record: task })}
              >
                <span>{task.title}</span>
                <ArrowUpRight size={14} />
              </button>
            ))}
            {!followups.length && (
              <p className="padded muted">
                You're all caught up. Follow-up tasks from Inbox appear here.
              </p>
            )}
          </Panel>
          <div className="quiet-note">
            <span>✦</span>
            <p>
              You don’t have to do it all.
              <br />
              <strong>Just the next right thing.</strong>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
function Stat({
  label,
  value,
  detail,
  icon,
  color,
}: {
  label: string;
  value: string;
  detail: string;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <div className="stat-card">
      <div className="stat-top">
        <span>{label}</span>
        <span className={`stat-icon ${color}`}>{icon}</span>
      </div>
      <strong>{value}</strong>
      <small>{detail}</small>
    </div>
  );
}
