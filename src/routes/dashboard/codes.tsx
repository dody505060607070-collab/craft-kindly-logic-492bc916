import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, KeyRound, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AdminHelp } from "@/components/AdminHelp";
import { SectionHint } from "@/components/SectionHint";

export const Route = createFileRoute("/dashboard/codes")({
  head: () => ({
    meta: [
      { title: "أكواد التفعيل والخصومات | لوحة تحكم المستر" },
      { name: "description", content: "توليد أكواد تفعيل تُستخدم مرة واحدة لفتح الدروس، والتحكم في الأسعار والخصومات." },
      { property: "og:title", content: "أكواد التفعيل والخصومات | منصة المستر" },
      { property: "og:description", content: "أكواد تفعيل تُستخدم مرة واحدة + خصومات على الدروس." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CodesPage,
});

const rpc = supabase.rpc.bind(supabase) as unknown as (
  fn: string,
  args?: Record<string, unknown>,
) => Promise<{ data: unknown; error: { message: string } | null }>;

type CodeRow = {
  id: string;
  code: string;
  course_id: string;
  plan: string;
  duration_days: number;
  note: string | null;
  used_by: string | null;
  used_at: string | null;
  created_at: string;
};

const planLabel = (plan: string) =>
  plan === "year" ? "سنة" : plan === "lifetime" ? "مدى الحياة" : plan === "term" ? "ترم" : plan === "month" ? "شهر" : plan;

const PRESETS = [
  { name: "month", label: "شهر", days: 30 },
  { name: "term", label: "ترم دراسي", days: 120 },
  { name: "year", label: "سنة", days: 365 },
  { name: "lifetime", label: "مدى الحياة", days: 0 },
];

function CodesPage() {
  const queryClient = useQueryClient();
  const [courseId, setCourseId] = useState("");
  const [plan, setPlan] = useState("month");
  const [customName, setCustomName] = useState("");
  const [customDays, setCustomDays] = useState(30);
  const [count, setCount] = useState(5);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [fresh, setFresh] = useState<string[]>([]);

  const [filter, setFilter] = useState<"all" | "unused" | "used">("all");

  const { data: courses } = useQuery({
    queryKey: ["admin-courses-min"],
    queryFn: async () => {
      const { data } = await supabase
        .from("courses")
        .select("id, title, price, price_year, discount_percent, is_free")
        .order("sort_order");
      return data ?? [];
    },
  });

  const { data: codes } = useQuery({
    queryKey: ["access-codes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("access_codes")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as CodeRow[];
    },
  });

  const courseTitles = useMemo(
    () => new Map((courses ?? []).map((course) => [course.id, course.title])),
    [courses],
  );

  const visible = (codes ?? []).filter((row) =>
    filter === "all" ? true : filter === "used" ? !!row.used_by : !row.used_by,
  );

  const generate = async () => {
    if (!courseId) return toast.error("اختر الدرس الأول");
    setBusy(true);
    try {
      const { data, error } = await rpc("generate_access_codes", {
        _course_id: courseId,
        _count: count,
        _plan: plan,
        _note: note.trim() || null,
      });
      if (error) throw new Error(error.message);
      const list = ((data ?? []) as Array<{ code: string }>).map((row) => row.code);
      setFresh(list);
      toast.success(`تم توليد ${list.length} كود`);
      await queryClient.invalidateQueries({ queryKey: ["access-codes"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "تعذر توليد الأكواد");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("متأكد من حذف الكود؟ مش هيقدر حد يستخدمه بعد كده.")) return;
    const { error } = await supabase.from("access_codes").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("تم الحذف");
    await queryClient.invalidateQueries({ queryKey: ["access-codes"] });
  };

  const savePricing = async (
    id: string,
    values: { price: number; price_year: number | null; discount_percent: number },
  ) => {
    const { error } = await supabase.from("courses").update(values).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("تم تحديث السعر والخصم");
    await queryClient.invalidateQueries({ queryKey: ["admin-courses-min"] });
  };

  return (
    <div className="space-y-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-black">أكواد التفعيل والخصومات</h1>
          <p className="text-sm text-muted-foreground">ولّد أكواد تفتح الدرس بدون دفع، وتحكم في الأسعار والخصومات.</p>
        </div>
        <AdminHelp
          title="شرح صفحة الأكواد والخصومات"
          intro="من هنا بتعمل أكواد تفعيل تديها لأي طالب، وبتظبط أسعار وخصومات الدروس."
          items={[
            { title: "توليد الأكواد", body: "اختر الدرس والمدة (شهر/سنة/مدى الحياة) وعدد الأكواد واضغط 'ولّد'. انسخ الأكواد وابعتها للطلاب." },
            { title: "كل كود مرة واحدة", body: "أول طالب يستخدم الكود بيتقيّد باسمه ويبقى مستخدم — مش هيشتغل تاني مع أي حد." },
            { title: "الطالب بيستخدمه فين؟", body: "من صفحة الدرس أو صفحة الاشتراك — فيه خانة 'عندك كود تفعيل؟' يكتب الكود فيها فيفتح الدرس فورًا." },
            { title: "الأسعار والخصومات", body: "من جدول الأسعار تحت: عدّل سعر الشهر وسعر السنة ونسبة الخصم %. الخصم بيظهر للطالب بالسعر القديم مشطوب والجديد جانبه." },
          ]}
        />
      </div>

      <section className="glass rounded-2xl p-5">
        <h2 className="mb-1 flex items-center gap-2 font-display text-xl font-black">
          <KeyRound className="size-5 text-accent" /> توليد أكواد جديدة
        </h2>
        <SectionHint title="إزاي تولّد أكواد">
          اختر الدرس اللي الكود هيفتحه، حدد مدة الاشتراك اللي الكود هيديها، اكتب عدد الأكواد (لحد ٢٠٠)، وأضف ملاحظة اختيارية (مثلاً "طلاب المنحة"). بعد التوليد انسخ الأكواد واحد واحد أو كلهم مرة واحدة.
        </SectionHint>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="text-xs font-bold">
            الدرس
            <select
              value={courseId}
              onChange={(event) => setCourseId(event.target.value)}
              className="mt-1 w-full rounded-xl border border-input bg-surface px-3 py-2.5 text-sm"
            >
              <option value="">— اختر الدرس —</option>
              {(courses ?? []).map((course) => (
                <option key={course.id} value={course.id}>{course.title}</option>
              ))}
            </select>
          </label>
          <label className="text-xs font-bold">
            المدة
            <select
              value={plan}
              onChange={(event) => setPlan(event.target.value)}
              className="mt-1 w-full rounded-xl border border-input bg-surface px-3 py-2.5 text-sm"
            >
              <option value="month">شهر</option>
              <option value="year">سنة</option>
              <option value="lifetime">مدى الحياة</option>
            </select>
          </label>
          <label className="text-xs font-bold">
            عدد الأكواد
            <input
              type="number"
              min={1}
              max={200}
              value={count}
              onChange={(event) => setCount(Number(event.target.value))}
              className="mt-1 w-full rounded-xl border border-input bg-surface px-3 py-2.5 text-sm"
            />
          </label>
          <label className="text-xs font-bold">
            ملاحظة (اختياري)
            <input
              value={note}
              onChange={(event) => setNote(event.target.value)}
              maxLength={120}
              placeholder="مثال: طلاب المنحة"
              className="mt-1 w-full rounded-xl border border-input bg-surface px-3 py-2.5 text-sm"
            />
          </label>
        </div>
        <button
          onClick={() => void generate()}
          disabled={busy}
          className="mt-3 flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-black text-primary-foreground disabled:opacity-60"
        >
          {busy ? <Loader2 className="size-4 animate-spin" /> : <KeyRound className="size-4" />}
          ولّد الأكواد
        </button>

        {fresh.length > 0 && (
          <div className="mt-4 rounded-xl bg-surface p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-black">الأكواد الجديدة ({fresh.length})</p>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(fresh.join("\n"));
                  toast.success("تم نسخ كل الأكواد");
                }}
                className="flex items-center gap-1 rounded-lg bg-primary/15 px-3 py-1.5 text-xs font-bold text-primary"
              >
                <Copy className="size-3.5" /> نسخ الكل
              </button>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {fresh.map((code) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(code);
                    toast.success("تم نسخ الكود");
                  }}
                  className="rounded-lg bg-card px-3 py-1.5 font-mono text-sm font-black tracking-widest"
                >
                  {code}
                </button>
              ))}
            </div>
          </div>
        )}
      </section>

      <section>
        <SectionHint title="كل الأكواد">
          جدول بكل الأكواد: الكود، الدرس، المدة، وحالة الاستخدام. الكود المستخدم بيبان بتاريخ استخدامه ومش هيشتغل تاني. تقدر تحذف أي كود لسه مستخدمه محدش.
        </SectionHint>
        <div className="soft-card rounded-2xl p-4">
          <div className="mb-3 flex gap-2">
            {([
              { key: "all", label: "الكل" },
              { key: "unused", label: "متاح" },
              { key: "used", label: "مستخدم" },
            ] as const).map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setFilter(tab.key)}
                className={`rounded-xl px-3 py-1.5 text-xs font-bold ${filter === tab.key ? "bg-primary text-primary-foreground" : "bg-surface"}`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="text-muted-foreground">
                <tr>
                  <th className="p-2">الكود</th>
                  <th className="p-2">الدرس</th>
                  <th className="p-2">المدة</th>
                  <th className="p-2">الحالة</th>
                  <th className="p-2">ملاحظة</th>
                  <th className="p-2" />
                </tr>
              </thead>
              <tbody>
                {visible.map((row) => (
                  <tr key={row.id} className="border-t border-border/50">
                    <td className="p-2 font-mono font-black tracking-widest">{row.code}</td>
                    <td className="p-2">{courseTitles.get(row.course_id) ?? "—"}</td>
                    <td className="p-2">{planLabel(row.plan)}</td>
                    <td className="p-2">
                      {row.used_by ? (
                        <span className="rounded-full bg-destructive/10 px-2 py-1 font-bold text-destructive">
                          مستخدم {row.used_at ? new Date(row.used_at).toLocaleDateString("ar-EG") : ""}
                        </span>
                      ) : (
                        <span className="rounded-full bg-emerald-500/10 px-2 py-1 font-bold text-emerald-600">متاح</span>
                      )}
                    </td>
                    <td className="p-2 text-muted-foreground">{row.note ?? "—"}</td>
                    <td className="p-2">
                      <div className="flex justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(row.code);
                            toast.success("تم النسخ");
                          }}
                          className="rounded-lg bg-surface p-2"
                          aria-label="نسخ"
                        >
                          <Copy className="size-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => void remove(row.id)}
                          className="rounded-lg bg-destructive/10 p-2 text-destructive"
                          aria-label="حذف"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {visible.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-muted-foreground">لا توجد أكواد.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section>
        <SectionHint title="الأسعار والخصومات">
          عدّل سعر الشهر وسعر السنة ونسبة الخصم لكل درس، واضغط "حفظ". الخصم نسبة مئوية (مثلاً ٢٥ = خصم ٢٥٪) وبيظهر للطالب بالسعر القديم مشطوب. حط ٠ لإلغاء الخصم.
        </SectionHint>
        <div className="soft-card space-y-3 rounded-2xl p-4">
          {(courses ?? []).map((course) => (
            <PricingRow
              key={course.id}
              title={course.title}
              price={Number(course.price ?? 0)}
              priceYear={course.price_year === null ? null : Number(course.price_year)}
              discount={Number(course.discount_percent ?? 0)}
              onSave={(values) => void savePricing(course.id, values)}
            />
          ))}
          {(courses ?? []).length === 0 && (
            <p className="p-4 text-center text-muted-foreground">لا توجد دروس.</p>
          )}
        </div>
      </section>
    </div>
  );
}

function PricingRow({
  title,
  price,
  priceYear,
  discount,
  onSave,
}: {
  title: string;
  price: number;
  priceYear: number | null;
  discount: number;
  onSave: (values: { price: number; price_year: number | null; discount_percent: number }) => void;
}) {
  const [month, setMonth] = useState(String(price));
  const [year, setYear] = useState(priceYear === null ? "" : String(priceYear));
  const [pct, setPct] = useState(String(discount));

  const finalMonth = Math.round(Number(month || 0) * (1 - Math.min(Math.max(Number(pct || 0), 0), 100) / 100));

  return (
    <div className="grid items-end gap-3 rounded-xl bg-surface p-3 sm:grid-cols-[1fr_auto_auto_auto_auto]">
      <p className="text-sm font-black">{title}</p>
      <label className="text-[11px] font-bold text-muted-foreground">
        سعر الشهر
        <input value={month} onChange={(e) => setMonth(e.target.value)} type="number" min={0}
          className="mt-1 w-28 rounded-lg border border-input bg-card px-2 py-2 text-sm" />
      </label>
      <label className="text-[11px] font-bold text-muted-foreground">
        سعر السنة
        <input value={year} onChange={(e) => setYear(e.target.value)} type="number" min={0} placeholder="—"
          className="mt-1 w-28 rounded-lg border border-input bg-card px-2 py-2 text-sm" />
      </label>
      <label className="text-[11px] font-bold text-muted-foreground">
        الخصم %
        <input value={pct} onChange={(e) => setPct(e.target.value)} type="number" min={0} max={100}
          className="mt-1 w-24 rounded-lg border border-input bg-card px-2 py-2 text-sm" />
      </label>
      <div className="flex items-center gap-2">
        <span className="text-xs font-bold text-primary">الشهر بعد الخصم: {finalMonth} ج.م</span>
        <button
          type="button"
          onClick={() =>
            onSave({
              price: Number(month || 0),
              price_year: year.trim() === "" ? null : Number(year),
              discount_percent: Math.min(Math.max(Number(pct || 0), 0), 100),
            })
          }
          className="rounded-lg bg-primary px-3 py-2 text-xs font-black text-primary-foreground"
        >
          حفظ
        </button>
      </div>
    </div>
  );
}
