import { useState } from 'react';
import { Plus, List, Columns3, Search, Folder, Pencil, Trash2 } from 'lucide-react';
import { statuses } from '../../shared/domain.ts';
import { projectProgress } from '../../shared/analytics.ts';
import { PageHeading, Panel, Tag, Progress, Empty } from '../components/ui.tsx';
import { TaskRow } from '../components/TaskRow.tsx';
import type { PageProps } from './types.ts';
export function Tasks(p: PageProps) {
  const [view, setView] = useState('list');
  const [tab, setTab] = useState('tasks');
  const [search, setSearch] = useState('');
  const [project, setProject] = useState('');
  const [status, setStatus] = useState('');
  const tasks = p.data.tasks.filter(
    (t) =>
      t.title.toLowerCase().includes(search.toLowerCase()) &&
      (!project || t.projectId === project) &&
      (!status || t.status === status),
  );
  return (
    <>
      <PageHeading
        eyebrow="MAKE PROGRESS"
        title="Tasks & projects"
        description="Turn big ideas into the next small step."
      >
        <button className="button subtle" onClick={() => p.edit({ resource: 'projects' })}>
          <Folder size={16} />
          New project
        </button>
        <button className="button primary" onClick={() => p.edit({ resource: 'tasks' })}>
          <Plus size={16} />
          New task
        </button>
      </PageHeading>
      <div className="tabs">
        <button className={tab === 'tasks' ? 'active' : ''} onClick={() => setTab('tasks')}>
          Tasks <span>{p.data.tasks.length}</span>
        </button>
        <button className={tab === 'projects' ? 'active' : ''} onClick={() => setTab('projects')}>
          Projects <span>{p.data.projects.length}</span>
        </button>
      </div>
      {tab === 'tasks' ? (
        <>
          <div className="toolbar">
            <label className="search-field">
              <Search size={16} />
              <input
                placeholder="Find a task…"
                aria-label="Find a task"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </label>
            <select
              aria-label="Filter by project"
              value={project}
              onChange={(e) => setProject(e.target.value)}
            >
              <option value="">All projects</option>
              {p.data.projects.map((pr) => (
                <option key={pr.id} value={pr.id}>
                  {pr.name}
                </option>
              ))}
            </select>
            <select
              aria-label="Filter by status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="">All statuses</option>
              {statuses.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
            <div className="segmented">
              <button
                title="List view"
                aria-label="List view"
                className={view === 'list' ? 'active' : ''}
                onClick={() => setView('list')}
              >
                <List size={17} />
              </button>
              <button
                title="Kanban view"
                aria-label="Kanban view"
                className={view === 'board' ? 'active' : ''}
                onClick={() => setView('board')}
              >
                <Columns3 size={17} />
              </button>
            </div>
          </div>
          {!tasks.length ? (
            <Panel>
              <Empty
                title="No tasks here yet"
                action={() => p.edit({ resource: 'tasks' })}
                label="Add task"
              />
            </Panel>
          ) : view === 'list' ? (
            <Panel>
              {tasks.map((t) => (
                <TaskRow
                  key={t.id}
                  task={t}
                  data={p.data}
                  toggle={() => p.toggleTask(t)}
                  edit={() => p.edit({ resource: 'tasks', record: t })}
                  remove={() => p.remove('tasks', t)}
                />
              ))}
            </Panel>
          ) : (
            <div className="kanban">
              {statuses.map((s) => (
                <section key={s} className="kanban-column">
                  <h2>
                    <i
                      className={`dot bg-${
                        s === 'Done' ? 'green' : s === 'In progress' ? 'violet' : 'amber'
                      }`}
                    />
                    {s}
                    <span>{tasks.filter((t) => t.status === s).length}</span>
                  </h2>
                  {tasks
                    .filter((t) => t.status === s)
                    .map((t) => (
                      <button
                        className="kanban-card"
                        key={t.id}
                        onClick={() => p.edit({ resource: 'tasks', record: t })}
                      >
                        <Tag color={t.priority === 'Urgent' ? 'rose' : ''}>{t.priority}</Tag>
                        <h3>{t.title}</h3>
                        <p>
                          {p.data.projects.find((pr) => pr.id === t.projectId)?.name || 'Personal'}
                        </p>
                        <div className="card-bottom">
                          <span>{t.dueDate || 'No due date'}</span>
                          {t.demo && <span className="demo-label">DEMO</span>}
                        </div>
                      </button>
                    ))}
                  <button
                    className="add-inline"
                    onClick={() => p.edit({ resource: 'tasks', initial: { status: s } })}
                  >
                    <Plus size={15} />
                    Add task
                  </button>
                </section>
              ))}
            </div>
          )}
        </>
      ) : (
        <div className="cards-grid">
          {p.data.projects.map((pr) => (
            <Panel key={pr.id}>
              <div className="project-card">
                <div className="card-top">
                  <span className={`project-symbol ${pr.color}`}>
                    <Folder size={20} />
                  </span>
                  <Tag>{pr.category}</Tag>
                  <div className="row-actions">
                    <button
                      className="icon-button"
                      aria-label={`Edit ${pr.name}`}
                      onClick={() => p.edit({ resource: 'projects', record: pr })}
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      className="icon-button danger"
                      aria-label={`Delete ${pr.name}`}
                      onClick={() => p.remove('projects', pr)}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
                <h2>{pr.name}</h2>
                <p>{pr.description || 'No description yet.'}</p>
                <div className="progress-label">
                  <span>{p.data.tasks.filter((t) => t.projectId === pr.id).length} tasks</span>
                  <b>{projectProgress(p.data, pr.id)}%</b>
                </div>
                <Progress value={projectProgress(p.data, pr.id)} color={pr.color} />
                <div className="card-bottom">
                  <span>{pr.dueDate ? `Due ${pr.dueDate}` : 'No deadline'}</span>
                  <button
                    className="text-link"
                    onClick={() => {
                      setProject(pr.id);
                      setTab('tasks');
                    }}
                  >
                    View tasks →
                  </button>
                </div>
              </div>
            </Panel>
          ))}
          {!p.data.projects.length && (
            <Empty
              title="Start with a project"
              action={() => p.edit({ resource: 'projects' })}
              label="Create project"
            />
          )}
        </div>
      )}
    </>
  );
}
