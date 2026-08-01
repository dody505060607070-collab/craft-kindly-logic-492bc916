import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FileUp, Loader2, Video } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

type UploadKind = "video" | "material";

export function CourseMediaUploader() {
  const queryClient = useQueryClient();
  const [courseId, setCourseId] = useState("");
  const [lessonId, setLessonId] = useState("");
  const [kind, setKind] = useState<UploadKind>("video");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  const { data } = useQuery({
    queryKey: ["admin-media-catalog"],
    queryFn: async () => {
      const [courses, lessons] = await Promise.all([
        supabase.from("courses").select("id, title").order("title"),
        supabase.from("lessons").select("id, title, course_id").order("sort_order"),
      ]);
      if (courses.error) throw courses.error;
      if (lessons.error) throw lessons.error;
      return { courses: courses.data ?? [], lessons: lessons.data ?? [] };
    },
  });

  const lessons = useMemo(
    () => (data?.lessons ?? []).filter((lesson) => lesson.course_id === courseId),
    [courseId, data?.lessons],
  );

  const upload = async () => {
    if (!courseId || !lessonId || !file) {
      toast.error("اختار الكورس والدرس والملف أولاً");
      return;
    }
    setBusy(true);
    try {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `${courseId}/${lessonId}/${Date.now()}-${safeName}`;
      const { error: uploadError } = await supabase.storage
        .from("course-videos")
        .upload(path, file, { contentType: file.type || undefined, upsert: false });
      if (uploadError) throw uploadError;

      if (kind === "video") {
        const { error } = await supabase.from("lessons").update({ video_url: `storage:${path}` }).eq("id", lessonId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("materials").insert({
          lesson_id: lessonId,
          title: file.name,
          file_path: path,
          file_type: file.type || file.name.split(".").pop() || "file",
        });
        if (error) throw error;
      }

      toast.success(kind === "video" ? "تم رفع الفيديو وربطه بالدرس" : "تم رفع الملف وإضافته للدرس");
      setFile(null);
      await queryClient.invalidateQueries({ queryKey: ["crud", kind === "video" ? "lessons" : "materials"] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذر رفع الملف");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="glass space-y-4 rounded-2xl p-5">
      <div className="flex gap-2">
        <Button type="button" variant={kind === "video" ? "default" : "outline"} onClick={() => setKind("video")}>
          <Video className="size-4" /> فيديو درس
        </Button>
        <Button type="button" variant={kind === "material" ? "default" : "outline"} onClick={() => setKind("material")}>
          <FileUp className="size-4" /> PDF / DOC / ملف
        </Button>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <label className="space-y-1 text-xs font-bold text-muted-foreground">
          الكورس
          <select value={courseId} onChange={(event) => { setCourseId(event.target.value); setLessonId(""); }} className="w-full rounded-xl border border-input bg-surface px-3 py-2.5 text-sm text-foreground">
            <option value="">اختر الكورس</option>
            {(data?.courses ?? []).map((course) => <option key={course.id} value={course.id}>{course.title}</option>)}
          </select>
        </label>
        <label className="space-y-1 text-xs font-bold text-muted-foreground">
          الدرس
          <select value={lessonId} onChange={(event) => setLessonId(event.target.value)} disabled={!courseId} className="w-full rounded-xl border border-input bg-surface px-3 py-2.5 text-sm text-foreground disabled:opacity-50">
            <option value="">اختر الدرس</option>
            {lessons.map((lesson) => <option key={lesson.id} value={lesson.id}>{lesson.title}</option>)}
          </select>
        </label>
      </div>
      <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-input bg-surface p-5 text-sm font-bold text-muted-foreground">
        <FileUp className="size-5" />
        {file?.name ?? (kind === "video" ? "اختر فيديو من جهازك" : "اختر PDF أو DOC أو أي ملف")}
        <input type="file" className="hidden" accept={kind === "video" ? "video/*" : ".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.zip,text/*,image/*"} onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
      </label>
      <Button type="button" onClick={upload} disabled={busy || !file || !lessonId}>
        {busy ? <Loader2 className="size-4 animate-spin" /> : <FileUp className="size-4" />}
        {busy ? "جارِ الرفع…" : "ارفع وانشر للطلاب"}
      </Button>
      <p className="text-xs text-muted-foreground">الملف خاص وآمن؛ لا يستطيع فتحه إلا مدير المنصة أو الطالب المشترك في الكورس.</p>
    </div>
  );
}