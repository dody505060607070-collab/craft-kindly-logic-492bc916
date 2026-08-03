import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { ListChecks, Loader2, Timer, AlertCircle, CheckCircle2, ChevronRight, ChevronLeft, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { StudentShell } from "@/components/StudentShell";
import { toast } from "sonner";

export const Route = createFileRoute("/quizzes/$quizId")({
  head: () => ({ meta: [
    { title: "ابدأ الاختبار | منصة المستر" },
    { name: "description", content: "اختبار اختيار من متعدد بتصحيح فوري." },
    { property: "og:title", content: "ابدأ الاختبار | منصة المستر" },
    { property: "og:description", content: "اختبار اختيار من متعدد بتصحيح فوري." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: QuizDetailPage,
});

function QuizDetailPage() {
  const { quizId } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number | string>>({});
  const [isStarted, setIsStarted] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  const { data: quiz, isLoading: isQuizLoading } = useQuery({
    queryKey: ["quiz", quizId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quizzes")
        .select("*, courses(title)")
        .eq("id", quizId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const { data: questions, isLoading: isQuestionsLoading } = useQuery({
    queryKey: ["quiz-questions", quizId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_quiz_questions_for_student", { _quiz_id: quizId });
      if (error) throw error;
      return data;
    },
  });

  const { data: lastAttempt } = useQuery({
    queryKey: ["quiz-last-attempt", quizId, user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("quiz_attempts")
        .select("*")
        .eq("quiz_id", quizId)
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!user || !quiz || !questions) return;
      
      if (Object.keys(answers).length !== questions.length) throw new Error("جاوب على كل الأسئلة الأول");
      const { data, error } = await supabase.rpc("submit_quiz_attempt", { _quiz_id: quizId, _answers: answers });
      if (error) throw error;
      const result = data?.[0];
      if (!result) throw new Error("تعذر حفظ النتيجة");
      return { score: Number(result.score), maxScore: Number(result.max_score), passed: result.passed };
    },
    onSuccess: (data) => {
      if (!data) return;
      toast.success(`تم تسليم الاختبار بنجاح! درجتك: ${data.score} / ${data.maxScore}`);
      setIsStarted(false);
      queryClient.invalidateQueries({ queryKey: ["quiz-last-attempt", quizId] });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "تعذر تسليم الاختبار");
    },
  });

  useEffect(() => {
    if (isStarted && timeLeft !== null && timeLeft > 0) {
      const timer = setInterval(() => {
        setTimeLeft(prev => (prev !== null ? prev - 1 : null));
      }, 1000);
      return () => clearInterval(timer);
    } else if (isStarted && timeLeft === 0) {
      submitMutation.mutate();
    }
  }, [isStarted, timeLeft]);

  const startQuiz = () => {
    setIsStarted(true);
    if (quiz?.duration_minutes) {
      setTimeLeft(quiz.duration_minutes * 60);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (isQuizLoading || isQuestionsLoading) {
    return (
      <StudentShell>
        <div className="flex h-[50vh] items-center justify-center">
          <Loader2 className="size-8 animate-spin text-primary" />
        </div>
      </StudentShell>
    );
  }

  if (!quiz) {
    return (
      <StudentShell>
        <div className="mx-auto max-w-4xl px-4 py-8 text-center">
          <AlertCircle className="mx-auto size-12 text-destructive opacity-50" />
          <h1 className="mt-4 text-2xl font-black">الاختبار غير موجود</h1>
          <button onClick={() => navigate({ to: "/quizzes" })} className="mt-4 text-primary font-bold underline">
            الرجوع لقائمة الاختبارات
          </button>
        </div>
      </StudentShell>
    );
  }

  if (!isStarted) {
    return (
      <StudentShell>
        <div className="mx-auto max-w-2xl px-4 py-8">
          <header className="mb-8 text-center">
            <span className="mx-auto grid size-16 place-items-center rounded-3xl bg-accent/15 text-accent mb-4">
              <ListChecks className="size-8" />
            </span>
            <h1 className="font-display text-3xl font-black">{quiz.title}</h1>
            {quiz.courses && (
              <p className="mt-2 text-primary font-bold">{(quiz.courses as any).title}</p>
            )}
          </header>

          <div className="glass rounded-3xl p-8 space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="soft-card p-4 text-center rounded-2xl">
                <p className="text-xs text-muted-foreground mb-1">المدة</p>
                <p className="font-black">{quiz.duration_minutes || "--"} دقيقة</p>
              </div>
              <div className="soft-card p-4 text-center rounded-2xl">
                <p className="text-xs text-muted-foreground mb-1">الأسئلة</p>
                <p className="font-black">{questions?.length || 0}</p>
              </div>
              <div className="soft-card p-4 text-center rounded-2xl">
                <p className="text-xs text-muted-foreground mb-1">درجة النجاح</p>
                <p className="font-black">{quiz.pass_score}%</p>
              </div>
              <div className="soft-card p-4 text-center rounded-2xl">
                <p className="text-xs text-muted-foreground mb-1">الدرجة الكلية</p>
                <p className="font-black">{questions?.reduce((acc, q) => acc + (q.points || 1), 0)}</p>
              </div>
            </div>

            {lastAttempt && (
              <div className={`p-4 rounded-2xl flex items-center justify-between ${lastAttempt.passed ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'}`}>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider">آخر محاولة</p>
                  <p className="font-black text-lg">{lastAttempt.score} / {lastAttempt.max_score}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold">{lastAttempt.passed ? 'ناجح' : 'لم يجتاز'}</p>
                  <p className="text-[10px] opacity-70">{new Date(lastAttempt.submitted_at).toLocaleDateString("ar-EG")}</p>
                </div>
              </div>
            )}

            <button
              onClick={startQuiz}
              disabled={!user || !questions?.length}
              className="w-full flex items-center justify-center gap-2 rounded-2xl bg-primary py-4 font-black text-primary-foreground shadow-lg shadow-primary/20 hover:scale-[1.02] transition-transform"
            >
              {!user ? "سجّل الدخول لبدء الاختبار" : !questions?.length ? "لم تتم إضافة أسئلة بعد" : "ابدأ الاختبار الآن"}
            </button>
          </div>
        </div>
      </StudentShell>
    );
  }

  const currentQuestion = questions![currentQuestionIndex];
  const options = currentQuestion.options as string[];

  return (
    <StudentShell>
      <div className="mx-auto max-w-3xl px-4 py-8">
        <header className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
             <div className="h-2 w-32 bg-card rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary transition-all duration-300" 
                  style={{ width: `${((currentQuestionIndex + 1) / questions!.length) * 100}%` }} 
                />
             </div>
             <span className="text-xs font-bold text-muted-foreground">
               {currentQuestionIndex + 1} من {questions!.length}
             </span>
          </div>
          {timeLeft !== null && (
            <div className="flex items-center gap-2 rounded-xl bg-destructive/10 px-3 py-1.5 text-destructive font-black">
              <Timer className="size-4" />
              <span className="text-sm font-mono">{formatTime(timeLeft)}</span>
            </div>
          )}
        </header>

        <div className="glass rounded-3xl p-6 md:p-8">
          <h2 className="text-xl font-black mb-8 leading-relaxed">
            {currentQuestion.question}
          </h2>

          <div className="space-y-3">
            {options.map((option, idx) => (
              <button
                key={idx}
                onClick={() => setAnswers({ ...answers, [currentQuestion.id]: idx })}
                className={`w-full flex items-center gap-4 rounded-2xl p-4 text-right transition-all border-2 ${
                  answers[currentQuestion.id] === idx
                    ? 'border-primary bg-primary/5'
                    : 'border-transparent bg-card hover:bg-primary/5'
                }`}
              >
                <span className={`grid size-8 shrink-0 place-items-center rounded-xl font-black text-sm transition-colors ${
                  answers[currentQuestion.id] === idx ? 'bg-primary text-primary-foreground' : 'bg-surface text-muted-foreground'
                }`}>
                  {String.fromCharCode(65 + idx)}
                </span>
                <span className="font-bold">{option}</span>
              </button>
            ))}
          </div>

          <div className="mt-10 flex items-center justify-between">
            <button
              onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
              disabled={currentQuestionIndex === 0}
              className="flex items-center gap-2 text-sm font-black disabled:opacity-30"
            >
              <ChevronRight className="size-4" /> السابق
            </button>

            {currentQuestionIndex === questions!.length - 1 ? (
              <button
                onClick={() => submitMutation.mutate()}
                disabled={submitMutation.isPending}
                className="flex items-center gap-2 rounded-xl bg-primary px-6 py-3 font-black text-primary-foreground shadow-lg shadow-primary/20 hover:opacity-90 disabled:opacity-50"
              >
                {submitMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                إنهاء الاختبار
              </button>
            ) : (
              <button
                onClick={() => setCurrentQuestionIndex(prev => Math.min(questions!.length - 1, prev + 1))}
                className="flex items-center gap-2 rounded-xl bg-surface px-6 py-3 font-black hover:bg-primary/10"
              >
                التالي <ChevronLeft className="size-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </StudentShell>
  );
}
