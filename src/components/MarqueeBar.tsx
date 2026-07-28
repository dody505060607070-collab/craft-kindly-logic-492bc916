import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function MarqueeBar() {
  const { data } = useQuery({
    queryKey: ["site-settings-public"],
    queryFn: async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("marquee_text,marquee_enabled")
        .eq("id", "main")
        .maybeSingle();
      return data;
    },
    staleTime: 30_000,
  });

  if (!data?.marquee_enabled || !data?.marquee_text?.trim()) return null;
  const text = data.marquee_text.trim();

  return (
    <>
      <div className="fixed inset-x-0 top-0 z-[100] w-full overflow-hidden border-b border-primary/40 bg-primary text-primary-foreground shadow-md">
        <div className="marquee-track whitespace-nowrap py-1.5 text-sm font-bold">
          {Array.from({ length: 4 }).map((_, i) => (
            <span key={i} className="mx-8 inline-block">
              {text}
            </span>
          ))}
        </div>
        <style>{`
          .marquee-track { animation: marquee-scroll 25s linear infinite; }
          @keyframes marquee-scroll {
            0% { transform: translateX(0); }
            100% { transform: translateX(-50%); }
          }
          [dir="rtl"] .marquee-track { animation-direction: reverse; }
        `}</style>
      </div>
      {/* Spacer so page content isn't hidden behind the fixed bar */}
      <div aria-hidden className="h-8" />
    </>
  );
}