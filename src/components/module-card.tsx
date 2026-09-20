import type { ReactNode } from "react";
import { HudCorners } from "./hud-corners";
import { LastUpdated } from "./last-updated";

export function ModuleCard({
  title,
  status,
  children,
  className = "",
  lastUpdated,
  onRefresh,
  refreshing,
}: {
  title: string;
  status: "live" | "soon";
  children: ReactNode;
  className?: string;
  lastUpdated?: string | null;
  onRefresh?: () => void;
  refreshing?: boolean;
}) {
  return (
    <section
      className={`relative flex flex-col gap-3 border border-[var(--color-border)] bg-[var(--color-panel)]/80 p-4 backdrop-blur-sm ${className}`}
    >
      <HudCorners />
      <header className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <h2 className="text-sm uppercase tracking-[0.15em] text-[var(--color-accent)]">{title}</h2>
        <div className="flex items-center gap-2">
          {lastUpdated !== undefined && <LastUpdated at={lastUpdated} />}
          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              disabled={refreshing}
              aria-label="Refresh"
              title="Refresh now"
              className="text-[var(--color-muted)] transition hover:text-[var(--color-accent)] disabled:opacity-40"
            >
              <span className={refreshing ? "inline-block animate-spin" : "inline-block"}>⟳</span>
            </button>
          )}
          <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-[var(--color-muted)]">
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                status === "live" ? "animate-pulse bg-[var(--color-accent)]" : "bg-[var(--color-border)]"
              }`}
            />
            {status === "live" ? "Live" : "Soon"}
          </span>
        </div>
      </header>
      <div className="text-sm text-[var(--color-foreground)]">{children}</div>
    </section>
  );
}
