import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminHelp } from "@/components/AdminHelp";

export const Route = createFileRoute("/dashboard/reports")({
  head: () => ({
    meta: [
      { title: "التقارير والإحصائيات | لوحة تحكم المستر" },
      { name: "description", content: "تقارير أداء الطلاب ونسب المشاهدة ودرجات الاختبارات في منصة المستر." },
      { property: "og:title", content: "التقارير والإحصائيات | منصة المستر" },
      { property: "og:description", content: "تقارير تفصيلية عن أداء الطلاب." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ReportsPage,
});

type Attempt = { id: string; score: number; created_at: string };

function ReportsPage() {
  const { data: attempts } = useQuery({
    queryKey: ["quiz-attempts-report"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quiz_attempts")
        .select("id,score,created_at")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data as Attempt[];
    },
  });

  const { data: progress } = useQuery({
    queryKey: ["progress-report"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lesson_progress")
        .select("id,completed,watched_seconds")
        .limit(1000);
      if (error) throw error;
      return data as { id: string; completed: boolean; watched_seconds: number }[];
    },
  });

  const list = attempts ?? [];
  const avg = list.length
    ? Math.round(list.reduce((a, x) => a + Number(x.score || 0), 0) / list.length)
    : 0;
  const rows = progress ?? [];
  const completed = rows.filter((r) => r.completed).length;
  const hours = Math.round(rows.reduce((a, r) => a + Number(r.watched_seconds || 0), 0) / 3600);

  const cards = [
    { label: "متوسط درجات الاختبارات", value: `${avg}%` },
    { label: "دروس مكتملة", value: completed },
    { label: "ساعات المشاهدة", value: hours },
    { label: "محاولات اختبار مسجلة", value: list.length },
  ];

  return (
    <div className="space-y-8">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-black">التقارير والإحصائيات</h1>
          <p className="text-sm text-muted-foreground">
            مؤشرات أداء الطلاب ونسب الإنجاز على المنصة.
          </p>
        </div>
        <AdminHelp
          title="شرح التقارير"
          intro="نظرة على الأرقام الأساسية للأداء."
          items={[
            { title: "متوسط الدرجات", body: "متوسط درجات آخر ١٠٠ محاولة اختبار." },
            { title: "دروس مكتملة", body: "عدد الدروس اللي طلاب أنهوها بالكامل." },
            { title: "ساعات المشاهدة", body: "مجموع ساعات مشاهدة الفيديوهات." },
            { title: "🤖 نصيحة", body: "اسأل المساعد الذكي: 'حلل لي أداء الطلاب واقترح تحسينات' وهيدلك خلاصة." },
          ]}
        />
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="card-3d glass rounded-2xl p-5">
            <p className="font-display text-3xl font-black text-primary">{c.value}</p>
            <p className="text-xs text-muted-foreground">{c.label}</p>
          </div>
        ))}
      </div>

      <section className="glass overflow-hidden rounded-2xl">
        <h2 className="border-b border-border/50 px-5 py-4 font-bold">آخر محاولات الاختبارات</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead className="bg-surface text-xs text-muted-foreground">
              <tr>
                <th className="px-5 py-3">الدرجة</th>
                <th className="px-5 py-3">التاريخ</th>
              </tr>
            </thead>
            <tbody>
              {list.slice(0, 20).map((a) => (
                <tr key={a.id} className="border-t border-border/40">
                  <td className="px-5 py-3 font-bold">{a.score}%</td>
                  <td className="px-5 py-3 text-muted-foreground">
                    {new Date(a.created_at).toLocaleString("ar-EG")}
                  </td>
                </tr>
              ))}
              {!list.length && (
                <tr>
                  <td colSpan={2} className="px-5 py-10 text-center text-muted-foreground">
                    لا توجد محاولات بعد.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
