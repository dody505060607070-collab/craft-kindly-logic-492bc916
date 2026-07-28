import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/dashboard/analytics")({
  head: () => ({
    meta: [
      { title: "التحليلات | لوحة تحكم المستر" },
      { name: "description", content: "لوحة تحليلات متقدمة: إيرادات، اشتراكات، استخدام الذكاء الاصطناعي، وأداء الكورسات." },
      { property: "og:title", content: "التحليلات | لوحة تحكم المستر" },
      { property: "og:description", content: "تحليلات المنصة." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AnalyticsPage,
});

type DayBucket = { day: string; count: number; value: number };

function last30Days(): string[] {
  const arr: string[] = [];
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  for (let i = 29; i >= 0; i--) {
    const x = new Date(d);
    x.setDate(d.getDate() - i);
    arr.push(x.toISOString().slice(0, 10));
  }
  return arr;
}

function bucketByDay(rows: { created_at: string; amount?: number }[]): DayBucket[] {
  const days = last30Days();
  const map = new Map<string, DayBucket>();
  for (const d of days) map.set(d, { day: d.slice(5), count: 0, value: 0 });
  for (const r of rows) {
    const k = r.created_at.slice(0, 10);
    const b = map.get(k);
    if (!b) continue;
    b.count += 1;
    b.value += Number(r.amount ?? 0);
  }
  return Array.from(map.values());
}

const COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];

function AnalyticsPage() {
  const since = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    d.setHours(0, 0, 0, 0);
    return d.toISOString();
  }, []);

  const enrollments = useQuery({
    queryKey: ["analytics", "enrollments", since],
    queryFn: async () => {
      const { data } = await supabase
        .from("enrollments")
        .select("created_at, course_id")
        .gte("created_at", since)
        .order("created_at");
      return data ?? [];
    },
  });

  const payments = useQuery({
    queryKey: ["analytics", "payments", since],
    queryFn: async () => {
      const { data } = await supabase
        .from("payments")
        .select("created_at, amount, status")
        .eq("status", "paid")
        .gte("created_at", since)
        .order("created_at");
      return data ?? [];
    },
  });

  const aiUsage = useQuery({
    queryKey: ["analytics", "ai_usage", since],
    queryFn: async () => {
      const { data } = await supabase
        .from("ai_usage")
        .select("created_at, kind, user_id")
        .gte("created_at", since)
        .order("created_at");
      return data ?? [];
    },
  });

  const topCourses = useQuery({
    queryKey: ["analytics", "top-courses"],
    queryFn: async () => {
      const [{ data: enr }, { data: courses }] = await Promise.all([
        supabase.from("enrollments").select("course_id"),
        supabase.from("courses").select("id, title"),
      ]);
      const map = new Map<string, number>();
      (enr ?? []).forEach((e) => map.set(e.course_id, (map.get(e.course_id) ?? 0) + 1));
      const idToTitle = new Map((courses ?? []).map((c) => [c.id, c.title] as const));
      return Array.from(map.entries())
        .map(([id, count]) => ({ name: idToTitle.get(id) ?? "—", count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 8);
    },
  });

  const enrollBuckets = useMemo(() => bucketByDay(enrollments.data ?? []), [enrollments.data]);
  const revenueBuckets = useMemo(
    () => bucketByDay((payments.data ?? []).map((p) => ({ created_at: p.created_at, amount: Number(p.amount) }))),
    [payments.data],
  );
  const aiBuckets = useMemo(() => bucketByDay(aiUsage.data ?? []), [aiUsage.data]);

  const aiByKind = useMemo(() => {
    const map = new Map<string, number>();
    (aiUsage.data ?? []).forEach((r) => map.set(r.kind, (map.get(r.kind) ?? 0) + 1));
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }, [aiUsage.data]);

  const totals = {
    enrollments: (enrollments.data ?? []).length,
    revenue: (payments.data ?? []).reduce((a, p) => a + Number(p.amount), 0),
    aiCalls: (aiUsage.data ?? []).length,
    activeUsers: new Set((aiUsage.data ?? []).map((r) => r.user_id)).size,
  };

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-display text-3xl font-black">التحليلات المتقدمة</h1>
        <p className="text-sm text-muted-foreground">آخر 30 يوم — إيرادات، اشتراكات، واستخدام الذكاء الاصطناعي.</p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="اشتراكات جديدة" value={totals.enrollments} tone="primary" />
        <KpiCard label="إيرادات (ج.م)" value={totals.revenue.toLocaleString("ar-EG")} tone="emerald" />
        <KpiCard label="طلبات AI" value={totals.aiCalls} tone="violet" />
        <KpiCard label="مستخدمين استعملوا AI" value={totals.activeUsers} tone="amber" />
      </div>

      <ChartCard title="الإيرادات اليومية (ج.م)">
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={revenueBuckets}>
            <defs>
              <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity={0.6} />
                <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
            <XAxis dataKey="day" fontSize={11} />
            <YAxis fontSize={11} />
            <Tooltip />
            <Area type="monotone" dataKey="value" stroke="#10b981" fill="url(#rev)" />
          </AreaChart>
        </ResponsiveContainer>
      </ChartCard>

      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard title="اشتراكات جديدة / يوم">
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={enrollBuckets}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
              <XAxis dataKey="day" fontSize={11} />
              <YAxis fontSize={11} allowDecimals={false} />
              <Tooltip />
              <Line type="monotone" dataKey="count" stroke="#6366f1" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="استخدام الذكاء الاصطناعي / يوم">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={aiBuckets}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
              <XAxis dataKey="day" fontSize={11} />
              <YAxis fontSize={11} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard title="توزيع طلبات AI حسب النوع">
          {aiByKind.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">لا توجد بيانات بعد.</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={aiByKind} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90} paddingAngle={3}>
                  {aiByKind.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Legend />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="أعلى الكورسات إقبالًا">
          {(topCourses.data ?? []).length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">لا يوجد اشتراكات بعد.</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={topCourses.data ?? []} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis type="number" fontSize={11} allowDecimals={false} />
                <YAxis type="category" dataKey="name" fontSize={11} width={140} />
                <Tooltip />
                <Bar dataKey="count" fill="#f59e0b" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>
    </div>
  );
}

function KpiCard({ label, value, tone }: { label: string; value: number | string; tone: string }) {
  const map: Record<string, string> = {
    primary: "from-primary/20 to-primary/5 text-primary",
    emerald: "from-emerald-500/20 to-emerald-500/5 text-emerald-500",
    violet: "from-violet-500/20 to-violet-500/5 text-violet-500",
    amber: "from-amber-500/20 to-amber-500/5 text-amber-500",
  };
  return (
    <div className={`card-3d rounded-2xl bg-gradient-to-br p-5 ${map[tone] ?? ""}`}>
      <p className="text-xs font-bold text-muted-foreground">{label}</p>
      <p className="mt-2 font-display text-3xl font-black text-foreground">{value}</p>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="card-3d glass rounded-2xl p-5">
      <h2 className="mb-4 font-display text-lg font-black">{title}</h2>
      {children}
    </section>
  );
}