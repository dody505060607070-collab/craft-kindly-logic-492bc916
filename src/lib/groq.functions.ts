import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { groqChat, groqJSON, GROQ_FAST, GROQ_SMART, type GroqMessage } from "./groq-helper.server";
import { optionalAiRateLimit } from "./ai-rate-limit.server";

// ================================================================
// 1) General chat (existing) — student & admin modes
// ================================================================
const ChatInput = z.object({
  messages: z
    .array(z.object({ role: z.enum(["system", "user", "assistant"]), content: z.string().max(6000) }))
    .min(1)
    .max(40),
  context: z.string().max(2000).optional(),
  mode: z.enum(["student", "admin"]).default("student"),
});

const STUDENT_SYSTEM = `أنت "مساعد المستر"، مدرس برمجة وذكاء اصطناعي مصري ودود على منصة الأستاذ المستر.
- جاوب دايمًا بالعربي المصري البسيط.
- اشرح الكود خطوة بخطوة باختصار مع أمثلة قصيرة.
- لو الطالب سأل عن حاجة مش برمجة، ساعده باحترام لكن رجّعه للتعلم.`;

const ADMIN_SYSTEM = `أنت مساعد إداري ذكي لمنصة تعليمية مصرية.
- ساعد الأدمن في: فلترة وتحليل بيانات، اقتراح ردود، توليد أسئلة، تلخيص، وكتابة إعلانات.
- جاوب بالعربي المصري، ونظّم النقاط بـ markdown.`;

export const askGroq = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => ChatInput.parse(input))
  .handler(async ({ data }) => {
    await optionalAiRateLimit(data.mode === "admin" ? "admin.chat" : "student.chat");
    const system = data.mode === "admin" ? ADMIN_SYSTEM : STUDENT_SYSTEM;
    const messages: GroqMessage[] = [
      { role: "system", content: data.context ? `${system}\n\nسياق: ${data.context}` : system },
      ...data.messages.filter((m) => m.role !== "system"),
    ];
    const reply = await groqChat({ messages, temperature: 0.6, maxTokens: 1500 });
    return { reply };
  });

// ================================================================
// 2) Summarize lesson content
// ================================================================
export const summarizeLesson = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => z.object({ text: z.string().min(20).max(20000), title: z.string().max(300).optional() }).parse(i))
  .handler(async ({ data }) => {
    const summary = await groqChat({
      model: GROQ_FAST,
      temperature: 0.3,
      messages: [
        { role: "system", content: "أنت مساعد تعليمي. لخص محتوى الدرس بالعربي المصري في نقاط مركزة." },
        { role: "user", content: `عنوان الدرس: ${data.title ?? "—"}\n\nالمحتوى:\n${data.text}\n\nاعمل ملخص في 6–10 نقاط bullet points واضحة، وبعده جدول بأهم المصطلحات وترجمتها.` },
      ],
    });
    return { summary };
  });

// ================================================================
// 3) Generate practice questions from lesson text
// ================================================================
type GenQ = { questions: { type: "mcq" | "truefalse"; prompt: string; choices?: string[]; answer: string | boolean; explanation?: string }[] };
export const generatePracticeQuestions = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => z.object({ text: z.string().min(20).max(20000), count: z.number().min(3).max(15).default(6) }).parse(i))
  .handler(async ({ data }) => {
    await optionalAiRateLimit("admin.quiz-questions");
    const out = await groqJSON<GenQ>({
      system: "أنت مصمم اختبارات تعليمي محترف. اكتب أسئلة تدريبية باللغة العربية المصرية، JSON بالشكل: {\"questions\":[{\"type\":\"mcq\"|\"truefalse\",\"prompt\":\"...\",\"choices\":[...],\"answer\":\"...\",\"explanation\":\"...\"}]}",
      user: `من النص التالي، ولّد ${data.count} أسئلة متنوعة (mcq + truefalse):\n\n${data.text}`,
      temperature: 0.5,
    });
    return out;
  });

