import type { CSSProperties, ReactNode } from "react";

export type GameProps = {
  options: Record<string, unknown>;
  onComplete: (success: boolean, data?: Record<string, unknown>) => void;
};

export function clampOption(
  options: Record<string, unknown>,
  key: string,
  fallback: number,
  min: number,
  max: number,
) {
  const value = Number(options[key]);
  return Math.min(
    max,
    Math.max(min, Number.isFinite(value) ? value : fallback),
  );
}

export function localeText(
  options: Record<string, unknown>,
  key: string,
  fallback: string,
  variables: Record<string, string | number> = {},
) {
  const locale =
    options.locale && typeof options.locale === "object"
      ? (options.locale as Record<string, unknown>)
      : {};
  const value = typeof locale[key] === "string" ? locale[key] : fallback;

  return value.replace(/\{(\w+)\}/g, (token, name: string) =>
    variables[name] === undefined ? token : String(variables[name]),
  );
}

export function GamePanel({
  eyebrow,
  title,
  instructions,
  children,
  status,
  compact = false,
  variant,
  cancelLabel = "CANCEL",
}: {
  eyebrow: string;
  title: string;
  instructions: string;
  children: ReactNode;
  status?: string;
  compact?: boolean;
  variant?: string;
  cancelLabel?: string;
}) {
  const className = [
    "mini-panel",
    variant && `mini-panel--${variant}`,
    compact && "is-compact",
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <section className={className}>
      <i className="panel-screw panel-screw--tl" />
      <i className="panel-screw panel-screw--tr" />
      <i className="panel-screw panel-screw--bl" />
      <i className="panel-screw panel-screw--br" />
      <header className="mini-panel__header">
        <div>
          <span>{eyebrow}</span>
          <h1>{title}</h1>
        </div>
        {status && <output aria-live="polite">{status}</output>}
      </header>
      <div className="mini-panel__stage">{children}</div>
      <footer>
        <p>{instructions}</p>
        <span>
          <kbd>ESC</kbd> {cancelLabel}
        </span>
      </footer>
    </section>
  );
}

export function rangeStyle(value: number) {
  return { "--value": value } as CSSProperties;
}

export function shuffle<T>(items: T[]) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const target = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[target]] = [copy[target], copy[index]];
  }
  return copy;
}
