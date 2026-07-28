// Server-only: per-user AI rate limiting + usage logging.
import { createClient } from "@supabase/supabase-js";
import { getRequest } from "@tanstack/react-start/server";
import type { Database } from "@/integrations/supabase/types";

// Free-tier limits per user (admins bypass).
export const AI_LIMIT_PER_MIN = 20;
export const AI_LIMIT_PER_HOUR = 150;
export const AI_LIMIT_PER_DAY = 800;

function serverClient() {
  const url = process.env.SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export type RateLimitResult = {
  allowed: boolean;
  perMin: number;
  perHour: number;
  perDay: number;
  retryAfterSec?: number;
  reason?: string;
};

export async function checkAiRateLimit(userId: string): Promise<RateLimitResult> {
  const sb = serverClient();

  // Admin bypass
  const { data: roles } = await sb
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);
  const isAdmin = (roles ?? []).some((r) => r.role === "admin");
  if (isAdmin) {
    return { allowed: true, perMin: 0, perHour: 0, perDay: 0 };
  }

  const now = Date.now();
  const minAgo = new Date(now - 60_000).toISOString();
  const hourAgo = new Date(now - 3_600_000).toISOString();
  const dayAgo = new Date(now - 86_400_000).toISOString();

  const [{ count: minC }, { count: hourC }, { count: dayC }] = await Promise.all([
    sb.from("ai_usage").select("id", { count: "exact", head: true }).eq("user_id", userId).gte("created_at", minAgo),
    sb.from("ai_usage").select("id", { count: "exact", head: true }).eq("user_id", userId).gte("created_at", hourAgo),
    sb.from("ai_usage").select("id", { count: "exact", head: true }).eq("user_id", userId).gte("created_at", dayAgo),
  ]);

  const perMin = minC ?? 0;
  const perHour = hourC ?? 0;
  const perDay = dayC ?? 0;

  if (perMin >= AI_LIMIT_PER_MIN) {
    return { allowed: false, perMin, perHour, perDay, retryAfterSec: 60, reason: `تجاوزت ${AI_LIMIT_PER_MIN} طلب في الدقيقة. جرّب بعد شوية.` };
  }
  if (perHour >= AI_LIMIT_PER_HOUR) {
    return { allowed: false, perMin, perHour, perDay, retryAfterSec: 3600, reason: `تجاوزت ${AI_LIMIT_PER_HOUR} طلب في الساعة. جرّب لاحقًا.` };
  }
  if (perDay >= AI_LIMIT_PER_DAY) {
    return { allowed: false, perMin, perHour, perDay, retryAfterSec: 86400, reason: `تجاوزت الحد اليومي ${AI_LIMIT_PER_DAY} طلب. جرّب بكرة.` };
  }
  return { allowed: true, perMin, perHour, perDay };
}

export async function logAiUsage(userId: string, kind: string, tokens = 0) {
  const sb = serverClient();
  await sb.from("ai_usage").insert({ user_id: userId, kind, tokens });
}

export async function assertAiRateLimit(userId: string, kind: string) {
  const r = await checkAiRateLimit(userId);
  if (!r.allowed) {
    const err = new Error(r.reason || "AI rate limit exceeded");
    (err as Error & { code?: string }).code = "AI_RATE_LIMITED";
    throw err;
  }
  // fire-and-forget log
  logAiUsage(userId, kind).catch(() => {});
}

// Best-effort userId extraction from the incoming request bearer.
// Returns null for anonymous callers (no throw).
export async function tryGetUserId(): Promise<string | null> {
  try {
    const req = getRequest();
    const auth = req?.headers?.get?.("authorization");
    if (!auth || !auth.startsWith("Bearer ")) return null;
    const token = auth.slice(7);
    if (!token || token.split(".").length !== 3) return null;
    const sb = createClient<Database>(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
    const { data, error } = await sb.auth.getClaims(token);
    if (error || !data?.claims?.sub) return null;
    return String(data.claims.sub);
  } catch {
    return null;
  }
}

// Rate-limit only if authenticated; anonymous callers pass through.
// Returns the userId (or null) so handlers can log/telemetry if needed.
export async function optionalAiRateLimit(kind: string): Promise<string | null> {
  const userId = await tryGetUserId();
  if (!userId) return null;
  await assertAiRateLimit(userId, kind);
  return userId;
}