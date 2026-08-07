import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { KeyRound, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

const rpc = supabase.rpc.bind(supabase) as unknown as (
  fn: string,
  args?: Record<string, unknown>,
) => Promise<{ data: unknown; error: { message: string } | null }>;

/** الطالب بيكتب كود التفعيل هنا فيتفتح الدرس على طول. */
export function RedeemCodeCard({ compact = false }: { compact?: boolean }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user) return toast.error("سجّل دخولك أولاً");
    if (!code.trim()) return toast.error("اكتب الكود");
    setBusy(true);
    try {
      const { error } = await rpc("redeem_access_code", { _code: code.trim() });
      if (error) throw new Error(error.message);
      toast.success("تم تفعيل الدرس بالكود ✅");
      setCode("");
      await queryClient.invalidateQueries({ queryKey: ["course-detail"] });
      await queryClient.invalidateQueries({ queryKey: ["home-courses"] });
      window.location.reload(); // Force reload to ensure all state is fresh
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "الكود غير صحيح");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className={compact ? "space-y-2" : "glass space-y-3 rounded-2xl p-5"}>
      <h2 className="flex items-center gap-2 text-sm font-black">
        <KeyRound className="size-4 text-accent" /> عندك كود تفعيل؟
      </h2>
      <p className="text-xs text-muted-foreground">
        اكتب الكود اللي استلمته من المستر وهيتفتح الدرس فورًا. كل كود يُستخدم مرة واحدة بس.
      </p>
      <div className="flex gap-2">
        <input
          value={code}
          onChange={(event) => setCode(event.target.value.toUpperCase())}
          maxLength={20}
          placeholder="مثال: A1B2C3D4E5"
          className="flex-1 rounded-xl border border-input bg-surface px-3 py-2.5 text-sm font-bold tracking-widest outline-none"
        />
        <button
          type="submit"
          disabled={busy}
          className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-black text-primary-foreground disabled:opacity-60"
        >
          {busy ? <Loader2 className="size-4 animate-spin" /> : <KeyRound className="size-4" />}
          تفعيل
        </button>
      </div>
    </form>
  );
}
