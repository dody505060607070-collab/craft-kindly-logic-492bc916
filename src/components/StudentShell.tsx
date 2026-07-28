import { useState, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  BookOpen,
  FileCheck2,
  ListChecks,
  LogIn,
  LogOut,
  Menu,
  Radio,
  Shield,
  User,
  X,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Logo } from "@/components/Logo";
import { AIChat } from "@/components/AIChat";

const NAV = [
  { to: "/", label: "الرئيسية", icon: undefined as typeof BookOpen | undefined },
  { to: "/courses", label: "الكورسات", icon: BookOpen as typeof BookOpen | undefined },
  { to: "/assignments", label: "الواجبات", icon: FileCheck2 as typeof BookOpen | undefined },
  { to: "/quizzes", label: "الاختبارات", icon: ListChecks as typeof BookOpen | undefined },
  { to: "/live", label: "البث المباشر", icon: Radio as typeof BookOpen | undefined },
] as const;

export function StudentShell({ children }: { children: ReactNode }) {
  const { user, profile, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const path = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-3 py-3 sm:px-4">
          <button
            className="rounded-lg p-2 hover:bg-card md:hidden"
            onClick={() => setOpen(true)}
            aria-label="القائمة"
          >
            <Menu className="size-5" />
          </button>

          <Logo size="xs" withText={false} className="!flex-row gap-2" />


          <nav className="mr-auto hidden items-center gap-1 md:flex">
            {NAV.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                activeOptions={{ exact: n.to === "/" }}
                activeProps={{ className: "bg-primary/15 text-primary" }}
                className="rounded-lg px-3 py-2 text-sm font-bold text-muted-foreground hover:bg-card hover:text-foreground"
              >
                {n.label}
              </Link>
            ))}
          </nav>

          <div className="mr-auto flex items-center gap-1.5 md:mr-0">
            {isAdmin && (
              <Link
                to="/dashboard"
                className="flex items-center gap-1.5 rounded-xl bg-accent px-3 py-2 text-xs font-black text-accent-foreground shadow-lg sm:text-sm"
              >
                <Shield className="size-4" />
                Admin
              </Link>
            )}
            {user ? (
              <>
                <Link
                  to="/me"
                  className="hidden items-center gap-1.5 rounded-xl bg-card px-3 py-2 text-xs font-bold sm:flex"
                >
                  <User className="size-4" />
                  {profile?.full_name?.split(" ")[0] || "حسابي"}
                </Link>
                <button
                  onClick={async () => {
                    await signOut();
                    navigate({ to: "/" });
                  }}
                  className="rounded-xl bg-card p-2 text-destructive hover:bg-destructive/10"
                  aria-label="تسجيل الخروج"
                >
                  <LogOut className="size-4" />
                </button>
              </>
            ) : (
              <Link
                to="/auth"
                className="flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-xs font-bold text-primary-foreground sm:text-sm"
              >
                <LogIn className="size-4" /> دخول
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Mobile drawer - full screen overlay */}
      {open && (
        <div
          className="fixed inset-0 z-50 md:hidden"
          onClick={() => setOpen(false)}
        >
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
          <aside
            onClick={(e) => e.stopPropagation()}
            className="absolute inset-0 flex h-full w-full flex-col bg-background p-5"
          >
            <div className="mb-6 flex items-center justify-between">
              <Logo size="sm" />
              <button
                onClick={() => setOpen(false)}
                className="rounded-lg bg-card p-2"
                aria-label="إغلاق"
              >
                <X className="size-5" />
              </button>
            </div>
            <nav className="flex-1 space-y-2 overflow-y-auto">
              {NAV.map((n) => {
                const active =
                  n.to === "/" ? path === "/" : path.startsWith(n.to);
                return (
                  <Link
                    key={n.to}
                    to={n.to}
                    onClick={() => setOpen(false)}
                    className={`flex items-center gap-3 rounded-2xl px-4 py-4 text-base font-bold transition ${
                      active
                        ? "bg-primary text-primary-foreground"
                        : "bg-card text-foreground hover:bg-primary/10"
                    }`}
                  >
                    {n.icon && <n.icon className="size-5" />}
                    {n.label}
                  </Link>
                );
              })}
              {user && (
                <Link
                  to="/me"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 rounded-2xl bg-card px-4 py-4 text-base font-bold"
                >
                  <User className="size-5" />
                  حسابي
                </Link>
              )}
              {isAdmin && (
                <Link
                  to="/dashboard"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 rounded-2xl bg-accent px-4 py-4 text-base font-black text-accent-foreground"
                >
                  <Shield className="size-5" />
                  لوحة التحكم (Admin)
                </Link>
              )}
            </nav>
            <div className="mt-4">
              {user ? (
                <button
                  onClick={async () => {
                    setOpen(false);
                    await signOut();
                    navigate({ to: "/" });
                  }}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-destructive/15 py-3 font-bold text-destructive"
                >
                  <LogOut className="size-4" />
                  تسجيل الخروج
                </button>
              ) : (
                <Link
                  to="/auth"
                  onClick={() => setOpen(false)}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3 font-bold text-primary-foreground"
                >
                  <LogIn className="size-4" />
                  تسجيل الدخول
                </Link>
              )}
            </div>
          </aside>
        </div>
      )}

      <main>{children}</main>

      <AIChat mode="student" context={`صفحة الطالب: ${path}`} />
    </div>
  );
}
