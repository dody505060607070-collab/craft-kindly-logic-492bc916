import { useState } from "react";
import { Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export type UploadMode = "signed" | "storage" | "path";

/** Inline uploader: يرفع الملف ويرجّع القيمة الجاهزة للحفظ في قاعدة البيانات. */
export function UploadField({
  bucket,
  mode,
  accept,
  prefix = "uploads",
  onDone,
  label = "ارفع ملف من جهازك",
}: {
  bucket: string;
  mode: UploadMode;
  accept?: string;
  prefix?: string;
  onDone: (value: string) => void;
  label?: string;
}) {
  const [busy, setBusy] = useState(false);

  const handle = async (file: File) => {
    setBusy(true);
    try {
      const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `${prefix}/${Date.now()}-${safe}`;
      const { error } = await supabase.storage
        .from(bucket)
        .upload(path, file, { contentType: file.type || undefined, upsert: false });
      if (error) throw error;

      if (mode === "signed") {
        const { data, error: signErr } = await supabase.storage
          .from(bucket)
          .createSignedUrl(path, 60 * 60 * 24 * 365 * 5);
        if (signErr) throw signErr;
        onDone(data.signedUrl);
      } else if (mode === "storage") {
        onDone(`storage:${path}`);
      } else {
        onDone(path);
      }
      toast.success("تم الرفع بنجاح");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "فشل الرفع");
    } finally {
      setBusy(false);
    }
  };

  return (
    <label className="mt-2 flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-input bg-surface px-3 py-2.5 text-xs font-bold text-muted-foreground">
      {busy ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
      {busy ? "جارِ الرفع…" : label}
      <input
        type="file"
        accept={accept}
        className="hidden"
        disabled={busy}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void handle(file);
          event.target.value = "";
        }}
      />
    </label>
  );
}
