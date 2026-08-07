import { createFileRoute } from "@tanstack/react-router";
import { CrudSection } from "@/components/CrudSection";
import { AdminHelp } from "@/components/AdminHelp";
import { SectionHint } from "@/components/SectionHint";
import { AssessmentBuilder } from "@/components/AssessmentBuilder";

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
          intro="بتضيف اختبار، بتربطه بالكورس والدرس، وبعدين تضيف أسئلته (اختيار من متعدد أو صح وخطأ) يدويًا أو بالذكاء الاصطناعي."
          items={[
            { title: "١. اعمل الاختبار", body: "من قسم 'الاختبارات' اضغط 'إضافة جديد'. حدّد العنوان والكورس والدرس (الفيديو اللي الاختبار بيتبعه) والمدة ودرجة النجاح." },
            { title: "٢. ارفع ملف الأسئلة (اختياري)", body: "لو عندك ملف PDF فيه الأسئلة، ارفعه في 'ملف الأسئلة' — الطالب هيقدر يفتحه من صفحة الاختبار." },
            { title: "٣. ارفع ملف الإجابة الصحيحة", body: "ملف/نص الإجابة الصحيحة ده الطالب مش بيشوفه أبدًا. الذكاء الاصطناعي بيستخدمه في مراجعة وتصحيح إجابات الطلاب." },
            { title: "٤. أضف الأسئلة", body: "من 'منشئ الاختبار': اختر الكورس ثم الدرس ثم الاختبار، حدد نوع الأسئلة وعددها واضغط 'ولّد الأسئلة'، راجع وعلّم الإجابة الصحيحة ثم احفظ." },
            { title: "منشور؟", body: "لازم يبقى 'منشور = نعم' عشان الطالب يشوف الاختبار." },
          ]}
        />
      </div>

      <AssessmentBuilder mode="quiz" />

      <div>
        <SectionHint title="١. الاختبارات">
          اعمل الاختبار نفسه: العنوان، الكورس، الدرس (الفيديو اللي الاختبار مربوط بيه)، المدة بالدقايق، ودرجة النجاح %. ارفع "ملف الأسئلة" لو عندك، و"ملف الإجابة الصحيحة" للـ AI فقط (الطالب مش هيشوفه). لازم "منشور = نعم".
        </SectionHint>
        <CrudSection
          table="quizzes"
          title="الاختبارات"
          description="حدد الكورس والدرس والمدة ودرجة النجاح لكل اختبار."
          fields={[
            { key: "title", label: "عنوان الاختبار", required: true },
            { key: "course_id", label: "الكورس", relation: { table: "courses", label: "title" } },
            { key: "lesson_id", label: "الدرس / الفيديو", relation: { table: "lessons", label: "title" } },
            { key: "duration_minutes", label: "المدة (دقيقة)", type: "number", default: 15 },
            { key: "max_attempts", label: "عدد المحاولات (0 = غير محدود)", type: "number", default: 0 },
            { key: "pass_score", label: "درجة النجاح %", type: "number", default: 50 },
            {
              key: "questions_file_url",
              label: "ملف الأسئلة (يشوفه الطالب)",
              hideInTable: true,
              upload: { bucket: "assessment-files", mode: "storage", prefix: "questions", accept: ".pdf,.doc,.docx,.png,.jpg,.jpeg", label: "ارفع ملف الأسئلة" },
            },
            {
              key: "answer_key_url",
              label: "ملف الإجابة الصحيحة (سري — للـ AI فقط)",
              hideInTable: true,
              upload: { bucket: "assessment-files", mode: "storage", prefix: "answers", accept: ".pdf,.doc,.docx,.txt,.md,.png,.jpg,.jpeg", label: "ارفع ملف الإجابة" },
            },
            { key: "answer_key_text", label: "نص الإجابة النموذجية (للـ AI)", type: "textarea", hideInTable: true },
            { key: "is_published", label: "منشور", type: "bool", default: true },
          ]}
        />
      </div>

      <div>
        <SectionHint title="٢. بنك الأسئلة المتقدم">
          استخدم هذا الجدول فقط لو محتاج تعدّل سؤال قديم. "نوع السؤال" = mcq (اختيار من متعدد) أو truefalse (صح وخطأ). للإضافة العادية استخدم المنشئ فوق.
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
            {
              key: "kind",
              label: "نوع السؤال",
              type: "select",
              default: "mcq",
              options: [
                { value: "mcq", label: "اختيار من متعدد" },
                { value: "truefalse", label: "صح وخطأ" },
              ],
            },
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
