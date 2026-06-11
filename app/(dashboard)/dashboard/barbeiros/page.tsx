"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, Search, X, ToggleLeft, ToggleRight } from "lucide-react";
import { createClient } from "@/lib/supabase-client";
import { z } from "zod";

// ─── Schema ───────────────────────────────────────────────────────────────────

const schema = z.object({
  name: z.string().min(2, "Nome obrigatorio"),
  commission_percent: z
    .number({ invalid_type_error: "Comissao obrigatoria" })
    .min(0)
    .max(100),
  monthly_goal: z.number({ invalid_type_error: "Meta invalida" }).min(0),
});
type FormData = z.infer<typeof schema>;

// ─── Types ────────────────────────────────────────────────────────────────────

type Barber = {
  id: string;
  name: string;
  commission_percent: number;
  monthly_goal: number;
  active: boolean;
};

// ─── Hooks ────────────────────────────────────────────────────────────────────

function useBarbers() {
  const supabase = createClient();
  return useQuery<Barber[]>({
    queryKey: ["barbers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("barbers")
        .select("id, name, commission_percent, monthly_goal, active")
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });
}

function useUpsertBarber(id?: string) {
  const qc = useQueryClient();
  const supabase = createClient();
  return useMutation({
    mutationFn: async (input: FormData) => {
      if (id) {
        const { error } = await supabase.from("barbers").update(input).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("barbers").insert(input);
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["barbers"] }),
  });
}

function useToggleActive() {
  const qc = useQueryClient();
  const supabase = createClient();
  return useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from("barbers").update({ active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["barbers"] }),
  });
}

function useDeleteBarber() {
  const qc = useQueryClient();
  const supabase = createClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("barbers").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["barbers"] }),
  });
}

// ─── Shared styles ────────────────────────────────────────────────────────────

const inputCls = (err: boolean) =>
  `w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:border-slate-700 ${
    err ? "border-red-500" : ""
  }`;
const btnPrimary =
  "rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors";
const btnSecondary =
  "rounded-lg border px-4 py-2 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors";

// ─── Modal ────────────────────────────────────────────────────────────────────

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl bg-white shadow-xl dark:bg-slate-900">
        <div className="flex items-center justify-between border-b px-5 py-4 dark:border-slate-800">
          <h2 className="font-semibold">{title}</h2>
          <button onClick={onClose} className="rounded p-1 hover:bg-slate-100 dark:hover:bg-slate-800">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

// ─── Form ─────────────────────────────────────────────────────────────────────

