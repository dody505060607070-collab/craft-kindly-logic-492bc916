import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Beaker, Pencil, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/dashboard/ab-tests")({
  head: () => ({
    meta: [
      { title: "اختبارات A/B على الكورسات | لوحة تحكم المستر" },
      { name: "description", content: "اختبر عناوين وأسعار وأوصاف مختلفة للكورسات وقارن معدلات التحويل بذكاء." },
      { property: "og:title", content: "اختبارات A/B على الكورسات" },
      { property: "og:description", content: "قارن أداء نسخ مختلفة من صفحات الكورسات." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AbTestsPage,
});

type Course = { id: string; title: string; description: string | null; cover_url: string | null; price: number };
type Variant = {
  id: string;
  course_id: string;
  name: string;
  title_override: string | null;
  description_override: string | null;
  cover_override: string | null;
  price_override: number | null;
  weight: number;
  is_active: boolean;
};
type EventRow = { course_id: string; variant_id: string | null; event: string };

function AbTestsPage() {
  const qc = useQueryClient();
  const [selected, setSelected] = useState<string | null>(null);
  const [editing, setEditing] = useState<Partial<Variant> | null>(null);

  const courses = useQuery({
    queryKey: ["ab", "courses"],
    queryFn: async () => {
      const { data } = await supabase.from("courses").select("id, title, description, cover_url, price").order("sort_order");
      return (data ?? []) as Course[];
    },
  });

  const variants = useQuery({
    queryKey: ["ab", "variants", selected],
    enabled: !!selected,
    queryFn: async () => {
      const { data } = await supabase.from("course_variants").select("*").eq("course_id", selected!).order("created_at");
      return (data ?? []) as Variant[];
    },
  });

  const events = useQuery({
    queryKey: ["ab", "events", selected],
    enabled: !!selected,
    queryFn: async () => {
      const { data } = await supabase.from("variant_events").select("course_id, variant_id, event").eq("course_id", selected!);
      return (data ?? []) as EventRow[];
    },
  });

  const save = useMutation({
    mutationFn: async (v: Partial<Variant>) => {
      if (v.id) {
        const { error } = await supabase.from("course_variants").update({
          name: v.name,
          title_override: v.title_override || null,
          description_override: v.description_override || null,
          cover_override: v.cover_override || null,
          price_override: v.price_override ?? null,
          weight: v.weight ?? 1,
          is_active: v.is_active ?? true,
        }).eq("id", v.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("course_variants").insert({
          course_id: selected!,
          name: v.name || "Variant",
          title_override: v.title_override || null,
          description_override: v.description_override || null,
          cover_override: v.cover_override || null,
          price_override: v.price_override ?? null,
          weight: v.weight ?? 1,
          is_active: v.is_active ?? true,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ab", "variants", selected] });
      setEditing(null);
    },
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("course_variants").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ab", "variants", selected] }),
  });

  const stats = (variantId: string | null) => {
    const rows = (events.data ?? []).filter((e) => e.variant_id === variantId);
    const views = rows.filter((r) => r.event === "view").length;
    const clicks = rows.filter((r) => r.event === "click").length;
    const enrolls = rows.filter((r) => r.event === "enroll").length;
    const ctr = views ? (clicks / views) * 100 : 0;
    const cvr = views ? (enrolls / views) * 100 : 0;
    return { views, clicks, enrolls, ctr, cvr };
  };

  const controlStats = stats(null);

  return (
    <div className="space-y-8">
      <header className="flex items-center gap-3">
        <Beaker className="size-6 text-primary" />
        <div>
          <h1 className="font-display text-3xl font-black">اختبارات A/B</h1>
          <p className="text-sm text-muted-foreground">
            جرّب نسخ مختلفة من عنوان الكورس، السعر، الوصف، والغلاف — والمنصة بتوزع الزوار وبتقيس التحويل تلقائي.
          </p>
        </div>
      </header>

      <section className="card-3d glass rounded-2xl p-5">
        <label className="mb-2 block text-xs font-bold text-muted-foreground">اختر كورس</label>
        <select
          value={selected ?? ""}
          onChange={(e) => setSelected(e.target.value || null)}
          className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
        >
          <option value="">— اختر —</option>
          {(courses.data ?? []).map((c) => (
            <option key={c.id} value={c.id}>{c.title}</option>
          ))}
        </select>
      </section>

      {selected && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl font-black">النسخ المختلفة</h2>
            <button
              onClick={() => setEditing({ name: "", weight: 1, is_active: true })}
              className="flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-xs font-bold text-primary-foreground"
            >
              <Plus className="size-4" /> نسخة جديدة
            </button>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-border">
            <table className="w-full text-sm">
              <thead className="bg-card text-xs">
                <tr>
                  <th className="p-3 text-right">النسخة</th>
                  <th className="p-3">الوزن</th>
                  <th className="p-3">مشاهدات</th>
                  <th className="p-3">ضغط</th>
                  <th className="p-3">اشتراك</th>
                  <th className="p-3">CTR%</th>
                  <th className="p-3">CVR%</th>
                  <th className="p-3">حالة</th>
                  <th className="p-3"></th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-border/60 bg-background/50">
                  <td className="p-3 font-bold">Control (الأصلي)</td>
                  <td className="p-3 text-center">—</td>
                  <td className="p-3 text-center">{controlStats.views}</td>
                  <td className="p-3 text-center">{controlStats.clicks}</td>
                  <td className="p-3 text-center">{controlStats.enrolls}</td>
                  <td className="p-3 text-center">{controlStats.ctr.toFixed(1)}</td>
                  <td className="p-3 text-center font-bold text-emerald-500">{controlStats.cvr.toFixed(1)}</td>
                  <td className="p-3 text-center text-xs text-muted-foreground">دائم</td>
                  <td></td>
                </tr>
                {(variants.data ?? []).map((v) => {
                  const s = stats(v.id);
                  return (
                    <tr key={v.id} className="border-t border-border/60">
                      <td className="p-3 font-bold">{v.name}</td>
                      <td className="p-3 text-center">{v.weight}</td>
                      <td className="p-3 text-center">{s.views}</td>
                      <td className="p-3 text-center">{s.clicks}</td>
                      <td className="p-3 text-center">{s.enrolls}</td>
                      <td className="p-3 text-center">{s.ctr.toFixed(1)}</td>
                      <td className="p-3 text-center font-bold text-emerald-500">{s.cvr.toFixed(1)}</td>
                      <td className="p-3 text-center text-xs">
                        {v.is_active ? <span className="text-emerald-500">شغّالة</span> : <span className="text-muted-foreground">موقوفة</span>}
                      </td>
                      <td className="p-3">
                        <div className="flex justify-center gap-2">
                          <button onClick={() => setEditing(v)} className="rounded-lg p-1.5 hover:bg-card"><Pencil className="size-4" /></button>
                          <button onClick={() => { if (confirm("تحذف النسخة؟")) del.mutate(v.id); }} className="rounded-lg p-1.5 text-destructive hover:bg-card"><Trash2 className="size-4" /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {(variants.data ?? []).length === 0 && (
                  <tr><td colSpan={9} className="p-8 text-center text-muted-foreground">مفيش نسخ لسه — أضف نسخة عشان تبدأ الاختبار.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {editing && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" onClick={() => setEditing(null)}>
          <div className="w-full max-w-lg space-y-3 rounded-2xl bg-background p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-display text-lg font-black">{editing.id ? "تعديل نسخة" : "نسخة جديدة"}</h3>
            <Field label="اسم النسخة" value={editing.name ?? ""} onChange={(v) => setEditing({ ...editing, name: v })} />
            <Field label="عنوان بديل (اختياري)" value={editing.title_override ?? ""} onChange={(v) => setEditing({ ...editing, title_override: v })} />
            <Field label="وصف بديل (اختياري)" value={editing.description_override ?? ""} onChange={(v) => setEditing({ ...editing, description_override: v })} multiline />
            <Field label="رابط غلاف بديل (اختياري)" value={editing.cover_override ?? ""} onChange={(v) => setEditing({ ...editing, cover_override: v })} />
            <div className="grid grid-cols-2 gap-3">
              <Field label="سعر بديل" type="number" value={String(editing.price_override ?? "")} onChange={(v) => setEditing({ ...editing, price_override: v === "" ? null : Number(v) })} />
              <Field label="الوزن" type="number" value={String(editing.weight ?? 1)} onChange={(v) => setEditing({ ...editing, weight: Number(v) || 1 })} />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={editing.is_active ?? true} onChange={(e) => setEditing({ ...editing, is_active: e.target.checked })} />
              شغّالة
            </label>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setEditing(null)} className="rounded-xl bg-card px-4 py-2 text-sm font-bold">إلغاء</button>
              <button onClick={() => save.mutate(editing)} disabled={save.isPending} className="rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground disabled:opacity-50">
                {save.isPending ? "جارِ الحفظ…" : "حفظ"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, value, onChange, type = "text", multiline }: { label: string; value: string; onChange: (v: string) => void; type?: string; multiline?: boolean }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-bold text-muted-foreground">{label}</span>
      {multiline ? (
        <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={3} className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm" />
      ) : (
        <input type={type} value={value} onChange={(e) => onChange(e.target.value)} className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm" />
      )}
    </label>
  );
}