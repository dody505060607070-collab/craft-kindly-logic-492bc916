import { createFileRoute } from "@tanstack/react-router";
import { CrudSection } from "@/components/CrudSection";
import { AdminHelp } from "@/components/AdminHelp";
import { SectionHint } from "@/components/SectionHint";
import { CoverUploader } from "@/components/CoverUploader";

export const Route = createFileRoute("/dashboard/courses")({
  head: () => ({
    meta: [
      { title: "الكورسات والدروس | لوحة تحكم المستر" },
      { name: "description", content: "إضافة وتعديل وحذف المواد والكورسات والفصول والدروس في منصة المستر." },
      { property: "og:title", content: "الكورسات والدروس | منصة المستر" },
      { property: "og:description", content: "إدارة كاملة للمحتوى التعليمي." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CoursesPage,
});

function CoursesPage() {
  return (
    <div className="space-y-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-black">الكورسات والدروس</h1>
          <p className="text-sm text-muted-foreground">هرمية: مادة → كورس → فصل → درس.</p>
        </div>
        <AdminHelp
          title="شرح الكورسات والدروس"
          intro="التسلسل عندنا: مادة (مثل البرمجة) → كورس → فصل → درس."
          items={[
            {
              title: "١. المواد الدراسية",
              body: "المستوى الأعلى (البرمجة، الذكاء الاصطناعي…). ابدأ بها لأن كل كورس بينتمي لمادة.",
            },
            {
              title: "٢. الكورسات",
              body: "لكل كورس سعر (بالجنيه)، صف دراسي، رابط صورة غلاف، ونشر/إخفاء. لو 'مجاني'، الطالب يدخله من غير اشتراك.",
            },
            {
              title: "٣. الفصول",
              body: "تقسّم الكورس لفصول (Chapters). كل درس بيتبع فصل.",
            },
            {
              title: "الدروس والفيديو",
              body: "أضف الدروس من صفحة 'سيرفر الفيديوهات' (الفيديو + رابط اليوتيوب). أو ارفع فيديو خاص بيك.",
            },
            {
              title: "نصيحة سريعة",
              body: "لجذب الطلاب فعّل 'is_free_preview' في أول درس عشان يقدر يشوفه قبل الاشتراك.",
            },
          ]}
        />
      </div>

      <div>
        <SectionHint title="١. المواد الدراسية (المستوى الأعلى)">
          دي أعم تصنيف: مثلًا "البرمجة" أو "الذكاء الاصطناعي". لازم تضيف المادة الأول قبل ما تعمل كورس، لأن كل كورس بيبقى تحت مادة معينة. "الترتيب" بيحدد ظهورها في القائمة (الأصغر يظهر أول). لو "منشورة = لا" الطلاب مش هيشوفوها.
        </SectionHint>
        <CrudSection
          table="subjects"
          title="المواد الدراسية"
          description="البرمجة، الذكاء الاصطناعي، أو أي مادة جديدة."
          orderBy="sort_order"
          ascending
          fields={[
            { key: "name", label: "اسم المادة" },
            { key: "description", label: "الوصف", type: "textarea" },
            { key: "icon", label: "أيقونة (اسم من lucide)", hideInTable: true },
            { key: "sort_order", label: "الترتيب", type: "number", default: 0 },
            { key: "is_published", label: "منشورة", type: "bool", default: true },
          ]}
        />
      </div>

      <div>
        <SectionHint title="٢. الكورسات">
          هنا بتضيف الكورس نفسه. "معرّف المادة" بتاخده من صف المادة اللي فوق (اضغط عرض ونسخ الـUUID). حط سعر بالجنيه، وحدّد الصف الدراسي. لو "مجاني = نعم" الطالب هيدخله من غير اشتراك. "منشور = لا" بيخفيه من الطلاب.
        </SectionHint>
        <CrudSection
          table="courses"
          title="الكورسات"
          description="كل كورس له سعر وصف دراسي وحالة نشر."
          orderBy="sort_order"
          ascending
          fields={[
            { key: "title", label: "عنوان الكورس" },
            { key: "description", label: "الوصف", type: "textarea" },
            { key: "subject_id", label: "معرّف المادة (UUID)", hideInTable: true },
            { key: "grade", label: "الصف الدراسي" },
            { key: "price", label: "السعر (ج.م)", type: "number", default: 0 },
            { key: "is_free", label: "مجاني", type: "bool", default: false },
            { key: "is_published", label: "منشور", type: "bool", default: true },
            { key: "cover_url", label: "رابط صورة الغلاف", hideInTable: true },
            { key: "sort_order", label: "الترتيب", type: "number", default: 0 },
          ]}
        />
      </div>

      <div>
        <SectionHint title="رافع صور الأغلفة">
          ارفع صورة غلاف للكورس من جهازك، وبعد الرفع هيطلعلك رابط. انسخه وحطه في خانة "رابط صورة الغلاف" جوا الكورس اللي فوق.
        </SectionHint>
        <CoverUploader />
      </div>
      <CrudSection
        table="chapters"
        title="الفصول الدراسية"
        description="تقسيم الكورس لفصول ووحدات."
        orderBy="sort_order"
        ascending
        fields={[
          { key: "title", label: "عنوان الفصل" },
          { key: "course_id", label: "معرّف الكورس (UUID)" },
          { key: "sort_order", label: "الترتيب", type: "number", default: 0 },
        ]}
      />

      <div>
        <SectionHint title="الفصول الدراسية">
          كل كورس ممكن يتقسم لفصول (Chapters) عشان تنظّم الدروس. حط "معرّف الكورس" اللي الفصل يخصه، والترتيب. مش لازم — تقدر تسيب كل الدروس تحت الكورس مباشرة من غير فصول.
        </SectionHint>
        <CrudSection
          table="chapters"
          title="الفصول الدراسية"
          description="تقسيم الكورس لفصول ووحدات."
          orderBy="sort_order"
          ascending
          fields={[
            { key: "title", label: "عنوان الفصل" },
            { key: "course_id", label: "معرّف الكورس (UUID)" },
            { key: "sort_order", label: "الترتيب", type: "number", default: 0 },
          ]}
        />
      </div>

      <div>
        <SectionHint title="الدروس (اختصار سريع)">
          إدارة الدروس هنا كمان بس صفحة "سيرفر الفيديوهات" أنسب لأنها فيها زرار الرفع. حط "معرّف الفصل" لو الدرس تحت فصل، وإلا سيبه فاضي.
        </SectionHint>
        <CrudSection
          table="lessons"
          title="الدروس"
          description="كل درس بينتمي لكورس وممكن لفصل."
          orderBy="sort_order"
          ascending
          fields={[
            { key: "title", label: "عنوان الدرس" },
            { key: "description", label: "الوصف", type: "textarea", hideInTable: true },
            { key: "course_id", label: "معرّف الكورس (UUID)" },
            { key: "chapter_id", label: "معرّف الفصل (UUID)", hideInTable: true },
            { key: "video_url", label: "رابط الفيديو (YouTube/mp4)", hideInTable: true },
            { key: "duration_seconds", label: "المدة (ثانية)", type: "number", default: 0 },
            { key: "is_free_preview", label: "معاينة مجانية", type: "bool", default: false },
            { key: "is_published", label: "منشور", type: "bool", default: true },
            { key: "sort_order", label: "الترتيب", type: "number", default: 0 },
          ]}
        />
      </div>
    </div>
  );
}
