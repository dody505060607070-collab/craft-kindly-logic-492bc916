/** حساب السعر بعد الخصم (نسبة مئوية على مستوى الدرس). */
export function discounted(price: number | null | undefined, discountPercent: number | null | undefined) {
  const base = Number(price ?? 0);
  const pct = Math.min(Math.max(Number(discountPercent ?? 0), 0), 100);
  if (!pct) return { final: base, hasDiscount: false, base, pct: 0 };
  return { final: Math.round(base * (1 - pct / 100)), hasDiscount: base > 0, base, pct };
}
