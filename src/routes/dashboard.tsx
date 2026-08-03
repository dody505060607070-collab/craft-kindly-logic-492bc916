import { useEffect, useState } from "react";
import { Link, Outlet, createFileRoute, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  BarChart3,
  Beaker,
  BookOpen,
  CreditCard,
  FileCheck2,
  Home,
  LineChart,
  ListChecks,
  LogOut,
  Menu,
  MessageSquare,
  Radio,
  Users,
  Video,
  Eye,
  X,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { SITE } from "@/lib/site";
import { Logo } from "@/components/Logo";
import { AIChat } from "@/components/AIChat";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "لوحة التحكم | منصة المستر" },
      {
        name: "description",
        content: "لوحة تحكم منصة المستر: إدارة الكورسات والطلاب والبث المباشر والمدفوعات والواجبات.",
      },
      { property: "og:title", content: "لوحة التحكم | منصة المستر" },
      { property: "og:description", content: "إدارة كاملة لمنصة المستر التعليمية." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DashboardLayout,
});

const NAV = [
  { to: "/", label: "منظور الطالب", icon: Eye },
  { to: "/dashboard", label: "نظرة عامة", icon: Home, exact: true },
  { to: "/dashboard/courses", label: "الكورسات والدروس", icon: BookOpen },
  { to: "/dashboard/videos", label: "سيرفر الفيديوهات", icon: Video },
  { to: "/dashboard/live", label: "البث المباشر", icon: Radio },
  { to: "/dashboard/students", label: "الطلاب", icon: Users },
  { to: "/dashboard/assignments", label: "الواجبات والتصحيح الذكي", icon: FileCheck2 },
  { to: "/dashboard/quizzes", label: "الاختبارات وبنك الأسئلة", icon: ListChecks },
  { to: "/dashboard/payments", label: "المدفوعات والاشتراكات", icon: CreditCard },
  { to: "/dashboard/codes", label: "أكواد التفعيل والخصومات", icon: KeyRound },
  { to: "/dashboard/messages", label: "أدوات الاتصال", icon: MessageSquare },
  { to: "/dashboard/reports", label: "التقارير والإحصائيات", icon: BarChart3 },
  { to: "/dashboard/analytics", label: "تحليلات متقدمة", icon: LineChart },
  { to: "/dashboard/ab-tests", label: "اختبارات A/B", icon: Beaker },
] as const;

function DashboardLayout() {
  const { user, loading, profile, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const path = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (!loading) {
      if (!user) navigate({ to: "/auth" });
      else if (!isAdmin) navigate({ to: "/" });
    }
  }, [loading, user, isAdmin, navigate]);

  useEffect(() => setOpen(false), [path]);

  if (loading || !user || !isAdmin) {
    return (
      <div className="grid min-h-screen place-items-center text-muted-foreground">جارِ التحميل…</div>
    );
  }

  return (
    <div className="min-h-screen xl:pr-72">
      <aside
        className={`fixed inset-y-0 right-0 z-50 flex w-screen flex-col border-l border-border/60 bg-surface/95 p-4 backdrop-blur-xl transition-transform sm:w-72 xl:translate-x-0 ${
          open ? "translate-x-0" : "translate-x-full xl:translate-x-0"
        }`}
      >
        <div className="mb-5 flex items-center justify-between">
          <Logo size="sm" />
          <button className="xl:hidden" onClick={() => setOpen(false)} aria-label="إغلاق">
            <X className="size-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto">
          {NAV.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              activeOptions={{ exact: "exact" in n ? n.exact : false }}
              activeProps={{ className: "bg-primary/15 text-primary" }}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold text-muted-foreground transition hover:bg-card hover:text-foreground"
            >
              <n.icon className="size-4" />
              {n.label}
            </Link>
          ))}
        </nav>

        <div className="mt-4 rounded-2xl bg-card p-3">
          <p className="truncate text-sm font-bold">{profile?.full_name || "مستخدم"}</p>
          <p className="text-xs text-muted-foreground">
            {profile?.phone} · {isAdmin ? "مدير المنصة" : "طالب"}
          </p>
          <button
            onClick={async () => {
              await signOut();
              navigate({ to: "/" });
            }}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-surface py-2 text-xs font-bold text-destructive"
          >
            <LogOut className="size-3.5" /> تسجيل الخروج
          </button>
        </div>
      </aside>

      {open && (
        <button
          aria-label="إغلاق القائمة"
          className="fixed inset-0 z-40 bg-black/60 xl:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border/50 bg-background/70 px-4 py-3 backdrop-blur-xl xl:hidden">
        <button onClick={() => setOpen(true)} aria-label="فتح القائمة">
          <Menu className="size-5" />
        </button>
        <Logo size="xs" withText={false} className="!flex-row gap-2" />
        <span className="font-display font-black">{SITE.name}</span>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">
        <Outlet />
      </main>

      <AIChat mode="admin" context={`صفحة الأدمن: ${path}`} />
    </div>
  );
}
