import { createLovableAiGatewayProvider } from "./ai-gateway.server";
import { createServerFn } from "@tanstack/react-start";
import { generateText, Output } from "ai";
import { z } from "zod";

const GradeInput = z.object({
  question: z.string().min(1).max(4000),
  answer: z.string().min(1).max(8000),
  maxScore: z.number().min(1).max(100).default(10),
});

export const gradeAssignment = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => GradeInput.parse(input))
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("خدمة الذكاء الاصطناعي غير مهيأة");

    const gateway = createLovableAiGatewayProvider(key);
    const { output } = await generateText({
      model: gateway("google/gemini-3.6-flash"),
      output: Output.object({
        schema: z.object({
          score: z.number(),
          feedback: z.string(),
        }),
      }),
      system:
        "أنت مساعد تصحيح لمنصة تعليمية مصرية لمادة البرمجة. صحّح إجابة الطالب بعدل، وأعطِ درجة من الحد الأقصى المحدد وملاحظات مختصرة باللغة العربية المصرية البسيطة.",
      prompt: `السؤال: ${data.question}\n\nإجابة الطالب: ${data.answer}\n\nالدرجة القصوى: ${data.maxScore}`,
    });

    return output;
  });

const ChatInput = z.object({
  messages: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(4000) }))
    .min(1)
    .max(30),
});

export const askTutor = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => ChatInput.parse(input))
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("خدمة الذكاء الاصطناعي غير مهيأة");

    const gateway = createLovableAiGatewayProvider(key);
    const { text } = await generateText({
      model: gateway("google/gemini-3.6-flash"),
      system:
        "أنت 'مساعد المستر'، مدرس برمجة مصري ودود على منصة المستر للأستاذ المستر. جاوب بالعربية المصرية المبسطة، واشرح الكود خطوة بخطوة باختصار.",
      messages: data.messages,
    });

    return { reply: text };
  });
