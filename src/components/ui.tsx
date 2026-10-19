import { useEffect, useId, useRef } from 'react';
import type { ReactNode } from 'react';
import { X, Plus, ArrowUpRight } from 'lucide-react';

export function Modal({
  title,
  children,
  close,
  wide = false,
}: {
  title: string;
  children: ReactNode;
  close: () => void;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const previous = document.activeElement as HTMLElement;
    ref.current?.showModal();
    return () => {
      previous?.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className={`modal ${wide ? 'wide' : ''}`}
      aria-labelledby={titleId}
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}
      onClick={(e) => {
        if (e.target === ref.current) close();
      }}
    >
      <div className="modal-inner">
        <header>
          <h2 id={titleId}>{title}</h2>
          <button className="icon-button" aria-label="Close dialog" onClick={close}>
            <X size={19} />
          </button>
        </header>
        {children}
      </div>
    </dialog>
  );
}
export function Panel({
  title,
  meta,
  children,
  className = '',
}: {
  title?: string;
  meta?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`panel ${className}`}>
      {title && (
        <div className="panel-heading">
          <h2>{title}</h2>
          {meta}
        </div>
      )}
      {children}
    </section>
  );
}
export function Empty({
  title,
  detail,
  action,
  label = 'Create your first record',
}: {
  title: string;
  detail?: string;
  action?: () => void;
  label?: string;
}) {
  return (
    <div className="empty">
      <div className="empty-symbol">✦</div>
      <h3>{title}</h3>
      <p>{detail || 'A little space to start something meaningful.'}</p>
      {action && (
        <button className="button" onClick={action}>
          <Plus size={16} />
          {label}
        </button>
      )}
    </div>
  );
}
export function Progress({ value, color = 'violet' }: { value: number; color?: string }) {
  return (
    <div
      className="progress"
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <span className={`bg-${color}`} style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  );
}
export function Tag({ children, color = '' }: { children: ReactNode; color?: string }) {
  return <span className={`tag ${color}`}>{children}</span>;
}
export function ExternalLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className="text-link">
      {children}
      <ArrowUpRight size={14} />
    </a>
  );
}
export function PageHeading({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      <div className="heading-actions">{children}</div>
    </div>
  );
}
