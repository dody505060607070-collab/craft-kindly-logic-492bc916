import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, CreditCard, Radio, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { PLATFORM_SECTIONS, SITE } from "@/lib/site";
import { AdminHelp } from "@/components/AdminHelp";
import { AIAdminPanel } from "@/components/AIAdminPanel";

export const Route = createFileRoute("/dashboard/")({
  head: () => ({
    meta: [
      { title: "نظرة عامة | لوحة تحكم المستر" },
      { name: "description", content: "ملخص سريع لأداء منصة المستر: الطلاب، الكورسات، البث، والإيرادات." },
      { property: "og:title", content: "نظرة عامة | لوحة تحكم المستر" },
      { property: "og:description", content: "ملخص أداء منصة المستر." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Overview,
});

function Overview() {
  const { profile, isAdmin } = useAuth();

  const { data } = useQuery({
    queryKey: ["overview"],
    queryFn: async () => {
      const [students, courses, live, payments] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("courses").select("id", { count: "exact", head: true }),
        supabase.from("live_sessions").select("id", { count: "exact", head: true }),
        supabase.from("payments").select("amount").eq("status", "paid"),
      ]);
      const revenue = (payments.data ?? []).reduce(
        (a: number, p: { amount: number }) => a + Number(p.amount),
        0,
      );
      return {
        students: students.count ?? 0,
        courses: courses.count ?? 0,
        live: live.count ?? 0,
        revenue,
      };
    },
  });

  const stats = [
    { label: "إجمالي الحسابات", value: data?.students ?? 0, icon: Users },
    { label: "الكورسات", value: data?.courses ?? 0, icon: BookOpen },
    { label: "حصص البث", value: data?.live ?? 0, icon: Radio },
    { label: "الإيرادات (ج.م)", value: data?.revenue ?? 0, icon: CreditCard },
  ];

  return (
    <div className="space-y-8">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-black">
            أهلاً {profile?.full_name || "بيك"} 👋
          </h1>
          <p className="text-sm text-muted-foreground">
            {isAdmin
              ? "أنت مسجل كـ مدير المنصة — تقدر تضيف وتعدل وتحذف في كل قسم."
              : `${SITE.name} — ${SITE.tagline}`}
          </p>
        </div>
        <AdminHelp
          title="مرحبًا بك في لوحة التحكم"
          intro="من هنا تدير كل المنصة. كل قسم في القائمة الجانبية له صفحة مخصصة."
          items={[
            { title: "نظرة عامة", body: "الأرقام السريعة: عدد الطلاب، الكورسات، حصص البث، والإيرادات." },
            { title: "الكورسات والدروس", body: "أضف مواد وكورسات وفصول ودروس. كل درس ينتمي لكورس." },
            { title: "سيرفر الفيديوهات", body: "ارفع فيديوهات الدروس على تخزين آمن أو استخدم روابط YouTube." },
            { title: "البث المباشر", body: "أنشئ حصة بث، اشارك رابط الاستريم، وتفاعل مع الطلاب في الشات." },
            { title: "الطلاب", body: "بيانات الحسابات والاشتراكات والأجهزة." },
            { title: "الواجبات والتصحيح الذكي", body: "أنشئ واجبات وخلي AI يصحح إجابات الطلاب." },
            { title: "الاختبارات وبنك الأسئلة", body: "اختبارات إلكترونية بتصحيح فوري." },
            { title: "المدفوعات والاشتراكات", body: "اعتماد تحويلات فودافون كاش/إنستاباي وأكواد الخصم." },
            { title: "أدوات الاتصال", body: "إعلانات عامة، إشعارات فردية، ورسائل خاصة." },
            { title: "التقارير والإحصائيات", body: "أداء الطلاب ونسب الإنجاز." },
            { title: "🤖 المساعد الذكي (Groq)", body: "زر Sparkles تحت اليسار — اسأله في أي حاجة أو خلّيه يعمل لك تلخيصات وردود." },
          ]}
        />
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="card-3d glass rounded-2xl p-5">
            <s.icon className="mb-3 size-5 text-primary" />
            <p className="font-display text-3xl font-black">{s.value}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      {isAdmin && <AIAdminPanel />}

      <section>
        <h2 className="mb-4 font-display text-xl font-black">أقسام المنصة</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PLATFORM_SECTIONS.map((s, i) => (
            <Link key={s.key} to={s.to} className="card-3d glass block rounded-2xl p-5">
              <span className="mb-2 inline-block font-display text-xs font-black text-accent">
                {String(i + 1).padStart(2, "0")}
              </span>
              <h3 className="font-bold">{s.title}</h3>
              <p className="mt-1 text-xs text-muted-foreground">{s.desc}</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
