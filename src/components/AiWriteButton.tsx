import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { askGroq } from "@/lib/groq.functions";

type Props = {
  purpose: string; // e.g. "شريط علوي متحرك قصير للموقع"
  placeholder?: string;
  onGenerated: (text: string) => void;
  label?: string;
};

export function AiWriteButton({ purpose, placeholder, onGenerated, label = "اكتب بالذكاء" }: Props) {
  const [open, setOpen] = useState(false);
  const [hint, setHint] = useState("");
  const [busy, setBusy] = useState(false);
  const ask = useServerFn(askGroq);

  const generate = async () => {
    setBusy(true);
    try {
      const system = `أنت مساعد كتابة إعلانات باللهجة المصرية لمنصة تعليمية اسمها "المستر". اكتب نص ${purpose}. مباشر، مختصر، بدون علامات اقتباس أو رموز markdown، ومناسب للعرض للطلاب.`;
      const user = hint.trim()
        ? `المطلوب بالتحديد: ${hint.trim()}`
        : `اكتب نصًا جذابًا مناسبًا لـ ${purpose} لمنصة المستر التعليمية.`;
      const res = await ask({
        data: {
          mode: "admin",
          messages: [
            { role: "system", content: system },
            { role: "user", content: user },
          ],
        },
      });
      const clean = (res?.reply ?? "").replace(/^["']|["']$/g, "").trim();
      if (!clean) throw new Error("مفيش رد");
      onGenerated(clean);
      toast.success("جاهز! ممكن تعدّل النص قبل الحفظ.");
      setOpen(false);
      setHint("");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 rounded-lg bg-accent/15 px-3 py-1.5 text-xs font-bold text-accent hover:bg-accent/25"
      >
        <Sparkles className="size-3.5" /> {label}
      </button>
      {open && (
        <div className="absolute end-0 z-30 mt-2 w-72 rounded-2xl border border-border bg-surface p-3 shadow-2xl">
          <label className="mb-1 block text-[11px] font-bold text-muted-foreground">
            وصف مختصر للإعلان (اختياري)
          </label>
          <textarea
            rows={2}
            value={hint}
            onChange={(e) => setHint(e.target.value)}
            placeholder={placeholder ?? "مثال: تذكير بحصة مراجعة الجبر يوم الجمعة"}
            className="w-full rounded-lg border border-input bg-background px-2 py-1.5 text-xs outline-none"
          />
          <div className="mt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg px-3 py-1.5 text-xs text-muted-foreground"
            >
              إلغاء
            </button>
            <button
              type="button"
              onClick={generate}
              disabled={busy}
              className="flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground disabled:opacity-60"
            >
              {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
              أنشئ
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
