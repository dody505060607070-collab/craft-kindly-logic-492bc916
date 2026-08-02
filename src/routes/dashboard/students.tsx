import { createFileRoute } from "@tanstack/react-router";
import { CrudSection } from "@/components/CrudSection";
import { AdminHelp } from "@/components/AdminHelp";
import { SectionHint } from "@/components/SectionHint";

export const Route = createFileRoute("/dashboard/students")({
  head: () => ({
    meta: [
      { title: "الطلاب | لوحة تحكم المستر" },
      { name: "description", content: "إدارة حسابات الطلاب والاشتراكات ومتابعة نسب التقدم في منصة المستر." },
      { property: "og:title", content: "الطلاب | منصة المستر" },
      { property: "og:description", content: "إدارة حسابات الطلاب واشتراكاتهم." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: StudentsPage,
});

function StudentsPage() {
  return (
    <div className="space-y-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-black">إدارة الطلاب</h1>
          <p className="text-sm text-muted-foreground">كل حسابات الطلاب واشتراكاتهم وأجهزتهم في مكان واحد.</p>
        </div>
        <AdminHelp
          title="شرح صفحة الطلاب"
          intro="هنا بتتحكم في كل حاجة تخص الطالب من حسابه لاشتراكاته لأجهزته."
          items={[
            {
              title: "حسابات الطلاب",
              body: "بتظهر كل الحسابات المسجلة. اضغط على أيقونة القلم عشان تعدّل بيانات (الاسم، رقم ولي الأمر، الصف). لو حابب توقف حساب، غيّر 'نشط' إلى 'لا'.",
            },
            {
              title: "الاشتراكات في الكورسات",
              body: "أضف اشتراك جديد بإدخال معرّف الطالب (UUID من جدول الطلاب) ومعرّف الكورس. حدّد تاريخ انتهاء الاشتراك (اتركه فارغ لاشتراك مفتوح).",
            },
            {
              title: "الأجهزة المسجلة",
              body: "بتشوف كل الأجهزة اللي دخل منها الطالب. لو شكيت في مشاركة الحساب، فعّل 'محظور' وهيمنعه من الدخول من الجهاز ده.",
            },
            {
              title: "نصيحة",
              body: "استخدم زر '?' في كل صفحة عشان تفهم كل خانة قبل ما تعدّل. وممكن تسأل المساعد الذكي (زر Sparkles تحت) 'وريني الطلاب اللي مدفعوش'.",
            },
          ]}
        />
      </div>

      <div>
        <SectionHint title="إدارة سريعة للطلاب (الأسهل)">
          ابحث باسم الطالب أو رقمه، افتح كارت الطالب، وبعدين بدوسة واحدة افتح له أي كورس <b>لشهر أو لسنة</b> أو تلغي اشتراكه، وكمان تشوف واجباته ودرجاته. مفيش UUID ولا تعقيد.
        </SectionHint>
        <StudentsManager />
      </div>

      <div>
        <SectionHint title="حسابات الطلاب (تعديل البيانات)">
          دي كل حسابات الطلاب المسجلين. مش بتقدر تضيف طالب من هنا (الطلاب بيسجلوا بنفسهم من صفحة التسجيل)، بس تقدر تعدّل بياناتهم (الاسم، الصف، رقم ولي الأمر) أو توقف الحساب بـ"نشط = لا". النقاط بتظهر للطالب كتحفيز.
        </SectionHint>

        <CrudSection
          table="profiles"
          title="حسابات الطلاب"
          description="بيانات الطالب ورقم ولي الأمر والصف الدراسي."
          allowCreate={false}
          fields={[
            { key: "full_name", label: "الاسم" },
            { key: "phone", label: "رقم الهاتف" },
            { key: "parent_phone", label: "رقم ولي الأمر" },
            { key: "grade", label: "الصف" },
            { key: "points", label: "النقاط", type: "number", default: 0 },
            { key: "is_active", label: "نشط", type: "bool", default: true },
          ]}
        />
      </div>

      <div>
        <SectionHint title="الاشتراكات في الكورسات">
          هنا بتفتح كورس لطالب يدويًا (من غير ما يدفع). حط UUID الطالب و UUID الكورس، وحدّد تاريخ انتهاء الاشتراك (شهر / سنة / سيبها فاضية = مفتوح). لو الطالب دفع، النظام بيضيفه هنا تلقائيًا لما تعتمد الدفع في صفحة "المدفوعات".
        </SectionHint>
        <CrudSection
          table="enrollments"
          title="الاشتراكات في الكورسات"
          description="افتح كورس لطالب أو حدّد تاريخ انتهاء اشتراكه."
          fields={[
            { key: "user_id", label: "الطالب", required: true, relation: { table: "profiles", label: "full_name" } },
            { key: "course_id", label: "الكورس", required: true, relation: { table: "courses", label: "title" } },
            { key: "progress", label: "نسبة التقدم %", type: "number", default: 0 },
            { key: "expires_at", label: "ينتهي في", type: "datetime" },
          ]}
        />
      </div>

      <div>
        <SectionHint title="الأجهزة المسجلة">
          كل جهاز دخل بيه الطالب بيتسجل هنا (لمنع مشاركة الحسابات). لو شكيت إن حساب متشارك بين ناس (أجهزة كتير غريبة)، فعّل "محظور = نعم" على الجهاز، والطالب مش هيقدر يدخل منه تاني.
        </SectionHint>
        <CrudSection
          table="user_devices"
          title="الأجهزة المسجلة"
          description="مراقبة أجهزة الطلاب لمنع مشاركة الحسابات."
          allowCreate={false}
          orderBy="last_seen_at"
          fields={[
            { key: "user_id", label: "معرّف الطالب" },
            { key: "device_name", label: "الجهاز" },
            { key: "device_fingerprint", label: "بصمة الجهاز", hideInTable: true },
            { key: "is_blocked", label: "محظور", type: "bool", default: false },
          ]}
        />
      </div>
    </div>
  );
}