// ================================================================
// 4) Grade a single answer (student essay / short answer)
// ================================================================
export const gradeStudentAnswer = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => z.object({
    question: z.string().min(1).max(4000),
    answer: z.string().min(1).max(10000),
    modelAnswer: z.string().max(4000).optional(),
    maxScore: z.number().min(1).max(100).default(10),
  }).parse(i))
  .handler(async ({ data }) => {
    const out = await groqJSON<{ score: number; feedback: string; strengths: string[]; improvements: string[] }>({
      system: "أنت مصحّح تعليمي عادل بالعربي المصري. أعِد JSON فقط: {score, feedback, strengths:[...], improvements:[...]}",
      user: `السؤال: ${data.question}\n\nإجابة الطالب: ${data.answer}\n\n${data.modelAnswer ? `نموذج الإجابة المرجعي: ${data.modelAnswer}\n\n` : ""}الدرجة القصوى: ${data.maxScore}. صحّح بعدل واعمل feedback بالعربي.`,
      temperature: 0.2,
    });
    return out;
  });

// ================================================================
// 5) Explain code
// ================================================================
export const explainCode = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => z.object({ code: z.string().min(1).max(15000), language: z.string().max(30).optional() }).parse(i))
  .handler(async ({ data }) => {
    const explanation = await groqChat({
      temperature: 0.3,
      messages: [
        { role: "system", content: "أنت مدرس برمجة مصري. اشرح الكود سطر سطر بالعربي المصري بشكل مبسط." },
        { role: "user", content: `${data.language ? `اللغة: ${data.language}\n\n` : ""}الكود:\n\`\`\`\n${data.code}\n\`\`\`\n\nاشرح لي كل جزء بالتفصيل.` },
      ],
    });
    return { explanation };
  });

// ================================================================
// 6) Debug help — code + error message
// ================================================================
export const debugCode = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => z.object({ code: z.string().min(1).max(15000), error: z.string().min(1).max(4000) }).parse(i))
  .handler(async ({ data }) => {
    const diagnosis = await groqChat({
      temperature: 0.3,
      messages: [
        { role: "system", content: "أنت مطور برمجيات مصري خبير. حدّد سبب الخطأ واعرض الحل بالعربي المصري مع كود مصحح." },
        { role: "user", content: `الكود:\n\`\`\`\n${data.code}\n\`\`\`\n\nرسالة الخطأ:\n${data.error}\n\nقول لي: (1) السبب (2) الحل (3) الكود بعد التصليح.` },
      ],
    });
    return { diagnosis };
  });

// ================================================================
// 7) Personal study plan — reads user's enrollments & progress
// ================================================================
export const studyPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ days: z.number().min(3).max(60).default(14), goals: z.string().max(500).optional() }).parse(i))
  .handler(async ({ data, context }) => {
    const [enrolls, progress] = await Promise.all([
      context.supabase.from("enrollments").select("progress, courses(title, grade)").eq("user_id", context.userId),
      context.supabase.from("lesson_progress").select("completed, watched_seconds, lessons(title, courses(title))").eq("user_id", context.userId).limit(50),
    ]);
    const ctx = {
      enrollments: enrolls.data ?? [],
      recentProgress: progress.data ?? [],
    };
    const plan = await groqChat({
      temperature: 0.4,
      messages: [
        { role: "system", content: "أنت مدرب دراسي شخصي. اكتب خطة مذاكرة يومية بالعربي المصري في جدول Markdown." },
        { role: "user", content: `بيانات الطالب:\n${JSON.stringify(ctx).slice(0, 4000)}\n\nأهداف: ${data.goals ?? "تحسين الأداء العام"}\nاعمل خطة مذاكرة لـ ${data.days} يوم على شكل جدول: | اليوم | الكورس | الدرس/النشاط | الوقت المقترح |، وبعدها 3 نصائح.` },
      ],
    });
    return { plan };
  });

