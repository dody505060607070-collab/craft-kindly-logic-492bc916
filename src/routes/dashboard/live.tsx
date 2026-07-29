import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Send } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { CrudSection } from "@/components/CrudSection";
import { AdminHelp } from "@/components/AdminHelp";
import { SectionHint } from "@/components/SectionHint";

export const Route = createFileRoute("/dashboard/live")({
  head: () => ({
    meta: [
      { title: "البث المباشر | لوحة تحكم المستر" },
      { name: "description", content: "إدارة حصص البث المباشر مع دردشة تفاعلية وتسجيل الحصص في منصة المستر." },
      { property: "og:title", content: "البث المباشر | منصة المستر" },
      { property: "og:description", content: "حصص مباشرة ودردشة تفاعلية للطلاب." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: LivePage,
});

type LiveSession = { id: string; title: string; stream_url: string | null; status: string };
type LiveMsg = { id: string; content: string; user_id: string; created_at: string };

function LivePage() {
  const { user } = useAuth();
  const [active, setActive] = useState<LiveSession | null>(null);
  const [messages, setMessages] = useState<LiveMsg[]>([]);
  const [text, setText] = useState("");

  const { data: sessions } = useQuery({
    queryKey: ["live-sessions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("live_sessions")
        .select("id,title,stream_url,status")
        .order("starts_at", { ascending: false });
      if (error) throw error;
      return data as LiveSession[];
    },
  });

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    void supabase
      .from("live_messages")
      .select("id,content,user_id,created_at")
      .eq("session_id", active.id)
      .order("created_at")
      .limit(200)
      .then(({ data }) => {
        if (!cancelled) setMessages((data ?? []) as LiveMsg[]);
      });

    const channel = supabase
      .channel(`live-${active.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "live_messages",
          filter: `session_id=eq.${active.id}`,
        },
        (payload) => setMessages((m) => [...m, payload.new as LiveMsg]),
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [active]);

  const send = async () => {
    if (!text.trim() || !active || !user) return;
    const { error } = await supabase
      .from("live_messages")
      .insert({ session_id: active.id, user_id: user.id, content: text.trim().slice(0, 500) });
    if (error) toast.error(error.message);
    else setText("");
  };

  return (
    <div className="space-y-12">
      <section>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-black">غرفة البث المباشر</h1>
            <p className="text-sm text-muted-foreground">
              اختر حصة لعرض البث والدردشة التفاعلية اللحظية.
            </p>
          </div>
          <AdminHelp
            title="شرح البث المباشر"
            intro="أنشئ حصة، انسخ رابطها للطلاب، وتفاعل معهم في الشات."
            items={[
              { title: "١. أنشئ حصة", body: "من قسم 'إدارة حصص البث' تحت — أضف عنوان وموعد ورابط الاستريم (YouTube live أو Zoom embed)." },
              { title: "٢. رابط البث (embed)", body: "لازم يكون embed مش رابط عادي. للـ YouTube: استخدم رابط /embed/{ID}." },
              { title: "٣. الحالات", body: "مجدولة → جارية الآن (لما تبدأ) → انتهت. غيّرها يدويًا." },
              { title: "٤. رابط التسجيل", body: "بعد الحصة، حط رابط التسجيل عشان الطلاب اللي متابعوش يشوفوه." },
              { title: "الشات", body: "أي طالب مشترك يقدر يكتب. الرسائل بتوصل لحظيًا." },
            ]}
          />
        </div>

        <SectionHint title="اختار حصة">
          دي كل الحصص اللي عملتها من الجدول تحت. دوس على أي حصة عشان تشوف بثها والشات بتاعها. لو لسه ما عملتش حصة، انزل تحت لـ"إدارة حصص البث" وأضف واحدة.
        </SectionHint>
        <div className="mt-4 flex flex-wrap gap-2">
          {(sessions ?? []).map((s) => (
            <button
              key={s.id}
              onClick={() => setActive(s)}
              className={`rounded-xl px-4 py-2 text-sm font-bold ${
                active?.id === s.id
                  ? "bg-primary text-primary-foreground"
                  : "glass text-muted-foreground"
              }`}
            >
              {s.title}
            </button>
          ))}
          {!sessions?.length && (
            <p className="text-sm text-muted-foreground">لا توجد حصص بث بعد.</p>
          )}
        </div>

        {active && (
          <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_320px]">
            <div className="glass overflow-hidden rounded-2xl">
              {active.stream_url ? (
                <iframe
                  src={active.stream_url}
                  title={active.title}
                  allow="autoplay; fullscreen; picture-in-picture"
                  allowFullScreen
                  className="aspect-video w-full"
                />
              ) : (
                <div className="grid aspect-video place-items-center text-sm text-muted-foreground">
                  لم يتم إضافة رابط البث بعد.
                </div>
              )}
            </div>

            <div className="glass flex h-96 flex-col rounded-2xl p-3">
              <p className="mb-2 text-sm font-bold">الدردشة المباشرة</p>
              <div className="flex-1 space-y-2 overflow-y-auto pl-1">
                {messages.map((m) => (
                  <div key={m.id} className="rounded-xl bg-surface px-3 py-2 text-sm">
                    {m.content}
                  </div>
                ))}
                {!messages.length && (
                  <p className="text-xs text-muted-foreground">ابدأ الدردشة…</p>
                )}
              </div>
              <div className="mt-2 flex gap-2">
                <input
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && send()}
                  maxLength={500}
                  placeholder="اكتب رسالتك…"
                  className="flex-1 rounded-xl border border-input bg-surface px-3 py-2 text-sm outline-none"
                />
                <button
                  onClick={send}
                  className="rounded-xl bg-primary px-3 text-primary-foreground"
                  aria-label="إرسال"
                >
                  <Send className="size-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </section>

      <div>
        <SectionHint title="إدارة حصص البث">
          هنا بتضيف حصة جديدة. "رابط البث" لازم يكون رابط <b>embed</b> (مش رابط عادي) — من YouTube: <code className="rounded bg-card px-1">https://www.youtube.com/embed/VIDEO_ID</code>. حدّد موعد البدء والحالة (مجدولة → جارية → انتهت). بعد الحصة، حط "رابط التسجيل" عشان الطلاب اللي فاتتهم يشوفوها.
        </SectionHint>
        <CrudSection
          table="live_sessions"
          title="إدارة حصص البث"
          description="أضف حصة جديدة برابط البث، وبعد انتهائها ضع رابط التسجيل."
          orderBy="starts_at"
          fields={[
            { key: "title", label: "عنوان الحصة" },
            { key: "description", label: "الوصف", type: "textarea", hideInTable: true },
            { key: "stream_url", label: "رابط البث (embed)" },
            { key: "recording_url", label: "رابط التسجيل", hideInTable: true },
            { key: "starts_at", label: "موعد البدء", type: "datetime" },
            {
              key: "status",
              label: "الحالة",
              type: "select",
              default: "scheduled",
              options: [
                { value: "scheduled", label: "مجدولة" },
                { value: "live", label: "جارية الآن" },
                { value: "ended", label: "انتهت" },
              ],
            },
          ]}
        />
      </div>
    </div>
  );
}
