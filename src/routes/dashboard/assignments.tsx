import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { gradeStudentAnswer } from "@/lib/groq.functions";
import { CrudSection } from "@/components/CrudSection";
import { AdminHelp } from "@/components/AdminHelp";
import { SectionHint } from "@/components/SectionHint";


export const Route = createFileRoute("/dashboard/assignments")({
  head: () => ({
    meta: [
      { title: "الواجبات والتصحيح الذكي | لوحة تحكم المستر" },
      { name: "description", content: "إدارة الواجبات وتصحيح إجابات الطلاب تلقائيًا بالذكاء الاصطناعي في منصة المستر." },
      { property: "og:title", content: "الواجبات والتصحيح الذكي | منصة المستر" },
      { property: "og:description", content: "تصحيح آلي للواجبات مع ملاحظات فورية." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AssignmentsPage,
});

function AiGrader() {
  const grade = useServerFn(gradeStudentAnswer);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ score: number; feedback: string } | null>(null);

  const run = async () => {
    if (!question.trim() || !answer.trim()) {
      toast.error("اكتب السؤال وإجابة الطالب");
      return;
    }
    setBusy(true);
    try {
        const res = await grade({ data: { question, answer, maxScore: 10 } });
      setResult({ score: res.score, feedback: res.feedback });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "تعذر التصحيح الآن");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="glass rounded-2xl p-5">
      <h2 className="mb-1 flex items-center gap-2 font-display text-xl font-black">
        <Sparkles className="size-5 text-accent" /> التصحيح الذكي
      </h2>
      <p className="mb-4 text-sm text-muted-foreground">
        الذكاء الاصطناعي يصحح الإجابة ويكتب ملاحظات فورية للطالب.
      </p>
      <SectionHint title="إزاي تستخدم التصحيح الذكي">
        الصق نص السؤال في الخانة الشمال، وإجابة الطالب في اليمين، واضغط "صحّح الإجابة". الـAI هيدي درجة من ١٠ وملاحظات مفصلة. كل ما تحط نموذج إجابة في الواجب نفسه (تحت)، كل ما التصحيح يبقى أدق.
      </SectionHint>
      <div className="grid gap-3 md:grid-cols-2">
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          maxLength={4000}
          rows={5}
          placeholder="نص السؤال…"
          className="rounded-xl border border-input bg-surface p-3 text-sm outline-none"
        />
        <textarea
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          maxLength={8000}
          rows={5}
          placeholder="إجابة الطالب…"
          className="rounded-xl border border-input bg-surface p-3 text-sm outline-none"
        />
      </div>
      <button
        onClick={run}
        disabled={busy}
        className="mt-3 flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-60"
      >
        {busy ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
        صحّح الإجابة
      </button>

      {result && (
        <div className="mt-4 rounded-xl bg-surface p-4">
          <p className="font-display text-2xl font-black text-primary">{result.score} / 10</p>
          <p className="mt-2 text-sm leading-relaxed">{result.feedback}</p>
        </div>
      )}
    </section>
  );
}

function AssignmentsPage() {
  return (
    <div className="space-y-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-black">الواجبات والتصحيح الذكي</h1>
          <p className="text-sm text-muted-foreground">أضف واجب، وخلّي الذكاء الاصطناعي يصحّح لك.</p>
        </div>
        <AdminHelp
          title="شرح صفحة الواجبات"
          intro="بتنشئ واجبات وبتراجع تسليمات الطلاب — وممكن تخلي AI يصحّح."
          items={[
            {
              title: "التصحيح الذكي",
              body: "الصق نص السؤال وإجابة الطالب واضغط 'صحّح'. الـ AI هيدي درجة من ١٠ وملاحظات مفصّلة.",
            },
            {
              title: "إضافة واجب",
              body: "املأ العنوان والتعليمات ومعرّف الكورس. حدّد موعد التسليم والدرجة القصوى. لو مش منشور، الطالب مش هيشوفه.",
            },
            {
              title: "وصف أو نموذج الإجابة",
              body: "أضف نموذج إجابة مثالي داخل الوصف — واستخدمه مع أداة التصحيح الذكي للحصول على نتيجة أدق.",
            },
            {
              title: "تسليمات الطلاب",
              body: "بتشوف كل تسليمات الطلاب هنا. ضع الدرجة يدويًا أو استخدم التصحيح الذكي فوق وانسخ النتيجة.",
            },
          ]}
        />
      </div>

      <AiGrader />

      <div>
        <SectionHint title="إنشاء واجب جديد">
          املأ العنوان والتعليمات (اللي الطالب هيقراها). "معرّف الكورس" بتاخده من صفحة الكورسات. حدّد موعد التسليم والدرجة القصوى. "نموذج الإجابة" مهم جدًا — الـAI بيقارن بيه إجابة الطالب. لو "منشور = لا" الطالب مش هيشوف الواجب.
        </SectionHint>
        <CrudSection
          table="assignments"
          title="الواجبات"
          description="أضف واجب بموعد تسليم ودرجة."
          fields={[
            { key: "title", label: "عنوان الواجب" },
            { key: "instructions", label: "التعليمات", type: "textarea", hideInTable: true },
            { key: "description", label: "وصف أو نموذج إجابة للـ AI", type: "textarea", hideInTable: true },
            { key: "course_id", label: "الكورس", relation: { table: "courses", label: "title" } },
            { key: "due_at", label: "موعد التسليم", type: "datetime" },
            { key: "max_score", label: "الدرجة القصوى", type: "number", default: 10 },
            { key: "is_published", label: "منشور", type: "bool", default: true },
          ]}
        />
      </div>

      <div>
        <SectionHint title="تسليمات الطلاب">
          هنا بتظهرلك كل تسليمات الطلاب للواجبات. افتح التسليم، شوف إجابة الطالب، وحط الدرجة يدويًا أو استخدم التصحيح الذكي فوق وانسخ نتيجته. اكتب ملاحظات في "الملاحظات" عشان الطالب يشوفها.
        </SectionHint>
        <CrudSection
          table="assignment_submissions"
          title="تسليمات الطلاب"
          description="راجع التسليمات وضع الدرجة والملاحظات."
          allowCreate={false}
          fields={[
            { key: "assignment_id", label: "معرّف الواجب" },
            { key: "user_id", label: "معرّف الطالب" },
            { key: "content", label: "الإجابة", type: "textarea", hideInTable: true },
            { key: "grade", label: "الدرجة", type: "number" },
            { key: "feedback", label: "الملاحظات", type: "textarea", hideInTable: true },
          ]}
        />
      </div>
    </div>
  );
}
