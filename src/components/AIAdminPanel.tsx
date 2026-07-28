import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import ReactMarkdown from "react-markdown";
import {
  BarChart3,
  Brain,
  CalendarClock,
  FileSearch,
  Filter,
  Loader2,
  MessagesSquare,
  PenLine,
  Radio,
  Search,
  ShieldAlert,
  Sparkles,
  Target,
  Wand2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  analyzeReports,
  contentAssistant,
  detectAssignmentCheating,
  filterStudentsAI,
  generateCoursePlan,
  generateCourseSeo,
  suggestReplies,
  summarizeLiveSession,
  weeklyInsights,
} from "@/lib/groq.functions";

type Tab =
  | "filter"
  | "weekly"
  | "reports"
  | "course-gen"
  | "seo"
  | "replies"
  | "live-sum"
  | "cheat"
  | "content";

const TABS: { key: Tab; label: string; icon: React.ComponentType<{ className?: string }>; desc: string }[] = [
  { key: "filter", label: "فلترة الطلاب بالذكاء", icon: Filter, desc: "اكتب طلب بالعربي — الـ AI يرجّع لك الطلاب" },
  { key: "weekly", label: "تقرير أسبوعي", icon: CalendarClock, desc: "ملخص أداء آخر 7 أيام + توصيات" },
  { key: "reports", label: "تحليل ذكي للأداء", icon: BarChart3, desc: "AI يحلل كل بيانات المنصة" },
  { key: "course-gen", label: "توليد منهج كامل", icon: Wand2, desc: "منهج + فصول + دروس + واجبات" },
  { key: "seo", label: "وصف + SEO للكورس", icon: Search, desc: "وصف تسويقي وترميز SEO احترافي" },
  { key: "replies", label: "اقتراح ردود", icon: MessagesSquare, desc: "3 ردود ذكية على رسائل الطلاب" },
  { key: "live-sum", label: "تلخيص البث المباشر", icon: Radio, desc: "لخص حصة بث بالكامل" },
  { key: "cheat", label: "كشف الغش في الواجبات", icon: ShieldAlert, desc: "قارن تسليمات ورصد التشابه" },
  { key: "content", label: "مساعد إنتاج محتوى", icon: PenLine, desc: "outline / script / أسئلة / تدريبات" },
];

