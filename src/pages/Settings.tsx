import { useState, useEffect } from 'react';
import {
  Moon,
  Sun,
  Download,
  Database,
  Plug,
  ShieldCheck,
  Check,
  Mail,
  CalendarDays,
  GitBranch,
  FileSpreadsheet,
  Sparkles,
  Server,
  Bell,
  Clock3,
} from 'lucide-react';
import { api, request } from '../api.ts';
import { PageHeading, Panel, Tag, Modal } from '../components/ui.tsx';
import type { PageProps } from './types.ts';
type Integration = {
  id: string;
  name: string;
  category: string;
  detail: string;
  state: string;
  lastSync: null;
  enabled: boolean;
};
export function Settings(p: PageProps) {
  const settings = p.data.settings[0];
  const [name, setName] = useState(settings.name);
  const [currency, setCurrency] = useState(settings.currency);
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [providers, setProviders] = useState<Integration[]>([]);
  const [providerError, setProviderError] = useState('');
  useEffect(() => {
    request<Integration[]>('integrations')
      .then(setProviders)
      .catch((e) => setProviderError(e.message));
  }, []);
  async function save(theme = settings.theme) {
    setBusy(true);
    try {
      await api.save('settings', { name, currency, theme }, settings.id);
      await p.reload();
      p.notify('Preferences saved');
    } catch (e) {
      p.notify((e as Error).message, true);
    } finally {
      setBusy(false);
    }
  }
  async function loadDemo() {
    setBusy(true);
    try {
      const result = await request<{ seeded: boolean }>('demo', {
        method: 'POST',
        body: JSON.stringify({ confirm: true }),
      });
      await p.reload();
      p.notify(
        result.seeded
          ? 'Labeled demo workspace created'
          : 'Demo seed skipped: your workspace already has records.',
      );
      setConfirm(false);
    } catch (e) {
      p.notify((e as Error).message, true);
    } finally {
      setBusy(false);
    }
  }
  const icons = [CalendarDays, Mail, GitBranch, GitBranch, Server, FileSpreadsheet, Sparkles];
  return (
    <>
      <PageHeading
        eyebrow="MAKE IT YOURS"
        title="Settings & integrations"
        description="Your workspace. Your preferences. Your data."
      />
      <div className="two-columns">
        <Panel title="Personal preferences">
          <form
            className="settings-form"
            onSubmit={(e) => {
              e.preventDefault();
              void save();
            }}
          >
            <label className="field">
              <span>Your name / workspace name</span>
              <input
                value={name}
                maxLength={200}
                required
                onChange={(e) => setName(e.target.value)}
              />
            </label>
            <label className="field">
              <span>Default currency</span>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value as typeof currency)}
              >
                {['TWD', 'USD', 'EUR', 'JPY'].map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
            <button className="button primary" disabled={busy}>
              <Check size={16} />
              Save preferences
            </button>
          </form>
        </Panel>
        <Panel title="Appearance">
          <div className="padded">
            <p className="muted">A workspace that feels right, day or night.</p>
            <div className="theme-options">
              <button
                disabled={busy}
                className={settings.theme === 'dark' ? 'selected' : ''}
                onClick={() => void save('dark')}
              >
                <div className="theme-preview dark-preview">
                  <i />
                  <i />
                  <i />
                </div>
                <span>
                  <Moon size={16} />
                  Dark{settings.theme === 'dark' && <Check size={15} />}
                </span>
              </button>
              <button
                disabled={busy}
                className={settings.theme === 'light' ? 'selected' : ''}
                onClick={() => void save('light')}
              >
                <div className="theme-preview light-preview">
                  <i />
                  <i />
                  <i />
                </div>
                <span>
                  <Sun size={16} />
                  Light{settings.theme === 'light' && <Check size={15} />}
                </span>
              </button>
            </div>
          </div>
        </Panel>
      </div>
      <Panel title="Data & privacy" className="section-gap">
        <div className="settings-row">
          <span className="project-symbol green">
            <ShieldCheck size={20} />
          </span>
          <div>
            <h3>Local by default</h3>
            <p>
              SQLite storage on this server. No analytics, cloud sync, AI requests, or repository
              scanning.
            </p>
          </div>
          <Tag color="green">Private</Tag>
        </div>
        <div className="settings-row">
          <Download size={21} />
          <div>
            <h3>Export workspace</h3>
            <p>
              Download saved records as JSON. For full backups including audit history, copy the
              data folder while the app is stopped.
            </p>
          </div>
          <a className="button subtle small" href="/api/backup" download="orbit-backup.json">
            Export JSON
          </a>
        </div>
        <div className="settings-row">
          <Database size={21} />
          <div>
            <h3>Explore a demo workspace</h3>
            <p>
              Add clearly labeled sample records to an empty workspace. Existing workspaces are
              never overwritten.
            </p>
          </div>
          <button className="button subtle small" onClick={() => setConfirm(true)}>
            Load demo
          </button>
        </div>
        <div className="settings-row">
          <ShieldCheck size={21} />
          <div>
            <h3>Remote access is not enabled</h3>
            <p>
              Authentication and encrypted credential storage must be added before any remote
              deployment or OAuth integration.
            </p>
          </div>
        </div>
      </Panel>
      <div className="section-title section-gap">
        <h2>Connected services</h2>
        <Tag>
          <Plug size={13} />0 connected
        </Tag>
      </div>
      {providerError && (
        <p className="error-message" role="alert">
          {providerError}
        </p>
      )}
      <div className="integration-grid">
        {providers.map((integration, i) => {
          const Icon = icons[i] || Plug;
          return (
            <Panel key={integration.id}>
              <div className="integration-card">
                <div className="card-top">
                  <span className="project-symbol">
                    <Icon size={21} />
                  </span>
                  <Tag>Not implemented</Tag>
                </div>
                <h3>{integration.name}</h3>
                <p>{integration.detail}</p>
                <small>Disabled · Never synchronized</small>
              </div>
            </Panel>
          );
        })}
      </div>
      <div className="notice section-gap">
        <ShieldCheck size={18} />
        Integration credentials are not collected in this version. OAuth, encryption, and manual
        sync will be added together with authentication.
      </div>
      {confirm && (
        <Modal title="Load demo workspace?" close={() => setConfirm(false)}>
          <p className="muted">
            This creates labeled sample projects, tasks, expenses, events, notes, habits, and
            Push/Pull/Legs routines. It only runs if your workspace is empty.
          </p>
          <div className="modal-actions">
            <button className="button subtle" onClick={() => setConfirm(false)}>
              Cancel
            </button>
            <button disabled={busy} className="button primary" onClick={() => void loadDemo()}>
              Create demo records
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
export function Inbox(p: PageProps) {
  return (
    <>
      <PageHeading
        eyebrow="LESS NOISE, MORE SIGNAL"
        title="Inbox"
        description="A home for important conversations and follow-ups."
      />
      <Panel>
        <div className="integration-empty">
          <span className="large-icon">
            <Mail size={35} />
          </span>
          <Tag>Gmail · not connected</Tag>
          <h2>Your inbox will live here.</h2>
          <p>
            Read-only Gmail access is planned. No email has been accessed or imported. In the
            meantime, capture a follow-up as a task so it doesn’t get lost.
          </p>
          <div className="heading-actions">
            <button
              className="button primary"
              onClick={() => p.edit({ resource: 'tasks', initial: { tags: ['follow-up'] } })}
            >
              Create follow-up task
            </button>
            <button className="button subtle" onClick={() => p.navigate('settings')}>
              View integrations
            </button>
          </div>
        </div>
      </Panel>
      <Panel title="Pending follow-ups" className="section-gap">
        {p.data.tasks
          .filter((t) => t.tags.includes('follow-up') && t.status !== 'Done')
          .map((t) => (
            <button
              className="record-row full-width"
              key={t.id}
              onClick={() => p.edit({ resource: 'tasks', record: t })}
            >
              <span>{t.title}</span>
              <Tag>{t.dueDate || 'No due date'}</Tag>
            </button>
          ))}
        {!p.data.tasks.some((t) => t.tags.includes('follow-up') && t.status !== 'Done') && (
          <p className="muted padded">No pending follow-up tasks.</p>
        )}
      </Panel>
    </>
  );
}
export function Automations() {
  return (
    <>
      <PageHeading
        eyebrow="A LITTLE LESS REPETITION"
        title="Automations"
        description="Recurring workflows, with you in control."
      />
      <div className="notice">
        <Bell size={18} />
        No background scheduler is installed. All workflows below are planned, disabled, and have
        never run.
      </div>
      <div className="cards-grid">
        {[
          'Morning briefing',
          'Weekly review',
          'Expense summary',
          'Research progress report',
          'Deadline reminders',
        ].map((name) => (
          <Panel key={name}>
            <div className="integration-card">
              <div className="card-top">
                <span className="project-symbol">
                  <Clock3 size={20} />
                </span>
                <Tag>Not implemented</Tag>
              </div>
              <h3>{name}</h3>
              <p>Schedule: not configured</p>
              <small>Last run: Never · Next run: None</small>
            </div>
          </Panel>
        ))}
      </div>
    </>
  );
}
