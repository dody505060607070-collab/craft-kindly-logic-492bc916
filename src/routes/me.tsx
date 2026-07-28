import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { LogOut, User as UserIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { StudentShell } from "@/components/StudentShell";

export const Route = createFileRoute("/me")({
  head: () => ({
    meta: [
      { title: "حسابي | منصة المستر" },
      { name: "description", content: "بياناتك واشتراكاتك." },
      { property: "og:title", content: "حسابي | منصة المستر" },
      { property: "og:description", content: "بياناتك واشتراكاتك." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MePage,
});

function MePage() {
  const { user, profile, signOut, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [loading, user, navigate]);

  const { data } = useQuery({
    queryKey: ["me-data", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const [en, py] = await Promise.all([
        supabase.from("enrollments").select("*, courses(title, price)").eq("user_id", user!.id),
        supabase.from("payments").select("*, courses(title)").eq("user_id", user!.id).order("created_at", { ascending: false }),
      ]);
      return { enrollments: en.data ?? [], payments: py.data ?? [] };
    },
  });

  if (!user) return null;

  return (
    <StudentShell>
      <div className="mx-auto max-w-3xl px-4 py-8">
        <div className="glass mb-6 flex items-center gap-4 rounded-2xl p-5">
          <span className="grid size-14 place-items-center rounded-2xl bg-primary text-primary-foreground">
            <UserIcon className="size-6" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-xl font-black">
              {profile?.full_name || "طالب"}
            </p>
            <p className="text-xs text-muted-foreground">
              {profile?.phone} · {profile?.grade || "-"}
            </p>
          </div>
          <button
            onClick={async () => {
              await signOut();
              navigate({ to: "/" });
            }}
            className="rounded-xl bg-destructive/15 px-3 py-2 text-xs font-bold text-destructive"
          >
            <LogOut className="mr-1 inline size-4" /> خروج
          </button>
        </div>

        <section className="mb-6">
          <h2 className="mb-3 font-display text-lg font-black">اشتراكاتي</h2>
          <div className="space-y-2">
            {(data?.enrollments ?? []).map((e) => (
              <Link
                key={e.id}
                to="/courses/$courseId"
                params={{ courseId: e.course_id }}
                className="soft-card block rounded-2xl p-4"
              >
                <p className="font-black">
                  {(e.courses as { title: string } | null)?.title ?? "كورس"}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">التقدم: {e.progress}%</p>
              </Link>
            ))}
            {(data?.enrollments ?? []).length === 0 && (
              <p className="text-sm text-muted-foreground">لسه مش مشترك في أي كورس.</p>
            )}
          </div>
        </section>

        <section>
          <h2 className="mb-3 font-display text-lg font-black">مدفوعاتي</h2>
          <div className="space-y-2">
            {(data?.payments ?? []).map((p) => (
              <div key={p.id} className="soft-card flex items-center justify-between rounded-2xl p-4">
                <div>
                  <p className="font-bold">
                    {(p.courses as { title: string } | null)?.title ?? "-"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(p.created_at).toLocaleDateString("ar-EG")} · {p.method}
                  </p>
                </div>
                <div className="text-left">
                  <p className="font-black text-primary">{p.amount} ج.م</p>
                  <p
                    className={`text-xs font-bold ${
                      p.status === "paid"
                        ? "text-emerald-500"
                        : p.status === "pending"
                          ? "text-amber-500"
                          : "text-destructive"
                    }`}
                  >
                    {p.status === "paid"
                      ? "تم الاعتماد"
                      : p.status === "pending"
                        ? "قيد المراجعة"
                        : "مرفوض"}
                  </p>
                </div>
              </div>
            ))}
            {(data?.payments ?? []).length === 0 && (
              <p className="text-sm text-muted-foreground">لا توجد مدفوعات.</p>
            )}
          </div>
        </section>
      </div>
    </StudentShell>
  );
}
