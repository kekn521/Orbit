import { useState, useEffect, useCallback } from 'react';
import {
  LayoutDashboard,
  CheckSquare2,
  CalendarDays,
  FlaskConical,
  Inbox as InboxIcon,
  Wallet,
  Dumbbell,
  Sparkles,
  Settings as SettingsIcon,
  Search,
  Command,
  Plus,
  ChevronDown,
  Menu,
  X,
  Zap,
  CircleHelp,
  ArrowUpRight,
  LoaderCircle,
  AlertTriangle,
  Check,
  Clock3,
  Pause,
  Play,
  RotateCcw,
} from 'lucide-react';
import type { DashboardData, Entry, Resource } from '../shared/domain.ts';
import { api } from './api.ts';
import { Modal } from './components/ui.tsx';
import { Editor } from './components/Editor.tsx';
import type { EditTarget } from './components/Editor.tsx';
import { Overview } from './pages/Overview.tsx';
import { Tasks } from './pages/Tasks.tsx';
import { Calendar } from './pages/Calendar.tsx';
import { Finances } from './pages/Finances.tsx';
import { Fitness } from './pages/Fitness.tsx';
import { Research } from './pages/Research.tsx';
import { Assistant } from './pages/Assistant.tsx';
import { Settings, Inbox, Automations } from './pages/Settings.tsx';
import type { PageProps } from './pages/types.ts';

