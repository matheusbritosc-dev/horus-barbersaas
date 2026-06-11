"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, Search, X } from "lucide-react";
import { createClient } from "@/lib/supabase-client";
import { z } from "zod";
import { format } from "date-fns";

// ─── Schema ───────────────────────────────────────────────────────────────────

const schema = z.object({
  name: z.string().min(2, "Nome obrigatorio"),
  phone: z.string().min(10, "Telefone invalido"),
  email: z.string().email("Email invalido").or(z.literal("")).optional(),
  birthday: z.string().optional(),
  notes: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

// ─── Types ────────────────────────────────────────────────────────────────────

type Client = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  birthday: string | null;
  loyalty_points: number;
  created_at: string;
};

// ─── Hooks ────────────────────────────────────────────────────────────────────

function useClients() {
  const supabase = createClient();
  return useQuery<Client[]>({
    queryKey: ["clients"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("id, name, phone, email, birthday, loyalty_points, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

function useUpsertClient(id?: string) {
  const qc = useQueryClient();
  const supabase = createClient();
  return useMutation({
    mutationFn: async (input: FormData) => {
      const payload = { ...input, email: input.email || null };
      if (id) {
        const { error } = await supabase.from("clients").update(payload).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("clients").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["clients"] }),
  });
}

function useDeleteClient() {
  const qc = useQueryClient();
  const supabase = createClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("clients").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["clients"] }),
  });
}

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

function ClientForm({
  initial,
  onClose,
}: {
  initial?: Client;
  onClose: () => void;
}) {
  const [form, setForm] = useState<FormData>({
    name: initial?.name ?? "",
    phone: initial?.phone ?? "",
    email: initial?.email ?? "",
    birthday: initial?.birthday ?? "",
    notes: "",
  });
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const mutation = useUpsertClient(initial?.id);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const result = schema.safeParse(form);
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
      setErrors({ name: "Erro ao salvar. Tente novamente." });
    }
  }

  function field(key: keyof FormData) {
    return {
      value: form[key] ?? "",
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        setForm((f) => ({ ...f, [key]: e.target.value })),
    };
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1">
        <label className="text-sm font-medium">Nome *</label>
        <input className={inputCls(!!errors.name)} {...field("name")} />
        {errors.name && <p className="text-xs text-red-500">{errors.name}</p>}
      </div>
      <div className="space-y-1">
        <label className="text-sm font-medium">Telefone *</label>
        <input className={inputCls(!!errors.phone)} {...field("phone")} type="tel" />
        {errors.phone && <p className="text-xs text-red-500">{errors.phone}</p>}
      </div>
      <div className="space-y-1">
        <label className="text-sm font-medium">Email</label>
        <input className={inputCls(false)} {...field("email")} type="email" />
      </div>
      <div className="space-y-1">
        <label className="text-sm font-medium">Aniversario</label>
        <input className={inputCls(false)} {...field("birthday")} type="date" />
      </div>
      <div className="space-y-1">
        <label className="text-sm font-medium">Observacoes</label>
        <textarea
          className={inputCls(false) + " resize-none"}
          {...field("notes")}
          rows={3}
        />
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

// ─── Styles ───────────────────────────────────────────────────────────────────

const inputCls = (err: boolean) =>
  `w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:border-slate-700 ${
    err ? "border-red-500" : ""
  }`;
const btnPrimary =
  "rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors";
const btnSecondary =
  "rounded-lg border px-4 py-2 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors";

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ClientesPage() {
  const { data: clients = [], isLoading, error } = useClients();
  const deleteClient = useDeleteClient();
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Client | undefined>();
  const [creating, setCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Client | null>(null);

  const filtered = clients.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.includes(search)
  );

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Clientes</h1>
          <p className="text-sm text-slate-500">{clients.length} clientes cadastrados</p>
        </div>
        <button onClick={() => setCreating(true)} className={btnPrimary + " flex items-center gap-2"}>
          <Plus className="h-4 w-4" />
          Novo cliente
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nome ou telefone..."
          className="w-full rounded-lg border py-2 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:border-slate-700"
        />
      </div>

      <div className="overflow-hidden rounded-xl border dark:border-slate-800">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-800/50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-400">Nome</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-400">Telefone</th>
              <th className="hidden px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-400 md:table-cell">Email</th>
              <th className="hidden px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-400 lg:table-cell">Pontos</th>
              <th className="hidden px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-400 xl:table-cell">Cadastro</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y dark:divide-slate-800">
            {isLoading && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                  Carregando...
                </td>
              </tr>
            )}
            {error && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-red-500">
                  Erro ao carregar clientes.
                </td>
              </tr>
            )}
            {!isLoading && filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                  Nenhum cliente encontrado.
                </td>
              </tr>
            )}
            {filtered.map((c) => (
              <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                <td className="px-4 py-3 font-medium">{c.name}</td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{c.phone}</td>
                <td className="hidden px-4 py-3 text-slate-600 dark:text-slate-400 md:table-cell">
                  {c.email ?? "—"}
                </td>
                <td className="hidden px-4 py-3 lg:table-cell">
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                    {c.loyalty_points} pts
                  </span>
                </td>
                <td className="hidden px-4 py-3 text-slate-500 xl:table-cell">
                  {format(new Date(c.created_at), "dd/MM/yyyy")}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() => setEditing(c)}
                      className="rounded p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700"
                    >
                      <Pencil className="h-3.5 w-3.5 text-slate-500" />
                    </button>
                    <button
                      onClick={() => setDeleteTarget(c)}
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
          title={editing ? "Editar cliente" : "Novo cliente"}
          onClose={() => {
            setCreating(false);
            setEditing(undefined);
          }}
        >
          <ClientForm
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
                await deleteClient.mutateAsync(deleteTarget.id);
                setDeleteTarget(null);
              }}
              disabled={deleteClient.isPending}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
            >
              {deleteClient.isPending ? "Excluindo..." : "Excluir"}
            </button>
          </div>
        </Modal>
      )}
    </section>
  );
}
