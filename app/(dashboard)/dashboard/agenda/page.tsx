"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, X, CalendarClock } from "lucide-react";
import { createClient } from "@/lib/supabase-client";
import { format } from "date-fns";
import { z } from "zod";

// ─── Schema ───────────────────────────────────────────────────────────────────

const schema = z.object({
  client_id: z.string().uuid("Selecione um cliente"),
  barber_id: z.string().uuid("Selecione um barbeiro"),
  service_id: z.string().uuid("Selecione um servico"),
  start_at: z.string().min(1, "Data/hora obrigatoria"),
  end_at: z.string().min(1, "Data/hora fim obrigatoria"),
  status: z.enum(["scheduled", "confirmed", "completed", "cancelled", "no_show"]),
});
type FormData = z.infer<typeof schema>;

// ─── Types ────────────────────────────────────────────────────────────────────

type Appointment = {
  id: string;
  start_at: string;
  end_at: string;
  status: string;
  clients: { name: string } | null;
  barbers: { name: string } | null;
  services: { name: string; price: number } | null;
};

type Client = { id: string; name: string };
type Barber = { id: string; name: string };
type Service = { id: string; name: string; price: number; duration_minutes: number };

// ─── Hooks ────────────────────────────────────────────────────────────────────

function useAppointments() {
  const supabase = createClient();
  return useQuery<Appointment[]>({
    queryKey: ["appointments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appointments")
        .select("id, start_at, end_at, status, clients(name), barbers(name), services(name, price)")
        .order("start_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data as unknown as Appointment[]) ?? [];
    },
  });
}

function useSelectData() {
  const supabase = createClient();
  return useQuery({
    queryKey: ["appointments-select-data"],
    queryFn: async () => {
      const [clientsRes, barbersRes, servicesRes] = await Promise.all([
        supabase.from("clients").select("id, name").order("name"),
        supabase.from("barbers").select("id, name").eq("active", true).order("name"),
        supabase.from("services").select("id, name, price, duration_minutes").eq("active", true).order("name"),
      ]);
      return {
        clients: (clientsRes.data ?? []) as Client[],
        barbers: (barbersRes.data ?? []) as Barber[],
        services: (servicesRes.data ?? []) as Service[],
      };
    },
  });
}

function useUpsertAppointment(id?: string) {
  const qc = useQueryClient();
  const supabase = createClient();
  return useMutation({
    mutationFn: async (input: FormData) => {
      if (id) {
        const { error } = await supabase.from("appointments").update(input).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("appointments").insert(input);
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["appointments"] }),
  });
}

