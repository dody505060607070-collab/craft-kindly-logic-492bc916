import { createFileRoute } from "@tanstack/react-router";
import { CrudSection } from "@/components/CrudSection";
import { AdminHelp } from "@/components/AdminHelp";
import { SectionHint } from "@/components/SectionHint";
import { QuizBuilder } from "@/components/QuizBuilder";

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
              body: "استخدم منشئ الاختبار السهل: اختر الاختبار، اكتب السؤال واختياراته، ثم علّم الإجابة الصحيحة واحفظ. ويمكن للذكاء الاصطناعي توليد الأسئلة كلها من موضوع الدرس.",
            },
            {
              title: "التوليد بالذكاء الاصطناعي",
              body: "اكتب موضوع الاختبار أو الصق محتوى الدرس، حدد عدد الأسئلة واضغط توليد. راجع الأسئلة والإجابات ثم اضغط حفظ كل الأسئلة.",
            },
            {
              title: "الإجابة الصحيحة",
              body: "اضغط الدائرة بجانب الاختيار الصحيح؛ الطالب لن يرى الإجابة، والتصحيح يتم تلقائيًا بعد إنهاء الاختبار.",
            },
            {
              title: "منشور؟",
              body: "لازم يبقى 'منشور = نعم' عشان الطالب يشوف الاختبار.",
            },
          ]}
        />
      </div>

      <QuizBuilder />

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
            { key: "course_id", label: "الكورس", relation: { table: "courses", label: "title" } },
            { key: "duration_minutes", label: "المدة (دقيقة)", type: "number", default: 15 },
            { key: "pass_score", label: "درجة النجاح %", type: "number", default: 50 },
            { key: "is_published", label: "منشور", type: "bool", default: true },
          ]}
        />
      </div>

      <div>
        <SectionHint title="٣. بنك الأسئلة المتقدم">
          استخدم هذا الجدول فقط لو محتاج تعدّل البيانات الخام لسؤال قديم. للإضافة العادية استخدم "منشئ الاختبار السهل" فوق.
        </SectionHint>
        <CrudSection
          table="quiz_questions"
          title="بنك الأسئلة"
          description="أضف السؤال والاختيارات والإجابة الصحيحة."
          orderBy="sort_order"
          ascending
          fields={[
            { key: "quiz_id", label: "الاختبار", required: true, relation: { table: "quizzes", label: "title" } },
            { key: "question", label: "نص السؤال", type: "textarea", required: true },
            { key: "options", label: 'الاختيارات (JSON مثل ["أ","ب"])', type: "textarea", hideInTable: true },
            { key: "correct_index", label: "رقم الاختيار الصحيح (يبدأ من 0)", type: "number", default: 0 },
            { key: "points", label: "الدرجة", type: "number", default: 1 },
            { key: "sort_order", label: "الترتيب", type: "number", default: 0 },
          ]}
        />
      </div>
    </div>
  );
}
