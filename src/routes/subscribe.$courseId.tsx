import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { CheckCircle2, Copy, Upload } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { StudentShell } from "@/components/StudentShell";
import { SITE } from "@/lib/site";

export const Route = createFileRoute("/subscribe/$courseId")({
  head: () => ({
    meta: [
      { title: "اشترك في الدرس | منصة المستر" },
      { name: "description", content: "طرق الاشتراك عبر فودافون كاش أو إنستاباي." },
      { property: "og:title", content: "اشترك في الدرس" },
      { property: "og:description", content: "الدفع عبر فودافون كاش/إنستاباي." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Subscribe,
});

function Subscribe() {
  const { courseId } = useParams({ from: "/subscribe/$courseId" });
  const { user } = useAuth();
  const [reference, setReference] = useState("");
  const [method, setMethod] = useState("vodafone_cash");
  const [plan, setPlan] = useState<"month" | "year">("month");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const { data: course } = useQuery({
    queryKey: ["subscribe-course", courseId],
    queryFn: async () => {
      const { data } = await supabase.from("courses").select("*").eq("id", courseId).maybeSingle();
      return data;
    },
  });

  const { data: settings } = useQuery({
    queryKey: ["site-settings-public"],
    queryFn: async () => {
      const { data } = await supabase.from("site_settings").select("*").eq("id", "main").maybeSingle();
      return data;
    },
  });
  const payPhone = settings?.payment_phone || SITE.phone;
  const payInsta = settings?.payment_instapay || SITE.phone;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return toast.error("سجّل دخولك أولاً");
    if (!reference.trim()) return toast.error("اكتب رقم عملية الدفع");
    setBusy(true);
    try {
      let proofUrl: string | null = null;
      if (file) {
        const path = `${user.id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
        const { error: upErr } = await supabase.storage
          .from("payment-proofs")
          .upload(path, file);
        if (upErr) throw upErr;
        proofUrl = path;
      }
      const { error } = await supabase.from("payments").insert({
        user_id: user.id,
        course_id: courseId,
        amount: plan === "year" ? (course?.price_year ?? course?.price ?? 0) : (course?.price ?? 0),
        method,
        reference,
        proof_url: proofUrl,
        status: "pending",
        plan,
      });
      if (error) throw error;
      setDone(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "حصلت مشكلة");
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <StudentShell>
        <div className="mx-auto max-w-xl px-4 py-12 text-center">
          <div className="glass rounded-3xl p-8">
            <CheckCircle2 className="mx-auto size-16 text-emerald-500" />
            <h1 className="mt-4 font-display text-2xl font-black">تم إرسال طلب الاشتراك</h1>
            <p className="mt-3 text-sm text-muted-foreground">
              سيتم مراجعة التحويل بتاعك خلال 12 ساعة كحد أقصى، وهيتم تفعيل الدرس فور الاعتماد.
            </p>
            <p className="mt-1 text-xs text-muted-foreground">هتوصلك رسالة داخل المنصة عند التفعيل.</p>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              <Link to="/" hash="courses" className="rounded-xl bg-primary px-5 py-2.5 text-sm font-black text-primary-foreground">
                رجوع للدروس
              </Link>
              <Link to="/courses/$courseId" params={{ courseId }} className="rounded-xl bg-card px-5 py-2.5 text-sm font-black">
                معاينة المحتوى
              </Link>
            </div>
          </div>
        </div>
      </StudentShell>
    );
  }

  return (
    <StudentShell>
      <div className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="font-display text-2xl font-black sm:text-3xl">الاشتراك</h1>
        {course && (
          <p className="mt-2 text-sm text-muted-foreground">
            درس: <span className="font-bold text-foreground">{course.title}</span> — السعر:{" "}
            <span className="font-black text-primary">{plan === "year" ? (course.price_year ?? course.price) : course.price} ج.م</span>
          </p>
        )}

        <div className="mt-6 space-y-4">
          <div className="glass rounded-2xl p-5">
            <h2 className="font-black">طرق الدفع</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              حوّل المبلغ على أحد الأرقام التالية ثم ارفع صورة الإيصال ورقم العملية.
            </p>
            {settings?.payment_note && (
              <p className="mt-2 rounded-xl bg-primary/10 p-3 text-xs text-primary">{settings.payment_note}</p>
            )}
            <div className="mt-3 space-y-2">
              {[
                { label: "فودافون كاش", value: payPhone },
                { label: "إنستاباي", value: payInsta },
              ].map((p) => (
                <div key={p.label} className="flex items-center justify-between rounded-xl bg-card p-3">
                  <div>
                    <p className="text-xs text-muted-foreground">{p.label}</p>
                    <p className="text-lg font-black tracking-wider text-primary">{p.value}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(p.value);
                      toast.success("تم النسخ");
                    }}
                    className="rounded-xl bg-primary/15 p-2 text-primary"
                    aria-label="نسخ"
                  >
                    <Copy className="size-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <form onSubmit={submit} className="glass space-y-4 rounded-2xl p-5">
            <h2 className="font-black">تأكيد الدفع</h2>

            <div>
              <label className="mb-1.5 block text-xs font-bold text-muted-foreground">مدة الاشتراك</label>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => setPlan("month")} className={`rounded-xl border p-3 text-sm font-bold ${plan === "month" ? "border-primary bg-primary/10 text-primary" : "border-input bg-surface"}`}>شهر — {course?.price ?? 0} ج.م</button>
                <button type="button" onClick={() => setPlan("year")} className={`rounded-xl border p-3 text-sm font-bold ${plan === "year" ? "border-primary bg-primary/10 text-primary" : "border-input bg-surface"}`}>سنة — {course?.price_year ?? course?.price ?? 0} ج.م</button>
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-bold text-muted-foreground">
                طريقة الدفع
              </label>
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value)}
                className="w-full rounded-xl border border-input bg-surface px-3 py-2.5 text-sm"
              >
                <option value="vodafone_cash">فودافون كاش</option>
                <option value="instapay">إنستاباي</option>
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-bold text-muted-foreground">
                رقم عملية الدفع
              </label>
              <input
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                className="w-full rounded-xl border border-input bg-surface px-3 py-2.5 text-sm"
                placeholder="مثال: 123456789"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-bold text-muted-foreground">
                صورة الإيصال (اختياري)
              </label>
              <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-input bg-surface p-4 text-sm text-muted-foreground hover:bg-card">
                <Upload className="size-4" />
                {file ? file.name : "اختر صورة"}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
              </label>
            </div>

            <button
              disabled={busy}
              className="w-full rounded-xl bg-primary py-3 font-black text-primary-foreground disabled:opacity-60"
            >
              {busy ? "جارِ الإرسال..." : "إرسال طلب الاشتراك"}
            </button>

            {!user && (
              <p className="text-center text-xs text-muted-foreground">
                <Link to="/auth" className="text-primary underline">
                  سجّل دخولك
                </Link>{" "}
                عشان تقدر تشترك.
              </p>
            )}
          </form>
        </div>
      </div>
    </StudentShell>
  );
}
