"use client";

import * as React from "react";

export function cx(
  ...classes: Array<string | false | null | undefined>
): string {
  return classes.filter(Boolean).join(" ");
}

import type { Tone } from "../lib/tone";
export type { Tone };

const TONE_SURFACE: Record<Tone, string> = {
  brand: "bg-brand-50 text-brand-700",
  success: "bg-success-bg text-success-fg",
  warning: "bg-warning-bg text-warning-fg",
  danger: "bg-danger-bg text-danger-fg",
  info: "bg-info-bg text-info-fg",
  neutral: "bg-neutral-bg text-neutral-fg",
  accent: "bg-accent-bg text-accent-fg",
};

const TONE_DOT: Record<Tone, string> = {
  brand: "bg-brand-500",
  success: "bg-success-solid",
  warning: "bg-warning-solid",
  danger: "bg-danger-solid",
  info: "bg-info-solid",
  neutral: "bg-neutral-solid",
  accent: "bg-accent-solid",
};

// ---------------------------------------------------------------------------
// Button
// ---------------------------------------------------------------------------

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "success";

  size?: "sm" | "md" | "lg";
  loading?: boolean;
  icon?: React.ReactNode;
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      variant = "primary",
      size = "md",
      loading = false,
      icon,
      className,
      children,
      disabled,
      type,
      ...rest
    },
    ref,
  ) {
    const base =
      "inline-flex items-center justify-center gap-2 rounded-xl font-medium " +
      "transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50 " +
      "focus-visible:outline-2 focus-visible:outline-offset-2 active:translate-y-px";

    const sizes = {
      sm: "h-8 px-3 text-xs",
      md: "h-10 px-4 text-sm",
      lg: "h-11 px-5 text-sm",
    };

    const variants = {
      primary: "bg-brand-600 text-white hover:bg-brand-700 shadow-sm",
      secondary: "bg-surface text-ink border border-line hover:bg-surface-2",
      ghost: "text-ink-muted hover:bg-surface-2 hover:text-ink",
      danger: "bg-danger-solid text-white hover:brightness-110 shadow-sm",
      success: "bg-success-solid text-white hover:brightness-110 shadow-sm",
    };

    return (
      <button
        ref={ref}
        type={type}
        className={cx(base, sizes[size], variants[variant], className)}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        {...rest}
      >
        {loading ? (
          <span
            className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent"
            aria-hidden
          />
        ) : (
          icon
        )}

        {children}
      </button>
    );
  },
);

// ---------------------------------------------------------------------------
// Icon Button
// ---------------------------------------------------------------------------