const navigation = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'tasks', label: 'Tasks & projects', icon: CheckSquare2 },
  { id: 'calendar', label: 'Calendar', icon: CalendarDays },
  { id: 'research', label: 'Research & development', icon: FlaskConical },
  { id: 'inbox', label: 'Inbox', icon: InboxIcon },
  { id: 'finances', label: 'Finances', icon: Wallet },
  { id: 'fitness', label: 'Fitness & habits', icon: Dumbbell },
  { id: 'assistant', label: 'AI assistant', icon: Sparkles },
];
const extraNavigation = [
  { id: 'automations', label: 'Automations', icon: Zap },
  { id: 'settings', label: 'Settings & integrations', icon: SettingsIcon },
];
const allNavigation = [...navigation, ...extraNavigation];
function currentPage() {
  const id = window.location.hash.slice(1);
  return allNavigation.some((n) => n.id === id) ? id : 'overview';
}
export function App() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loadError, setLoadError] = useState('');
  const [page, setPage] = useState(currentPage);
  const [editor, setEditor] = useState<EditTarget | null>(null);
  const [deleting, setDeleting] = useState<{ resource: Resource; record: Entry<Resource> } | null>(
    null,
  );
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<{ message: string; error: boolean } | null>(null);
  const [palette, setPalette] = useState(false);
  const [query, setQuery] = useState('');
  const [mobile, setMobile] = useState(false);
  const [help, setHelp] = useState(false);
  const [focus, setFocus] = useState(false);
  const [focusEnd, setFocusEnd] = useState<number>(
    () => Number(localStorage.getItem('orbit-focus-end')) || 0,
  );
  const [remaining, setRemaining] = useState(25 * 60);
  const [now, setNow] = useState(Date.now());
  const notify = useCallback((message: string, error = false) => setToast({ message, error }), []);
  const reload = useCallback(async () => {
    const result = await api.dashboard();
    setData(result);
    setLoadError('');
  }, []);
  useEffect(() => {
    void reload().catch((e) => setLoadError(e.message));
  }, [reload]);
  useEffect(() => {
    const handler = () => {
      setPage(currentPage());
      setMobile(false);
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', handler);
    return () => window.removeEventListener('hashchange', handler);
  }, []);
  useEffect(() => {
    if (data) document.documentElement.dataset.theme = data.settings[0].theme;
  }, [data]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 6000);
    return () => clearTimeout(timer);
  }, [toast]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPalette((open) => !open);
        setQuery('');
      }
      if (e.key === 'Escape') setMobile(false);
      if (
        e.key.toLowerCase() === 'n' &&
        !e.ctrlKey &&
        !e.metaKey &&
        !(
          e.target instanceof HTMLInputElement ||
          e.target instanceof HTMLTextAreaElement ||
          e.target instanceof HTMLSelectElement
        ) &&
        !document.querySelector('dialog[open]')
      ) {
        e.preventDefault();
        setEditor({ resource: 'tasks' });
      }
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, []);
  useEffect(() => {
    if (!focusEnd) return;
    localStorage.setItem('orbit-focus-end', String(focusEnd));
    const timer = setInterval(() => {
      const time = Date.now();
      setNow(time);
      if (time >= focusEnd) {
        setFocusEnd(0);
        setRemaining(0);
        localStorage.removeItem('orbit-focus-end');
        notify('Focus session complete. Take a moment to recharge.');
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [focusEnd, notify]);
  const navigate = (id: string) => {
    window.location.hash = id;
    setPage(id);
    setMobile(false);
  };
  const remove = (resource: Resource, record: Entry<Resource>) => setDeleting({ resource, record });
  async function toggleTask(task: Entry<'tasks'>) {
    const {
      id,
      createdAt: _created,
      updatedAt: _updated,
      demo: _demo,
      completedAt: _completed,
      ...values
    } = task;
    try {
      await api.save(
        'tasks',
        { ...values, status: task.status === 'Done' ? 'Backlog' : 'Done' },
        id,
      );
      await reload();
      notify(task.status === 'Done' ? 'Task reopened' : 'One step forward. Task completed.');
    } catch (e) {
      notify((e as Error).message, true);
    }
  }
  async function confirmDelete() {
    if (!deleting) return;
    setBusy(true);
    try {
      await api.remove(deleting.resource, deleting.record.id);
      await reload();
      setDeleting(null);
      notify('Record deleted');
    } catch (e) {
      notify((e as Error).message, true);
    } finally {
      setBusy(false);
    }
  }
  const seconds = focusEnd ? Math.max(0, Math.ceil((focusEnd - now) / 1000)) : remaining;
  const timeLabel = `${Math.floor(seconds / 60)
    .toString()
    .padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
  const nav = (items: typeof navigation) =>
    items.map((item) => (
      <a
        key={item.id}
        href={`#${item.id}`}
        className={`nav-item ${page === item.id ? 'active' : ''}`}
        aria-current={page === item.id ? 'page' : undefined}
        onClick={() => setMobile(false)}
      >
        <item.icon size={18} />
        <span>{item.label}</span>
        {item.id === 'tasks' && data && (
          <span className="nav-count">{data.tasks.filter((t) => t.status !== 'Done').length}</span>
        )}
        {item.id === 'assistant' && <span className="nav-sparkle">✦</span>}
      </a>
    ));
  const pageProps: PageProps | null = data
    ? {
        data,
        edit: setEditor,
        remove,
        reload,
        notify,
        toggleTask: (t) => void toggleTask(t),
        navigate,
      }
    : null;
  const anyDemo = data && Object.values(data).some((items) => items.some((i) => i.demo));
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      {mobile && (
        <button
          className="sidebar-backdrop"
          aria-label="Close navigation"
          onClick={() => setMobile(false)}
        />
      )}
      <aside className={`sidebar ${mobile ? 'open' : ''}`}>
        <a className="brand" href="#overview">
          <span className="brand-logo">
            o<span />
          </span>
          <span>
            orbit<span className="brand-period">.</span>
          </span>
          <button
            className="mobile-close icon-button"
            aria-label="Close navigation"
            onClick={(e) => {
              e.preventDefault();
              setMobile(false);
            }}
          >
            <X size={18} />
          </button>
        </a>
        <button className="workspace-switch" onClick={() => navigate('settings')}>
          <span className="workspace-avatar">
            {(data?.settings[0].name || 'K').slice(0, 1).toUpperCase()}
          </span>
          <span>
            <strong>Personal workspace</strong>
            <small>Local & private</small>
          </span>
          <ChevronDown size={14} />
        </button>
        <button
          className="sidebar-search"
          onClick={() => {
            setPalette(true);
            setQuery('');
          }}
        >
          <Search size={15} />
          <span>Quick search</span>
          <kbd>⌘ K</kbd>
        </button>
        <span className="nav-label">WORKSPACE</span>
        <nav aria-label="Main navigation">{nav(navigation)}</nav>
        <span className="nav-label tools-label">TOOLS</span>
        <nav aria-label="Tools">{nav(extraNavigation)}</nav>
        <div className="sidebar-bottom">
          <div className="local-status">
            <i className="dot bg-green" />
            <span>All systems local</span>
            <ShieldIcon />
          </div>
          <button className="help-link" onClick={() => setHelp(true)}>
            <CircleHelp size={17} />
            <span>A little help & shortcuts</span>
            <ArrowUpRight size={14} />
          </button>
          <div className="profile">
            <span className="profile-avatar">
              {(data?.settings[0].name === 'My workspace' ? 'K' : data?.settings[0].name || 'K')
                .slice(0, 1)
                .toUpperCase()}
            </span>
            <span>
              <strong>{data?.settings[0].name || 'My workspace'}</strong>
              <small>Your personal space</small>
            </span>
            <button
              className="icon-button"
              aria-label="Open settings"
              onClick={() => navigate('settings')}
            >
              <SettingsIcon size={16} />
            </button>
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div>
            <button
              className="mobile-menu icon-button"
              aria-label="Open navigation"
              onClick={() => setMobile(true)}
            >
              <Menu size={20} />
            </button>
            <span className="breadcrumb">Workspace</span>
            <span className="breadcrumb-slash">/</span>
            <span>{allNavigation.find((n) => n.id === page)?.label}</span>
          </div>
          <div className="topbar-right">
            {focusEnd > 0 && (
              <button className="focus-chip" onClick={() => setFocus(true)}>
                <Clock3 size={14} />
                {timeLabel}
              </button>
            )}
            <span className="local-badge">
              <i className="dot bg-green" />
              Local mode
            </span>
            <button
              className="icon-button"
              onClick={() => setPalette(true)}
              aria-label="Open command palette"
            >
              <Command size={17} />
            </button>
            <button
              className="topbar-add"
              aria-label="Quick add task"
              onClick={() => setEditor({ resource: 'tasks' })}
            >
              <Plus size={18} />
            </button>
          </div>
        </header>
        <main id="main-content" tabIndex={-1}>
          {loadError ? (
            <div className="load-state">
              <AlertTriangle size={28} />
              <h2>Couldn’t load your workspace</h2>
              <p>{loadError}</p>
              <button
                className="button primary"
                onClick={() => void reload().catch((e) => setLoadError(e.message))}
              >
                Try again
              </button>
            </div>
          ) : !pageProps ? (
            <div className="load-state">
              <LoaderCircle className="spin" size={28} />
              <p>Opening your workspace…</p>
            </div>
          ) : (
            <>
              {anyDemo && (
                <div className="demo-banner">
                  <span>DEMO WORKSPACE</span>Sample records are labeled and editable. No live
                  services are connected.
                </div>
              )}
              {page === 'overview' && <Overview {...pageProps} focus={() => setFocus(true)} />}
              {page === 'tasks' && <Tasks {...pageProps} />}
              {page === 'calendar' && <Calendar {...pageProps} />}
              {page === 'research' && <Research {...pageProps} />}
              {page === 'inbox' && <Inbox {...pageProps} />}
              {page === 'finances' && <Finances {...pageProps} />}
              {page === 'fitness' && <Fitness {...pageProps} />}
              {page === 'assistant' && <Assistant {...pageProps} />}
              {page === 'settings' && <Settings {...pageProps} />}
              {page === 'automations' && <Automations />}
              {!anyDemo && page === 'overview' && !data?.tasks.length && (
                <div className="welcome-banner">
                  <Sparkles size={20} />
                  <div>
                    <strong>Your workspace, a fresh start.</strong>
                    <p>Create your first task, or explore a labeled demo from Settings.</p>
                  </div>
                  <button className="button subtle" onClick={() => navigate('settings')}>
                    Explore demo
                  </button>
                </div>
              )}
            </>
          )}
          <footer className="page-footer">
            <span>Built for a more intentional day.</span>
            <span>Orbit · Your data stays yours</span>
          </footer>
        </main>
      </div>
      {toast && (
        <div
          className={`toast ${toast.error ? 'error' : ''}`}
          role={toast.error ? 'alert' : 'status'}
        >
          {toast.error ? <AlertTriangle size={18} /> : <Check size={18} />}
          <span>{toast.message}</span>
          <button
            className="icon-button"
            aria-label="Dismiss notification"
            onClick={() => setToast(null)}
          >
            <X size={15} />
          </button>
        </div>
      )}
      {editor && data && (
        <Editor
          key={editor.record?.id || editor.resource}
          target={editor}
          data={data}
          close={() => setEditor(null)}
          saved={async () => {
            await reload();
            notify('Saved to your workspace');
          }}
        />
      )}
      {deleting && (
        <Modal
          title="Delete this record?"
          close={() => {
            if (!busy) setDeleting(null);
          }}
        >
          <p className="muted">
            This removes the selected record from your workspace.{' '}
            {deleting.resource === 'projects'
              ? 'Linked tasks and notes will be kept without a project.'
              : deleting.resource === 'habits'
              ? 'Its check-in history will also be removed.'
              : 'This action cannot be undone in the interface.'}{' '}
            A local audit record is retained.
          </p>
          <div className="modal-actions">
            <button className="button subtle" disabled={busy} onClick={() => setDeleting(null)}>
              Keep record
            </button>
            <button
              className="button destructive"
              disabled={busy}
              onClick={() => void confirmDelete()}
            >
              {busy ? 'Deleting…' : 'Delete record'}
            </button>
          </div>
        </Modal>
      )}
      {palette && (
        <Modal title="What would you like to do?" close={() => setPalette(false)}>
          <div className="palette-search">
            <Search size={19} />
            <input
              autoFocus
              placeholder="Search pages, actions, or tasks…"
              aria-label="Search commands"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="command-list">
            {allNavigation
              .filter((n) => n.label.toLowerCase().includes(query.toLowerCase()))
              .map((n) => (
                <button
                  key={n.id}
                  onClick={() => {
                    navigate(n.id);
                    setPalette(false);
                  }}
                >
                  <n.icon size={18} />
                  Go to {n.label}
                  <span>↵</span>
                </button>
              ))}
            {[
              { label: 'Create task', resource: 'tasks' },
              { label: 'Record expense', resource: 'expenses' },
              { label: 'Log workout', resource: 'workouts' },
              { label: 'Add note', resource: 'notes' },
            ]
              .filter((a) => a.label.toLowerCase().includes(query.toLowerCase()))
              .map((a) => (
                <button
                  key={a.label}
                  onClick={() => {
                    setPalette(false);
                    setEditor({ resource: a.resource as Resource });
                  }}
                >
                  <Plus size={18} />
                  {a.label}
                </button>
              ))}
            {query &&
              data?.tasks
                .filter((t) => t.title.toLowerCase().includes(query.toLowerCase()))
                .slice(0, 6)
                .map((t) => (
                  <button
                    key={t.id}
                    onClick={() => {
                      setPalette(false);
                      setEditor({ resource: 'tasks', record: t });
                    }}
                  >
                    <CheckSquare2 size={18} />
                    {t.title}
                  </button>
                ))}
          </div>
          <p className="palette-hint">Tab to navigate · Enter to select · Esc to close</p>
        </Modal>
      )}
      {focus && (
        <Modal title="A moment to focus" close={() => setFocus(false)}>
          <div className="focus-dialog">
            <span className="sparkle-box">
              <Clock3 size={24} />
            </span>
            <p>One task. A little less noise.</p>
            <div className="timer">{timeLabel}</div>
            <div className="heading-actions">
              <button
                className="button primary"
                onClick={() => {
                  if (focusEnd) {
                    setRemaining(seconds);
                    setFocusEnd(0);
                    localStorage.removeItem('orbit-focus-end');
                  } else {
                    const time = Date.now();
                    setNow(time);
                    setFocusEnd(time + (remaining || 25 * 60) * 1000);
                  }
                }}
              >
                {focusEnd ? <Pause size={17} /> : <Play size={17} />}
                {focusEnd ? 'Pause' : 'Start focus'}
              </button>
              <button
                className="button subtle"
                onClick={() => {
                  setFocusEnd(0);
                  setRemaining(25 * 60);
                  localStorage.removeItem('orbit-focus-end');
                }}
              >
                <RotateCcw size={16} />
                Reset
              </button>
            </div>
            <small>25 minutes · running sessions survive a refresh</small>
          </div>
        </Modal>
      )}
      {help && (
        <Modal title="A little help" close={() => setHelp(false)}>
          <div className="help-content">
            <p>
              Orbit keeps your workspace in a local SQLite database. Use the + buttons to add
              records; select a record or its pencil icon to edit it.
            </p>
            <div>
              <kbd>Ctrl / ⌘ K</kbd>
              <span>Search and quick actions</span>
            </div>
            <div>
              <kbd>N</kbd>
              <span>New task (outside text fields)</span>
            </div>
            <div>
              <kbd>Esc</kbd>
              <span>Close dialog or navigation</span>
            </div>
            <p>
              Visit Settings to change your theme, export data, or load an optional demo. External
              integrations and scheduled automations are not implemented yet.
            </p>
          </div>
        </Modal>
      )}
    </div>
  );
}
function ShieldIcon() {
  return <span className="tiny-label">●</span>;
}
