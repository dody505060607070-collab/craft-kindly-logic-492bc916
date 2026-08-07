import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FileQuestion } from "lucide-react";
import { toast } from "sonner";
import { UploadField } from "@/components/UploadField";
import { supabase } from "@/integrations/supabase/client";

type QuizOption = { id: string; title: string };

export function QuestionBankFileUploader() {
  const queryClient = useQueryClient();
  const [quizId, setQuizId] = useState("");

  const { data: quizzes = [] } = useQuery({
    queryKey: ["question-bank-upload-quizzes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quizzes")
        .select("id,title")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as QuizOption[];
    },
  });

  const saveFile = async (column: "questions_file_url" | "answer_key_url", value: string) => {
    if (!quizId) {
      toast.error("اختر الاختبار أولًا");
      return;
    }

    const { error } = await supabase.from("quizzes").update({ [column]: value }).eq("id", quizId);
    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success(column === "questions_file_url" ? "تم حفظ ملف الأسئلة في بنك الأسئلة" : "تم حفظ ملف الإجابة السرية");
    await queryClient.invalidateQueries({ queryKey: ["crud", "quizzes"] });
  };

  return (
    <section className="mb-5 space-y-4 rounded-lg border border-border bg-surface p-4">
      <div className="flex items-center gap-2">
        <FileQuestion className="size-5 text-primary" />
        <div>
          <h3 className="font-black">رفع ملفات بنك الأسئلة</h3>
          <p className="text-xs text-muted-foreground">اختر الاختبار، ثم ارفع ملف الأسئلة وملف الإجابة النموذجية.</p>
        </div>
      </div>

      <label className="block">
        <span className="mb-1.5 block text-xs font-black text-muted-foreground">الاختبار</span>
        <select
          value={quizId}
          onChange={(event) => setQuizId(event.target.value)}
          className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none"
        >
          <option value="">— اختر الاختبار قبل رفع الملف —</option>
          {quizzes.map((quiz) => <option key={quiz.id} value={quiz.id}>{quiz.title}</option>)}
        </select>
      </label>

      <div className={`grid gap-4 md:grid-cols-2 ${quizId ? "" : "pointer-events-none opacity-50"}`}>
        <div>
          <p className="text-xs font-black">ملف الأسئلة الذي سيظهر للطالب</p>
          <UploadField
            bucket="assessment-files"
            mode="storage"
            prefix="bank-questions"
            accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
            label="ارفع ملف أسئلة بنك الأسئلة"
            onDone={(value) => void saveFile("questions_file_url", value)}
          />
        </div>
        <div>
          <p className="text-xs font-black">ملف الإجابة النموذجية السري</p>
          <UploadField
            bucket="assessment-files"
            mode="storage"
            prefix="bank-answers"
            accept=".pdf,.doc,.docx,.txt,.md,.png,.jpg,.jpeg"
            label="ارفع ملف الإجابة للذكاء الاصطناعي"
            onDone={(value) => void saveFile("answer_key_url", value)}
          />
        </div>
      </div>
    </section>
  );
}