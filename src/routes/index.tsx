import { createFileRoute, Link } from "@tanstack/react-router";
import { motion, useScroll, useSpring, useTransform } from "motion/react";
import { useRef } from "react";
import { MessageCircle, PlayCircle, ShieldCheck, Sparkles } from "lucide-react";

import logoMark from "@/assets/logo-mark.png";
import teacherHero from "@/assets/teacher-hero.png";
import teacherThumbs from "@/assets/teacher-thumbsup.png";
import teacherPoint from "@/assets/teacher-point.png";
import coursePython from "@/assets/course-python.jpg";
import courseWeb from "@/assets/course-web.jpg";
import courseAi from "@/assets/course-ai.jpg";
import { SITE } from "@/lib/site";
import { useAuth } from "@/lib/auth";
import { LogIn, LogOut, Shield, User as UserIcon, BookOpen } from "lucide-react";
import { SubscribersCounter } from "@/components/SubscribersCounter";
import { ThemeToggle } from "@/components/ThemeToggle";

function HomeHeader() {
  const { user, isAdmin, profile, signOut } = useAuth();
  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-3 py-3 sm:px-4">
        <div className="flex items-center gap-1.5">
          <ThemeToggle />
          {!user ? (
            <>
              <Link
                to="/auth"
                className="rounded-xl px-3 py-2 text-xs font-bold text-muted-foreground transition hover:text-primary sm:text-sm"
              >
                <LogIn className="ml-1 inline size-4" /> دخول
              </Link>
              <Link
                to="/auth"
                className="rounded-xl bg-primary px-3 py-2 text-xs font-bold text-primary-foreground shadow-lg shadow-primary/25 transition hover:opacity-90 sm:text-sm"
              >
                حساب جديد
              </Link>
            </>
          ) : (
            <>
              {isAdmin && (
                <Link
                  to="/dashboard"
                  className="flex items-center gap-1.5 rounded-xl bg-accent px-3 py-2 text-xs font-black text-accent-foreground shadow-lg sm:text-sm"
                >
                  <Shield className="size-4" /> Admin
                </Link>
              )}
              <Link
                to="/courses"
                className="hidden items-center gap-1.5 rounded-xl bg-card px-3 py-2 text-xs font-bold sm:flex"
              >
                <BookOpen className="size-4" /> الكورسات
              </Link>
              <Link
                to="/me"
                className="flex items-center gap-1.5 rounded-xl bg-card px-3 py-2 text-xs font-bold"
              >
                <UserIcon className="size-4" />
                <span className="hidden sm:inline">
                  {profile?.full_name?.split(" ")[0] || "حسابي"}
                </span>
              </Link>
              <button
                onClick={() => void signOut()}
                className="rounded-xl bg-card p-2 text-destructive hover:bg-destructive/10"
                aria-label="تسجيل الخروج"
              >
                <LogOut className="size-4" />
              </button>
            </>
          )}
        </div>
        <Logo size="sm" />
      </div>
    </header>
  );
}

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "منصة المستر | كورسات برمجة وذكاء اصطناعي" },
      {
        name: "description",
        content:
          "كورسات برمجة وذكاء اصطناعي مع الأستاذ المستر — شرح مبسط، فيديوهات منظمة، ومتابعة خطوة بخطوة.",
      },
      { property: "og:title", content: "منصة المستر | كورسات برمجة وذكاء اصطناعي" },
      { property: "og:description", content: "كورسات برمجة وذكاء اصطناعي مع الأستاذ المستر — شرح مبسط، فيديوهات منظمة، ومتابعة خطوة بخطوة." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

const fadeUp = {
  hidden: { opacity: 0, y: 36 },
  show: { opacity: 1, y: 0 },
};

function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      variants={fadeUp}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 0.7, delay, ease: [0.2, 0.7, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}

function Logo({ size = "lg" }: { size?: "lg" | "sm" }) {
  const big = size === "lg";
  return (
    <Link to="/" className="group flex flex-col items-center leading-none">
      <motion.img
        src={logoMark}
        alt="شعار منصة المستر"
        width={1024}
        height={1024}
        className={big ? "h-28 w-28 object-contain drop-shadow-xl sm:h-36 sm:w-36" : "h-14 w-14 object-contain"}
        whileHover={{ rotate: -6, scale: 1.06 }}
        transition={{ type: "spring", stiffness: 250, damping: 14 }}
      />
    </Link>
  );
}

const COURSES = [
  {
    title: "أساسيات البرمجة بـ Python",
    grade: "من الصفر للاحتراف",
    img: coursePython,
    price: "٢٥٠ جنيه",
  },
  {
    title: "تطوير مواقع الويب",
    grade: "HTML · CSS · JavaScript",
    img: courseWeb,
    price: "٣٠٠ جنيه",
  },
  {
    title: "مقدمة في الذكاء الاصطناعي",
    grade: "مشاريع عملية",
    img: courseAi,
    price: "٣٥٠ جنيه",
  },
];

const FEATURES = [
  { icon: PlayCircle, title: "فيديوهات منظمة", desc: "كل درس بترتيبه وتقدر ترجعله في أي وقت." },
  { icon: ShieldCheck, title: "محتوى محمي", desc: "حسابك ليك لوحدك والمحتوى آمن." },
  { icon: Sparkles, title: "شرح مبسط", desc: "كود خطوة بخطوة من غير تعقيد." },
];

function Home() {
  const heroRef = useRef<HTMLElement | null>(null);
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 24, mass: 0.3 });
  const { scrollYProgress: heroProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const heroY = useTransform(heroProgress, [0, 1], [0, 90]);
  const heroFade = useTransform(heroProgress, [0, 1], [1, 0.15]);

  return (
    <div className="min-h-screen overflow-x-hidden">
      <motion.div
        style={{ scaleX: progress }}
        className="fixed inset-x-0 top-0 z-50 h-1 origin-right bg-primary"
      />

      <HomeHeader />


      {/* Hero */}
      <section ref={heroRef} className="relative mx-auto max-w-6xl px-4 pt-10 pb-16 sm:pt-16">
        <motion.div
          style={{ y: heroY, opacity: heroFade }}
          className="grid items-center gap-10 md:grid-cols-2"
        >
          <Reveal className="text-center md:text-right">
            <div className="mb-5 flex justify-center md:justify-start">
              <Logo />
            </div>
            <h1 className="font-display text-4xl leading-tight font-black sm:text-5xl">
              اتعلم <span className="text-gradient">البرمجة</span> صح
            </h1>
            <p className="mt-4 text-lg text-muted-foreground">
              كورسات برمجة وذكاء اصطناعي مع {SITE.teacher}
            </p>
            <div className="mt-7 flex flex-wrap justify-center gap-3 md:justify-start">
              <a
                href="#courses"
                className="rounded-2xl bg-primary px-6 py-3 font-bold text-primary-foreground shadow-xl shadow-primary/25 transition hover:-translate-y-0.5"
              >
                شوف الكورسات
              </a>
              <Link
                to="/auth"
                className="rounded-2xl border border-border bg-card px-6 py-3 font-bold transition hover:-translate-y-0.5"
              >
                ابدأ دلوقتي
              </Link>
            </div>
          </Reveal>

          <div className="relative mx-auto w-full max-w-md">
            <div className="blob morphy absolute inset-6 -z-10" />
            <motion.img
              src={teacherHero}
              alt="الأستاذ المستر"
              width={1024}
              height={1024}
              className="relative w-full drop-shadow-2xl"
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, ease: [0.2, 0.7, 0.3, 1] }}
            />
            <motion.span
              className="floaty absolute top-6 right-0 rounded-2xl bg-card px-3 py-2 text-xs font-bold shadow-lg"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              {"</>"} كود بسيط
            </motion.span>
            {/* Compact floating stat strip that fades together with the hero image */}
            <div className="absolute inset-x-0 -bottom-2 flex justify-center sm:-bottom-3">
              <SubscribersCounter />
            </div>
          </div>
        </motion.div>
      </section>
      {/* Courses */}
      <section id="courses" className="mx-auto max-w-6xl px-4 py-16">
        <Reveal>
          <h2 className="text-center text-3xl font-black sm:text-4xl">
            ال<span className="text-gradient">كورسات</span>
          </h2>
        </Reveal>

        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {COURSES.map((c, i) => (
            <Reveal key={c.title} delay={i * 0.12}>
              <article className="soft-card h-full overflow-hidden rounded-3xl">
                <img
                  src={c.img}
                  alt={c.title}
                  loading="lazy"
                  width={1024}
                  height={640}
                  className="h-44 w-full object-cover"
                />
                <div className="p-5">
                  <p className="text-xs font-bold text-primary">{c.grade}</p>
                  <h3 className="mt-1 text-lg font-black">{c.title}</h3>
                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-sm font-bold text-muted-foreground">{c.price}</span>
                    <Link
                      to="/auth"
                      className="rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground"
                    >
                      ادخل الكورس
                    </Link>
                  </div>
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="bg-surface/70 py-16">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 md:grid-cols-2">
          <Reveal>
            <img
              src={teacherPoint}
              alt="الأستاذ المستر بيشرح"
              loading="lazy"
              width={1024}
              height={1024}
              className="mx-auto w-full max-w-sm drop-shadow-2xl"
            />
          </Reveal>
          <div className="space-y-4">
            {FEATURES.map((f, i) => (
              <Reveal key={f.title} delay={i * 0.1}>
                <div className="soft-card flex items-start gap-4 rounded-3xl p-5">
                  <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
                    <f.icon className="size-5" />
                  </span>
                  <div className="min-w-0">
                    <h3 className="font-black">{f.title}</h3>
                    <p className="text-sm text-muted-foreground">{f.desc}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-4 py-20">
        <Reveal>
          <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-primary via-primary to-accent px-6 py-12 text-center text-primary-foreground">
            <img
              src={teacherThumbs}
              alt=""
              aria-hidden
              loading="lazy"
              width={1024}
              height={1024}
              className="pointer-events-none absolute bottom-0 left-0 hidden h-56 w-auto object-contain opacity-40 md:block lg:h-64"
            />
            {/* readability overlay on top of the decorative image */}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-l from-transparent via-primary/40 to-primary/70 md:from-transparent md:via-primary/60 md:to-primary" aria-hidden />
            <div className="relative">
              <h2 className="text-3xl font-black drop-shadow-sm">جاهز تبدأ؟</h2>
              <p className="mt-3 opacity-95">اعمل حسابك واتفرج على أول درس النهارده.</p>
            </div>
            <Link
              to="/auth"
              className="relative mt-7 inline-block rounded-2xl bg-card px-7 py-3 font-black text-primary shadow-xl transition hover:-translate-y-0.5"
            >
              إنشاء حساب
            </Link>
          </div>
        </Reveal>
      </section>

      <footer className="border-t border-border py-10 text-center">
        <div className="flex justify-center">
          <Logo />
        </div>
        <p className="mt-4 text-sm text-muted-foreground">{SITE.subject}</p>
        <p className="mt-1 text-xs text-muted-foreground">© {new Date().getFullYear()}</p>
      </footer>

      <motion.a
        href={`https://wa.me/${SITE.whatsapp}`}
        target="_blank"
        rel="noreferrer"
        aria-label="تواصل واتساب"
        className="fixed bottom-6 left-6 z-50 grid size-14 place-items-center rounded-full bg-[#25D366] text-white shadow-2xl"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        whileHover={{ scale: 1.08 }}
        transition={{ type: "spring", stiffness: 260, damping: 16, delay: 0.6 }}
      >
        <MessageCircle className="size-7" />
      </motion.a>
    </div>
  );
}
