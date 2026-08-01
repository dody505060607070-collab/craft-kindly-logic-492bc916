import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Pencil, Plus, Save, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { AiWriteButton } from "@/components/AiWriteButton";

/* الوصول لأي جدول باسم ديناميكي */
type AnyQuery = {
  select: (q: string) => AnyQuery;
  order: (c: string, o?: { ascending?: boolean }) => AnyQuery;
  limit: (n: number) => Promise<{ data: unknown; error: { message: string } | null }>;
  insert: (v: unknown) => Promise<{ error: { message: string } | null }>;
  update: (v: unknown) => { eq: (c: string, v: string) => Promise<{ error: { message: string } | null }> };
  delete: () => { eq: (c: string, v: string) => Promise<{ error: { message: string } | null }> };
};
const db = (t: string) =>
  (supabase as unknown as { from: (t: string) => AnyQuery }).from(t);

export type Field = {
  key: string;
  label: string;
  type?: "text" | "textarea" | "number" | "bool" | "select" | "datetime";
  options?: { value: string; label: string }[];
  hideInTable?: boolean;
  default?: unknown;
  required?: boolean;
  relation?: { table: "courses" | "subjects" | "chapters" | "lessons" | "assignments" | "quizzes" | "profiles"; label: string };
};

type Row = Record<string, unknown>;

