import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export const ADMIN_PHONE = "01016177688";

export type Profile = {
  id: string;
  full_name: string;
  phone: string | null;
  avatar_url: string | null;
  grade: string | null;
  points: number;
  is_active: boolean;
};

type AuthState = {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  roles: string[];
  isAdmin: boolean;
  loading: boolean;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

/** المنصة بتسجل بالرقم فقط — بنحوّل الرقم لبريد داخلي مخفي عن المستخدم. */
export function phoneToEmail(phone: string) {
  return `${phone.replace(/\D/g, "")}@mister.students`;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const loadMeta = async (userId: string | undefined) => {
    if (!userId) {
      setProfile(null);
      setRoles([]);
      return;
    }
    const [{ data: p }, { data: r }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", userId),
    ]);
    setProfile((p as Profile) ?? null);
    setRoles((r ?? []).map((x: { role: string }) => x.role));
  };

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      setTimeout(() => void loadMeta(s?.user?.id), 0);
    });

    void supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      await loadMeta(data.session?.user?.id);
      setLoading(false);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      user: session?.user ?? null,
      session,
      profile,
      roles,
      isAdmin: roles.includes("admin"),
      loading,
      refresh: async () => loadMeta(session?.user?.id),
      signOut: async () => {
        await supabase.auth.signOut();
        setProfile(null);
        setRoles([]);
      },
    }),
    [session, profile, roles, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
