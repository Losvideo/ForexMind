import "server-only";
import { getDb } from "@/lib/db";

// Cheapest current Flash-tier model as of the ForexMind Build Roadmap's 2026-09-19 cost pass.
// Gemini 2.0 Flash (the original plan) was discontinued before that plan was even written —
// re-verify this is still current before relying on it long-term; this catalog churns fast.
const MODEL = "gemini-3.1-flash-lite";
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

async function logUsage(module: string, promptTokens: number, outputTokens: number) {
  if (!process.env.DATABASE_URL) return;
  try {
    const sql = getDb();
    await sql`INSERT INTO gemini_usage_log (module, prompt_tokens, output_tokens) VALUES (${module}, ${promptTokens}, ${outputTokens})`;
  } catch {
    // Usage logging is for cost visibility, not correctness — never let it break a real request.
  }
}

async function callGemini(module: string, systemPrompt: string, userPrompt: string, jsonMode: boolean): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY not configured");

  const res = await fetch(`${ENDPOINT}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents: [{ parts: [{ text: userPrompt }] }],
      ...(jsonMode ? { generationConfig: { responseMimeType: "application/json" } } : {}),
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Gemini returned ${res.status}: ${body.slice(0, 300)}`);
  }

  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Gemini response had no content");

  const usage = data.usageMetadata;
  if (usage) {
    await logUsage(module, usage.promptTokenCount ?? 0, usage.candidatesTokenCount ?? 0);
  }

  return text;
}

export async function generateJSON<T>(module: string, systemPrompt: string, userPrompt: string): Promise<T> {
  const text = await callGemini(module, systemPrompt, userPrompt, true);
  return JSON.parse(text) as T;
}

export async function generateText(module: string, systemPrompt: string, userPrompt: string): Promise<string> {
  return callGemini(module, systemPrompt, userPrompt, false);
}
