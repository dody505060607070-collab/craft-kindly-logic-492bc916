import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import ReactMarkdown from "react-markdown";
import { Bot, Mic, MicOff, Send, Sparkles, X, Loader2 } from "lucide-react";
import { askGroq } from "@/lib/groq.functions";

type Msg = { role: "user" | "assistant"; content: string };

export function AIChat({ mode = "student", context }: { mode?: "student" | "admin"; context?: string }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "assistant",
      content:
        mode === "admin"
          ? "أنا مساعدك الذكي 👋 اسألني عن الطلاب، المدفوعات، الدرجات، أو خلّيني أكتب لك رد أو أعمل تلخيص."
          : "أهلاً بيك 👋 أنا مساعد المستر. اسألني في أي حاجة في البرمجة أو الذكاء الاصطناعي.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const mediaRec = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const ask = useServerFn(askGroq);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    const next: Msg[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const res = await ask({ data: { messages: next, mode, context } });
      setMessages((m) => [...m, { role: "assistant", content: res.reply || "…" }]);
    } catch (e) {
      setMessages((m) => [
        ...m,
        { role: "assistant", content: "حصل خطأ في الاتصال بالذكاء الاصطناعي. جرّب تاني بعد شوية." },
      ]);
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const toggleRecord = async () => {
    if (recording) {
      mediaRec.current?.stop();
      setRecording(false);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      chunks.current = [];
      rec.ondataavailable = (e) => e.data.size && chunks.current.push(e.data);
      rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const mime = mediaRec.current?.mimeType || "audio/webm";
        const blob = new Blob(chunks.current, { type: mime });
        if (blob.size < 2048) {
          setMessages((m) => [...m, { role: "assistant", content: "التسجيل قصير جدًا — اضغط الميكروفون وتكلم لثانيتين على الأقل." }]);
          setTranscribing(false);
          return;
        }
        const ext = mime.includes("mp4") ? "mp4" : mime.includes("ogg") ? "ogg" : mime.includes("wav") ? "wav" : "webm";
        setTranscribing(true);
        try {
          const fd = new FormData();
          fd.append("file", blob, `voice.${ext}`);
          const res = await fetch("/api/ai/transcribe", { method: "POST", body: fd });
          if (!res.ok) {
            const errText = await res.text();
            setMessages((m) => [...m, { role: "assistant", content: `تعذّر تحويل الصوت: ${errText}` }]);
            return;
          }
          const j = (await res.json()) as { text?: string };
          setInput((prev) => (prev ? prev + " " : "") + (j.text ?? ""));
        } catch (err) {
          console.error(err);
          setMessages((m) => [...m, { role: "assistant", content: "تعذّر الاتصال بخدمة التحويل الصوتي." }]);
        } finally {
          setTranscribing(false);
        }
      };
      rec.start();
      mediaRec.current = rec;
      setRecording(true);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-full bg-gradient-to-tr from-primary to-accent px-4 py-3 text-sm font-bold text-primary-foreground shadow-2xl transition hover:scale-105"
        aria-label="افتح المساعد الذكي"
      >
        <Sparkles className="size-4" />
        مساعد ذكي
      </button>

      {open && (
        <div className="fixed inset-0 z-[60] flex items-end justify-end bg-black/50 p-0 sm:items-end sm:p-5">
          <div className="flex h-[85vh] w-full flex-col rounded-t-3xl border border-border/60 bg-surface shadow-2xl sm:h-[600px] sm:max-w-md sm:rounded-3xl">
            <div className="flex items-center justify-between border-b border-border/50 px-4 py-3">
              <div className="flex items-center gap-2">
                <div className="grid size-9 place-items-center rounded-full bg-primary/15 text-primary">
                  <Bot className="size-4" />
                </div>
                <div>
                  <p className="font-bold">مساعد ذكي (Groq)</p>
                  <p className="text-[10px] text-muted-foreground">
                    {mode === "admin" ? "وضع الأدمن — فلترة وتحليل" : "شرح ومساعدة تعليمية"}
                  </p>
                </div>
              </div>
              <button onClick={() => setOpen(false)} aria-label="إغلاق">
                <X className="size-5" />
              </button>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto p-4">
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                    m.role === "user"
                      ? "ml-auto bg-primary text-primary-foreground"
                      : "mr-auto bg-card text-foreground"
                  }`}
                >
                  {m.role === "assistant" ? (
                    <div className="prose prose-sm max-w-none">
                      <ReactMarkdown>{m.content}</ReactMarkdown>
                    </div>
                  ) : (
                    <div className="whitespace-pre-wrap">{m.content}</div>
                  )}
                </div>
              ))}
              {loading && (
                <div className="mr-auto flex items-center gap-2 rounded-2xl bg-card px-3 py-2 text-sm text-muted-foreground">
                  <Loader2 className="size-3.5 animate-spin" /> بيفكّر…
                </div>
              )}
              <div ref={endRef} />
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                void send();
              }}
              className="flex items-center gap-2 border-t border-border/50 p-3"
            >
              <button
                type="button"
                onClick={toggleRecord}
                disabled={loading || transcribing}
                title="سؤال صوتي"
                className={`grid size-10 place-items-center rounded-xl transition ${
                  recording ? "bg-destructive text-destructive-foreground animate-pulse" : "bg-card hover:bg-primary/10"
                }`}
              >
                {transcribing ? <Loader2 className="size-4 animate-spin" /> : recording ? <MicOff className="size-4" /> : <Mic className="size-4" />}
              </button>
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="اكتب سؤالك…"
                className="flex-1 rounded-xl border border-border/60 bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                disabled={loading}
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="grid size-10 place-items-center rounded-xl bg-primary text-primary-foreground disabled:opacity-50"
              >
                <Send className="size-4" />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
