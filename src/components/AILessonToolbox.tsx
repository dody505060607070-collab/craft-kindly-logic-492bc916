import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import ReactMarkdown from "react-markdown";
import { BookText, Brain, Bug, Code2, HelpCircle, Languages, Loader2, Sparkles, X } from "lucide-react";
import {
  summarizeLesson,
  generatePracticeQuestions,
  flashcards,
  explainCode,
  debugCode,
  translateTerm,
  studyPlan,
} from "@/lib/groq.functions";

type ToolKey = "summary" | "questions" | "flashcards" | "explain" | "debug" | "translate" | "plan";

const TOOLS: { key: ToolKey; label: string; icon: React.ComponentType<{ className?: string }>; desc: string }[] = [
  { key: "summary", label: "لخّص الدرس", icon: BookText, desc: "ملخص سريع بنقاط + جدول مصطلحات" },
  { key: "questions", label: "أسئلة تدريب", icon: HelpCircle, desc: "6 أسئلة MCQ/صح-خطأ مع الحل" },
  { key: "flashcards", label: "بطاقات مذاكرة", icon: Brain, desc: "Flashcards للحفظ السريع" },
  { key: "explain", label: "اشرح لي الكود", icon: Code2, desc: "شرح سطر سطر بالعربي" },
  { key: "debug", label: "صلح خطأ عندي", icon: Bug, desc: "لصق الكود والخطأ واعرف الحل" },
  { key: "translate", label: "ترجمة مصطلح", icon: Languages, desc: "مصطلح تقني + مثال" },
  { key: "plan", label: "خطة مذاكرة ليّ", icon: Sparkles, desc: "خطة شخصية بناءً على تقدمك" },
];

