// Client-safe helpers for A/B course variants.
import { supabase } from "@/integrations/supabase/client";

export type CourseVariant = {
  id: string;
  course_id: string;
  name: string;
  title_override: string | null;
  description_override: string | null;
  cover_override: string | null;
  price_override: number | null;
  weight: number;
  is_active: boolean;
};

function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function getSessionKey(): string {
  if (typeof window === "undefined") return "ssr";
  const KEY = "ab_session_key";
  let v = localStorage.getItem(KEY);
  if (!v) {
    v = crypto.randomUUID();
    localStorage.setItem(KEY, v);
  }
  return v;
}

export function pickVariant(courseId: string, variants: CourseVariant[], seed: string): CourseVariant | null {
  const active = variants.filter((v) => v.is_active && v.weight > 0);
  if (active.length === 0) return null;
  const total = active.reduce((a, v) => a + v.weight, 0);
  const h = hashString(`${courseId}|${seed}`) % total;
  let acc = 0;
  for (const v of active) {
    acc += v.weight;
    if (h < acc) return v;
  }
  return active[active.length - 1];
}

export async function fetchActiveVariantsForCourse(courseId: string): Promise<CourseVariant[]> {
  const { data } = await supabase
    .from("course_variants")
    .select("*")
    .eq("course_id", courseId)
    .eq("is_active", true);
  return (data ?? []) as CourseVariant[];
}

const firedViews = new Set<string>();
export async function recordVariantEvent(
  courseId: string,
  variantId: string | null,
  event: "view" | "click" | "enroll",
  userId?: string | null,
) {
  const session = getSessionKey();
  if (event === "view") {
    const key = `${courseId}|${variantId ?? "control"}|${session}`;
    if (firedViews.has(key)) return;
    firedViews.add(key);
  }
  await supabase.from("variant_events").insert({
    course_id: courseId,
    variant_id: variantId,
    event,
    user_id: userId ?? null,
    session_key: session,
  });
}

export type CourseCardOverrides = {
  title?: string;
  description?: string;
  cover?: string;
  price?: number;
};

export function applyVariant<T extends { title: string; description: string | null; cover_url: string | null; price: number }>(
  course: T,
  variant: CourseVariant | null,
): T {
  if (!variant) return course;
  return {
    ...course,
    title: variant.title_override || course.title,
    description: variant.description_override ?? course.description,
    cover_url: variant.cover_override ?? course.cover_url,
    price: variant.price_override ?? course.price,
  };
}