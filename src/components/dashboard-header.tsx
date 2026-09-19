import { logout } from "@/app/actions/auth";

export function DashboardHeader() {
  return (
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-border)] px-4 py-3 sm:px-6">
      <h1 className="glow text-xl tracking-widest text-[var(--color-accent)]">FOREXMIND</h1>
      <form action={logout}>
        <button
          type="submit"
          className="rounded border border-[var(--color-border)] px-3 py-1 text-xs uppercase tracking-wider text-[var(--color-muted)] transition hover:border-[var(--color-accent-dim)] hover:text-[var(--color-accent)]"
        >
          Log out
        </button>
      </form>
    </header>
  );
}
