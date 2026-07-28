import { createFileRoute } from "@tanstack/react-router";
import { CrudSection } from "@/components/CrudSection";
import { AdminHelp } from "@/components/AdminHelp";

export const Route = createFileRoute("/dashboard/messages")({
  head: () => ({
    meta: [
      { title: "أدوات الاتصال | لوحة تحكم المستر" },
      { name: "description", content: "إرسال الإعلانات والإشعارات والرسائل الداخلية للطلاب وأولياء الأمور في منصة المستر." },
      { property: "og:title", content: "أدوات الاتصال | منصة المستر" },
      { property: "og:description", content: "إعلانات وإشعارات ورسائل داخلية." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MessagesPage,
});

function MessagesPage() {
  return (
    <div className="space-y-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-black">أدوات الاتصال</h1>
          <p className="text-sm text-muted-foreground">تواصل مع الطلاب بإعلانات وإشعارات ورسائل خاصة.</p>
        </div>
        <AdminHelp
          title="شرح أدوات الاتصال"
          intro="فيه ٣ طرق لتوصيل رسالة للطلاب — اختار المناسب."
          items={[
            {
              title: "الإعلانات العامة",
              body: "بتظهر لكل الطلاب على الصفحة الرئيسية. مناسبة لتذكير بموعد امتحان أو حصة. فعّل 'مثبت' عشان تفضل فوق.",
            },
            {
              title: "الإشعارات",
              body: "إشعار موجّه لطالب واحد بس. تحتاج تحط UUID الطالب. مفيد لتنبيهات شخصية.",
            },
            {
              title: "الرسائل الداخلية",
              body: "دردشة خاصة مع طالب معيّن. الطالب يرد عليك من صفحته الشخصية.",
            },
            {
              title: "المساعد الذكي",
              body: "افتح مساعد Groq تحت وقول له 'اكتب لي إعلان عن حصة مراجعة جبر يوم الجمعة' وهيكتبه لك جاهز للنسخ.",
            },
          ]}
        />
      </div>

      <CrudSection
        table="announcements"
        title="الإعلانات العامة"
        description="تظهر لكل الطلاب على المنصة. فعّل 'إظهار كإعلان منبثق' لعرضه لمدة 5 ثواني عند فتح الموقع."
        fields={[
          { key: "title", label: "العنوان" },
          { key: "body", label: "المحتوى", type: "textarea" },
          { key: "is_pinned", label: "مثبت", type: "bool", default: false },
          { key: "show_as_popup", label: "إظهار كإعلان منبثق (5 ثواني)", type: "bool", default: false },
          { key: "is_active", label: "مفعّل", type: "bool", default: true },
        ]}
        aiHelpers={{
          title: { purpose: "عنوان إعلان قصير وجذاب (أقل من 60 حرف)" },
          body: { purpose: "محتوى إعلان تعليمي واضح ومختصر لطلاب منصة المستر" },
        }}
      />

      <CrudSection
        table="notifications"
        title="الإشعارات"
        description="إشعار موجه لطالب معيّن."
        fields={[
          { key: "user_id", label: "معرّف الطالب (UUID)" },
          { key: "title", label: "العنوان" },
          { key: "body", label: "النص", type: "textarea" },
          { key: "is_read", label: "مقروء", type: "bool", default: false },
        ]}
      />

      <CrudSection
        table="messages"
        title="الرسائل الداخلية"
        description="محادثات بين المدرس والطلاب وأولياء الأمور."
        fields={[
          { key: "recipient_id", label: "معرّف المستلم (UUID)" },
          { key: "content", label: "الرسالة", type: "textarea" },
        ]}
      />
    </div>
  );
}
