import { useState, useEffect, useRef } from 'react';
import { Sparkles, ArrowUp, ShieldCheck, LoaderCircle } from 'lucide-react';
import { request } from '../api.ts';
import { PageHeading, Tag } from '../components/ui.tsx';
import type { PageProps } from './types.ts';
export function Assistant(_p: PageProps) {
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; text: string }[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => {
    end.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [messages]);
  async function ask(question: string) {
    if (!question.trim() || busy) return;
    setBusy(true);
    setInput('');
    setError('');
    setMessages((m) => [...m, { role: 'user', text: question }]);
    try {
      const result = await request<{ text: string }>('assistant', {
        method: 'POST',
        body: JSON.stringify({ prompt: question }),
      });
      setMessages((m) => [...m, { role: 'assistant', text: result.text }]);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageHeading
        eyebrow="A LITTLE PERSPECTIVE"
        title="Your workspace assistant"
        description="Useful answers from the information you’ve already saved."
      >
        <Tag color="green">
          <ShieldCheck size={13} />
          100% local
        </Tag>
      </PageHeading>
      <div className="assistant-shell">
        <div className="assistant-status">
          <span className="sparkle-box">
            <Sparkles size={17} />
          </span>
          <div>
            <strong>Local planning companion</strong>
            <small>Rules-based summaries · read-only · no external model connected</small>
          </div>
        </div>
        <div className="chat-messages">
          {!messages.length && (
            <div className="assistant-welcome">
              <div className="assistant-orb">
                <Sparkles size={32} />
              </div>
              <h2>Let’s make sense of your day.</h2>
              <p>
                Get a daily briefing, review your progress, or see where your money went. Your data
                stays on this device.
              </p>
              <div className="prompt-grid">
                {[
                  'What should I focus on today?',
                  'Summarize my weekly progress',
                  'How much did I spend this week?',
                  'What is happening with my research?',
                ].map((q) => (
                  <button key={q} onClick={() => void ask(q)}>
                    {q}
                    <ArrowUp size={15} />
                  </button>
                ))}
              </div>
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={`chat-message ${m.role}`}>
              <span className="chat-avatar">
                {m.role === 'assistant' ? <Sparkles size={17} /> : 'Y'}
              </span>
              <div>
                <small>{m.role === 'assistant' ? 'Orbit · local rules' : 'You'}</small>
                <p>{m.text}</p>
              </div>
            </div>
          ))}
          {busy && (
            <div className="chat-message">
              <LoaderCircle className="spin" size={18} />
              <span>Reading your saved records…</span>
            </div>
          )}
          <div ref={end} />
        </div>
        {error && (
          <p className="error-message" role="alert">
            {error}
          </p>
        )}
        <form
          className="chat-input"
          onSubmit={(e) => {
            e.preventDefault();
            void ask(input);
          }}
        >
          <input
            aria-label="Ask about your workspace"
            placeholder="Ask about your tasks, schedule, spending, or research…"
            maxLength={2000}
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          <button
            className="button primary"
            aria-label="Send question"
            disabled={busy || !input.trim()}
          >
            <ArrowUp size={19} />
          </button>
        </form>
        <p className="chat-disclaimer">
          This is a deterministic helper, not a language model. It cannot edit records, send
          messages, or run commands. Chat is not saved.
        </p>
      </div>
    </>
  );
}
