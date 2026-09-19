import type { ReactNode } from "react";
import { HudCorners } from "./hud-corners";

export function ModuleCard({
  title,
  status,
  children,
  className = "",
}: {
  title: string;
  status: "live" | "soon";
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`relative flex flex-col gap-3 border border-[var(--color-border)] bg-[var(--color-panel)]/80 p-4 backdrop-blur-sm ${className}`}
    >
      <HudCorners />
      <header className="flex items-center justify-between">
        <h2 className="text-sm uppercase tracking-[0.15em] text-[var(--color-accent)]">{title}</h2>
        <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-[var(--color-muted)]">
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              status === "live" ? "animate-pulse bg-[var(--color-accent)]" : "bg-[var(--color-border)]"
            }`}
          />
          {status === "live" ? "Live" : "Soon"}
        </span>
      </header>
      <div className="text-sm text-[var(--color-foreground)]">{children}</div>
    </section>
  );
}
