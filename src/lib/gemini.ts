import "server-only";

// Cheapest current Flash-tier model as of the ForexMind Build Roadmap's 2026-09-19 cost pass.
// Gemini 2.0 Flash (the original plan) was discontinued before that plan was even written —
// re-verify this is still current before relying on it long-term; this catalog churns fast.
const MODEL = "gemini-3.1-flash-lite";
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

export async function generateJSON<T>(systemPrompt: string, userPrompt: string): Promise<T> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY not configured");

  const res = await fetch(`${ENDPOINT}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents: [{ parts: [{ text: userPrompt }] }],
      generationConfig: { responseMimeType: "application/json" },
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Gemini returned ${res.status}: ${body.slice(0, 300)}`);
  }

  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Gemini response had no content");

  return JSON.parse(text) as T;
}
