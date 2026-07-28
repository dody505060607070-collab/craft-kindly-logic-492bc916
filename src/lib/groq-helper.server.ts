// Server-only helper for Groq calls. Never import from browser code.

const CHAT_URL = "https://api.groq.com/openai/v1/chat/completions";
const TRANSCRIBE_URL = "https://api.groq.com/openai/v1/audio/transcriptions";

// Balanced quality: llama-3.3-70b-versatile
// Fast: llama-3.1-8b-instant
export const GROQ_SMART = "llama-3.3-70b-versatile";
export const GROQ_FAST = "llama-3.1-8b-instant";

export type GroqMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export async function groqChat(opts: {
  messages: GroqMessage[];
  json?: boolean;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}): Promise<string> {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error("GROQ_API_KEY غير مهيأ");

  const body: Record<string, unknown> = {
    model: opts.model ?? GROQ_SMART,
    messages: opts.messages,
    temperature: opts.temperature ?? 0.4,
    max_tokens: opts.maxTokens ?? 2048,
  };
  if (opts.json) body.response_format = { type: "json_object" };

  const res = await fetch(CHAT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Groq ${res.status}: ${text.slice(0, 400)}`);
  }
  const j = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  return j.choices?.[0]?.message?.content ?? "";
}

export async function groqJSON<T>(opts: {
  system: string;
  user: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}): Promise<T> {
  const raw = await groqChat({
    messages: [
      { role: "system", content: opts.system + "\n\nأعِد الرد JSON فقط بدون شرح إضافي." },
      { role: "user", content: opts.user },
    ],
    json: true,
    model: opts.model,
    temperature: opts.temperature,
    maxTokens: opts.maxTokens,
  });
  try {
    return JSON.parse(raw) as T;
  } catch {
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]) as T;
    throw new Error("رد الذكاء الاصطناعي مش JSON صالح");
  }
}

export async function groqTranscribe(file: File | Blob, filename = "voice.webm"): Promise<string> {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error("GROQ_API_KEY غير مهيأ");

  if (!file || file.size < 1024) {
    throw new Error("التسجيل قصير أو فاضي — سجّل تاني وتأكد من الميكروفون");
  }

  const fd = new FormData();
  fd.append("file", file, filename);
  fd.append("model", "whisper-large-v3-turbo");
  fd.append("response_format", "json");

  const res = await fetch(TRANSCRIBE_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}` },
    body: fd,
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Groq transcribe ${res.status}: ${t.slice(0, 300)}`);
  }
  const j = (await res.json()) as { text?: string };
  return j.text ?? "";
}