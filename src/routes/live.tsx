import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Radio } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { StudentShell } from "@/components/StudentShell";

export const Route = createFileRoute("/live")({
  head: () => ({
    meta: [
      { title: "البث المباشر | منصة المستر" },
      { name: "description", content: "الحصص المباشرة والمسجلة." },
      { property: "og:title", content: "البث المباشر | منصة المستر" },
      { property: "og:description", content: "الحصص المباشرة والمسجلة." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: LivePage,
});

const STATUS_LABEL: Record<string, { text: string; cls: string }> = {
  scheduled: { text: "قريبًا", cls: "bg-amber-500/15 text-amber-500" },
  live: { text: "مباشر الآن", cls: "bg-red-500/15 text-red-500 animate-pulse" },
  ended: { text: "انتهت", cls: "bg-muted text-muted-foreground" },
};

function LivePage() {
  const { data } = useQuery({
    queryKey: ["live-public"],
    queryFn: async () => {
      const [catalog, playable] = await Promise.all([
        supabase.rpc("get_live_sessions_catalog"),
        supabase.from("live_sessions").select("id, stream_url, recording_url"),
      ]);
      const playMap = new Map(
        ((playable.data ?? []) as Array<{ id: string; stream_url: string | null; recording_url: string | null }>)
          .map((r) => [r.id, r]),
      );
      return ((catalog.data ?? []) as Array<any>).map((s) => ({
        ...s,
        stream_url: playMap.get(s.id)?.stream_url ?? null,
        recording_url: playMap.get(s.id)?.recording_url ?? null,
        courses: s.course_title ? { title: s.course_title } : null,
      }));
    },
  });

  return (
    <StudentShell>
      <div className="mx-auto max-w-4xl px-4 py-8">
        <header className="mb-6">
          <h1 className="font-display text-3xl font-black">البث المباشر</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            كل الحصص القادمة والمسجّلة في مكان واحد.
          </p>
        </header>

        <div className="space-y-3">
          {(data ?? []).map((s) => {
            const st = STATUS_LABEL[s.status] ?? STATUS_LABEL.scheduled;
            return (
              <div key={s.id} className="soft-card flex items-start gap-3 rounded-2xl p-4">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-red-500/15 text-red-500">
                  <Radio className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-black">{s.title}</h3>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${st.cls}`}>
                      {st.text}
                    </span>
                  </div>
                  {s.description && (
                    <p className="mt-1 text-sm text-muted-foreground">{s.description}</p>
                  )}
                  <p className="mt-2 text-xs text-muted-foreground">
                    {new Date(s.starts_at).toLocaleString("ar-EG")}
                  </p>
                  {(s.stream_url || s.recording_url) && (
                    <a
                      href={s.stream_url || s.recording_url!}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 inline-block rounded-xl bg-primary px-3 py-1.5 text-xs font-black text-primary-foreground"
                    >
                      {s.status === "ended" ? "شاهد التسجيل" : "افتح البث"}
                    </a>
                  )}
                </div>
              </div>
            );
          })}
          {(data ?? []).length === 0 && (
            <p className="text-center text-muted-foreground">لا توجد حصص حاليًا.</p>
          )}
        </div>
      </div>
    </StudentShell>
  );
}
