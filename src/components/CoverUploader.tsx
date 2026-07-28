import { useState } from "react";
import { Loader2, Copy, Upload } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

/** Admin helper: upload a course cover image and get a long-lived signed URL to paste in the course's cover_url field. */
export function CoverUploader() {
  const [busy, setBusy] = useState(false);
  const [url, setUrl] = useState<string>("");

  const onFile = async (file: File) => {
    setBusy(true);
    try {
      const path = `covers/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const { error } = await supabase.storage.from("course-covers").upload(path, file, {
        contentType: file.type,
        upsert: false,
      });
      if (error) throw error;
      const { data, error: sErr } = await supabase.storage
        .from("course-covers")
        .createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
      if (sErr) throw sErr;
      setUrl(data.signedUrl);
      toast.success("تم الرفع — انسخ الرابط وضعه في حقل صورة الغلاف");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "فشل الرفع");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="glass rounded-2xl p-5">
      <h3 className="font-black">رفع صورة غلاف كورس</h3>
      <p className="mt-1 text-xs text-muted-foreground">
        ارفع الصورة هنا، ثم انسخ الرابط والصقه في حقل "رابط صورة الغلاف" أعلاه.
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <label className="flex cursor-pointer items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground">
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
          اختر صورة
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onFile(f);
            }}
          />
        </label>
        {url && (
          <button
            type="button"
            onClick={() => {
              navigator.clipboard.writeText(url);
              toast.success("تم نسخ الرابط");
            }}
            className="flex items-center gap-2 rounded-xl bg-card px-3 py-2 text-xs font-bold"
          >
            <Copy className="size-3" /> نسخ الرابط
          </button>
        )}
      </div>
      {url && (
        <div className="mt-3 flex items-center gap-3">
          <img src={url} alt="preview" className="h-20 w-32 rounded-lg object-cover" />
          <p dir="ltr" className="line-clamp-2 flex-1 break-all text-[10px] text-muted-foreground">
            {url}
          </p>
        </div>
      )}
    </div>
  );
}