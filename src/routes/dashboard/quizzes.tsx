import { createFileRoute } from "@tanstack/react-router";
import { CrudSection } from "@/components/CrudSection";
import { AdminHelp } from "@/components/AdminHelp";
import { SectionHint } from "@/components/SectionHint";

export const Route = createFileRoute("/dashboard/quizzes")({
  head: () => ({
    meta: [
      { title: "الاختبارات وبنك الأسئلة | لوحة تحكم المستر" },
      { name: "description", content: "إنشاء اختبارات إلكترونية وبنك أسئلة اختيار من متعدد وصح وخطأ في منصة المستر." },
      { property: "og:title", content: "الاختبارات وبنك الأسئلة | منصة المستر" },
      { property: "og:description", content: "اختبارات إلكترونية بتصحيح فوري." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: QuizzesPage,
});

function QuizzesPage() {
  return (
    <div className="space-y-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-black">الاختبارات وبنك الأسئلة</h1>
          <p className="text-sm text-muted-foreground">اعمل اختبارات إلكترونية بتتصحّح آليًا.</p>
        </div>
        <AdminHelp
          title="شرح صفحة الاختبارات"
          intro="بتضيف اختبار كامل وبعدين تضيف أسئلته من بنك الأسئلة."
          items={[
            {
              title: "١. اعمل الاختبار",
              body: "من قسم 'الاختبارات' اضغط 'إضافة جديد'. حدّد العنوان ومعرّف الكورس (اختياري: معرّف الدرس) والمدة بالدقايق ودرجة النجاح %.",
            },
            {
              title: "٢. أضف الأسئلة",
              body: "انسخ معرّف الاختبار (UUID)، بعدين روح لـ'بنك الأسئلة' وأضف السؤال. اختار نوعه: اختيار من متعدد أو صح/خطأ أو مقالي.",
            },
            {
              title: "الاختيارات (choices)",
              body: 'للـ MCQ اكتبها كـ JSON مثل: ["إجابة أ","إجابة ب","إجابة ج"]. للـ true/false اتركها فاضية.',
            },
            {
              title: "الإجابة الصحيحة",
              body: 'اكتبها كـ JSON. للـ MCQ رقم الاختيار (مثل 0 أو 1). لصح/خطأ true أو false. للمقالي اترك للمصحح الذكي.',
            },
            {
              title: "منشور؟",
              body: "لازم يبقى 'منشور = نعم' عشان الطالب يشوف الاختبار.",
            },
          ]}
        />
      </div>

      <div>
        <SectionHint title="١. الاختبارات">
          الخطوة الأولى: اعمل الاختبار نفسه (شل / كيان). حدّد "معرّف الكورس" و(اختياري) "معرّف الدرس" لو الاختبار مربوط بدرس معين. "المدة بالدقايق" هي الوقت اللي الطالب هيمتحن فيه. "درجة النجاح %" هي أقل نسبة للنجاح. لازم "منشور = نعم".
        </SectionHint>
        <CrudSection
          table="quizzes"
          title="الاختبارات"
          description="حدد المدة ودرجة النجاح لكل اختبار."
          fields={[
            { key: "title", label: "عنوان الاختبار" },
            { key: "course_id", label: "معرّف الكورس (UUID)" },
            { key: "lesson_id", label: "معرّف الدرس (اختياري)", hideInTable: true },
            { key: "duration_minutes", label: "المدة (دقيقة)", type: "number", default: 15 },
            { key: "pass_score", label: "درجة النجاح %", type: "number", default: 50 },
            { key: "is_published", label: "منشور", type: "bool", default: true },
          ]}
        />
      </div>

      <div>
        <SectionHint title="٢. بنك الأسئلة">
          بعد ما تعمل الاختبار انسخ الـUUID بتاعه وحطه هنا. اختار نوع السؤال: MCQ (اختيار من متعدد) — الاختيارات JSON زي <code className="rounded bg-card px-1">["أ","ب","ج"]</code> والإجابة رقم الاختيار (0 أو 1…). صح/خطأ — الإجابة <code className="rounded bg-card px-1">true</code> أو <code className="rounded bg-card px-1">false</code>. مقالي — الـAI هيصححه.
        </SectionHint>
        <CrudSection
          table="quiz_questions"
          title="بنك الأسئلة"
          description="أضف السؤال والاختيارات والإجابة الصحيحة."
          orderBy="sort_order"
          ascending
          fields={[
            { key: "quiz_id", label: "معرّف الاختبار (UUID)" },
            { key: "prompt", label: "نص السؤال", type: "textarea" },
            {
              key: "type",
              label: "النوع",
              type: "select",
              default: "mcq",
              options: [
                { value: "mcq", label: "اختيار من متعدد" },
                { value: "truefalse", label: "صح وخطأ" },
                { value: "essay", label: "مقالي" },
              ],
            },
            { key: "choices", label: 'الاختيارات (JSON مثل ["أ","ب"])', type: "textarea", hideInTable: true },
            { key: "correct_answer", label: "الإجابة الصحيحة (JSON)", hideInTable: true },
            { key: "points", label: "الدرجة", type: "number", default: 1 },
            { key: "sort_order", label: "الترتيب", type: "number", default: 0 },
          ]}
        />
      </div>
    </div>
  );
}
