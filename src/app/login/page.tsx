"use client";

import { useActionState } from "react";
import { login, type LoginState } from "@/app/actions/auth";

export default function LoginPage() {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(login, undefined);

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm rounded border border-[var(--color-border)] bg-[var(--color-panel)] p-8 shadow-[0_0_24px_rgba(0,255,102,0.08)]">
        <h1 className="glow mb-1 text-2xl tracking-widest text-[var(--color-accent)]">
          FOREXMIND
        </h1>
        <p className="mb-6 text-sm text-[var(--color-muted)]">
          Restricted access. Enter the site password to continue.
        </p>

        <form action={formAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label htmlFor="password" className="text-xs uppercase tracking-wider text-[var(--color-muted)]">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoFocus
              className="rounded border border-[var(--color-border)] bg-black px-3 py-2 text-[var(--color-foreground)] outline-none focus:border-[var(--color-accent)]"
            />
          </div>

          {state?.error && (
            <p className="text-sm text-[var(--color-danger)]" role="alert">
              {state.error}
            </p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="mt-2 rounded border border-[var(--color-accent-dim)] bg-[var(--color-accent-dim)]/10 py-2 text-[var(--color-accent)] transition hover:bg-[var(--color-accent-dim)]/20 disabled:opacity-50"
          >
            {pending ? "Verifying..." : "Enter"}
          </button>
        </form>
      </div>
    </main>
  );
}
