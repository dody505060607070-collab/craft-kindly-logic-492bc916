import { useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { CrudSection } from "@/components/CrudSection";
import { AdminHelp } from "@/components/AdminHelp";

export const Route = createFileRoute("/dashboard/videos")({
  head: () => ({
    meta: [
      { title: "سيرفر الفيديوهات | لوحة تحكم المستر" },
      { name: "description", content: "رفع فيديوهات الدروس والملفات المرفقة بجودة عالية على سيرفر منصة المستر." },
      { property: "og:title", content: "سيرفر الفيديوهات | منصة المستر" },
      { property: "og:description", content: "رفع وإدارة فيديوهات وملفات الدروس." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: VideosPage,
});

function Uploader({ bucket, label }: { bucket: string; label: string }) {
  const [busy, setBusy] = useState(false);
  const [url, setUrl] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const upload = async (file: File) => {
    setBusy(true);
    try {
      const path = `${Date.now()}-${file.name.replace(/[^\w.-]/g, "_")}`;
      const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: false });
      if (error) throw error;
      const { data, error: signErr } = await supabase.storage
        .from(bucket)
        .createSignedUrl(path, 60 * 60 * 24 * 365);
      if (signErr) throw signErr;
      setUrl(data.signedUrl);
      toast.success("تم الرفع — انسخ الرابط وضعه في الدرس");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "فشل الرفع");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="glass rounded-2xl p-5">
      <h3 className="mb-3 font-bold">{label}</h3>
      <input
        ref={inputRef}
        type="file"
        hidden
        onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
      />
      <button
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-60"
      >
        {busy ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
        اختر ملف وارفعه
      </button>
      {url && (
        <div className="mt-3">
          <p className="mb-1 text-xs text-muted-foreground">الرابط:</p>
          <input
            readOnly
            value={url}
            onFocus={(e) => e.currentTarget.select()}
            className="w-full rounded-xl border border-input bg-surface px-3 py-2 text-xs"
          />
        </div>
      )}
    </div>
  );
}

function VideosPage() {
  const { isAdmin } = useAuth();

  return (
    <div className="space-y-12">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-black">سيرفر رفع الفيديوهات والملفات</h1>
          <p className="text-sm text-muted-foreground">
            ارفع الفيديو أو ملف PDF، وانسخ الرابط الناتج وحطه في بيانات الدرس.
          </p>
        </div>
        <AdminHelp
          title="شرح سيرفر الفيديوهات"
          intro="ترفع فيديو أو ملف مرة واحدة، وتستخدم الرابط الناتج في أي عدد من الدروس."
          items={[
            {
              title: "رفع فيديو درس",
              body: "اختار ملف mp4/mkv. بعد الرفع هيطلعلك رابط، انسخه وحطه في خانة 'رابط الفيديو' جوا الدرس.",
            },
            {
              title: "رفع ملف PDF أو عرض",
              body: "نفس الطريقة — استخدم رابط الملف في قسم 'الملفات المرفقة'.",
            },
            {
              title: "بديل: YouTube",
              body: "لو ما عندكش استضافة كبيرة، ارفع الفيديو على يوتيوب (unlisted) وحط رابط الـ embed هنا.",
            },
            {
              title: "الدروس والملفات في الأسفل",
              body: "تقدر تدير الدروس والملفات المرفقة مباشرة من هنا كمان.",
            },
          ]}
        />
      </header>

      {isAdmin && (
        <div className="grid gap-4 md:grid-cols-2">
          <Uploader bucket="course-videos" label="رفع فيديو درس" />
          <Uploader bucket="course-videos" label="رفع ملف PDF / عرض تقديمي" />
        </div>
      )}

      <CrudSection
        table="lessons"
        title="الدروس"
        description="كل درس مرتبط بكورس، وله رابط فيديو ومدة."
        orderBy="sort_order"
        ascending
        fields={[
          { key: "title", label: "عنوان الدرس" },
          { key: "course_id", label: "معرّف الكورس (UUID)" },
          { key: "video_url", label: "رابط الفيديو" },
          { key: "duration_seconds", label: "المدة (ثانية)", type: "number", default: 0 },
          { key: "is_free_preview", label: "معاينة مجانية", type: "bool", default: false },
          { key: "is_published", label: "منشور", type: "bool", default: true },
          { key: "description", label: "الوصف", type: "textarea", hideInTable: true },
          { key: "sort_order", label: "الترتيب", type: "number", default: 0 },
        ]}
      />

      <CrudSection
        table="materials"
        title="الملفات المرفقة"
        description="ملفات PDF والعروض التقديمية المرتبطة بالدروس."
        fields={[
          { key: "title", label: "اسم الملف" },
          { key: "file_url", label: "رابط الملف" },
          { key: "file_type", label: "النوع", default: "pdf" },
          { key: "lesson_id", label: "معرّف الدرس (UUID)", hideInTable: true },
        ]}
      />
    </div>
  );
}