export function AIAdminPanel() {
  const [tab, setTab] = useState<Tab>("filter");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<React.ReactNode>(null);
  const [q, setQ] = useState("");
  const [q2, setQ2] = useState("");
  const [q3, setQ3] = useState("");
  const [pickA, setPickA] = useState("");

  const fFilter = useServerFn(filterStudentsAI);
  const fWeekly = useServerFn(weeklyInsights);
  const fReports = useServerFn(analyzeReports);
  const fCourseGen = useServerFn(generateCoursePlan);
  const fSeo = useServerFn(generateCourseSeo);
  const fReplies = useServerFn(suggestReplies);
  const fLiveSum = useServerFn(summarizeLiveSession);
  const fCheat = useServerFn(detectAssignmentCheating);
  const fContent = useServerFn(contentAssistant);

  const liveSessions = useQuery({
    queryKey: ["ai-live-sessions"],
    queryFn: async () => (await supabase.from("live_sessions").select("id, title, starts_at").order("starts_at", { ascending: false }).limit(30)).data ?? [],
    enabled: tab === "live-sum",
  });
  const assignmentsQ = useQuery({
    queryKey: ["ai-assignments"],
    queryFn: async () => (await supabase.from("assignments").select("id, title").order("created_at", { ascending: false }).limit(50)).data ?? [],
    enabled: tab === "cheat",
  });

  const run = async () => {
    setLoading(true);
    setError("");
    setResult(null);
    try {
      if (tab === "filter") {
        if (!q.trim()) throw new Error("اكتب طلب الفلترة");
        const r = await fFilter({ data: { query: q } });
        setResult(
          <div className="space-y-3">
            <div className="rounded-xl bg-primary/10 p-3 text-sm"><b>ملخص:</b> {r.summary_ar}</div>
            <p className="text-xs text-muted-foreground">النتائج: {r.students.length}</p>
            <div className="max-h-96 overflow-y-auto rounded-xl border border-border/50">
              <table className="w-full text-sm">
                <thead className="bg-card"><tr>
                  <th className="p-2 text-right">الاسم</th><th className="p-2">تليفون</th>
                  <th className="p-2">المدفوع</th><th className="p-2">كورسات</th><th className="p-2">متوسط الدرجات</th>
                </tr></thead>
                <tbody>
                  {r.students.map((s) => (
                    <tr key={s.id} className="border-t border-border/40">
                      <td className="p-2 text-right font-bold">{s.name}</td>
                      <td className="p-2 font-mono text-xs">{s.phone ?? "-"}</td>
                      <td className="p-2 text-center">{s.total_paid} ج.م</td>
                      <td className="p-2 text-center">{s.courses_enrolled}</td>
                      <td className="p-2 text-center">{s.quiz_avg ?? "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>,
        );
      } else if (tab === "weekly") {
        const r = await fWeekly();
        setResult(<AIMarkdown text={`### مؤشرات الأسبوع\n\n\`\`\`json\n${JSON.stringify(r.stats, null, 2)}\n\`\`\`\n\n${r.report}`} />);
      } else if (tab === "reports") {
        const r = await fReports();
        setResult(<AIMarkdown text={r.analysis} />);
      } else if (tab === "course-gen") {
        if (!q.trim()) throw new Error("اكتب عنوان الكورس");
        const r = await fCourseGen({ data: { title: q, grade: q2 || undefined, level: "مبتدئ" } });
        setResult(
          <div className="space-y-3 text-sm">
            <div className="rounded-xl bg-card p-3"><b>الوصف:</b> {r.description}</div>
            {r.chapters.map((ch, i) => (
              <div key={i} className="rounded-xl border border-border/40 p-3">
                <p className="font-black text-primary">فصل {i + 1}: {ch.title}</p>
                <ul className="mt-2 space-y-1 text-xs">
                  {ch.lessons.map((l, j) => (
                    <li key={j}>• <b>{l.title}</b> ({l.duration_min}د) — {l.summary}</li>
                  ))}
                </ul>
              </div>
            ))}
            <div className="rounded-xl bg-accent/10 p-3">
              <p className="font-bold">اختبارات:</p>
              <ul className="text-xs">{r.quizzes.map((qz, i) => <li key={i}>• {qz.title} ({qz.questions_count} سؤال)</li>)}</ul>
              <p className="mt-2 font-bold">واجبات:</p>
              <ul className="text-xs">{r.assignments.map((a, i) => <li key={i}>• {a.title}</li>)}</ul>
            </div>
          </div>,
        );
      } else if (tab === "seo") {
        if (!q.trim()) throw new Error("اكتب عنوان الكورس");
        const r = await fSeo({ data: { title: q, notes: q2 || undefined } });
        setResult(
          <div className="space-y-2 text-sm">
            <div className="rounded-xl bg-card p-3"><b>سطر جذاب:</b> {r.short}</div>
            <div className="rounded-xl bg-card p-3"><b>وصف طويل:</b> {r.long}</div>
            <div className="rounded-xl bg-card p-3"><b>SEO Title ({r.seo_title.length}):</b> {r.seo_title}</div>
            <div className="rounded-xl bg-card p-3"><b>SEO Description ({r.seo_description.length}):</b> {r.seo_description}</div>
            <div className="flex flex-wrap gap-1">{r.tags.map((t) => <span key={t} className="rounded-full bg-primary/15 px-2 py-0.5 text-xs text-primary">#{t}</span>)}</div>
          </div>,
        );
      } else if (tab === "replies") {
        if (!q.trim()) throw new Error("الصق رسالة الطالب");
        const r = await fReplies({ data: { message: q, tone: "ودود" } });
        setResult(
          <div className="space-y-2">
            {r.suggestions.map((s, i) => (
              <div key={i} className="rounded-xl bg-card p-3 text-sm">
                <p className="mb-2 text-xs font-bold text-primary">اقتراح {i + 1}</p>
                {s}
                <button onClick={() => navigator.clipboard.writeText(s)} className="mt-2 text-xs text-primary">نسخ</button>
              </div>
            ))}
          </div>,
        );
      } else if (tab === "live-sum") {
        if (!pickA) throw new Error("اختار حصة");
        const r = await fLiveSum({ data: { sessionId: pickA } });
        setResult(<AIMarkdown text={`### تلخيص (${r.messageCount} رسالة)\n\n${r.summary}`} />);
      } else if (tab === "cheat") {
        if (!pickA) throw new Error("اختار واجب");
        const r = await fCheat({ data: { assignmentId: pickA } });
        setResult(
          <div className="space-y-3">
            <div className="rounded-xl bg-card p-3 text-sm"><AIMarkdown text={r.report} /></div>
            {r.groups.map((g, i) => (
              <div key={i} className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm">
                <p className="font-black text-destructive">تشابه {g.similarity}%</p>
                <p className="text-xs">{g.reason}</p>
                <p className="mt-1 text-xs"><b>الطلاب:</b> {g.students.map((s) => s.name).join(" • ")}</p>
              </div>
            ))}
          </div>,
        );
      } else if (tab === "content") {
        if (!q.trim()) throw new Error("اكتب الموضوع");
        const r = await fContent({ data: { topic: q, kind: (q3 as "outline") || "outline" } });
        setResult(<AIMarkdown text={r.output} />);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطأ");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/5 via-background to-accent/5 p-5 shadow-xl">
      <div className="mb-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="grid size-10 place-items-center rounded-2xl bg-gradient-to-tr from-primary to-accent text-primary-foreground">
            <Brain className="size-5" />
          </span>
          <div>
            <h2 className="font-display text-lg font-black">مركز الذكاء الاصطناعي — Groq</h2>
            <p className="text-xs text-muted-foreground">9 أدوات ذكية لإدارة أفضل + Chat مباشر تحت اليسار</p>
          </div>
        </div>
        <span className="hidden rounded-full bg-emerald-500/15 px-2 py-1 text-[10px] font-bold text-emerald-500 sm:inline">
          Powered by Groq
        </span>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => {
              setTab(t.key);
              setResult(null);
              setError("");
              setQ("");
              setQ2("");
              setQ3("");
              setPickA("");
            }}
            className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-black transition ${
              tab === t.key ? "bg-primary text-primary-foreground shadow-lg" : "bg-card hover:bg-primary/10"
            }`}
          >
            <t.icon className="size-3.5" />
            {t.label}
          </button>
        ))}
      </div>

      <div className="rounded-2xl bg-background/70 p-4">
        <p className="mb-3 text-xs text-muted-foreground">
          <Target className="ml-1 inline size-3.5" />
          {TABS.find((x) => x.key === tab)?.desc}
        </p>

        {tab === "filter" && (
          <textarea value={q} onChange={(e) => setQ(e.target.value)} rows={2} placeholder='مثال: "الطلاب اللي دفعوا ومحققوش تقدم في آخر أسبوعين"' className="w-full rounded-xl border border-border/60 bg-background p-2 text-sm" />
        )}
        {tab === "course-gen" && (
          <div className="space-y-2">
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="عنوان الكورس" className="w-full rounded-xl border border-border/60 bg-background p-2 text-sm" />
            <input value={q2} onChange={(e) => setQ2(e.target.value)} placeholder="الصف/المستوى (اختياري)" className="w-full rounded-xl border border-border/60 bg-background p-2 text-sm" />
          </div>
        )}
        {tab === "seo" && (
          <div className="space-y-2">
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="عنوان الكورس" className="w-full rounded-xl border border-border/60 bg-background p-2 text-sm" />
            <textarea value={q2} onChange={(e) => setQ2(e.target.value)} rows={2} placeholder="ملاحظات (اختياري)" className="w-full rounded-xl border border-border/60 bg-background p-2 text-sm" />
          </div>
        )}
        {tab === "replies" && (
          <textarea value={q} onChange={(e) => setQ(e.target.value)} rows={3} placeholder="الصق رسالة الطالب هنا…" className="w-full rounded-xl border border-border/60 bg-background p-2 text-sm" />
        )}
        {tab === "live-sum" && (
          <select value={pickA} onChange={(e) => setPickA(e.target.value)} className="w-full rounded-xl border border-border/60 bg-background p-2 text-sm">
            <option value="">— اختار حصة —</option>
            {(liveSessions.data ?? []).map((s: { id: string; title: string; starts_at: string }) => (
              <option key={s.id} value={s.id}>{s.title} — {new Date(s.starts_at).toLocaleDateString("ar-EG")}</option>
            ))}
          </select>
        )}
        {tab === "cheat" && (
          <select value={pickA} onChange={(e) => setPickA(e.target.value)} className="w-full rounded-xl border border-border/60 bg-background p-2 text-sm">
            <option value="">— اختار واجب —</option>
            {(assignmentsQ.data ?? []).map((a: { id: string; title: string }) => (
              <option key={a.id} value={a.id}>{a.title}</option>
            ))}
          </select>
        )}
        {tab === "content" && (
          <div className="space-y-2">
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="موضوع الدرس/المحتوى" className="w-full rounded-xl border border-border/60 bg-background p-2 text-sm" />
            <select value={q3} onChange={(e) => setQ3(e.target.value)} className="w-full rounded-xl border border-border/60 bg-background p-2 text-sm">
              <option value="outline">Outline كامل</option>
              <option value="script">سكريبت شرح</option>
              <option value="questions">أسئلة تدريبية</option>
              <option value="exercises">تدريبات عملية</option>
            </select>
          </div>
        )}

        <button
          onClick={run}
          disabled={loading}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-black text-primary-foreground disabled:opacity-50"
        >
          {loading ? <><Loader2 className="size-4 animate-spin" /> بيفكّر…</> : <><Sparkles className="size-4" /> شغّل الذكاء الاصطناعي</>}
        </button>

        {error && <p className="mt-3 rounded-lg bg-destructive/10 p-2 text-xs text-destructive">{error}</p>}
        {result && <div className="mt-4">{result}</div>}
      </div>

      <p className="mt-3 flex items-center gap-1 text-[10px] text-muted-foreground">
        <FileSearch className="size-3" />
        كل النتائج مؤقتة وبتتولد فورًا — الـ AI بيقرأ من قاعدة البيانات في الوقت الفعلي.
      </p>
    </div>
  );
}

function AIMarkdown({ text }: { text: string }) {
  return (
    <div className="prose prose-sm max-w-none rounded-xl bg-card/60 p-4 text-sm">
      <ReactMarkdown>{text}</ReactMarkdown>
    </div>
  );
}