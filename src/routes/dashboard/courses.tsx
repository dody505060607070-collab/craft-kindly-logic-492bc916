import { createFileRoute } from "@tanstack/react-router";
import { CrudSection } from "@/components/CrudSection";
import { AdminHelp } from "@/components/AdminHelp";
import { SectionHint } from "@/components/SectionHint";

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
      <SectionHint title="إدارة الكورسات والاشتراكات والدروس">
        هنا يمكنك التحكم بكل شيء يخص الكورس في مكان واحد. ابدأ بإضافة المادة، ثم الكورس، ثم خطط الاشتراك (شهر، ترم، سنة)، ثم الفصول والدروس.
      </SectionHint>
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
              body: "لجذب الطلاب فعّل 'معاينة مجانية' في أول درس عشان يقدر يشوفه قبل الاشتراك.",
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
        <SectionHint title="٢. الكورسات والاشتراكات">
          هنا بتضيف الكورس نفسه وكل خطط الاشتراك بتاعته (شهر، ترم، سنة). لازم تختار "المادة" أولاً. سعر السنة والترم والخصومات بتظهر للطالب في صفحة الاشتراك. "مجاني = نعم" بيخلي الطالب يدخل الكورس من غير اشتراك.
        </SectionHint>
        <CrudSection
          table="courses"
          title="إضافة وتعديل الكورسات"
          description="إدارة الكورس والأسعار (شهر/ترم/سنة) والخصومات في مكان واحد."
          orderBy="sort_order"
          ascending
          fields={[
            { key: "title", label: "عنوان الكورس" },
            { key: "description", label: "الوصف", type: "textarea" },
            { key: "subject_id", label: "المادة", relation: { table: "subjects", label: "name" } },
            { key: "grade", label: "الصف الدراسي" },
            { key: "is_free", label: "مجاني", type: "bool", default: false },
            { key: "is_published", label: "منشور", type: "bool", default: true },
            {
              key: "cover_url",
              label: "صورة الغلاف",
              hideInTable: true,
              upload: { bucket: "course-covers", mode: "signed", accept: "image/*", prefix: "covers", label: "ارفع صورة الغلاف من جهازك" },
              hint: "ارفع الصورة من الزر وهي هتتحط تلقائيًا، أو الصق رابط صورة جاهز.",
            },
            { key: "price", label: "سعر الشهر (ج.م)", type: "number", default: 0 },
            { key: "price_term", label: "سعر الترم (ج.م)", type: "number", default: 0 },
            { key: "price_year", label: "سعر السنة (ج.م)", type: "number", default: 0 },
            { key: "discount_percent", label: "الخصم %", type: "number", default: 0 },
            { key: "sort_order", label: "الترتيب", type: "number", default: 0 },
          ]}
        />
      </div>


      <div>
        <SectionHint title="خطط الاشتراك (شهر / ترم / سنة / أي مدة)">
          هنا بتحدد لكل درس خطط الاشتراك اللي هتظهر للطالب. مثال: "شهر" مدتها 30 يوم بسعر 100، "الترم الدراسي" 120 يوم بسعر 300، "سنة" 365 يوم بسعر 500. تقدر تضيف أي مدة انت عايزها (مثلاً 15 يوم أو 90 يوم). لو خليت "ظاهرة للطالب = لا" الخطة مش هتظهر في صفحة الاشتراك. "الخصم %" بيخلي السعر يظهر مشطوب مع شارة خصم. لو مضفتش أي خطة، هيظهر للطالب سعر الشهر والسنة الافتراضيين من بيانات الكورس.
        </SectionHint>
        <CrudSection
          table="course_plans"
          title="خطط الاشتراك"
          description="أي مدة وأي سعر لكل درس."
          orderBy="sort_order"
          ascending
          fields={[
            { key: "course_id", label: "الدرس", required: true, relation: { table: "courses", label: "title" } },
            { key: "name", label: "اسم الخطة (شهر / ترم / سنة…)" },
            { key: "duration_days", label: "المدة (بالأيام)", type: "number", default: 30 },
            { key: "price", label: "السعر (ج.م)", type: "number", default: 0 },
            { key: "discount_percent", label: "الخصم %", type: "number", default: 0 },
            { key: "sort_order", label: "الترتيب", type: "number", default: 0 },
            { key: "is_active", label: "ظاهرة للطالب", type: "bool", default: true },
          ]}
        />
      </div>

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
            { key: "course_id", label: "الكورس", required: true, relation: { table: "courses", label: "title" } },
            { key: "sort_order", label: "الترتيب", type: "number", default: 0 },
          ]}
        />
      </div>

      <div>
        <SectionHint title="الدروس والفيديوهات والملفات">
          أضف الدروس هنا واربطها بالفصول. لرفع الفيديوهات والملفات المرفقة، يفضل استخدام صفحة "الفيديوهات والملفات" لأنها توفر واجهة أسهل للرفع.
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
            { key: "course_id", label: "الكورس", required: true, relation: { table: "courses", label: "title" } },
            { key: "chapter_id", label: "الفصل", relation: { table: "chapters", label: "title" } },
            { key: "video_url", label: "رابط الفيديو", hideInTable: true, upload: { bucket: "course-videos", mode: "storage", accept: "video/*", prefix: "lessons", label: "ارفع فيديو" } },
            { key: "duration_min", label: "المدة (دقيقة)", type: "number", default: 0 },
            { key: "is_free", label: "معاينة مجانية", type: "bool", default: false },
            { key: "is_published", label: "منشور", type: "bool", default: true },
            { key: "sort_order", label: "الترتيب", type: "number", default: 0 },
          ]}
        />
      </div>
    </div>
  );
}