function BarberForm({
  initial,
  onClose,
}: {
  initial?: Barber;
  onClose: () => void;
}) {
  const [form, setForm] = useState({
    name: initial?.name ?? "",
    commission_percent: initial?.commission_percent ?? 40,
    monthly_goal: initial?.monthly_goal ?? 0,
  });
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const mutation = useUpsertBarber(initial?.id);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = {
      name: form.name,
      commission_percent: Number(form.commission_percent),
      monthly_goal: Number(form.monthly_goal),
    };
    const result = schema.safeParse(parsed);
    if (!result.success) {
      const errs: typeof errors = {};
      result.error.issues.forEach((i) => {
        errs[i.path[0] as keyof FormData] = i.message;
      });
      setErrors(errs);
      return;
    }
    try {
      await mutation.mutateAsync(result.data);
      onClose();
    } catch {
      setErrors({ name: "Erro ao salvar." });
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1">
        <label className="text-sm font-medium">Nome *</label>
        <input
          className={inputCls(!!errors.name)}
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
        />
        {errors.name && <p className="text-xs text-red-500">{errors.name}</p>}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-sm font-medium">Comissao (%) *</label>
          <input
            type="number"
            min="0"
            max="100"
            step="0.5"
            className={inputCls(!!errors.commission_percent)}
            value={form.commission_percent}
            onChange={(e) =>
              setForm((f) => ({ ...f, commission_percent: parseFloat(e.target.value) }))
            }
          />
          {errors.commission_percent && (
            <p className="text-xs text-red-500">{errors.commission_percent}</p>
          )}
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">Meta mensal (R$)</label>
          <input
            type="number"
            min="0"
            step="50"
            className={inputCls(!!errors.monthly_goal)}
            value={form.monthly_goal}
            onChange={(e) =>
              setForm((f) => ({ ...f, monthly_goal: parseFloat(e.target.value) }))
            }
          />
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={onClose} className={btnSecondary}>
          Cancelar
        </button>
        <button type="submit" disabled={mutation.isPending} className={btnPrimary}>
          {mutation.isPending ? "Salvando..." : "Salvar"}
        </button>
      </div>
    </form>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function BarbeirosPage() {
  const { data: barbers = [], isLoading, error } = useBarbers();
  const toggleActive = useToggleActive();
  const deleteBarber = useDeleteBarber();
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Barber | undefined>();
  const [creating, setCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Barber | null>(null);

  const filtered = barbers.filter((b) =>
    b.name.toLowerCase().includes(search.toLowerCase())
  );
  const active = barbers.filter((b) => b.active).length;

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Barbeiros</h1>
          <p className="text-sm text-slate-500">
            {active} ativos de {barbers.length} cadastrados
          </p>
        </div>
        <button onClick={() => setCreating(true)} className={btnPrimary + " flex items-center gap-2"}>
          <Plus className="h-4 w-4" />
          Novo barbeiro
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar barbeiro..."
          className="w-full rounded-lg border py-2 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:border-slate-700"
        />
      </div>

      <div className="overflow-hidden rounded-xl border dark:border-slate-800">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-800/50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-400">Nome</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-400">Comissao</th>
              <th className="hidden px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-400 md:table-cell">
                Meta mensal
              </th>
              <th className="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-400">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y dark:divide-slate-800">
            {isLoading && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                  Carregando...
                </td>
              </tr>
            )}
            {error && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-red-500">
                  Erro ao carregar barbeiros.
                </td>
              </tr>
            )}
            {!isLoading && filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                  Nenhum barbeiro encontrado.
                </td>
              </tr>
            )}
            {filtered.map((b) => (
              <tr key={b.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                <td className="px-4 py-3 font-medium">{b.name}</td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                    {b.commission_percent}%
                  </span>
                </td>
                <td className="hidden px-4 py-3 text-slate-600 dark:text-slate-400 md:table-cell">
                  R$ {b.monthly_goal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => toggleActive.mutate({ id: b.id, active: !b.active })}
                    className="flex items-center gap-1.5 text-xs"
                  >
                    {b.active ? (
                      <>
                        <ToggleRight className="h-4 w-4 text-green-500" />
                        <span className="text-green-600 dark:text-green-400">Ativo</span>
                      </>
                    ) : (
                      <>
                        <ToggleLeft className="h-4 w-4 text-slate-400" />
                        <span className="text-slate-500">Inativo</span>
                      </>
                    )}
                  </button>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() => setEditing(b)}
                      className="rounded p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700"
                    >
                      <Pencil className="h-3.5 w-3.5 text-slate-500" />
                    </button>
                    <button
                      onClick={() => setDeleteTarget(b)}
                      className="rounded p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      <Trash2 className="h-3.5 w-3.5 text-red-400" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {(creating || editing) && (
        <Modal
          title={editing ? "Editar barbeiro" : "Novo barbeiro"}
          onClose={() => {
            setCreating(false);
            setEditing(undefined);
          }}
        >
          <BarberForm
            initial={editing}
            onClose={() => {
              setCreating(false);
              setEditing(undefined);
            }}
          />
        </Modal>
      )}

      {deleteTarget && (
        <Modal title="Confirmar exclusao" onClose={() => setDeleteTarget(null)}>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Deseja excluir <strong>{deleteTarget.name}</strong>? Esta acao nao pode ser desfeita.
          </p>
          <div className="mt-4 flex justify-end gap-2">
            <button onClick={() => setDeleteTarget(null)} className={btnSecondary}>
              Cancelar
            </button>
            <button
              onClick={async () => {
                await deleteBarber.mutateAsync(deleteTarget.id);
                setDeleteTarget(null);
              }}
              disabled={deleteBarber.isPending}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
            >
              {deleteBarber.isPending ? "Excluindo..." : "Excluir"}
            </button>
          </div>
        </Modal>
      )}
    </section>
  );
}
