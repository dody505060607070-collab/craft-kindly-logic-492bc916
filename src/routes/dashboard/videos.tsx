import { createFileRoute } from "@tanstack/react-router";
import { CrudSection } from "@/components/CrudSection";
import { AdminHelp } from "@/components/AdminHelp";
import { SectionHint } from "@/components/SectionHint";

export const Route = createFileRoute("/dashboard/videos")({
  head: () => ({
    meta: [
      { title: "سيرفر الفيديوهات | لوحة تحكم المستر" },
      { name: "description", content: "رفع فيديوهات الدروس والملفات المرفقة بجودة عالية على سيرفر منصة المستر." },
      { property: "og:title", content: "سيرفر الفيديوهات | منصة المستر" },
      { property: "og:description", content: "رفع وإدارة فيديوهات وملفات الدروس." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: VideosPage,
});

function VideosPage() {
  return (
    <div className="space-y-12">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-black">الفيديوهات والملفات</h1>
          <p className="text-sm text-muted-foreground">
            صفحة واحدة: تضيف الدرس، ترفع الفيديو أو تحط رابط يوتيوب، وترفع الملفات المرفقة.
          </p>
        </div>
        <AdminHelp
          title="شرح صفحة الفيديوهات"
          intro="كل حاجة بقت في مكان واحد — مفيش نسخ روابط ولا لزق."
          items={[
            {
              title: "١. أضف درس",
              body: "دوس 'إضافة جديد'، اختار الكورس من القائمة، اكتب عنوان الدرس ووصفه.",
            },
            {
              title: "٢. الفيديو",
              body: "إما تدوس 'ارفع فيديو الدرس' وتختار الملف من جهازك (بيترفع على سيرفرنا ومحمي)، أو تلزق رابط يوتيوب عادي في نفس الخانة.",
            },
            {
              title: "٣. الملفات المرفقة",
              body: "من جدول 'الملفات المرفقة' تحت: اختار الدرس، ارفع الـPDF، والطالب هيلاقيه تحت الفيديو مباشرة.",
            },
            {
              title: "٤. الحفظ",
              body: "دوس 'حفظ'. الوصف والفيديو بيظهروا للطالب فورًا في صفحة الكورس.",
            },
            {
              title: "معاينة مجانية",
              body: "فعّلها في أول درس عشان الطالب يشوفه قبل ما يدفع.",
            },
          ]}
        />
      </header>

      <div>
        <SectionHint title="الدروس والفيديوهات">
          اختار الكورس من القائمة المنسدلة (مش UUID)، اكتب العنوان والوصف، وبعدين إما ترفع الفيديو من جهازك بزر الرفع أو تلزق رابط يوتيوب. الوصف اللي بتكتبه هنا هو اللي الطالب بيشوفه تحت الفيديو.
        </SectionHint>
        <CrudSection
          table="lessons"
          title="الدروس"
          description="عنوان + وصف + فيديو (رفع أو رابط) لكل درس."
          orderBy="sort_order"
          ascending
          fields={[
            { key: "title", label: "عنوان الدرس" },
            { key: "course_id", label: "الكورس", required: true, relation: { table: "courses", label: "title" } },
            { key: "chapter_id", label: "الفصل (اختياري)", hideInTable: true, relation: { table: "chapters", label: "title" } },
            {
              key: "description",
              label: "وصف الدرس (يظهر للطالب)",
              type: "textarea",
              hideInTable: true,
            },
            {
              key: "video_url",
              label: "الفيديو",
              upload: { bucket: "course-videos", mode: "storage", accept: "video/*", prefix: "lessons", label: "ارفع فيديو الدرس من جهازك" },
              hint: "ارفع الفيديو بالزر، أو الصق رابط يوتيوب هنا.",
            },
            { key: "duration_min", label: "المدة (دقيقة)", type: "number", default: 0 },
            { key: "max_views", label: "أقصى عدد مشاهدات", type: "number", default: 0, hint: "0 تعني غير محدود. لو وصل الطالب للعدد ده مش هيقدر يفتح الفيديو تاني." },
            { key: "is_free", label: "معاينة مجانية", type: "bool", default: false },
            { key: "is_published", label: "منشور", type: "bool", default: true },
            { key: "sort_order", label: "الترتيب", type: "number", default: 0 },
          ]}
        />
      </div>

      <div>
        <SectionHint title="الملفات المرفقة (PDF / عروض / مذكرات)">
          اختار الدرس من القائمة، ارفع الملف بالزر، وهو هيظهر للطالب تحت الفيديو مباشرة في صفحة الكورس. الملفات محمية — الطالب المشترك بس هو اللي يفتحها.
        </SectionHint>
        <CrudSection
          table="materials"
          title="الملفات المرفقة"
          description="ملفات PDF والعروض المرتبطة بكل درس."
          fields={[
            { key: "title", label: "اسم الملف" },
            { key: "lesson_id", label: "الدرس", required: true, relation: { table: "lessons", label: "title" } },
            {
              key: "file_path",
              label: "الملف",
              upload: { bucket: "course-videos", mode: "path", accept: ".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.zip,image/*", prefix: "materials", label: "ارفع الملف من جهازك" },
              hint: "ارفع الملف بالزر، أو الصق رابط خارجي (درايف مثلًا).",
            },
            { key: "file_type", label: "النوع", default: "pdf" },
            {
              key: "questions_file_url",
              label: "بنك الأسئلة (يشوفه الطالب)",
              hideInTable: true,
              upload: { bucket: "assessment-files", mode: "storage", prefix: "bank-questions", accept: ".pdf,.doc,.docx,.png,.jpg,.jpeg", label: "ارفع ملف الأسئلة" },
            },
            {
              key: "answer_key_url",
              label: "ملف الإجابة الصحيحة (سري — للـ AI فقط)",
              hideInTable: true,
              upload: { bucket: "assessment-files", mode: "storage", prefix: "bank-answers", accept: ".pdf,.doc,.docx,.txt,.md,.png,.jpg,.jpeg", label: "ارفع ملف الإجابة" },
            },
            { key: "answer_key_text", label: "نص الإجابة النموذجية (للـ AI)", type: "textarea", hideInTable: true },
          ]}
        />
      </div>
    </div>
  );
}