// ================================================================
// 8) Flashcards
// ================================================================
export const flashcards = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => z.object({ text: z.string().min(20).max(20000), count: z.number().min(4).max(20).default(8) }).parse(i))
  .handler(async ({ data }) => {
    const out = await groqJSON<{ cards: { front: string; back: string }[] }>({
      system: "أنت مصمم بطاقات مذاكرة (flashcards). أعِد JSON فقط: {cards:[{front,back}]} بالعربي المصري.",
      user: `اعمل ${data.count} بطاقة مذاكرة قصيرة من النص:\n${data.text}`,
      temperature: 0.4,
    });
    return out;
  });

// ================================================================
// 10) Translate technical term with context
// ================================================================
export const translateTerm = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => z.object({ term: z.string().min(1).max(200), context: z.string().max(2000).optional() }).parse(i))
  .handler(async ({ data }) => {
    const out = await groqJSON<{ arabic: string; english: string; definition: string; example: string }>({
      system: "أنت قاموس تقني مصري. أعِد JSON: {arabic, english, definition, example} بالعربي المصري.",
      user: `المصطلح: ${data.term}\n${data.context ? `سياق: ${data.context}\n` : ""}اشرحه واعطي مثال قصير.`,
      temperature: 0.2,
      model: GROQ_FAST,
    });
    return out;
  });

// ================================================================
// 12) Admin: filter students via natural language
// ================================================================
export const filterStudentsAI = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ query: z.string().min(3).max(500) }).parse(i))
  .handler(async ({ data, context }) => {
    // Verify admin
    const { data: adminChk } = await context.supabase.rpc("is_admin");
    if (!adminChk) throw new Error("للأدمن فقط");

    // Pull rich dataset (RLS blocks non-admin from reading most, but is_admin bypasses via policies)
    const [profiles, enroll, pay, prog, attempts] = await Promise.all([
      context.supabase.from("profiles").select("id, full_name, phone, grade, points, is_active, created_at"),
      context.supabase.from("enrollments").select("user_id, course_id, progress, expires_at, courses(title)"),
      context.supabase.from("payments").select("user_id, amount, status, created_at, courses(title)"),
      context.supabase.from("lesson_progress").select("user_id, completed"),
      context.supabase.from("quiz_attempts").select("user_id, score, passed"),
    ]);

    const summary = (profiles.data ?? []).map((p) => {
      const en = (enroll.data ?? []).filter((e) => e.user_id === p.id);
      const py = (pay.data ?? []).filter((x) => x.user_id === p.id);
      const pr = (prog.data ?? []).filter((x) => x.user_id === p.id);
      const at = (attempts.data ?? []).filter((x) => x.user_id === p.id);
      return {
        id: p.id,
        name: p.full_name,
        phone: p.phone,
        grade: p.grade,
        active: p.is_active,
        points: p.points,
        courses_enrolled: en.length,
        payments_paid: py.filter((x) => x.status === "paid").length,
        payments_pending: py.filter((x) => x.status === "pending").length,
        total_paid: py.filter((x) => x.status === "paid").reduce((a, x) => a + Number(x.amount || 0), 0),
        lessons_completed: pr.filter((x) => x.completed).length,
        quiz_avg: at.length ? Math.round(at.reduce((a, x) => a + Number(x.score || 0), 0) / at.length) : null,
        joined: p.created_at,
      };
    });

    const result = await groqJSON<{ ids: string[]; reasoning: string; summary_ar: string }>({
      system: "أنت محلل بيانات أدمن. أعِد JSON فقط: {ids:[uuids], reasoning:'باختصار', summary_ar:'ملخص عربي للنتائج'}. اختر الطلاب اللي يطابقوا طلب الأدمن من الداتا المرفقة.",
      user: `طلب الأدمن: "${data.query}"\n\nقاعدة الطلاب:\n${JSON.stringify(summary).slice(0, 15000)}`,
      temperature: 0.1,
      maxTokens: 3000,
    });

    const filtered = summary.filter((s) => result.ids.includes(s.id));
    return { students: filtered, reasoning: result.reasoning, summary_ar: result.summary_ar };
  });

