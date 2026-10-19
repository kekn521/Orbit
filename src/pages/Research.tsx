import { useState } from 'react';
import { Plus, FlaskConical, Pencil, Trash2, GitBranch, FileText, AlertCircle } from 'lucide-react';
import { projectProgress } from '../../shared/analytics.ts';
import { PageHeading, Panel, Tag, Progress, ExternalLink, Empty } from '../components/ui.tsx';
import type { PageProps } from './types.ts';
export function Research(p: PageProps) {
  const [kind, setKind] = useState('');
  const projects = p.data.projects.filter((pr) =>
    ['Research', 'Development', 'University'].includes(pr.category),
  );
  return (
    <>
      <PageHeading
        eyebrow="FROM QUESTION TO DISCOVERY"
        title="Research & development"
        description="Keep the context. Connect the ideas. Move the work forward."
      >
        <button
          className="button subtle"
          onClick={() => p.edit({ resource: 'projects', initial: { category: 'Research' } })}
        >
          <Plus size={16} />
          Research project
        </button>
        <button className="button primary" onClick={() => p.edit({ resource: 'notes' })}>
          <FileText size={16} />
          Add note
        </button>
      </PageHeading>
      <div className="notice">
        <GitBranch size={17} />
        <span>
          Repository links are saved locally. No repository activity or test results have been
          imported.
        </span>
      </div>
      <div className="cards-grid">
        {projects.map((pr) => (
          <Panel key={pr.id}>
            <div className="project-card">
              <div className="card-top">
                <span className={`project-symbol ${pr.color}`}>
                  <FlaskConical size={19} />
                </span>
                <Tag>{pr.category}</Tag>
                <button
                  className="icon-button"
                  aria-label={`Edit ${pr.name}`}
                  onClick={() => p.edit({ resource: 'projects', record: pr })}
                >
                  <Pencil size={15} />
                </button>
              </div>
              <h2>{pr.name}</h2>
              <p>{pr.description}</p>
              <div className="progress-label">
                <span>Task completion</span>
                <b>{projectProgress(p.data, pr.id)}%</b>
              </div>
              <Progress value={projectProgress(p.data, pr.id)} color={pr.color} />
              {pr.blocker && (
                <div className="research-blocker">
                  <AlertCircle size={15} />
                  <span>{pr.blocker}</span>
                </div>
              )}
              {pr.nextStep && (
                <div className="next-step">
                  <small>NEXT STEP</small>
                  <p>{pr.nextStep}</p>
                </div>
              )}
              {pr.repository && <ExternalLink href={pr.repository}>Open repository</ExternalLink>}
              <div className="milestones">
                {p.data.tasks
                  .filter((t) => t.projectId === pr.id && t.milestone)
                  .map((t) => (
                    <button key={t.id} onClick={() => p.edit({ resource: 'tasks', record: t })}>
                      <span>
                        {t.status === 'Done' ? '◆' : '◇'} {t.title}
                      </span>
                      <small>{t.dueDate || t.status}</small>
                    </button>
                  ))}
                <button
                  className="text-link"
                  onClick={() =>
                    p.edit({ resource: 'tasks', initial: { projectId: pr.id, milestone: true } })
                  }
                >
                  <Plus size={14} />
                  Add milestone
                </button>
              </div>
            </div>
          </Panel>
        ))}
        {!projects.length && (
          <Empty
            title="Make space for discovery"
            action={() => p.edit({ resource: 'projects', initial: { category: 'Research' } })}
            label="Create research project"
          />
        )}
      </div>
      <div className="section-title section-gap">
        <h2>Research notebook</h2>
        <select aria-label="Note type" value={kind} onChange={(e) => setKind(e.target.value)}>
          <option value="">All notes</option>
          {['Note', 'Paper', 'Experiment', 'Progress report'].map((k) => (
            <option key={k}>{k}</option>
          ))}
        </select>
      </div>
      <div className="notes-grid">
        {p.data.notes
          .filter((n) => !kind || n.kind === kind)
          .map((n) => (
            <Panel key={n.id}>
              <div className="note-card">
                <div className="card-top">
                  <Tag color={n.kind === 'Experiment' ? 'violet' : ''}>{n.kind}</Tag>
                  <Tag
                    color={n.status === 'Blocked' ? 'rose' : n.status === 'Complete' ? 'green' : ''}
                  >
                    {n.status}
                  </Tag>
                  <div className="row-actions">
                    <button
                      className="icon-button"
                      aria-label={`Edit ${n.title}`}
                      onClick={() => p.edit({ resource: 'notes', record: n })}
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      className="icon-button"
                      aria-label={`Delete ${n.title}`}
                      onClick={() => p.remove('notes', n)}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                <h2>{n.title}</h2>
                <small>
                  {p.data.projects.find((pr) => pr.id === n.projectId)?.name || 'Personal notebook'}{' '}
                  {n.demo && '· Demo'}
                </small>
                <p className="note-content">{n.content || 'No content yet.'}</p>
                {n.url && <ExternalLink href={n.url}>Open reference</ExternalLink>}
                <footer>Updated {new Date(n.updatedAt).toLocaleDateString()}</footer>
              </div>
            </Panel>
          ))}
      </div>
      {!p.data.notes.length && (
        <Panel>
          <Empty
            title="Keep your thinking close"
            detail="Capture observations, paper references, experiments, and progress reports."
            action={() => p.edit({ resource: 'notes' })}
            label="Write a note"
          />
        </Panel>
      )}
    </>
  );
}
