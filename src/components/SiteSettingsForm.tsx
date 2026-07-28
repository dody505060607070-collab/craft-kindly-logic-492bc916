import { useEffect, useState } from "react";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AiWriteButton } from "@/components/AiWriteButton";

export function SiteSettingsForm() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["site-settings"],
    queryFn: async () => {
      const { data } = await supabase.from("site_settings").select("*").eq("id", "main").maybeSingle();
      return data;
    },
  });
  const [phone, setPhone] = useState("");
  const [insta, setInsta] = useState("");
  const [note, setNote] = useState("");
  const [marqueeText, setMarqueeText] = useState("");
  const [marqueeEnabled, setMarqueeEnabled] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!data) return;
    setPhone(data.payment_phone ?? "");
    setInsta(data.payment_instapay ?? "");
    setNote(data.payment_note ?? "");
    setMarqueeText((data as any).marquee_text ?? "");
    setMarqueeEnabled(Boolean((data as any).marquee_enabled));
  }, [data]);

  const save = async () => {
    setBusy(true);
    const { error } = await supabase
      .from("site_settings")
      .update({
        payment_phone: phone,
        payment_instapay: insta,
        payment_note: note,
        marquee_text: marqueeText,
        marquee_enabled: marqueeEnabled,
        updated_at: new Date().toISOString(),
      } as any)
      .eq("id", "main");
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("تم حفظ الإعدادات");
    qc.invalidateQueries({ queryKey: ["site-settings"] });
    qc.invalidateQueries({ queryKey: ["site-settings-public"] });
  };

  return (
    <div className="glass space-y-3 rounded-2xl p-5">
      <h2 className="font-black">إعدادات أرقام الدفع</h2>
      <p className="text-xs text-muted-foreground">
        هذه الأرقام تظهر للطالب في صفحة الاشتراك — عدّلها هنا في أي وقت.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-bold text-muted-foreground">رقم فودافون كاش</label>
          <input dir="ltr" value={phone} onChange={(e) => setPhone(e.target.value)}
            className="w-full rounded-xl border border-input bg-surface px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-bold text-muted-foreground">إنستاباي</label>
          <input dir="ltr" value={insta} onChange={(e) => setInsta(e.target.value)}
            className="w-full rounded-xl border border-input bg-surface px-3 py-2 text-sm" />
        </div>
      </div>
      <div>
        <label className="mb-1 block text-xs font-bold text-muted-foreground">ملاحظة تظهر للطالب (اختياري)</label>
        <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2}
          className="w-full rounded-xl border border-input bg-surface px-3 py-2 text-sm" />
      </div>
      <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
        <div className="mb-2 flex items-center justify-between">
          <label className="text-sm font-black">الشريط العلوي المتحرك (Marquee)</label>
          <label className="flex items-center gap-2 text-xs font-bold">
            <input type="checkbox" checked={marqueeEnabled} onChange={(e) => setMarqueeEnabled(e.target.checked)} />
            مفعّل
          </label>
        </div>
        <input
          value={marqueeText}
          onChange={(e) => setMarqueeText(e.target.value)}
          placeholder="اكتب نص الإعلان اللي هيتحرك فوق الموقع…"
          className="w-full rounded-xl border border-input bg-surface px-3 py-2 text-sm"
        />
        <p className="mt-1 text-[11px] text-muted-foreground">يظهر كشريط متحرك أعلى كل صفحات الموقع لغير الأدمن.</p>
      </div>
      <button onClick={save} disabled={busy}
        className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-60">
        {busy ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} حفظ
      </button>
    </div>
  );
}