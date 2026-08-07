import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Download, FileText, Lock, PlayCircle, FileCheck2, ListChecks } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { StudentShell } from "@/components/StudentShell";
import { useEffect, useMemo, useState } from "react";
import { AILessonToolbox } from "@/components/AILessonToolbox";
import { applyVariant, getSessionKey, pickVariant, recordVariantEvent, type CourseVariant } from "@/lib/ab";
import { RedeemCodeCard } from "@/components/RedeemCodeCard";

export const Route = createFileRoute("/courses/$courseId")({
  head: () => ({
    meta: [
      { title: "تفاصيل الدرس | منصة المستر" },
      { name: "description", content: "محتويات ودروس الدرس." },
      { property: "og:title", content: "تفاصيل الدرس" },
      { property: "og:description", content: "محتويات ودروس الدرس." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CourseDetail,
});

function isYoutube(url: string) {
  return /youtube\.com|youtu\.be/.test(url);
}

function toYoutubeEmbed(url: string | null): string | null {
  if (!url) return null;
  const m = url.match(/(?:v=|youtu\.be\/|\/live\/|\/embed\/|\/shorts\/)([\w-]{6,})/);
  return m ? `https://www.youtube.com/embed/${m[1]}` : url;
}

async function openMaterial(filePath: string) {
  if (/^https?:\/\//.test(filePath)) {
    window.open(filePath, "_blank", "noreferrer");
    return;
  }
  const path = filePath.startsWith("storage:") ? filePath.slice(8) : filePath;
  const { data } = await supabase.storage.from("course-videos").createSignedUrl(path, 3600);
  if (data?.signedUrl) window.open(data.signedUrl, "_blank", "noreferrer");
}


function CourseDetail() {
  const { courseId } = useParams({ from: "/courses/$courseId" });
  const { user, isAdmin } = useAuth();
  const [activeLesson, setActiveLesson] = useState<string | null>(null);
  const sessionKey = getSessionKey();

  const { data } = useQuery({
    queryKey: ["course-detail", courseId, user?.id, isAdmin],
    queryFn: async () => {
      const [c, chapters, catalog, playable, enroll, variantRows, assignments, quizzes] = await Promise.all([
        supabase.from("courses").select("*").eq("id", courseId).maybeSingle(),
        supabase.from("chapters").select("*").eq("course_id", courseId).order("sort_order"),
        supabase.rpc("get_lessons_catalog", { _course_id: courseId }),
        supabase.rpc("get_playable_lessons", { _course_id: courseId }),
        user
          ? supabase.from("enrollments").select("*").eq("course_id", courseId).eq("user_id", user.id).maybeSingle()
          : Promise.resolve({ data: null }),
        supabase.from("course_variants").select("*").eq("course_id", courseId).eq("is_active", true),
        supabase.from("assignments").select("*").eq("course_id", courseId).eq("is_published", true),
        supabase.from("quizzes").select("*").eq("course_id", courseId).eq("is_published", true),
      ]);
      const playableRows = (playable.data ?? []) as any[];
      const signedPlayable = await Promise.all(playableRows.map(async (row) => {
        if (!row.video_url?.startsWith("storage:")) return row;
        const { data: signed } = await supabase.storage.from("course-videos").createSignedUrl(row.video_url.slice(8), 3600);
        return { ...row, video_url: signed?.signedUrl ?? null };
      }));
      const playMap = new Map(signedPlayable.map((row) => [row.id, row]));
      const catalogRows = (catalog.data ?? []) as Array<Record<string, unknown> & { id: string }>;
      const merged = catalogRows.map((l) => {
        const p = playMap.get(l.id);
        return {
          ...l,
          video_url: p?.video_url ?? null,
          transcript: p?.description ?? null,
          max_views: p?.max_views ?? 0,
          current_views: p?.current_views ?? 0,
          unlocked: playMap.has(l.id),
        };
      });
      const lessonIds = catalogRows.map((l) => l.id);
      const materials = lessonIds.length
        ? await supabase.from("materials").select("id, title, file_path, file_type, lesson_id").in("lesson_id", lessonIds)
        : { data: [] };
      return {
        course: c.data,
        chapters: chapters.data ?? [],
        lessons: merged as Array<any>,
        materials: (materials.data ?? []) as Array<{ id: string; title: string; file_path: string; file_type: string; lesson_id: string }>,
        enrollment: enroll.data,
        variants: (variantRows.data ?? []) as CourseVariant[],
        assignments: assignments.data ?? [],
        quizzes: quizzes.data ?? [],
      };

    },
  });

  const variant = useMemo(
    () => (data?.course ? pickVariant(courseId, data.variants ?? [], sessionKey) : null),
    [data?.course, data?.variants, courseId, sessionKey],
  );

  useEffect(() => {
    if (!data?.course) return;
    recordVariantEvent(courseId, variant?.id ?? null, "view", user?.id).catch(() => {});
  }, [data?.course, courseId, variant?.id, user?.id]);

  if (!data?.course) {
    return (
      <StudentShell>
        <div className="mx-auto max-w-2xl px-4 py-16 text-center text-muted-foreground">
          جارِ التحميل...
        </div>
      </StudentShell>
    );
  }

  const rawCourse = data.course;
  const course = applyVariant(rawCourse, variant);
  const { chapters, lessons, enrollment, materials, assignments, quizzes } = data;
  const enrolled = Boolean(enrollment && (!enrollment.expires_at || new Date(enrollment.expires_at) > new Date()));
  const isCourseFree = Boolean(course.is_free) || Number(course.price) === 0;
  const canWatch = isAdmin || enrolled || isCourseFree;
  const current = activeLesson
    ? lessons.find((l) => l.id === activeLesson)
    : lessons.find((l) => (canWatch || Boolean(l.is_free)) && l.video_url) ||
      lessons.find((l) => canWatch || Boolean(l.is_free)) ||
      lessons[0];

  return (
    <StudentShell>
      <div className="mx-auto max-w-6xl px-4 py-6 sm:py-8">
        <header className="mb-6">
          <h1 className="font-display text-2xl font-black sm:text-3xl">{course.title}</h1>
          {course.description && (
            <p className="mt-2 text-sm text-muted-foreground">{course.description}</p>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-primary/15 px-3 py-1 text-xs font-bold text-primary">
              {course.grade || "الكل"}
            </span>
            <span className="rounded-full bg-card px-3 py-1 text-xs font-bold">
              {isCourseFree ? "مجاني" : `${course.price} ج.م`}
            </span>
            {enrolled && (
              <span className="flex items-center gap-1 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-bold text-emerald-500">
                <CheckCircle2 className="size-3" /> مشترك
              </span>
            )}
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          {/* Video / paywall */}
          <div className="space-y-4">
            <div className="aspect-video overflow-hidden rounded-2xl bg-black">
              {lessons.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center text-white">
                  <PlayCircle className="size-10 opacity-30" />
                  <p className="font-bold">لا يوجد محتوى في هذا الدرس بعد.</p>
                  {isAdmin && (
                    <Link
                      to="/dashboard/courses"
                      className="rounded-xl bg-primary px-4 py-2 text-sm font-black text-primary-foreground"
                    >
                      إضافة محتوى
                    </Link>
                  )}
                </div>
              ) : current && (canWatch || Boolean(current.is_free)) && current.video_url ? (
                (() => {
                  const hasReachedLimit = !isAdmin && current.max_views > 0 && current.current_views >= current.max_views;
                  
                  if (hasReachedLimit) {
                    return (
                      <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center text-white">
                        <Lock className="size-10 opacity-70 text-destructive" />
                        <p className="font-bold">لقد استنفدت عدد المشاهدات المسموح بها لهذا الفيديو ({current.max_views})</p>
                        <p className="text-xs opacity-60">تواصل مع المستر إذا كنت تعتقد أن هناك خطأ.</p>
                      </div>
                    );
                  }

                  return isYoutube(current.video_url) ? (
                    <iframe
                      key={current.id}
                      src={toYoutubeEmbed(current.video_url)!}
                      className="h-full w-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      title={current.title}
                      onLoad={() => {
                        if (!isAdmin) {
                          supabase.rpc('track_video_view', { _lesson_id: current.id }).then(() => {
                            // Silently refresh view count in background if needed
                          });
                        }
                      }}
                    />
                  ) : (
                    <video
                      key={current.id}
                      src={current.video_url}
                      controls
                      controlsList="nodownload"
                      className="h-full w-full"
                      onPlay={() => {
                        if (!isAdmin) {
                          supabase.rpc('track_video_view', { _lesson_id: current.id }).then(() => {
                            // Could trigger a refetch here but might be jarring
                          });
                        }
                      }}
                    />
                  );
                })()
              ) : (
                <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center text-white">
                  <Lock className="size-10 opacity-70" />
                  <p className="font-bold">
                    {current && !current.video_url 
                      ? "هذا الدرس لا يحتوي على فيديو بعد"
                      : "هذا المحتوى مغلق — اشترك لتفعيل الوصول"}
                  </p>
                  {!user ? (
                    <Link
                      to="/auth"
                      className="rounded-xl bg-primary px-4 py-2 text-sm font-black text-primary-foreground"
                    >
                      سجّل دخول أولاً
                    </Link>
                  ) : !canWatch && !Boolean(current?.is_free) ? (
                    <Link
                      to="/subscribe/$courseId"
                      params={{ courseId }}
                      onClick={() => recordVariantEvent(courseId, variant?.id ?? null, "enroll", user?.id).catch(() => {})}
                      className="rounded-xl bg-primary px-5 py-2.5 text-sm font-black text-primary-foreground"
                    >
                      اشترك الآن
                    </Link>
                  ) : null}
                </div>
              )}
            </div>
            {!canWatch && !isCourseFree && user && (
              <RedeemCodeCard />
            )}

            {current && (
              <div>
                <div className="flex items-center justify-between gap-4">
                  <h2 className="font-display text-lg font-black">{current.title}</h2>
                  {!isAdmin && current.max_views > 0 && (
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ring-1 ${
                      current.current_views >= current.max_views 
                        ? "bg-destructive/10 text-destructive ring-destructive/20" 
                        : "bg-primary/10 text-primary ring-primary/20"
                    }`}>
                      المشاهدات: {current.current_views} / {current.max_views}
                    </span>
                  )}
                </div>
                {current.description && (
                  <p className="mt-2 text-sm text-muted-foreground">{current.description}</p>
                )}
              </div>
            )}
            {current && (canWatch || Boolean(current.is_free)) && materials.filter((m) => m.lesson_id === current.id).length > 0 && (
              <div className="soft-card rounded-2xl p-4">
                <h3 className="mb-3 flex items-center gap-2 text-sm font-black">
                  <FileText className="size-4 text-primary" /> ملفات الدرس
                </h3>
                <div className="space-y-2">
                  {materials
                    .filter((m) => m.lesson_id === current.id)
                    .map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => void openMaterial(m.file_path)}
                        className="flex w-full items-center gap-2 rounded-xl bg-surface px-3 py-2.5 text-right text-xs font-bold hover:bg-primary/10"
                      >
                        <Download className="size-4 shrink-0 text-primary" />
                        <span className="line-clamp-1 flex-1">{m.title}</span>
                        <span className="text-[10px] text-muted-foreground">{m.file_type}</span>
                      </button>
                    ))}
                </div>
              </div>
            )}

            {current && (canWatch || Boolean(current.is_free)) &&
              (assignments.some((a: any) => a.lesson_id === current.id) || quizzes.some((q: any) => q.lesson_id === current.id)) && (
              <div className="soft-card rounded-2xl p-4">
                <h3 className="mb-3 text-sm font-black">واجبات واختبارات الدرس</h3>
                <div className="space-y-2">
                  {assignments.filter((a: any) => a.lesson_id === current.id).map((a: any) => (
                    <Link key={a.id} to="/assignments/$assignmentId" params={{ assignmentId: a.id }} className="flex items-center gap-2 rounded-xl bg-surface px-3 py-2.5 text-xs font-bold hover:bg-primary/10">
                      <FileCheck2 className="size-4 shrink-0 text-primary" />
                      <span className="line-clamp-1 flex-1">{a.title}</span>
                    </Link>
                  ))}
                  {quizzes.filter((q: any) => q.lesson_id === current.id).map((q: any) => (
                    <Link key={q.id} to="/quizzes/$quizId" params={{ quizId: q.id }} className="flex items-center gap-2 rounded-xl bg-surface px-3 py-2.5 text-xs font-bold hover:bg-accent/10">
                      <ListChecks className="size-4 shrink-0 text-accent" />
                      <span className="line-clamp-1 flex-1">{q.title}</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {current && (canWatch || Boolean(current.is_free)) && (
              <AILessonToolbox
                lessonTitle={current.title}
                lessonText={[current.description, current.summary, current.transcript].filter(Boolean).join("\n\n")}
              />
            )}
          </div>

          {/* Lesson list */}
          <aside className="space-y-6">
            <div className="rounded-2xl bg-card p-4">
              <h3 className="mb-3 text-sm font-black">محتوى الدرس</h3>
              {chapters.length === 0 && lessons.length === 0 && (
                <p className="text-xs text-muted-foreground">لا يوجد محتوى بعد.</p>
              )}
              <div className="space-y-3">
                {chapters.map((ch) => {
                  const chLessons = lessons.filter((l) => l.chapter_id === ch.id);
                  return (
                    <div key={ch.id}>
                      <p className="mb-2 text-xs font-black text-primary">{ch.title}</p>
                      <div className="space-y-1">
                        {chLessons.map((l) => {
                          const unlocked = canWatch || Boolean(l.is_free);
                          const isActive = current?.id === l.id;
                          return (
                            <button
                              key={l.id}
                              onClick={() => setActiveLesson(l.id)}
                              className={`flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-right text-xs font-bold transition ${
                                isActive
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-surface hover:bg-primary/10"
                              }`}
                            >
                              {unlocked ? (
                                <PlayCircle className="size-4 shrink-0" />
                              ) : (
                                <Lock className="size-4 shrink-0 opacity-60" />
                              )}
                              <span className="line-clamp-1 flex-1">{l.title}</span>
                              {Boolean(l.is_free) && !enrolled && (
                                <span className="rounded-full bg-emerald-500/20 px-1.5 py-0.5 text-[10px] text-emerald-500">
                                  مجاني
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
                {/* Lessons without chapters */}
                {lessons.filter((l) => !l.chapter_id).length > 0 && (
                  <div className="space-y-1">
                    {lessons
                      .filter((l) => !l.chapter_id)
                      .map((l) => (
                        <button
                          key={l.id}
                          onClick={() => setActiveLesson(l.id)}
                          className="flex w-full items-center gap-2 rounded-xl bg-surface px-3 py-2.5 text-right text-xs font-bold"
                        >
                          {canWatch || Boolean(l.is_free) ? <PlayCircle className="size-4" /> : <Lock className="size-4 opacity-60" />}
                          {l.title}
                        </button>
                      ))}
                  </div>
                )}
              </div>

              {!enrolled && !isCourseFree && (
                <Link
                  to="/subscribe/$courseId"
                  params={{ courseId }}
                  onClick={() => recordVariantEvent(courseId, variant?.id ?? null, "enroll", user?.id).catch(() => {})}
                  className="mt-4 block rounded-xl bg-primary py-3 text-center text-sm font-black text-primary-foreground"
                >
                  اشترك بـ {course.price} ج.م
                </Link>
              )}
            </div>

            {/* Quizzes & Assignments */}
            {(quizzes.length > 0 || assignments.length > 0) && (
              <div className="rounded-2xl bg-card p-4">
                <h3 className="mb-3 text-sm font-black">المهام والاختبارات</h3>
                <div className="space-y-2">
                  {quizzes.map((q) => (
                    <Link
                      key={q.id}
                      to="/quizzes/$quizId"
                      params={{ quizId: q.id }}
                      className="flex items-center gap-2 rounded-xl bg-accent/10 px-3 py-2.5 text-right text-xs font-bold text-accent hover:bg-accent/20"
                    >
                      <ListChecks className="size-4 shrink-0" />
                      <span className="line-clamp-1 flex-1">اختبار: {q.title}</span>
                    </Link>
                  ))}
                  {assignments.map((a) => (
                    <Link
                      key={a.id}
                      to="/assignments/$assignmentId"
                      params={{ assignmentId: a.id }}
                      className="flex items-center gap-2 rounded-xl bg-primary/10 px-3 py-2.5 text-right text-xs font-bold text-primary hover:bg-primary/20"
                    >
                      <FileCheck2 className="size-4 shrink-0" />
                      <span className="line-clamp-1 flex-1">واجب: {a.title}</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </aside>
        </div>
      </div>
    </StudentShell>
  );
}