// ================================================================
// 13) Admin: analyze reports
// ================================================================
export const analyzeReports = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: adminChk } = await context.supabase.rpc("is_admin");
    if (!adminChk) throw new Error("للأدمن فقط");

    const [prof, enr, pay, prog, att, courses] = await Promise.all([
      context.supabase.from("profiles").select("id, is_active, created_at"),
      context.supabase.from("enrollments").select("id, progress, created_at"),
      context.supabase.from("payments").select("amount, status, created_at"),
      context.supabase.from("lesson_progress").select("completed, watched_seconds, updated_at"),
      context.supabase.from("quiz_attempts").select("score, passed, created_at"),
      context.supabase.from("courses").select("id, title, is_published"),
    ]);

    const nowMs = Date.now();
    const activeLast7 = (prog.data ?? []).filter((r) => nowMs - new Date(r.updated_at).getTime() < 7 * 864e5).length;
    const revenue30d = (pay.data ?? []).filter((p) => p.status === "paid" && nowMs - new Date(p.created_at).getTime() < 30 * 864e5).reduce((a, p) => a + Number(p.amount || 0), 0);
    const totalStudents = (prof.data ?? []).length;
    const avgQuiz = (att.data ?? []).length ? Math.round((att.data ?? []).reduce((a, x) => a + Number(x.score || 0), 0) / (att.data ?? []).length) : 0;

    const analysis = await groqChat({
      temperature: 0.4,
      messages: [
        { role: "system", content: "أنت محلل بيانات تعليمية. اكتب تحليل ذكي بالعربي المصري في Markdown مع نقاط قوة، نقاط ضعف، وتوصيات عملية." },
        { role: "user", content: `مؤشرات المنصة:\n- إجمالي الطلاب: ${totalStudents}\n- نشط آخر 7 أيام: ${activeLast7}\n- إيراد آخر 30 يوم: ${revenue30d} ج.م\n- متوسط درجات: ${avgQuiz}%\n- عدد الكورسات: ${(courses.data ?? []).length}\n- تسليمات دفع pending: ${(pay.data ?? []).filter((p) => p.status === "pending").length}\n\nحلل الأداء واقترح إجراءات.` },
      ],
    });
    return { analysis, stats: { totalStudents, activeLast7, revenue30d, avgQuiz } };
  });

// ================================================================
// 14) Admin: generate full course outline
// ================================================================
export const generateCoursePlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ title: z.string().min(3).max(200), grade: z.string().max(80).optional(), level: z.enum(["مبتدئ","متوسط","متقدم"]).default("مبتدئ") }).parse(i))
  .handler(async ({ data, context }) => {
    const { data: adminChk } = await context.supabase.rpc("is_admin");
    if (!adminChk) throw new Error("للأدمن فقط");

    return await groqJSON<{
      description: string;
      seoTags: string[];
      chapters: { title: string; lessons: { title: string; summary: string; duration_min: number }[] }[];
      quizzes: { title: string; questions_count: number }[];
      assignments: { title: string; instructions: string }[];
    }>({
      system: "أنت مصمم مناهج تعليمية. أعِد JSON فقط بمنهج كامل: {description, seoTags:[...], chapters:[{title, lessons:[{title,summary,duration_min}]}], quizzes:[{title,questions_count}], assignments:[{title,instructions}]}",
      user: `اعمل منهج كورس بعنوان "${data.title}" ${data.grade ? `للصف: ${data.grade}` : ""} — مستوى ${data.level}. لازم يبقى 4-6 فصول، كل فصل 3-5 دروس، مع اختبارات وواجبات.`,
      temperature: 0.6,
      maxTokens: 4000,
    });
  });

// ================================================================
// 15) Course description + SEO
// ================================================================
export const generateCourseSeo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ title: z.string().min(3).max(200), notes: z.string().max(1000).optional() }).parse(i))
  .handler(async ({ data, context }) => {
    const { data: seoAdmin } = await context.supabase.rpc("is_admin");
    if (!seoAdmin) throw new Error("للأدمن فقط");
    return await groqJSON<{ short: string; long: string; tags: string[]; seo_title: string; seo_description: string }>({
      system: "أنت متخصص SEO تعليمي مصري. أعِد JSON: {short, long, tags:[...], seo_title, seo_description}.",
      user: `عنوان: ${data.title}\n${data.notes ? `ملاحظات: ${data.notes}` : ""}\nاكتب short (سطر جذاب), long (فقرة تسويقية), tags, seo_title (60 حرف), seo_description (155 حرف).`,
      temperature: 0.6,
      model: GROQ_FAST,
    });
  });

