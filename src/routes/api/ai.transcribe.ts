import { createFileRoute } from "@tanstack/react-router";
import { groqTranscribe } from "@/lib/groq-helper.server";

export const Route = createFileRoute("/api/ai/transcribe")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const fd = await request.formData();
          const file = fd.get("file");
          if (!(file instanceof Blob)) {
            return new Response("ملف صوتي مطلوب", { status: 400 });
          }
          const name = (file as File).name || "voice.webm";
          const text = await groqTranscribe(file, name);
          return Response.json({ text });
        } catch (e) {
          const msg = e instanceof Error ? e.message : "خطأ";
          const status = /قصير|فاضي|empty|too small/i.test(msg) ? 400 : 500;
          return new Response(msg, { status });
        }
      },
    },
  },
});