import { Circle, CircleCheck, Flag, GitBranch, Diamond, Pencil, Trash2 } from 'lucide-react';
import type { DashboardData, Entry } from '../../shared/domain.ts';
import { dayKey } from '../../shared/analytics.ts';
import { Tag } from './ui.tsx';
export function TaskRow({
  task,
  data,
  toggle,
  edit,
  remove,
  compact = false,
}: {
  task: Entry<'tasks'>;
  data: DashboardData;
  toggle: () => void;
  edit: () => void;
  remove?: () => void;
  compact?: boolean;
}) {
  const project = data.projects.find((p) => p.id === task.projectId);
  const overdue = task.dueDate && task.dueDate < dayKey() && task.status !== 'Done';
  const blocked = task.dependencyIds.some(
    (id) => data.tasks.find((t) => t.id === id)?.status !== 'Done',
  );
  return (
    <div className={`task-row ${task.status === 'Done' ? 'completed' : ''}`}>
      <button
        className="task-check"
        onClick={toggle}
        aria-label={`${task.status === 'Done' ? 'Reopen' : 'Complete'} ${task.title}`}
      >
        {task.status === 'Done' ? <CircleCheck size={19} /> : <Circle size={19} />}
      </button>
      <div className="task-info">
        <button className="task-title" onClick={edit}>
          {task.milestone && <Diamond size={13} />}
          {task.title}
        </button>
        <div className="task-meta">
          {project && (
            <span>
              <i className={`dot bg-${project.color}`} />
              {project.name}
            </span>
          )}
          {task.parentId && (
            <span>
              <GitBranch size={12} />
              Subtask
            </span>
          )}
          {blocked && <Tag color="amber">Blocked</Tag>}
          {!compact && task.tags.map((t) => <span key={t}>#{t}</span>)}
          {task.demo && <span className="demo-label">DEMO</span>}
        </div>
      </div>
      <div
        className={`priority-marker ${task.priority.toLowerCase()}`}
        title={`${task.priority} priority`}
      >
        <Flag size={14} />
      </div>
      {task.dueDate && (
        <span className={`due-date ${overdue ? 'overdue' : ''}`}>
          {task.dueDate === dayKey()
            ? 'Today'
            : new Date(task.dueDate + 'T12:00:00').toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
              })}
        </span>
      )}
      {!compact && (
        <div className="row-actions">
          <button className="icon-button" onClick={edit} aria-label={`Edit ${task.title}`}>
            <Pencil size={14} />
          </button>
          {remove && (
            <button
              className="icon-button danger"
              onClick={remove}
              aria-label={`Delete ${task.title}`}
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
