import { Info } from "lucide-react";

/**
 * Small inline hint box shown above admin sections.
 * Explains — in Arabic — what a section is for and how to use it.
 */
export function SectionHint({
  title,
  children,
}: {
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-3 flex items-start gap-2 rounded-2xl border border-primary/25 bg-primary/5 p-3 text-sm leading-relaxed text-foreground/90">
      <Info className="mt-0.5 size-4 shrink-0 text-primary" />
      <div>
        {title && <p className="mb-1 font-bold text-primary">{title}</p>}
        <p className="text-[13px] text-muted-foreground">{children}</p>
      </div>
    </div>
  );
}
