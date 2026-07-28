import { useState } from "react";
import { HelpCircle, X } from "lucide-react";

type Item = { title: string; body: string };

export function AdminHelp({
  title,
  intro,
  items,
}: {
  title: string;
  intro: string;
  items: Item[];
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-bold text-primary transition hover:bg-primary/20"
      >
        <HelpCircle className="size-3.5" /> شرح الصفحة
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-border/60 bg-surface p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <h3 className="font-display text-xl font-black">{title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{intro}</p>
              </div>
              <button onClick={() => setOpen(false)} aria-label="إغلاق">
                <X className="size-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3">
              {items.map((it, i) => (
                <div key={i} className="rounded-2xl bg-card p-4">
                  <p className="font-bold text-primary">{it.title}</p>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{it.body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
