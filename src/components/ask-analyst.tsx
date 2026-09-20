"use client";

import { useState } from "react";
import { ModuleCard } from "@/components/module-card";

type Exchange = { question: string; answer: string; error?: boolean };

export function AskAnalyst() {
  const [question, setQuestion] = useState("");
  const [pending, setPending] = useState(false);
  const [history, setHistory] = useState<Exchange[]>([]);
  const [notConfigured, setNotConfigured] = useState<string | null>(null);

  async function ask(e: React.FormEvent) {
    e.preventDefault();
    const q = question.trim();
    if (!q || pending) return;
    setPending(true);
    setQuestion("");

    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q }),
      });
      const data = await res.json();
      if (!data.configured) {
        setNotConfigured(data.message);
      } else if (data.error) {
        setHistory((prev) => [{ question: q, answer: data.error, error: true }, ...prev]);
      } else {
        setHistory((prev) => [{ question: q, answer: data.answer }, ...prev]);
      }
    } catch (err) {
      setHistory((prev) => [
        { question: q, answer: err instanceof Error ? err.message : "Network error", error: true },
        ...prev,
      ]);
    }
    setPending(false);
  }

  return (
    <ModuleCard title="Ask the Analyst" status="live">
      <div className="flex flex-col gap-3">
        {notConfigured ? (
          <p className="text-[var(--color-muted)]">{notConfigured}</p>
        ) : (
          <>
            <form onSubmit={ask} className="flex gap-2">
              <input
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="What do you think of today's CPI print for EUR/USD?"
                className="flex-1 rounded border border-[var(--color-border)] bg-black px-2 py-1 text-xs text-[var(--color-foreground)] outline-none focus:border-[var(--color-accent)]"
              />
              <button
                type="submit"
                disabled={pending}
                className="rounded border border-[var(--color-accent-dim)] px-3 py-1 text-xs uppercase tracking-wider text-[var(--color-accent)] hover:bg-[var(--color-accent-dim)]/10 disabled:opacity-50"
              >
                {pending ? "..." : "Ask"}
              </button>
            </form>

            <div className="flex max-h-64 flex-col gap-3 overflow-y-auto">
              {history.map((h, i) => (
                <div key={i} className="border-l-2 border-[var(--color-border)] pl-2">
                  <p className="text-xs text-[var(--color-accent)]">{h.question}</p>
                  <p className={`mt-1 text-xs ${h.error ? "text-[var(--color-danger)]" : "text-[var(--color-foreground)]"}`}>
                    {h.answer}
                  </p>
                </div>
              ))}
              {history.length === 0 && <p className="text-xs text-[var(--color-muted)]">Ask about any headline or move — answers are grounded in live prices and recent news, not guessed.</p>}
            </div>
          </>
        )}
      </div>
    </ModuleCard>
  );
}
