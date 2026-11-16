import React from 'react';
import { X } from 'lucide-react';

export const Card: React.FC<{
  children: React.ReactNode;
  className?: string;
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
}> = ({ children, className = '', title, subtitle, action }) => (
  <section
    className={`rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 transition-colors ${className}`}
  >
    {(title || action) && (
      <header className="mb-4 flex items-start justify-between gap-3">
        <div>
          {title && <h2 className="text-base font-semibold tracking-tight">{title}</h2>}
          {subtitle && <p className="mt-0.5 text-xs text-[var(--text-secondary)]">{subtitle}</p>}
        </div>
        {action}
      </header>
    )}
    {children}
  </section>
);

export const Button: React.FC<
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
    size?: 'sm' | 'md';
  }
> = ({ variant = 'primary', size = 'md', className = '', ...props }) => {
  const base =
    'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]';
  const sizes = size === 'sm' ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-sm';
  const variants = {
    primary: 'bg-[var(--accent-primary)] text-white hover:opacity-90',
    secondary: 'border border-[var(--border-subtle)] bg-[var(--bg-elevated)] text-[var(--text-primary)] hover:bg-[var(--bg-muted)]',
    danger: 'bg-[var(--status-danger)] text-white hover:opacity-90',
    ghost: 'text-[var(--text-secondary)] hover:bg-[var(--bg-muted)] hover:text-[var(--text-primary)]',
  };
  return <button className={`${base} ${sizes} ${variants[variant]} ${className}`} {...props} />;
};

export const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { label?: string; error?: string }> = ({
  label,
  error,
  className = '',
  ...props
}) => (
  <label className="block space-y-1">
    {label && <span className="block text-xs font-medium text-[var(--text-secondary)]">{label}</span>}
    <input
      className={`w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--accent-primary)] focus:outline-none ${className}`}
      {...props}
    />
    {error && <span className="block text-xs text-[var(--status-danger)]">{error}</span>}
  </label>
);

export const Select: React.FC<React.SelectHTMLAttributes<HTMLSelectElement> & { label?: string }> = ({
  label,
  className = '',
  children,
  ...props
}) => (
  <label className="block space-y-1">
    {label && <span className="block text-xs font-medium text-[var(--text-secondary)]">{label}</span>}
    <select
      className={`w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--accent-primary)] focus:outline-none ${className}`}
      {...props}
    >
      {children}
    </select>
  </label>
);

export const Modal: React.FC<{
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}> = ({ open, title, onClose, children }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="rounded-lg p-1 text-[var(--text-secondary)] hover:bg-[var(--bg-muted)]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
};

export const EmptyState: React.FC<{
  title: string;
  description: string;
  action?: React.ReactNode;
}> = ({ title, description, action }) => (
  <div className="rounded-xl border border-dashed border-[var(--border-subtle)] p-8 text-center">
    <p className="text-sm font-semibold">{title}</p>
    <p className="mx-auto mt-1 max-w-md text-xs text-[var(--text-secondary)]">{description}</p>
    {action && <div className="mt-4 flex justify-center">{action}</div>}
  </div>
);

export const Badge: React.FC<{
  children: React.ReactNode;
  tone?: 'neutral' | 'positive' | 'warning' | 'danger' | 'accent';
}> = ({ children, tone = 'neutral' }) => {
  const styles = {
    neutral: 'bg-[var(--bg-muted)] text-[var(--text-secondary)]',
    positive: 'bg-emerald-500/15 text-[var(--status-positive)]',
    warning: 'bg-amber-500/15 text-[var(--status-warning)]',
    danger: 'bg-rose-500/15 text-[var(--status-danger)]',
    accent: 'bg-[var(--accent-soft)] text-[var(--accent-primary)]',
  };
  return <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${styles[tone]}`}>{children}</span>;
};
