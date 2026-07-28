import { motion, useInView, useMotionValue, useTransform, animate } from "motion/react";
import { useEffect, useRef } from "react";
import { TrendingUp, Users } from "lucide-react";

function CountUp({ to, duration = 1.8 }: { to: number; duration?: number }) {
  const mv = useMotionValue(0);
  const rounded = useTransform(mv, (v) => Math.floor(v).toLocaleString("ar-EG"));
  const ref = useRef<HTMLSpanElement | null>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  useEffect(() => {
    if (!inView) return;
    const c = animate(mv, to, { duration, ease: [0.2, 0.7, 0.3, 1] });
    return () => c.stop();
  }, [inView, mv, to, duration]);
  return <motion.span ref={ref}>{rounded}</motion.span>;
}

/**
 * Compact floating stat strip meant to sit UNDER the teacher hero image.
 * Stays as a single horizontal bar on all screen sizes (never becomes a square block).
 */
export function SubscribersCounter({ className = "" }: { className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.9, delay: 0.35, ease: [0.2, 0.7, 0.3, 1] }}
      className={`pointer-events-auto mx-auto flex w-fit max-w-[92%] items-stretch gap-2 rounded-full border border-border/60 bg-card/85 px-2 py-1.5 shadow-xl backdrop-blur-xl ${className}`}
    >
      <div className="flex items-center gap-1.5 rounded-full px-2.5 py-1 sm:gap-2 sm:px-3">
        <span className="grid size-6 place-items-center rounded-full bg-primary/15 text-primary sm:size-7">
          <Users className="size-3.5 sm:size-4" />
        </span>
        <div className="flex items-baseline gap-1 leading-none">
          <span className="font-display text-sm font-black text-foreground sm:text-base">
            <CountUp to={642} />
            <span className="text-primary">+</span>
          </span>
          <span className="text-[9px] font-bold text-muted-foreground sm:text-[10px]">طالب</span>
        </div>
      </div>
      <span className="my-1 w-px bg-border/70" aria-hidden />
      <div className="flex items-center gap-1.5 rounded-full px-2.5 py-1 sm:gap-2 sm:px-3">
        <span className="grid size-6 place-items-center rounded-full bg-accent/25 text-accent-foreground sm:size-7">
          <TrendingUp className="size-3.5 sm:size-4" />
        </span>
        <div className="flex items-baseline gap-1 leading-none">
          <span className="font-display text-sm font-black text-foreground sm:text-base">
            <CountUp to={96} />
            <span className="text-primary">%</span>
          </span>
          <span className="text-[9px] font-bold text-muted-foreground sm:text-[10px]">نجاح</span>
        </div>
      </div>
    </motion.div>
  );
}