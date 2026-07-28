import { useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { Loader2, Lock, Phone, User } from "lucide-react";
import { Logo } from "@/components/Logo";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { phoneToEmail, useAuth } from "@/lib/auth";
import { SITE } from "@/lib/site";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "تسجيل الدخول | منصة المستر" },
      {
        name: "description",
        content: "سجّل دخولك أو أنشئ حساب جديد على منصة المستر برقم الهاتف فقط، بدون بريد إلكتروني.",
      },
      { property: "og:title", content: "تسجيل الدخول | منصة المستر" },
      { property: "og:description", content: "الدخول لمنصة المستر برقم الهاتف." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

const GRADES = [
  "الصف الأول الثانوي",
  "الصف الثاني الثانوي",
  "الصف الثالث الثانوي",
  "جامعي / أخرى",
];

function AuthPage() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [grade, setGrade] = useState(GRADES[0]);
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const { refresh } = useAuth();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = phone.replace(/\D/g, "");
    if (clean.length < 8) return toast.error("اكتب رقم هاتف صحيح");
    if (password.length < 6) return toast.error("كلمة السر لازم تكون 6 حروف/أرقام على الأقل");

    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email: phoneToEmail(clean),
          password,
          options: { data: { phone: clean, full_name: fullName || `طالب ${clean}`, grade } },
        });
        if (error) throw error;
        toast.success("تم إنشاء الحساب بنجاح");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: phoneToEmail(clean),
          password,
        });
        if (error) throw error;
        toast.success("أهلاً بيك 👋");
      }
      await refresh();
      navigate({ to: "/" });

    } catch (err) {
      const msg = err instanceof Error ? err.message : "حصلت مشكلة";
      toast.error(
        msg.includes("Invalid login")
          ? "الرقم أو كلمة السر غير صحيحة"
          : msg.includes("already registered")
            ? "الرقم ده مسجل بالفعل، سجّل دخول"
            : msg,
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid min-h-screen place-items-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex justify-center">
          <Logo size="md" />
        </div>


        <div className="glass rounded-3xl p-6">
          <div className="mb-6 grid grid-cols-2 gap-1 rounded-xl bg-surface p-1">
            {(["login", "signup"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`rounded-lg py-2 text-sm font-bold transition ${
                  mode === m ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                }`}
              >
                {m === "login" ? "تسجيل دخول" : "حساب جديد"}
              </button>
            ))}
          </div>

          <form onSubmit={submit} className="space-y-4">
            {mode === "signup" && (
              <>
                <Field icon={User} label="الاسم بالكامل">
                  <input
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="اكتب اسمك"
                    className="w-full bg-transparent text-sm outline-none"
                    maxLength={80}
                  />
                </Field>
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-muted-foreground">
                    الصف الدراسي
                  </label>
                  <select
                    value={grade}
                    onChange={(e) => setGrade(e.target.value)}
                    className="w-full rounded-xl border border-input bg-surface px-3 py-2.5 text-sm outline-none"
                  >
                    {GRADES.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}

            <Field icon={Phone} label="رقم الهاتف">
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                inputMode="numeric"
                placeholder="01xxxxxxxxx"
                className="w-full bg-transparent text-sm outline-none"
                maxLength={15}
                required
              />
            </Field>

            <Field icon={Lock} label="كلمة السر">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••"
                className="w-full bg-transparent text-sm outline-none"
                maxLength={64}
                required
              />
            </Field>

            <button
              disabled={busy}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 font-bold text-primary-foreground disabled:opacity-60"
            >
              {busy && <Loader2 className="size-4 animate-spin" />}
              {mode === "login" ? "دخول" : "إنشاء الحساب"}
            </button>
          </form>

          <p className="mt-5 text-center text-xs leading-relaxed text-muted-foreground">
            الدخول بالرقم فقط — من غير بريد إلكتروني.
          </p>
        </div>
      </div>
    </div>
  );
}

function Field({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ElementType;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-bold text-muted-foreground">{label}</label>
      <div className="flex items-center gap-2 rounded-xl border border-input bg-surface px-3 py-2.5">
        <Icon className="size-4 shrink-0 text-primary" />
        {children}
      </div>
    </div>
  );
}
