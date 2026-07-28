import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export function PopupAnnouncement() {
  const [open, setOpen] = useState(false);
  const [closed, setClosed] = useState(false);

  const { data } = useQuery({
    queryKey: ["popup-announcement"],
    queryFn: async () => {
      const { data } = await supabase
        .from("announcements")
        .select("id,title,body,image_url")
        .eq("show_as_popup", true)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data as { id: string; title: string; body: string; image_url: string | null } | null;
    },
    staleTime: 60_000,
  });

  useEffect(() => {
    if (!data || closed) return;
    setOpen(true);
    const t = setTimeout(() => setOpen(false), 5000);
    return () => clearTimeout(t);
  }, [data, closed]);

  if (!open || !data) return null;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4 animate-in fade-in"
      onClick={() => {
        setOpen(false);
        setClosed(true);
      }}
    >
      <div
        className="relative w-full max-w-md rounded-3xl border border-primary/40 bg-surface p-6 shadow-2xl animate-in zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="absolute left-3 top-3 rounded-full p-1 text-muted-foreground hover:bg-card"
          onClick={() => {
            setOpen(false);
            setClosed(true);
          }}
          aria-label="إغلاق"
        >
          <X className="size-4" />
        </button>
        <div className="mb-2 inline-block rounded-full bg-primary/15 px-3 py-1 text-[10px] font-black text-primary">
          إعلان
        </div>
        <h3 className="font-display text-xl font-black text-foreground">{data.title}</h3>
        <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
          {data.body}
        </p>
        {data.image_url && (
          <img
            src={data.image_url}
            alt={data.title}
            className="mt-3 w-full rounded-2xl border border-border object-cover max-h-64"
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
          />
        )}
        <div className="mt-4 h-1 w-full overflow-hidden rounded-full bg-card">
          <div className="h-full bg-primary animate-[popup-bar_5s_linear_forwards]" />
        </div>
        <style>{`@keyframes popup-bar { from { width: 100%; } to { width: 0%; } }`}</style>
      </div>
    </div>
  );
}