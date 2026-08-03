import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { groqJSON } from "./groq-helper.server";

const TRUE_WORDS = ["true", "صح", "صحيح", "نعم"];

export type GeneratedQuestion = {
  kind: "mcq" | "truefalse";
  question: string;
  options: string[];
  correctIndex: number;
  explanation?: string;
};

type RawQuestion = {
  type?: string;
  kind?: string;
  prompt?: string;
  question?: string;
  choices?: unknown;
  options?: unknown;
  answer?: unknown;
  explanation?: string;
};

function normalize(raw: RawQuestion[]): GeneratedQuestion[] {
  return raw
    .map((item) => {
      const kindRaw = String(item.kind ?? item.type ?? "mcq").toLowerCase();
      const kind: "mcq" | "truefalse" =
        kindRaw.includes("true") || kindRaw.includes("صح") ? "truefalse" : "mcq";
      const question = String(item.question ?? item.prompt ?? "").trim();
      const answer = String(item.answer ?? "").trim().toLowerCase();
      if (kind === "truefalse") {
        return {
          kind,
          question,
          options: ["صح", "خطأ"],
          correctIndex: TRUE_WORDS.includes(answer) ? 0 : 1,
          explanation: item.explanation,
        };
      }
      const list = (Array.isArray(item.options) ? item.options : Array.isArray(item.choices) ? item.choices : [])
        .map((option) => String(option).trim())
        .filter(Boolean);
      let correctIndex = list.findIndex((option) => option.toLowerCase() === answer);
      if (correctIndex < 0 && /^[0-9]+$/.test(answer)) correctIndex = Number(answer);
      if (correctIndex < 0 || correctIndex >= list.length) correctIndex = 0;
      return { kind, question, options: list, correctIndex, explanation: item.explanation };
    })
    .filter((item) => item.question && item.options.length >= 2);
}

/** ولّد أسئلة اختيار من متعدد و/أو صح وخطأ من محتوى درس معيّن أو من نص. */
export const generateAssessmentQuestions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        lessonId: z.string().uuid().optional(),
        extra: z.string().max(20000).optional(),
        count: z.number().min(1).max(20).default(6),
        kind: z.enum(["mcq", "truefalse", "mixed"]).default("mixed"),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("is_admin");
    if (!isAdmin) throw new Error("للأدمن فقط");

    const parts: string[] = [];
    if (data.lessonId) {
      const { data: lesson } = await context.supabase
        .from("lessons")
        .select("title, description, transcript, video_url, courses(title)")
        .eq("id", data.lessonId)
        .maybeSingle();
      if (lesson) {
        const course = lesson.courses as { title?: string } | null;
        parts.push(`الكورس: ${course?.title ?? "—"}`);
        parts.push(`عنوان الدرس: ${lesson.title}`);
        if (lesson.description) parts.push(`وصف الدرس: ${lesson.description}`);
        if (lesson.transcript) parts.push(`نص/تفريغ الفيديو:\n${lesson.transcript.slice(0, 12000)}`);
        if (lesson.video_url) parts.push(`رابط الفيديو: ${lesson.video_url}`);
      }
      const { data: materials } = await context.supabase
        .from("materials")
        .select("title, file_type")
        .eq("lesson_id", data.lessonId);
      if (materials?.length) {
        parts.push(`الملفات المرفقة مع الدرس: ${materials.map((m) => `${m.title} (${m.file_type})`).join(" — ")}`);
      }
    }
    if (data.extra?.trim()) parts.push(`ملاحظات المدرس / محتوى إضافي:\n${data.extra.trim()}`);

    const source = parts.join("\n\n");
    if (source.trim().length < 20) throw new Error("اختر درسًا فيه محتوى أو اكتب موضوع الأسئلة");

    const typeRule =
      data.kind === "mcq"
        ? 'كل الأسئلة لازم تكون "mcq" باختيارات 4.'
        : data.kind === "truefalse"
          ? 'كل الأسئلة لازم تكون "truefalse" (صح / خطأ).'
          : 'نوّع بين "mcq" (4 اختيارات) و "truefalse" (صح / خطأ).';

    const out = await groqJSON<{ questions: RawQuestion[] }>({
      system:
        'أنت مصمم اختبارات تعليمي محترف بالعربي المصري. أعِد JSON فقط بالشكل: {"questions":[{"kind":"mcq"|"truefalse","question":"...","options":["..."],"answer":"نص الاختيار الصحيح أو صح/خطأ","explanation":"..."}]}',
      user: `ولّد ${data.count} أسئلة من محتوى الدرس التالي. ${typeRule}\nالأسئلة لازم تكون مباشرة وواضحة ومناسبة لطالب مصري.\n\n${source}`,
      temperature: 0.4,
      maxTokens: 3500,
    });

    const questions = normalize(out.questions ?? []);
    if (!questions.length) throw new Error("لم يتم توليد أسئلة صالحة، حاول مرة أخرى");
    return { questions };
  });

/** تصحيح تسليم طالب بالذكاء الاصطناعي بالاعتماد على ملف/نص الإجابة الصحيحة. */
export const gradeSubmissionWithAnswerKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ submissionId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("is_admin");
    if (!isAdmin) throw new Error("للأدمن فقط");

    const { data: submission, error } = await context.supabase
      .from("assignment_submissions")
      .select("id, content, assignment_id")
      .eq("id", data.submissionId)
      .maybeSingle();
    if (error) throw error;
    if (!submission) throw new Error("التسليم غير موجود");

    const { data: assignment } = await context.supabase
      .from("assignments")
      .select("title, instructions, description, answer_key_text, answer_key_url, max_score")
      .eq("id", submission.assignment_id)
      .maybeSingle();
    if (!assignment) throw new Error("الواجب غير موجود");

    let key = assignment.answer_key_text ?? "";
    const keyUrl = assignment.answer_key_url;
    if (!key && keyUrl && /\.(txt|md|csv|json)$/i.test(keyUrl)) {
      try {
        const path = keyUrl.startsWith("storage:") ? keyUrl.slice("storage:".length) : null;
        if (path) {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const file = await supabaseAdmin.storage.from("assessment-files").download(path);
          if (file.data) key = (await file.data.text()).slice(0, 8000);
        }
      } catch {
        key = "";
      }
    }

    const maxScore = Number(assignment.max_score ?? 10);
    const result = await groqJSON<{ score: number; feedback: string }>({
      system:
        "أنت مصحّح تعليمي عادل بالعربي المصري. أعِد JSON فقط: {score:number, feedback:string}. قارن إجابة الطالب بنموذج الإجابة لو موجود.",
      user: `الواجب: ${assignment.title}\nالتعليمات: ${assignment.instructions ?? assignment.description ?? "—"}\n\n${key ? `نموذج الإجابة الصحيحة (من المدرس):\n${key}\n\n` : "لا يوجد نموذج إجابة — صحّح باجتهادك.\n\n"}إجابة الطالب:\n${submission.content ?? "(لا يوجد نص)"}\n\nالدرجة القصوى: ${maxScore}. اكتب feedback بالعربي المصري في 3–5 نقاط.`,
      temperature: 0.2,
      maxTokens: 1500,
    });

    const score = Math.max(0, Math.min(maxScore, Number(result.score) || 0));
    await context.supabase
      .from("assignment_submissions")
      .update({ grade: score, feedback: result.feedback, auto_graded: true })
      .eq("id", submission.id);

    return { score, maxScore, feedback: result.feedback, usedAnswerKey: Boolean(key) };
  });
