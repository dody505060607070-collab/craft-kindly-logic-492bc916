import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function MarqueeBar() {
  const { data } = useQuery({
    queryKey: ["site-settings-public"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_settings")
        .select("marquee_text,marquee_enabled")
        .eq("id", "main")
        .maybeSingle();
      if (error) return null;
      return data ?? null;
    },
    retry: 1,
    staleTime: 0,
    gcTime: 0,
    refetchInterval: 15_000,
    refetchOnReconnect: true,
    refetchOnWindowFocus: true,
  });

  if (!data?.marquee_enabled || !data?.marquee_text?.trim()) return null;
  const text = data.marquee_text.trim();

  return (
    <>
      <div
        data-announcement-marquee
        className="fixed inset-x-0 top-0 z-[2147483600] w-screen overflow-hidden border-b border-primary/40 bg-primary pt-[env(safe-area-inset-top)] text-primary-foreground shadow-md"
      >
        <div className="marquee-track whitespace-nowrap py-1.5 text-sm font-black leading-5 sm:text-sm">
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
      <div aria-hidden className="h-[calc(2rem+env(safe-area-inset-top))]" />
    </>
  );
}