export function CrudSection({
  table,
  title,
  description,
  fields,
  orderBy = "created_at",
  ascending = false,
  readOnly = false,
  allowCreate = true,
  emptyText = "لا توجد بيانات بعد.",
  aiHelpers,
}: {
  table: string;
  title: string;
  description?: string;
  fields: Field[];
  orderBy?: string;
  ascending?: boolean;
  readOnly?: boolean;
  allowCreate?: boolean;
  emptyText?: string;
  aiHelpers?: Record<string, { purpose: string; placeholder?: string }>;
}) {
  const { isAdmin } = useAuth();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Row | null>(null);
  const canEdit = isAdmin && !readOnly;
  const canCreate = canEdit && allowCreate;

  const relationFields = fields.filter((field) => field.relation);
  const { data: relationOptions = {} } = useQuery({
    queryKey: ["crud-relations", table, relationFields.map((field) => `${field.key}:${field.relation?.table}`).join("|")],
    enabled: relationFields.length > 0,
    queryFn: async () => {
      const entries = await Promise.all(relationFields.map(async (field) => {
        const relation = field.relation;
        if (!relation) return [field.key, []] as const;
        const { data, error } = await db(relation.table).select(`id,${relation.label}`).order(relation.label).limit(500);
        if (error) throw error;
        return [field.key, (data ?? []) as Row[]] as const;
      }));
      return Object.fromEntries(entries) as Record<string, Row[]>;
    },
  });


  const { data, isLoading } = useQuery({
    queryKey: ["crud", table],
    queryFn: async () => {
      const { data, error } = await db(table)
        .select("*")
        .order(orderBy, { ascending })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as Row[];
    },
  });

  const save = useMutation({
    mutationFn: async (row: Row) => {
      const payload: Row = {};
      for (const f of fields) {
        let v = row[f.key];
        if (v === "" || v === undefined) v = null;
        if (f.type === "number" && v !== null) v = Number(v);
        payload[f.key] = v;
      }
      const missing = fields.find((field) => field.required && (payload[field.key] === null || payload[field.key] === ""));
      if (missing) throw new Error(`اكتب ${missing.label}`);
      if (row.id) {
        const { error } = await db(table).update(payload).eq("id", row.id as string);
        if (error) throw error;
      } else {
        const { error } = await db(table).insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("تم الحفظ");
      setEditing(null);
      qc.invalidateQueries({ queryKey: ["crud", table] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db(table).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("تم الحذف");
      qc.invalidateQueries({ queryKey: ["crud", table] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const visible = fields.filter((f) => !f.hideInTable);

  return (
    <section className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-black">{title}</h1>
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>
        {canCreate && (

          <button
            onClick={() =>
              setEditing(Object.fromEntries(fields.map((f) => [f.key, f.default ?? ""])) as Row)
            }
            className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground"
          >
            <Plus className="size-4" /> إضافة جديد
          </button>
        )}
      </header>

      {editing && (
        <div className="glass rounded-2xl p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-bold">{editing.id ? "تعديل عنصر" : "إضافة عنصر جديد"}</h2>
            <button onClick={() => setEditing(null)} className="text-muted-foreground">
              <X className="size-4" />
            </button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {fields.map((f) => (
              <div key={f.key} className={f.type === "textarea" ? "sm:col-span-2" : ""}>
                <div className="mb-1.5 flex items-center justify-between gap-2">
                  <label className="block text-xs font-bold text-muted-foreground">
                    {f.label}
                  </label>
                  {aiHelpers?.[f.key] && editing && (
                    <AiWriteButton
                      purpose={aiHelpers[f.key].purpose}
                      placeholder={aiHelpers[f.key].placeholder}
                      onGenerated={(t) => setEditing({ ...editing, [f.key]: t })}
                    />
                  )}
                </div>
                {f.relation ? (
                  <select
                    value={String(editing[f.key] ?? "")}
                    onChange={(e) => setEditing({ ...editing, [f.key]: e.target.value })}
                    className="w-full rounded-xl border border-input bg-surface px-3 py-2 text-sm outline-none"
                  >
                    <option value="">— اختر {f.label} —</option>
                    {(relationOptions[f.key] ?? []).map((option) => (
                      <option key={String(option.id)} value={String(option.id)}>{String(option[f.relation?.label ?? "id"] ?? option.id)}</option>
                    ))}
                  </select>
                ) : f.type === "textarea" ? (
                  <textarea
                    rows={3}
                    value={String(editing[f.key] ?? "")}
                    onChange={(e) => setEditing({ ...editing, [f.key]: e.target.value })}
                    className="w-full rounded-xl border border-input bg-surface px-3 py-2 text-sm outline-none"
                  />
                ) : f.type === "bool" ? (
                  <button
                    type="button"
                    onClick={() => setEditing({ ...editing, [f.key]: !editing[f.key] })}
                    className={`rounded-xl px-4 py-2 text-sm font-bold ${
                      editing[f.key]
                        ? "bg-success text-primary-foreground"
                        : "bg-surface text-muted-foreground"
                    }`}
                  >
                    {editing[f.key] ? "نعم" : "لا"}
                  </button>
                ) : f.type === "select" ? (
                  <select
                    value={String(editing[f.key] ?? "")}
                    onChange={(e) => setEditing({ ...editing, [f.key]: e.target.value })}
                    className="w-full rounded-xl border border-input bg-surface px-3 py-2 text-sm outline-none"
                  >
                    <option value="">— اختر —</option>
                    {f.options?.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type={
                      f.type === "number" ? "number" : f.type === "datetime" ? "datetime-local" : "text"
                    }
                    value={String(editing[f.key] ?? "").slice(0, f.type === "datetime" ? 16 : undefined)}
                    onChange={(e) => setEditing({ ...editing, [f.key]: e.target.value })}
                    className="w-full rounded-xl border border-input bg-surface px-3 py-2 text-sm outline-none"
                  />
                )}
              </div>
            ))}
          </div>
          <button
            onClick={() => save.mutate(editing)}
            disabled={save.isPending}
            className="mt-5 flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-60"
          >
            {save.isPending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            حفظ
          </button>
        </div>
      )}

      <div className="glass overflow-x-auto rounded-2xl">
        {isLoading ? (
          <div className="grid place-items-center py-14">
            <Loader2 className="size-6 animate-spin text-primary" />
          </div>
        ) : !data?.length ? (
          <p className="py-14 text-center text-sm text-muted-foreground">{emptyText}</p>
        ) : (
          <table className="w-full text-right text-sm">
            <thead className="bg-surface/70 text-xs text-muted-foreground">
              <tr>
                {visible.map((f) => (
                  <th key={f.key} className="px-4 py-3 font-bold whitespace-nowrap">
                    {f.label}
                  </th>
                ))}
                {canEdit && <th className="px-4 py-3">إجراءات</th>}
              </tr>
            </thead>
            <tbody>
              {data.map((row) => (
                <tr key={String(row.id)} className="border-t border-border/50">
                  {visible.map((f) => (
                    <td key={f.key} className="max-w-[260px] truncate px-4 py-3">
                      {f.type === "bool" ? (
                        <span className={row[f.key] ? "text-success" : "text-muted-foreground"}>
                          {row[f.key] ? "✔" : "✖"}
                        </span>
                      ) : f.type === "select" ? (
                        (f.options?.find((o) => o.value === row[f.key])?.label ??
                        String(row[f.key] ?? "—"))
                      ) : (
                        String(row[f.key] ?? "—")
                      )}
                    </td>
                  ))}
                  {canEdit && (
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => setEditing(row)}
                          className="rounded-lg bg-surface p-2 text-accent"
                          aria-label="تعديل"
                        >
                          <Pencil className="size-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm("متأكد من الحذف؟")) remove.mutate(String(row.id));
                          }}
                          className="rounded-lg bg-surface p-2 text-destructive"
                          aria-label="حذف"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {!isAdmin && (
        <p className="text-xs text-muted-foreground">
          العرض فقط — الإضافة والتعديل والحذف متاحة لحساب الإدارة.
        </p>
      )}
    </section>
  );
}
