import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

type Payment = {
  id: string;
  user_id: string;
  course_id: string | null;
  amount: number;
  method: string;
  reference: string | null;
  proof_url: string | null;
  status: string;
  created_at: string;
};

function ProofImage({ path }: { path: string }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    supabase.storage.from("payment-proofs").createSignedUrl(path, 3600).then(({ data }) => {
      if (!cancelled) setUrl(data?.signedUrl ?? null);
    });
    return () => { cancelled = true; };
  }, [path]);
  if (!url) return <div className="grid h-40 w-full place-items-center bg-card text-xs text-muted-foreground">جارِ التحميل...</div>;
  return (
    <a href={url} target="_blank" rel="noreferrer">
      <img src={url} alt="proof" className="h-40 w-full rounded-lg object-cover" />
    </a>
  );
}

export function PaymentProofsReview() {
  const qc = useQueryClient();
  const [busyId, setBusyId] = useState<string | null>(null);

  const { data: payments } = useQuery({
    queryKey: ["pending-payments"],
    queryFn: async () => {
      const { data } = await supabase
        .from("payments")
        .select("*")
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(50);
      return (data ?? []) as Payment[];
    },
  });

  const ids = Array.from(new Set((payments ?? []).flatMap((p) => [p.user_id, p.course_id].filter(Boolean)))) as string[];
  const { data: profiles } = useQuery({
    queryKey: ["proofs-profiles", ids.join(",")],
    enabled: ids.length > 0,
    queryFn: async () => {
      const [pr, co] = await Promise.all([
        supabase.from("profiles").select("id, full_name, phone, grade").in("id", ids),
        supabase.from("courses").select("id, title").in("id", ids),
      ]);
      const pmap = new Map((pr.data ?? []).map((r: any) => [r.id, r]));
      const cmap = new Map((co.data ?? []).map((r: any) => [r.id, r]));
      return { pmap, cmap };
    },
  });

  const setStatus = async (p: Payment, status: "paid" | "failed") => {
    setBusyId(p.id);
    try {
      const { error } = await supabase.from("payments").update({ status }).eq("id", p.id);
      if (error) throw error;
      if (status === "paid" && p.course_id) {
        await supabase.from("enrollments").insert({ user_id: p.user_id, course_id: p.course_id, progress: 0 });
      }
      toast.success(status === "paid" ? "تم اعتماد الدفع وتفعيل الاشتراك" : "تم الرفض");
      qc.invalidateQueries({ queryKey: ["pending-payments"] });
      qc.invalidateQueries({ queryKey: ["crud", "payments"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "حصل خطأ");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section className="space-y-3">
      <h2 className="font-display text-xl font-black">تحويلات قيد المراجعة</h2>
      <p className="text-xs text-muted-foreground">شوف إيصال التحويل والطالب واعتمد أو ارفض. اعتماد التحويل بيفعّل الاشتراك تلقائيًا.</p>
      {(payments ?? []).length === 0 && (
        <div className="glass rounded-2xl p-6 text-center text-sm text-muted-foreground">
          لا يوجد تحويلات جديدة الآن.
        </div>
      )}
      <div className="grid gap-4 md:grid-cols-2">
        {(payments ?? []).map((p) => {
          const prof = profiles?.pmap.get(p.user_id) as any;
          const course = p.course_id ? (profiles?.cmap.get(p.course_id) as any) : null;
          return (
            <div key={p.id} className="glass rounded-2xl p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-black">{prof?.full_name ?? "طالب"}</p>
                  <p dir="ltr" className="text-xs text-muted-foreground">{prof?.phone ?? "—"}</p>
                  {prof?.grade && <p className="text-xs text-muted-foreground">صف: {prof.grade}</p>}
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">{course?.title ?? "—"}</p>
                  <p className="text-sm font-black text-primary">{p.amount} ج.م</p>
                </div>
              </div>
              <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
                <span className="rounded-full bg-card px-2 py-0.5">{p.method}</span>
                {p.reference && <span dir="ltr" className="rounded-full bg-card px-2 py-0.5">#{p.reference}</span>}
                <span className="rounded-full bg-card px-2 py-0.5">
                  {new Date(p.created_at).toLocaleString("ar-EG")}
                </span>
              </div>
              <div className="mt-3">
                {p.proof_url ? <ProofImage path={p.proof_url} /> : (
                  <div className="grid h-24 place-items-center rounded-lg bg-card text-xs text-muted-foreground">
                    لا يوجد إيصال مرفق
                  </div>
                )}
              </div>
              <div className="mt-3 flex gap-2">
                <button onClick={() => setStatus(p, "paid")} disabled={busyId === p.id}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-emerald-500 py-2 text-xs font-black text-white disabled:opacity-60">
                  {busyId === p.id ? <Loader2 className="size-3.5 animate-spin" /> : <CheckCircle2 className="size-3.5" />}
                  اعتماد
                </button>
                <button onClick={() => setStatus(p, "failed")} disabled={busyId === p.id}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-rose-500 py-2 text-xs font-black text-white disabled:opacity-60">
                  <XCircle className="size-3.5" /> رفض
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}