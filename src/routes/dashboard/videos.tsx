import { createFileRoute } from "@tanstack/react-router";
import { CrudSection } from "@/components/CrudSection";
import { AdminHelp } from "@/components/AdminHelp";
import { SectionHint } from "@/components/SectionHint";
import { CourseMediaUploader } from "@/components/CourseMediaUploader";

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
          <h1 className="font-display text-2xl font-black">سيرفر رفع الفيديوهات والملفات</h1>
          <p className="text-sm text-muted-foreground">
            ارفع الفيديو أو ملف PDF، وانسخ الرابط الناتج وحطه في بيانات الدرس.
          </p>
        </div>
        <AdminHelp
          title="شرح سيرفر الفيديوهات"
          intro="ترفع فيديو أو ملف مرة واحدة، وتستخدم الرابط الناتج في أي عدد من الدروس."
          items={[
            {
              title: "رفع فيديو درس",
              body: "اختار ملف mp4/mkv. بعد الرفع هيطلعلك رابط، انسخه وحطه في خانة 'رابط الفيديو' جوا الدرس.",
            },
            {
              title: "رفع ملف PDF أو عرض",
              body: "نفس الطريقة — استخدم رابط الملف في قسم 'الملفات المرفقة'.",
            },
            {
              title: "بديل: YouTube",
              body: "لو ما عندكش استضافة كبيرة، ارفع الفيديو على يوتيوب (unlisted) وحط رابط الـ embed هنا.",
            },
            {
              title: "الدروس والملفات في الأسفل",
              body: "تقدر تدير الدروس والملفات المرفقة مباشرة من هنا كمان.",
            },
          ]}
        />
      </header>

      <div>
          <SectionHint title="رفع الفيديوهات والملفات">
            اختار الملف من جهازك، استنى ينتهي الرفع، ونسخ الرابط اللي هيطلعلك. الرابط ده اللي هتحطه في خانة "رابط الفيديو" جوا الدرس تحت، أو في "رابط الملف" جوا الملفات المرفقة. البدائل: تقدر ترفع الفيديو على YouTube (unlisted) وتحط رابط الـembed هنا.
          </SectionHint>
          <CourseMediaUploader />
      </div>

      <div>
        <SectionHint title="الدروس">
          كل درس لازم ينتمي لكورس (حط "معرّف الكورس UUID"). حط رابط الفيديو (اللي جبته من الرفع فوق أو من يوتيوب)، والمدة بالثواني. فعّل "معاينة مجانية" لو عايز الطالب يشوف الدرس ده قبل الاشتراك (مفيد لأول درس عشان يجذبه). "منشور = لا" بيخفي الدرس.
        </SectionHint>
        <CrudSection
          table="lessons"
          title="الدروس"
          description="كل درس مرتبط بكورس، وله رابط فيديو ومدة."
          orderBy="sort_order"
          ascending
          fields={[
            { key: "title", label: "عنوان الدرس" },
            { key: "course_id", label: "الكورس", required: true, relation: { table: "courses", label: "title" } },
            { key: "video_url", label: "رابط الفيديو" },
            { key: "duration_min", label: "المدة (دقيقة)", type: "number", default: 0 },
            { key: "is_free", label: "معاينة مجانية", type: "bool", default: false },
            { key: "is_published", label: "منشور", type: "bool", default: true },
            { key: "description", label: "الوصف", type: "textarea", hideInTable: true },
            { key: "sort_order", label: "الترتيب", type: "number", default: 0 },
          ]}
        />
      </div>

      <div>
        <SectionHint title="الملفات المرفقة (PDF / عروض)">
          مذكرات أو ملازم بترفقها مع الدروس. حط "معرّف الدرس" اللي الملف يخصه، ورابط الملف من الرفع فوق. الطالب هيشوف الملف تحت الفيديو في صفحة الدرس.
        </SectionHint>
        <CrudSection
          table="materials"
          title="الملفات المرفقة"
          description="ملفات PDF والعروض التقديمية المرتبطة بالدروس."
          fields={[
            { key: "title", label: "اسم الملف" },
            { key: "file_path", label: "مسار الملف", hideInTable: true },
            { key: "file_type", label: "النوع", default: "pdf" },
            { key: "lesson_id", label: "الدرس", required: true, relation: { table: "lessons", label: "title" } },
          ]}
        />
      </div>
    </div>
  );
}