function useDeleteAppointment() {
  const qc = useQueryClient();
  const supabase = createClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("appointments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["appointments"] }),
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

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  scheduled: {
    label: "Agendado",
    cls: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  },
  confirmed: {
    label: "Confirmado",
    cls: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  },
  completed: {
    label: "Concluido",
    cls: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
  },
  cancelled: {
    label: "Cancelado",
    cls: "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400",
  },
  no_show: {
    label: "Nao compareceu",
    cls: "bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400",
  },
};

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

function AppointmentForm({
  initial,
  onClose,
}: {
  initial?: Appointment;
  onClose: () => void;
}) {
  const { data: selects } = useSelectData();
  const [form, setForm] = useState<Partial<FormData>>({
    client_id: "",
    barber_id: "",
    service_id: "",
    start_at: "",
    end_at: "",
    status: "scheduled",
  });
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const mutation = useUpsertAppointment(initial?.id);

  function onServiceChange(serviceId: string) {
    const svc = selects?.services.find((s) => s.id === serviceId);
    setForm((f) => {
      if (!svc || !f.start_at) return { ...f, service_id: serviceId };
      const start = new Date(f.start_at);
      const end = new Date(start.getTime() + svc.duration_minutes * 60_000);
      return {
        ...f,
        service_id: serviceId,
        end_at: end.toISOString().slice(0, 16),
      };
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const result = schema.safeParse({
      ...form,
      start_at: form.start_at ? new Date(form.start_at).toISOString() : "",
      end_at: form.end_at ? new Date(form.end_at).toISOString() : "",
    });
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
      setErrors({ client_id: "Erro ao salvar." });
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1">
        <label className="text-sm font-medium">Cliente *</label>
        <select
          className={inputCls(!!errors.client_id)}
          value={form.client_id}
          onChange={(e) => setForm((f) => ({ ...f, client_id: e.target.value }))}
        >
          <option value="">Selecione...</option>
          {selects?.clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        {errors.client_id && <p className="text-xs text-red-500">{errors.client_id}</p>}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-sm font-medium">Barbeiro *</label>
          <select
            className={inputCls(!!errors.barber_id)}
            value={form.barber_id}
            onChange={(e) => setForm((f) => ({ ...f, barber_id: e.target.value }))}
          >
            <option value="">Selecione...</option>
            {selects?.barbers.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
          {errors.barber_id && <p className="text-xs text-red-500">{errors.barber_id}</p>}
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium">Servico *</label>
          <select
            className={inputCls(!!errors.service_id)}
            value={form.service_id}
            onChange={(e) => onServiceChange(e.target.value)}
          >
            <option value="">Selecione...</option>
            {selects?.services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          {errors.service_id && <p className="text-xs text-red-500">{errors.service_id}</p>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-sm font-medium">Inicio *</label>
          <input
            type="datetime-local"
            className={inputCls(!!errors.start_at)}
            value={form.start_at}
            onChange={(e) => setForm((f) => ({ ...f, start_at: e.target.value }))}
          />
          {errors.start_at && <p className="text-xs text-red-500">{errors.start_at}</p>}
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">Fim *</label>
          <input
            type="datetime-local"
            className={inputCls(!!errors.end_at)}
            value={form.end_at}
            onChange={(e) => setForm((f) => ({ ...f, end_at: e.target.value }))}
          />
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium">Status</label>
        <select
          className={inputCls(false)}
          value={form.status}
          onChange={(e) =>
            setForm((f) => ({ ...f, status: e.target.value as FormData["status"] }))
          }
        >
          {Object.entries(STATUS_LABELS).map(([value, { label }]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
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

export default function AgendaPage() {
  const { data: appointments = [], isLoading, error } = useAppointments();
  const deleteAppt = useDeleteAppointment();
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Appointment | undefined>();
  const [deleteTarget, setDeleteTarget] = useState<Appointment | null>(null);
  const [filterStatus, setFilterStatus] = useState("all");

  const today = appointments.filter(
    (a) => new Date(a.start_at).toDateString() === new Date().toDateString()
  ).length;

  const filtered =
    filterStatus === "all" ? appointments : appointments.filter((a) => a.status === filterStatus);

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Agenda</h1>
          <p className="text-sm text-slate-500">{today} agendamentos hoje</p>
        </div>
        <button onClick={() => setCreating(true)} className={btnPrimary + " flex items-center gap-2"}>
          <Plus className="h-4 w-4" />
          Novo agendamento
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {[["all", "Todos"], ...Object.entries(STATUS_LABELS).map(([v, { label }]) => [v, label])].map(
          ([value, label]) => (
            <button
              key={value}
              onClick={() => setFilterStatus(value)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                filterStatus === value
                  ? "bg-blue-600 text-white"
                  : "border hover:bg-slate-50 dark:hover:bg-slate-800"
              }`}
            >
              {label}
            </button>
          )
        )}
      </div>

      <div className="overflow-hidden rounded-xl border dark:border-slate-800">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-800/50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-400">
                Data / Hora
              </th>
              <th className="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-400">
                Cliente
              </th>
              <th className="hidden px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-400 md:table-cell">
                Barbeiro
              </th>
              <th className="hidden px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-400 lg:table-cell">
                Servico
              </th>
              <th className="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-400">
                Status
              </th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y dark:divide-slate-800">
            {isLoading && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                  <CalendarClock className="mx-auto mb-2 h-8 w-8 opacity-40" />
                  Carregando...
                </td>
              </tr>
            )}
            {error && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-red-500">
                  Erro ao carregar agendamentos.
                </td>
              </tr>
            )}
            {!isLoading && filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                  Nenhum agendamento encontrado.
                </td>
              </tr>
            )}
            {filtered.map((a) => {
              const st = STATUS_LABELS[a.status] ?? { label: a.status, cls: "" };
              return (
                <tr key={a.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                  <td className="px-4 py-3">
                    <span className="font-medium">
                      {format(new Date(a.start_at), "dd/MM/yyyy")}
                    </span>
                    <span className="ml-2 text-slate-500">
                      {format(new Date(a.start_at), "HH:mm")}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-medium">{a.clients?.name ?? "—"}</td>
                  <td className="hidden px-4 py-3 text-slate-600 dark:text-slate-400 md:table-cell">
                    {a.barbers?.name ?? "—"}
                  </td>
                  <td className="hidden px-4 py-3 text-slate-600 dark:text-slate-400 lg:table-cell">
                    {a.services?.name ?? "—"}
                    {a.services && (
                      <span className="ml-2 text-slate-400">
                        R$ {a.services.price.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${st.cls}`}>
                      {st.label}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => setEditing(a)}
                        className="rounded p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700"
                      >
                        <Pencil className="h-3.5 w-3.5 text-slate-500" />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(a)}
                        className="rounded p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20"
                      >
                        <Trash2 className="h-3.5 w-3.5 text-red-400" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {(creating || editing) && (
        <Modal
          title={editing ? "Editar agendamento" : "Novo agendamento"}
          onClose={() => {
            setCreating(false);
            setEditing(undefined);
          }}
        >
          <AppointmentForm
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
            Deseja cancelar/excluir o agendamento de{" "}
            <strong>{deleteTarget.clients?.name}</strong>?
          </p>
          <div className="mt-4 flex justify-end gap-2">
            <button onClick={() => setDeleteTarget(null)} className={btnSecondary}>
              Cancelar
            </button>
            <button
              onClick={async () => {
                await deleteAppt.mutateAsync(deleteTarget.id);
                setDeleteTarget(null);
              }}
              disabled={deleteAppt.isPending}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
            >
              {deleteAppt.isPending ? "Excluindo..." : "Excluir"}
            </button>
          </div>
        </Modal>
      )}
    </section>
  );
}
