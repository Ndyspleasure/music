import { useId, type ButtonHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from "react";
import { cx } from "../../utils/cx";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

export function Button({
  variant = "secondary",
  size = "md",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: "sm" | "md" | "lg" }) {
  return (
    <button
      type="button"
      className={cx(
        "inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-45",
        size === "sm" && "h-8 px-3 text-xs",
        size === "md" && "h-10 px-4 text-sm",
        size === "lg" && "h-12 px-6 text-base",
        variant === "primary" && "bg-spot text-stage-950 hover:bg-spot-soft",
        variant === "secondary" &&
          "border border-stage-600 bg-stage-800 text-ink hover:border-stage-500 hover:bg-stage-700",
        variant === "ghost" && "text-ink-muted hover:bg-stage-800 hover:text-ink",
        variant === "danger" && "bg-bad/90 text-stage-950 hover:bg-bad",
        className,
      )}
      {...props}
    />
  );
}

export function Panel({
  title,
  actions,
  children,
  className,
}: {
  title?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cx("rounded-2xl border border-stage-700 bg-stage-850/80 p-4 backdrop-blur", className)}>
      {(title || actions) && (
        <header className="mb-3 flex items-center justify-between gap-2">
          {title && <h2 className="text-xs font-semibold tracking-[0.14em] text-ink-muted uppercase">{title}</h2>}
          {actions}
        </header>
      )}
      {children}
    </section>
  );
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: (id: string) => ReactNode;
}) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-xs font-medium text-ink-muted">
        {label}
      </label>
      {children(id)}
      {hint && <p className="text-[11px] leading-snug text-ink-faint">{hint}</p>}
    </div>
  );
}

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cx(
        "h-10 w-full rounded-xl border border-stage-600 bg-stage-800 px-3 text-sm text-ink hover:border-stage-500",
        className,
      )}
      {...props}
    />
  );
}

export function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  format,
  hint,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  format?: (v: number) => string;
  hint?: string;
}) {
  const id = useId();
  const display = format ? format(value) : String(value);
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline justify-between">
        <label htmlFor={id} className="text-xs font-medium text-ink-muted">
          {label}
        </label>
        <output htmlFor={id} className="font-mono text-xs text-ink tabular-nums">
          {display}
        </output>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-valuetext={display}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-6 w-full cursor-pointer"
      />
      {hint && <p className="text-[11px] leading-snug text-ink-faint">{hint}</p>}
    </div>
  );
}

export function Toggle({
  label,
  checked,
  onChange,
  hint,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  hint?: string;
}) {
  const id = useId();
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex flex-col">
        <label htmlFor={id} className="cursor-pointer text-sm text-ink">
          {label}
        </label>
        {hint && <span className="text-[11px] leading-snug text-ink-faint">{hint}</span>}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cx(
          "relative mt-0.5 h-6 w-11 shrink-0 rounded-full border transition-colors",
          checked ? "border-spot bg-spot/80" : "border-stage-600 bg-stage-700",
        )}
      >
        <span
          className={cx(
            "absolute top-0.5 left-0.5 h-4.5 w-4.5 rounded-full bg-ink shadow transition-transform",
            checked && "translate-x-5",
          )}
        />
        <span className="sr-only">{checked ? "Aktif" : "Nonaktif"}</span>
      </button>
    </div>
  );
}

export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string; icon?: ReactNode }[];
  onChange: (v: T) => void;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="grid auto-cols-fr grid-flow-col gap-1 rounded-xl border border-stage-700 bg-stage-900 p-1"
    >
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cx(
            "flex h-9 items-center justify-center gap-1.5 rounded-lg px-2 text-sm font-medium transition-colors",
            value === o.value ? "bg-stage-700 text-ink shadow-inner" : "text-ink-muted hover:text-ink",
          )}
        >
          {o.icon}
          {o.label}
        </button>
      ))}
    </div>
  );
}

export type Tone = "ok" | "warn" | "bad" | "idle" | "busy";

export function StatusDot({ tone }: { tone: Tone }) {
  return (
    <span
      aria-hidden
      className={cx(
        "inline-block h-2 w-2 shrink-0 rounded-full",
        tone === "ok" && "bg-ok",
        tone === "warn" && "bg-warn",
        tone === "bad" && "bg-bad",
        tone === "idle" && "bg-stage-500",
        tone === "busy" && "animate-pulse bg-glow",
      )}
    />
  );
}

export function Badge({ children, tone = "idle" }: { children: ReactNode; tone?: Tone }) {
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold tracking-wide uppercase",
        tone === "ok" && "bg-ok/15 text-ok",
        tone === "warn" && "bg-warn/15 text-warn",
        tone === "bad" && "bg-bad/15 text-bad",
        (tone === "idle" || tone === "busy") && "bg-stage-700 text-ink-muted",
      )}
    >
      {children}
    </span>
  );
}
