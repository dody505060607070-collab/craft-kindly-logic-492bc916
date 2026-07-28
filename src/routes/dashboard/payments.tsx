import { createFileRoute } from "@tanstack/react-router";
import { CrudSection } from "@/components/CrudSection";
import { AdminHelp } from "@/components/AdminHelp";
import { SITE } from "@/lib/site";
import { SiteSettingsForm } from "@/components/SiteSettingsForm";
import { PaymentProofsReview } from "@/components/PaymentProofsReview";

export const Route = createFileRoute("/dashboard/payments")({
  head: () => ({
    meta: [
      { title: "المدفوعات والاشتراكات | لوحة تحكم المستر" },
      { name: "description", content: "متابعة مدفوعات فودافون كاش والمحافظ الإلكترونية وأكواد الخصم في منصة المستر." },
      { property: "og:title", content: "المدفوعات والاشتراكات | منصة المستر" },
      { property: "og:description", content: "إدارة الاشتراكات وأكواد الخصم." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PaymentsPage,
});

function PaymentsPage() {
  return (
    <div className="space-y-12">
      <div className="glass rounded-2xl p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-black">المدفوعات</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              محفظة استقبال الاشتراكات (فودافون كاش / إنستاباي):{" "}
              <span className="font-bold text-primary">{SITE.phone}</span>
            </p>
          </div>
          <AdminHelp
            title="شرح المدفوعات والاشتراكات"
            intro="متابعة تحويلات الطلاب وأكواد الخصم."
            items={[
              {
                title: "دورة الاعتماد",
                body: "الطالب يحوّل → يرفع screenshot → يظهر عندك بحالة 'قيد المراجعة'. افتح صفحة الطالب، شوف الإيصال، وغيّر الحالة لـ 'مدفوع'. النظام هيفتح الكورس تلقائيًا.",
              },
              {
                title: "الحالات",
                body: "pending = قيد المراجعة | paid = مدفوع (يفعّل الاشتراك) | failed = رفض | refunded = مسترجع.",
              },
              {
                title: "طريقة الدفع (method)",
                body: "'vodafone_cash' أو 'instapay' — بتظهر للطالب في صفحة الاشتراك.",
              },
              {
                title: "أكواد الخصم",
                body: "اعمل كود مثلاً SUMMER بنسبة 20%، وحدّد أقصى استخدام وتاريخ انتهاء. الطالب يكتبه عند الدفع.",
              },
            ]}
          />
        </div>
      </div>

      <SiteSettingsForm />

      <PaymentProofsReview />

      <CrudSection
        table="payments"
        title="عمليات الدفع"
        description="اعتمد أو ارفض تحويلات الطلاب."
        fields={[
          { key: "user_id", label: "معرّف الطالب" },
          { key: "course_id", label: "معرّف الكورس", hideInTable: true },
          { key: "amount", label: "المبلغ", type: "number", default: 0 },
          { key: "method", label: "وسيلة الدفع", default: "vodafone_cash" },
          { key: "reference", label: "رقم العملية" },
          { key: "coupon_code", label: "كوبون", hideInTable: true },
          { key: "proof_url", label: "رابط الإيصال", hideInTable: true },
          {
            key: "status",
            label: "الحالة",
            type: "select",
            default: "pending",
            options: [
              { value: "pending", label: "قيد المراجعة" },
              { value: "paid", label: "مدفوع" },
              { value: "failed", label: "مرفوض" },
              { value: "refunded", label: "مسترجع" },
            ],
          },
        ]}
      />

      <CrudSection
        table="coupons"
        title="أكواد الخصم"
        description="اعمل كوبونات خصم بنسبة أو مبلغ ثابت."
        fields={[
          { key: "code", label: "الكود" },
          { key: "discount_percent", label: "نسبة الخصم %", type: "number", default: 0 },
          { key: "max_uses", label: "أقصى استخدام", type: "number", default: 100 },
          { key: "expires_at", label: "ينتهي في", type: "datetime" },
          { key: "is_active", label: "مفعّل", type: "bool", default: true },
        ]}
      />
    </div>
  );
}
