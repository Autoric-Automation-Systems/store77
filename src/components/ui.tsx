import type { ReactNode } from "react";

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={`card ${className}`}>{children}</div>;
}

export function CardHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-ink-200 px-3 py-4 sm:px-5 sm:px-6">
      <div>
        <h2 className="text-base font-semibold text-ink-900">{title}</h2>
        {description ? (
          <p className="mt-0.5 text-sm text-ink-500">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

export function Field({
  label,
  name,
  error,
  hint,
  children,
}: {
  label: string;
  name: string;
  error?: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label className="label" htmlFor={name}>
        {label}
      </label>
      {children}
      {hint && !error ? (
        <p className="mt-1 text-xs text-ink-500">{hint}</p>
      ) : null}
      {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}
    </div>
  );
}

type BadgeTone = "neutral" | "success" | "warning" | "danger" | "info";

const TONES: Record<BadgeTone, string> = {
  neutral: "bg-ink-100 text-ink-700",
  success: "bg-emerald-50 text-emerald-700",
  warning: "bg-amber-50 text-amber-700",
  danger: "bg-red-50 text-red-700",
  info: "bg-brand-50 text-brand-700",
};

export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: BadgeTone;
}) {
  return <span className={`badge ${TONES[tone]}`}>{children}</span>;
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
      <p className="text-base font-semibold text-ink-800">{title}</p>
      {description ? (
        <p className="max-w-md text-sm text-ink-500">{description}</p>
      ) : null}
      {action}
    </div>
  );
}

export function Stat({
  label,
  value,
  hint,
  tone = "neutral",
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: BadgeTone;
}) {
  return (
    <div className="card card-pad">
      <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">
        {label}
      </p>
      <p className="mt-2 text-xl font-bold text-ink-900 sm:text-2xl">{value}</p>
      {hint ? (
        <p className="mt-1">
          <Badge tone={tone}>{hint}</Badge>
        </p>
      ) : null}
    </div>
  );
}

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink-900">
          {title}
        </h1>
        {description ? (
          <p className="mt-1 text-sm text-ink-500">{description}</p>
        ) : null}
      </div>
      {action}
    </header>
  );
}

export function Alert({
  tone = "info",
  children,
}: {
  tone?: "info" | "success" | "danger" | "warning";
  children: ReactNode;
}) {
  const tones = {
    info: "border-brand-100 bg-brand-50 text-brand-700",
    success: "border-emerald-100 bg-emerald-50 text-emerald-700",
    danger: "border-red-100 bg-red-50 text-red-700",
    warning: "border-amber-100 bg-amber-50 text-amber-800",
  } as const;
  return (
    <div className={`rounded-xl border px-4 py-3 text-sm ${tones[tone]}`}>
      {children}
    </div>
  );
}