export function AILessonToolbox({ lessonText, lessonTitle }: { lessonText?: string; lessonTitle?: string }) {
  const [active, setActive] = useState<ToolKey | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string>("");
  const [inputA, setInputA] = useState("");
  const [inputB, setInputB] = useState("");
  const [error, setError] = useState("");

  const fnSummary = useServerFn(summarizeLesson);
  const fnQuestions = useServerFn(generatePracticeQuestions);
  const fnFlash = useServerFn(flashcards);
  const fnExplain = useServerFn(explainCode);
  const fnDebug = useServerFn(debugCode);
  const fnTranslate = useServerFn(translateTerm);
  const fnPlan = useServerFn(studyPlan);

  const source = lessonText && lessonText.length > 30 ? lessonText : (lessonTitle ?? "");

  const run = async () => {
    if (!active) return;
    setLoading(true);
    setError("");
    setResult("");
    try {
      if (active === "summary") {
        const r = await fnSummary({ data: { text: source || inputA || "درس عام", title: lessonTitle } });
        setResult(r.summary);
      } else if (active === "questions") {
        const r = await fnQuestions({ data: { text: source || inputA, count: 6 } });
        setResult(
          r.questions
            .map(
              (q, i) =>
                `**${i + 1}. ${q.prompt}**\n${
                  q.choices ? q.choices.map((c, j) => `- ${String.fromCharCode(1571 + j)}) ${c}`).join("\n") : ""
                }\n\n✅ الإجابة: **${String(q.answer)}**${q.explanation ? `\n💡 ${q.explanation}` : ""}`,
            )
            .join("\n\n---\n\n"),
        );
      } else if (active === "flashcards") {
        const r = await fnFlash({ data: { text: source || inputA, count: 8 } });
        setResult(r.cards.map((c, i) => `**${i + 1}. ${c.front}**\n> ${c.back}`).join("\n\n"));
      } else if (active === "explain") {
        if (!inputA.trim()) throw new Error("الصق الكود الأول");
        const r = await fnExplain({ data: { code: inputA, language: inputB || undefined } });
        setResult(r.explanation);
      } else if (active === "debug") {
        if (!inputA.trim() || !inputB.trim()) throw new Error("محتاج الكود ورسالة الخطأ");
        const r = await fnDebug({ data: { code: inputA, error: inputB } });
        setResult(r.diagnosis);
      } else if (active === "translate") {
        if (!inputA.trim()) throw new Error("اكتب المصطلح");
        const r = await fnTranslate({ data: { term: inputA, context: lessonTitle } });
        setResult(`### ${r.arabic} — \`${r.english}\`\n\n${r.definition}\n\n**مثال:** ${r.example}`);
      } else if (active === "plan") {
        const r = await fnPlan({ data: { days: 14, goals: inputA || undefined } });
        setResult(r.plan);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "حصل خطأ");
    } finally {
      setLoading(false);
    }
  };

  const needsInputA =
    active === "explain" ||
    active === "debug" ||
    active === "translate" ||
    active === "plan" ||
    (!source && (active === "summary" || active === "questions" || active === "flashcards"));
  const needsInputB = active === "debug";

  return (
    <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5 p-4">
      <div className="mb-3 flex items-center gap-2">
        <span className="grid size-8 place-items-center rounded-xl bg-primary/15 text-primary">
          <Sparkles className="size-4" />
        </span>
        <div>
          <p className="font-black">أدوات ذكاء اصطناعي للدرس</p>
          <p className="text-[11px] text-muted-foreground">اختار أداة واضغط تنفيذ — الذكاء الاصطناعي بيشتغل ليك</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {TOOLS.map((t) => (
          <button
            key={t.key}
            onClick={() => {
              setActive(t.key);
              setResult("");
              setError("");
              setInputA("");
              setInputB("");
            }}
            className={`flex flex-col items-center gap-1 rounded-xl px-2 py-3 text-center text-xs font-bold transition ${
              active === t.key ? "bg-primary text-primary-foreground shadow-lg" : "bg-card hover:bg-primary/10"
            }`}
            title={t.desc}
          >
            <t.icon className="size-4" />
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {active && (
        <div className="mt-4 space-y-3 rounded-xl border border-border/50 bg-background/60 p-3">
          {needsInputA && (
            <textarea
              value={inputA}
              onChange={(e) => setInputA(e.target.value)}
              placeholder={
                active === "translate"
                  ? "اكتب المصطلح…"
                  : active === "plan"
                    ? "أهدافك (اختياري)…"
                    : active === "explain" || active === "debug"
                      ? "الصق الكود هنا"
                      : "الصق نص/محتوى الدرس…"
              }
              rows={active === "translate" || active === "plan" ? 2 : 5}
              className="w-full rounded-xl border border-border/60 bg-background p-2 text-sm outline-none focus:border-primary"
            />
          )}
          {needsInputB && (
            <textarea
              value={inputB}
              onChange={(e) => setInputB(e.target.value)}
              placeholder={active === "debug" ? "الصق رسالة الخطأ…" : "لغة البرمجة (اختياري)"}
              rows={2}
              className="w-full rounded-xl border border-border/60 bg-background p-2 text-sm outline-none focus:border-primary"
            />
          )}
          <div className="flex gap-2">
            <button
              onClick={run}
              disabled={loading}
              className="flex-1 rounded-xl bg-primary py-2 text-sm font-black text-primary-foreground disabled:opacity-50"
            >
              {loading ? (
                <span className="inline-flex items-center gap-2"><Loader2 className="size-4 animate-spin" /> بيفكّر…</span>
              ) : (
                "شغّل الذكاء الاصطناعي"
              )}
            </button>
            {(result || error) && (
              <button
                onClick={() => {
                  setResult("");
                  setError("");
                }}
                className="rounded-xl bg-card px-3 text-sm"
              >
                <X className="size-4" />
              </button>
            )}
          </div>
          {error && <p className="rounded-lg bg-destructive/10 p-2 text-xs text-destructive">{error}</p>}
          {result && (
            <div className="prose prose-sm max-w-none rounded-xl bg-card/60 p-3 text-sm leading-relaxed">
              <ReactMarkdown>{result}</ReactMarkdown>
            </div>
          )}
        </div>
      )}
    </div>
  );
}