// ================================================================
// 16) Summarize Live Session (reads live_messages + session)
// ================================================================
export const summarizeLiveSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ sessionId: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { data: liveAdmin } = await context.supabase.rpc("is_admin");
    if (!liveAdmin) throw new Error("للأدمن فقط");
    const [s, msgs] = await Promise.all([
      context.supabase.from("live_sessions").select("*").eq("id", data.sessionId).maybeSingle(),
      context.supabase.from("live_messages").select("content, created_at").eq("session_id", data.sessionId).order("created_at").limit(500),
    ]);
    if (!s.data) throw new Error("الحصة غير موجودة");
    const chatText = (msgs.data ?? []).map((m) => `- ${m.content}`).join("\n");
    const summary = await groqChat({
      temperature: 0.4,
      messages: [
        { role: "system", content: "لخص جلسة بث مباشر بالعربي المصري: أهم النقاط، الأسئلة المتكررة من الطلاب، والتوصيات." },
        { role: "user", content: `عنوان الحصة: ${s.data.title}\nوصف: ${s.data.description ?? "—"}\n\nرسائل الشات (${msgs.data?.length ?? 0}):\n${chatText.slice(0, 8000)}` },
      ],
    });
    return { summary, messageCount: msgs.data?.length ?? 0 };
  });

// ================================================================
// 17) Suggest 3 message replies
// ================================================================
export const suggestReplies = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ message: z.string().min(1).max(3000), tone: z.enum(["ودود","رسمي","مختصر"]).default("ودود") }).parse(i))
  .handler(async ({ data, context }) => {
    const { data: replyAdmin } = await context.supabase.rpc("is_admin");
    if (!replyAdmin) throw new Error("للأدمن فقط");
    return await groqJSON<{ suggestions: string[] }>({
      system: "أنت مساعد أدمن تعليمي. أعِد JSON: {suggestions:[3 ردود قصيرة بالعربي المصري بأسلوب مختلف]}",
      user: `رسالة الطالب: "${data.message}"\nأسلوب الرد: ${data.tone}`,
      temperature: 0.7,
      model: GROQ_FAST,
    });
  });

// ================================================================
// 18) Cheat detection across an assignment's submissions
// ================================================================
export const detectAssignmentCheating = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ assignmentId: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { data: adminChk } = await context.supabase.rpc("is_admin");
    if (!adminChk) throw new Error("للأدمن فقط");
    const { data: subs } = await context.supabase
      .from("assignment_submissions")
      .select("id, user_id, content, profiles:profiles!assignment_submissions_user_id_fkey(full_name)")
      .eq("assignment_id", data.assignmentId)
      .not("content", "is", null);
    if (!subs || subs.length < 2) return { report: "مفيش تسليمات كافية للمقارنة.", groups: [] };

    const compact = subs.map((s, i) => ({ i, id: s.id, name: (s.profiles as { full_name?: string } | null)?.full_name ?? "طالب", content: (s.content ?? "").slice(0, 2000) }));
    const out = await groqJSON<{ groups: { student_indices: number[]; similarity: number; reason: string }[]; report: string }>({
      system: "أنت محقق في الغش الأكاديمي. قارن التسليمات وحدد أي منها متشابه بشكل مريب (نسخ نص، نفس الأخطاء الحرفية). أعِد JSON: {groups:[{student_indices,similarity(0-100),reason}], report:'تقرير عربي'}",
      user: `التسليمات:\n${JSON.stringify(compact).slice(0, 15000)}`,
      temperature: 0.1,
      maxTokens: 2500,
    });
    const groups = (out.groups ?? []).map((g) => ({
      ...g,
      students: g.student_indices.map((i) => compact[i]).filter(Boolean).map((s) => ({ id: s?.id, name: s?.name })),
    }));
    return { report: out.report, groups };
  });