export function IconButton({
  label,
  active,
  className,
  children,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cx(
        "inline-flex h-9 w-9 items-center justify-center rounded-xl transition-colors duration-150",
        active
          ? "bg-surface-3 text-ink"
          : "text-ink-muted hover:bg-surface-2 hover:text-ink",
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Form controls
// ---------------------------------------------------------------------------

const control =
  "w-full rounded-xl border border-line bg-surface text-sm text-ink " +
  "placeholder:text-ink-faint transition-colors " +
  "focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 " +
  "disabled:bg-surface-2 disabled:text-ink-faint";

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(function Input({ className, ...rest }, ref) {
  return (
    <input
      ref={ref}
      className={cx(control, "h-10 px-3.5", className)}
      {...rest}
    />
  );
});

export function SearchInput({
  className,
  onClear,
  value,
  ...rest
}: React.InputHTMLAttributes<HTMLInputElement> & {
  onClear?: () => void;
}) {
  return (
    <div className="relative">
      <svg
        className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint"
        viewBox="0 0 20 20"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        aria-hidden
      >
        <circle cx="9" cy="9" r="6" />

        <path d="M13.5 13.5 17 17" strokeLinecap="round" />
      </svg>

      <input
        type="search"
        value={value}
        className={cx(control, "h-10 pl-10 pr-9", className)}
        {...rest}
      />

      {onClear && value ? (
        <button
          type="button"
          onClick={onClear}
          aria-label="Clear search"
          className="absolute right-2.5 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full text-ink-faint transition-colors hover:bg-surface-3 hover:text-ink"
        >
          <svg
            viewBox="0 0 16 16"
            className="h-3 w-3"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="m4 4 8 8M12 4l-8 8" strokeLinecap="round" />
          </svg>
        </button>
      ) : null}
    </div>
  );
}

export function Textarea({
  className,
  ...rest
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea className={cx(control, "px-3.5 py-2.5", className)} {...rest} />
  );
}

export function Select({
  className,
  children,
  ...rest
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select
        className={cx(control, "h-10 appearance-none px-3.5 pr-9", className)}
        {...rest}
      >
        {children}
      </select>

      <svg
        className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint"
        viewBox="0 0 20 20"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        aria-hidden
      >
        <path d="m6 8 4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Field
// ---------------------------------------------------------------------------

export function Field({
  label,
  hint,
  error,
  required,
  htmlFor,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  htmlFor?: string;
  children: React.ReactNode;
}) {
  const generatedId = React.useId();

  /*
   * If htmlFor is supplied by the page, use it.
   * Otherwise generate a stable ID.
   */
  const controlId = htmlFor ?? generatedId;

  return (
    <div className="space-y-1.5">
      <label
        htmlFor={controlId}
        className="block text-xs font-medium text-ink-muted"
      >
        {label}

        {required && (
          <span className="ml-0.5 text-danger-fg" aria-hidden>
            *
          </span>
        )}

        {required && <span className="sr-only"> (required)</span>}
      </label>

      {children}

      {error ? (
        <p className="text-xs text-danger-fg" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-ink-faint">{hint}</p>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Card
// ---------------------------------------------------------------------------

export function Card({
  className,
  children,
  interactive,
  as: Tag = "div",
}: {
  className?: string;
  children: React.ReactNode;
  interactive?: boolean;
  as?: "div" | "section" | "article";
}) {
  return (
    <Tag
      className={cx(
        "rounded-2xl border border-line bg-surface shadow-card",
        interactive && "transition-shadow duration-200 hover:shadow-lift",
        className,
      )}
    >
      {children}
    </Tag>
  );
}

export function CardHeader({
  title,
  description,
  action,
  className,
}: {
  title: React.ReactNode;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cx(
        "flex items-start justify-between gap-4 px-5 pb-4 pt-5",
        className,
      )}
    >
      <div className="min-w-0">
        <h2 className="text-sm font-semibold text-ink">{title}</h2>

        {description && (
          <p className="mt-1 text-xs text-ink-muted">{description}</p>
        )}
      </div>

      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Badge
// ---------------------------------------------------------------------------

export function Badge({
  tone = "neutral",
  dot,
  className,
  children,
}: {
  tone?: Tone;
  dot?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-2 py-1 text-2xs font-medium",
        TONE_SURFACE[tone],
        className,
      )}
    >
      {dot && (
        <span
          className={cx("h-1.5 w-1.5 rounded-full", TONE_DOT[tone])}
          aria-hidden
        />
      )}

      {children}
    </span>
  );
}

export function StatusBadge({
  tone,
  children,
}: {
  tone: Tone;
  children: React.ReactNode;
}) {
  return (
    <Badge tone={tone} dot>
      {children}
    </Badge>
  );
}

// ---------------------------------------------------------------------------
// Alert
// ---------------------------------------------------------------------------

export function Alert({
  tone = "danger",
  title,
  children,
  action,
  onDismiss,
}: {
  tone?: Tone;
  title: string;
  children?: React.ReactNode;
  action?: React.ReactNode;
  onDismiss?: () => void;
}) {
  return (
    <div
      className={cx("rounded-xl px-4 py-3", TONE_SURFACE[tone])}
      role="alert"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium">{title}</p>

          {children && (
            <div className="mt-1 text-xs leading-relaxed opacity-90">
              {children}
            </div>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {action}

          {onDismiss && (
            <button
              type="button"
              onClick={onDismiss}
              aria-label="Dismiss"
              className="rounded-md p-1 opacity-60 transition-opacity hover:opacity-100"
            >
              <svg
                viewBox="0 0 16 16"
                className="h-3.5 w-3.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="m4 4 8 8M12 4l-8 8" strokeLinecap="round" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Empty State
// ---------------------------------------------------------------------------

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      {icon && (
        <div className="mb-3.5 flex h-11 w-11 items-center justify-center rounded-xl bg-surface-3 text-ink-faint">
          {icon}
        </div>
      )}

      <p className="text-sm font-medium text-ink">{title}</p>

      {description && (
        <p className="mt-1.5 max-w-sm text-sm text-ink-muted">{description}</p>
      )}

      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Loading
// ---------------------------------------------------------------------------

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cx("animate-pulse rounded-lg bg-surface-3", className)}
      aria-hidden
    />
  );
}

export function TableSkeleton({
  rows = 6,
  columns = 5,
}: {
  rows?: number;
  columns?: number;
}) {
  return (
    <div aria-busy className="divide-y divide-line">
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex items-center gap-4 px-5 py-3.5">
          {Array.from({
            length: columns,
          }).map((__, colIndex) => (
            <Skeleton
              key={colIndex}
              className={cx(
                "h-3.5",
                colIndex === 0 ? "w-28" : colIndex === 1 ? "flex-1" : "w-16",
              )}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export function Spinner({
  className,
  label = "Loading",
}: {
  className?: string;
  label?: string;
}) {
  return (
    <div
      className={cx("flex items-center justify-center py-20", className)}
      role="status"
    >
      <span className="h-6 w-6 animate-spin rounded-full border-2 border-line border-t-brand-500" />
      <span className="sr-only">{label}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// KPI Card
// ---------------------------------------------------------------------------

export function StatCard({
  label,
  value,
  icon,
  tone = "brand",
  hint,
  change,
  sparkline,
  href,
}: {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  tone?: Tone;
  hint?: string;
  change?: {
    value: number;
    label: string;
  };
  sparkline?: React.ReactNode;
  href?: string;
}) {
  const direction = change
    ? change.value > 0
      ? "up"
      : change.value < 0
        ? "down"
        : "flat"
    : null;

  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <span
          className={cx(
            "flex h-9 w-9 items-center justify-center rounded-xl",
            TONE_SURFACE[tone],
          )}
        >
          {icon}
        </span>

        {change && (
          <span
            className={cx(
              "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-2xs font-medium",
              direction === "up"
                ? "bg-success-bg text-success-fg"
                : direction === "down"
                  ? "bg-danger-bg text-danger-fg"
                  : "bg-neutral-bg text-neutral-fg",
            )}
          >
            <span aria-hidden>
              {direction === "up" ? "↑" : direction === "down" ? "↓" : "→"}
            </span>
            {Math.abs(change.value)}%
            <span className="sr-only">
              {direction === "up"
                ? "increase"
                : direction === "down"
                  ? "decrease"
                  : "no change"}
            </span>
          </span>
        )}
      </div>

      <p className="mt-4 text-xs font-medium text-ink-muted">{label}</p>

      <div className="mt-1 flex items-end justify-between gap-3">
        <p className="text-2xl font-semibold tabular-nums leading-none tracking-tight text-ink">
          {value}
        </p>

        {sparkline && <div className="shrink-0 opacity-90">{sparkline}</div>}
      </div>

      {(hint || change) && (
        <p className="mt-2 truncate text-2xs text-ink-faint">
          {change?.label ?? hint}
        </p>
      )}
    </>
  );

  const className =
    "block rounded-2xl border border-line bg-surface p-5 shadow-card transition-shadow duration-200";

  return href ? (
    <a href={href} className={cx(className, "hover:shadow-lift")}>
      {body}
    </a>
  ) : (
    <div className={className}>{body}</div>
  );
}

// ---------------------------------------------------------------------------
// Chart Card
// ---------------------------------------------------------------------------

export function ChartCard({
  title,
  description,
  action,
  children,
  loading,
  empty,
  footer,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  loading?: boolean;
  empty?: {
    title: string;
    description?: string;
  } | null;
  footer?: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader title={title} description={description} action={action} />

      <div className="px-5 pb-5">
        {loading ? (
          <div className="h-[260px]">
            <Skeleton className="h-full w-full" />
          </div>
        ) : empty ? (
          <EmptyState title={empty.title} description={empty.description} />
        ) : (
          children
        )}
      </div>

      {footer && <div className="border-t border-line px-5 py-3">{footer}</div>}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Table
// ---------------------------------------------------------------------------

export function Table({
  children,
  label,
}: {
  children: React.ReactNode;
  label?: string;
}) {
  return (
    <div className="scroll-slim overflow-x-auto">
      <table
        className="w-full border-collapse text-left text-sm"
        aria-label={label}
      >
        {children}
      </table>
    </div>
  );
}

export function Th({
  children,
  className,
  onSort,
  sorted,
  align = "left",
}: {
  children?: React.ReactNode;
  className?: string;
  onSort?: () => void;
  sorted?: "asc" | "desc" | null;
  align?: "left" | "right" | "center";
}) {
  const content = (
    <span
      className={cx(
        "inline-flex items-center gap-1",
        align === "right" && "flex-row-reverse",
      )}
    >
      {children}

      {onSort && (
        <span
          className={cx(
            "text-[8px]",
            sorted ? "text-brand-500" : "text-ink-faint/60",
          )}
          aria-hidden
        >
          {sorted === "asc" ? "▲" : sorted === "desc" ? "▼" : "↕"}
        </span>
      )}
    </span>
  );

  return (
    <th
      scope="col"
      aria-sort={
        sorted ? (sorted === "asc" ? "ascending" : "descending") : undefined
      }
      className={cx(
        "whitespace-nowrap border-b border-line bg-surface-2 px-5 py-2.5 text-2xs font-semibold uppercase tracking-wide text-ink-muted",
        align === "right" && "text-right",
        align === "center" && "text-center",
        className,
      )}
    >
      {onSort ? (
        <button
          type="button"
          onClick={onSort}
          className="inline-flex items-center gap-1 rounded transition-colors hover:text-ink"
        >
          {content}
        </button>
      ) : (
        content
      )}
    </th>
  );
}

export function Td({
  children,
  className,
  align = "left",
}: {
  children?: React.ReactNode;
  className?: string;
  align?: "left" | "right" | "center";
}) {
  return (
    <td
      className={cx(
        "border-b border-line px-5 py-3.5 align-middle text-ink",
        align === "right" && "text-right",
        align === "center" && "text-center",
        className,
      )}
    >
      {children}
    </td>
  );
}

export function Tr({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <tr
      className={cx(
        "transition-colors duration-100 hover:bg-surface-2",
        onClick && "cursor-pointer",
      )}
      onClick={onClick}
    >
      {children}
    </tr>
  );
}

// ---------------------------------------------------------------------------
// Pagination
// ---------------------------------------------------------------------------

export function Pagination({
  page,
  totalPages,
  total,
  onChange,
}: {
  page: number;
  totalPages: number;
  total: number;
  onChange: (page: number) => void;
}) {
  return (
    <nav
      aria-label="Pagination"
      className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-5 py-3"
    >
      <p className="text-xs text-ink-muted">
        Page <span className="font-medium text-ink">{page}</span> of{" "}
        {totalPages} · {total.toLocaleString()} record
        {total === 1 ? "" : "s"}
      </p>

      <div className="flex gap-2">
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
        >
          Previous
        </Button>

        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={page >= totalPages}
          onClick={() => onChange(page + 1)}
        >
          Next
        </Button>
      </div>
    </nav>
  );
}

// ---------------------------------------------------------------------------
// Modal
// ---------------------------------------------------------------------------

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  width = "md",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  width?: "sm" | "md" | "lg";
}) {
  const panelRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;

    const panel = panelRef.current;

    if (!panel) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== "Tab" || !panelRef.current) {
        return;
      }

      const focusable = panelRef.current.querySelectorAll<HTMLElement>(
        'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])',
      );

      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", onKeyDown);

    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";

    /*
     * Only focus the first control when the modal
     * opens. We deliberately do not run this on
     * every render/keystroke.
     */
    const timer = window.setTimeout(() => {
      panel
        .querySelector<HTMLElement>(
          "input:not([disabled]),select:not([disabled]),textarea:not([disabled]),button:not([disabled])",
        )
        ?.focus();
    }, 40);

    return () => {
      window.removeEventListener("keydown", onKeyDown);

      document.body.style.overflow = previousOverflow;

      window.clearTimeout(timer);
    };
  }, [open, onClose]);

  if (!open) return null;

  const widths = {
    sm: "max-w-sm",
    md: "max-w-lg",
    lg: "max-w-3xl",
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="presentation"
    >
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in"
        onMouseDown={(event) => {
          /*
           * Only close when the actual backdrop was clicked.
           * This prevents accidental closing when interacting
           * with content inside the modal.
           */
          if (event.target === event.currentTarget) {
            onClose();
          }
        }}
        aria-hidden
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cx(
          "relative w-full rounded-2xl border border-line bg-surface shadow-pop animate-scale-in",
          widths[width],
        )}
      >
        <div className="px-5 pb-4 pt-5">
          <h2 className="text-sm font-semibold text-ink">{title}</h2>

          {description && (
            <p className="mt-1 text-xs text-ink-muted">{description}</p>
          )}
        </div>

        <div className="scroll-slim max-h-[60vh] overflow-y-auto px-5">
          {children}
        </div>

        {footer && (
          <div className="flex justify-end gap-2 border-t border-line px-5 py-4">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Dropdown
// ---------------------------------------------------------------------------

export function Dropdown({
  trigger,
  children,
  align = "right",
  width = "w-56",
}: {
  trigger: (props: { open: boolean; toggle: () => void }) => React.ReactNode;

  children: (props: { close: () => void }) => React.ReactNode;

  align?: "left" | "right";
  width?: string;
}) {
  const [open, setOpen] = React.useState(false);

  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", onPointerDown);

    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("mousedown", onPointerDown);

      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      {trigger({
        open,
        toggle: () => setOpen((value) => !value),
      })}

      {open && (
        <div
          className={cx(
            "absolute z-40 mt-2 overflow-hidden rounded-xl border border-line bg-surface p-1 shadow-pop animate-slide-up",
            align === "right" ? "right-0" : "left-0",
            width,
          )}
          role="menu"
        >
          {children({
            close: () => setOpen(false),
          })}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Menu Item
// ---------------------------------------------------------------------------

export function MenuItem({
  onClick,
  icon,
  active,
  danger,
  children,
}: {
  onClick?: () => void;
  icon?: React.ReactNode;
  active?: boolean;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={cx(
        "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition-colors",
        danger
          ? "text-danger-fg hover:bg-danger-bg"
          : active
            ? "bg-surface-3 text-ink font-medium"
            : "text-ink-muted hover:bg-surface-2 hover:text-ink",
      )}
    >
      {icon && <span className="shrink-0">{icon}</span>}

      <span className="flex-1 truncate">{children}</span>

      {active && (
        <svg
          viewBox="0 0 16 16"
          className="h-3.5 w-3.5 shrink-0 text-brand-500"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          aria-hidden
        >
          <path
            d="m3 8.5 3.5 3.5L13 5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Avatar
// ---------------------------------------------------------------------------

export function Avatar({
  name,
  size = "md",
  tone = "neutral",
}: {
  name: string;
  size?: "sm" | "md" | "lg";
  tone?: Tone;
}) {
  const sizes = {
    sm: "h-6 w-6 text-[10px]",
    md: "h-8 w-8 text-xs",
    lg: "h-10 w-10 text-sm",
  };

  return (
    <span
      className={cx(
        "inline-flex shrink-0 items-center justify-center rounded-full font-semibold",
        sizes[size],
        TONE_SURFACE[tone],
      )}
      aria-hidden
    >
      {name}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Segmented
// ---------------------------------------------------------------------------

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: Array<{
    value: T;
    label: string;
  }>;

  value: T;
  onChange: (value: T) => void;
  label?: string;
}) {
  return (
    <div
      className="inline-flex rounded-xl border border-line bg-surface-2 p-0.5"
      role="tablist"
      aria-label={label}
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="tab"
          aria-selected={value === option.value}
          onClick={() => onChange(option.value)}
          className={cx(
            "rounded-[10px] px-3 py-1.5 text-xs font-medium transition-colors duration-150",
            value === option.value
              ? "bg-surface text-ink shadow-sm"
              : "text-ink-muted hover:text-ink",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page Header
// ---------------------------------------------------------------------------

export function PageHeader({
  title,
  description,
  action,
  breadcrumb,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  breadcrumb?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {breadcrumb}

        <h1 className="text-xl font-semibold tracking-tight text-ink">
          {title}
        </h1>

        {description && (
          <p className="mt-1 text-sm text-ink-muted">{description}</p>
        )}
      </div>

      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Progress Bar
// ---------------------------------------------------------------------------

export function ProgressBar({
  percentage,
  tone,
}: {
  percentage: number;
  tone?: Tone;
}) {
  const colour = tone
    ? TONE_DOT[tone]
    : percentage >= 100
      ? "bg-success-solid"
      : percentage >= 60
        ? "bg-brand-500"
        : "bg-warning-solid";

  return (
    <div
      className="h-1.5 w-full overflow-hidden rounded-full bg-surface-3"
      role="progressbar"
      aria-valuenow={Math.round(percentage)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={cx(
          "h-full rounded-full transition-all duration-500 ease-swift",
          colour,
        )}
        style={{
          width: `${Math.min(100, Math.max(0, percentage))}%`,
        }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tooltip
// ---------------------------------------------------------------------------

export function Tip({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <span className="group/tip relative flex">
      {children}

      <span
        role="tooltip"
        className="pointer-events-none absolute left-full top-1/2 z-50 ml-3 -translate-y-1/2 whitespace-nowrap rounded-lg border border-line bg-surface px-2.5 py-1.5 text-xs font-medium text-ink opacity-0 shadow-lift transition-opacity duration-150 group-hover/tip:opacity-100"
      >
        {label}
      </span>
    </span>
  );
}