// ================================================================
// 19) Weekly insights for admin
// ================================================================
export const weeklyInsights = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: adminChk } = await context.supabase.rpc("is_admin");
    if (!adminChk) throw new Error("للأدمن فقط");
    const weekAgo = new Date(Date.now() - 7 * 864e5).toISOString();
    const [signups, pays, prog, attempts] = await Promise.all([
      context.supabase.from("profiles").select("id, created_at").gte("created_at", weekAgo),
      context.supabase.from("payments").select("amount, status, created_at").gte("created_at", weekAgo),
      context.supabase.from("lesson_progress").select("completed, updated_at").gte("updated_at", weekAgo),
      context.supabase.from("quiz_attempts").select("score, passed, created_at").gte("created_at", weekAgo),
    ]);
    const stats = {
      new_signups: signups.data?.length ?? 0,
      revenue: (pays.data ?? []).filter((p) => p.status === "paid").reduce((a, p) => a + Number(p.amount || 0), 0),
      pending_payments: (pays.data ?? []).filter((p) => p.status === "pending").length,
      lessons_completed: (prog.data ?? []).filter((r) => r.completed).length,
      quiz_attempts: attempts.data?.length ?? 0,
      pass_rate: attempts.data?.length ? Math.round(((attempts.data ?? []).filter((a) => a.passed).length / attempts.data.length) * 100) : 0,
    };
    const report = await groqChat({
      temperature: 0.4,
      messages: [
        { role: "system", content: "اكتب تقرير أسبوعي بالعربي المصري في Markdown: النجاحات، المشاكل، وأولويات الأسبوع الجاي." },
        { role: "user", content: `مؤشرات آخر 7 أيام:\n${JSON.stringify(stats, null, 2)}` },
      ],
    });
    return { report, stats };
  });

// ================================================================
// 20) Content assistant — help create lesson content
// ================================================================
export const contentAssistant = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => z.object({
    topic: z.string().min(3).max(300),
    kind: z.enum(["outline", "script", "questions", "exercises"]).default("outline"),
  }).parse(i))
  .handler(async ({ data }) => {
    const kindLabel = { outline: "outline كامل", script: "سكريبت شرح", questions: "أسئلة تدريبية", exercises: "تدريبات عملية" }[data.kind];
    const output = await groqChat({
      temperature: 0.5,
      messages: [
        { role: "system", content: "أنت مساعد إنتاج محتوى تعليمي مصري. اكتب Markdown منظّم." },
        { role: "user", content: `الموضوع: ${data.topic}\nالمطلوب: ${kindLabel}\n\nاكتب باحترافية وبالعربي المصري.` },
      ],
    });
    return { output, kind: data.kind };
  });

// ================================================================
// 11) Grade essay quiz answer (specialized wrapper for admin flow)
// ================================================================
export const gradeQuizEssay = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ attemptId: z.string().uuid(), questionId: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { data: adminChk } = await context.supabase.rpc("is_admin");
    if (!adminChk) throw new Error("للأدمن فقط");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [q, a] = await Promise.all([
      supabaseAdmin.from("quiz_questions").select("prompt, correct_answer, points").eq("id", data.questionId).maybeSingle(),
      supabaseAdmin.from("quiz_attempts").select("answers").eq("id", data.attemptId).maybeSingle(),
    ]);
    if (!q.data || !a.data) throw new Error("بيانات ناقصة");
    const studentAnswer = ((a.data.answers as Record<string, unknown>)?.[data.questionId] as string) ?? "";
    const modelAns = typeof q.data.correct_answer === "string" ? q.data.correct_answer : JSON.stringify(q.data.correct_answer);
    const out = await groqJSON<{ score: number; feedback: string }>({
      system: "أنت مصحّح اختبارات مقالية بالعربي المصري. أعِد JSON فقط: {score, feedback}.",
      user: `السؤال: ${q.data.prompt}\nنموذج الإجابة: ${modelAns}\nإجابة الطالب: ${studentAnswer}\nالدرجة القصوى: ${q.data.points}`,
      temperature: 0.2,
    });
    return out;
  });
