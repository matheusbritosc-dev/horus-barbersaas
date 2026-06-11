"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Eye, Trash2, X } from "lucide-react";
import { createClient } from "@/lib/supabase-client";
import { format } from "date-fns";
import { z } from "zod";

// ─── Types ────────────────────────────────────────────────────────────────────

type Order = {
  id: string;
  subtotal: number;
  discount: number;
  total: number;
  payment_status: string;
  created_at: string;
  clients: { name: string } | null;
  barbers: { name: string } | null;
};

type OrderItem = {
  id: string;
  item_type: string;
  description: string;
  quantity: number;
  unit_price: number;
  total_price: number;
};

type Client = { id: string; name: string };
type Barber = { id: string; name: string };
type Service = { id: string; name: string; price: number };

// ─── Schema ───────────────────────────────────────────────────────────────────

const orderSchema = z.object({
  client_id: z.string().uuid("Selecione um cliente"),
  barber_id: z.string().uuid("Selecione um barbeiro"),
  discount: z.number().min(0),
  payment_status: z.enum(["pending", "paid", "refunded", "failed"]),
});

const itemSchema = z.object({
  description: z.string().min(1, "Descricao obrigatoria"),
  quantity: z.number().int().min(1),
  unit_price: z.number().min(0.01, "Preco invalido"),
  item_type: z.enum(["service", "product"]),
});

// ─── Hooks ────────────────────────────────────────────────────────────────────

function useOrders() {
  const supabase = createClient();
  return useQuery<Order[]>({
    queryKey: ["orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("id, subtotal, discount, total, payment_status, created_at, clients(name), barbers(name)")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data as unknown as Order[]) ?? [];
    },
  });
}

function useOrderItems(orderId: string | null) {
  const supabase = createClient();
  return useQuery<OrderItem[]>({
    queryKey: ["order-items", orderId],
    enabled: !!orderId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("order_items")
        .select("*")
        .eq("order_id", orderId!);
      if (error) throw error;
      return data ?? [];
    },
  });
}

function useSelectData() {
  const supabase = createClient();
  return useQuery({
    queryKey: ["orders-select"],
    queryFn: async () => {
      const [clientsRes, barbersRes, servicesRes] = await Promise.all([
        supabase.from("clients").select("id, name").order("name"),
        supabase.from("barbers").select("id, name").eq("active", true).order("name"),
        supabase.from("services").select("id, name, price").eq("active", true).order("name"),
      ]);
      return {
        clients: (clientsRes.data ?? []) as Client[],
        barbers: (barbersRes.data ?? []) as Barber[],
        services: (servicesRes.data ?? []) as Service[],
      };
    },
  });
}

function useCreateOrder() {
  const qc = useQueryClient();
  const supabase = createClient();
  return useMutation({
    mutationFn: async ({
      order,
      items,
    }: {
      order: z.infer<typeof orderSchema>;
      items: z.infer<typeof itemSchema>[];
    }) => {
      const subtotal = items.reduce((s, i) => s + i.quantity * i.unit_price, 0);
      const total = Math.max(0, subtotal - order.discount);

      const { data: newOrder, error: orderErr } = await supabase
        .from("orders")
        .insert({ ...order, subtotal, total })
        .select("id")
        .single();
      if (orderErr) throw orderErr;

      if (items.length > 0) {
        const { error: itemsErr } = await supabase.from("order_items").insert(
          items.map((i) => ({ ...i, order_id: newOrder.id }))
        );
        if (itemsErr) throw itemsErr;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["orders"] }),
  });
}

function useDeleteOrder() {
  const qc = useQueryClient();
  const supabase = createClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("orders").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["orders"] }),
  });
}

// ─── Shared ───────────────────────────────────────────────────────────────────

const inputCls = (err = false) =>
  `w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:border-slate-700 ${
    err ? "border-red-500" : ""
  }`;
const btnPrimary =
  "rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors";
const btnSecondary =
  "rounded-lg border px-4 py-2 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors";

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  pending: { label: "Pendente", cls: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" },
  paid: { label: "Pago", cls: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
  refunded: { label: "Reembolsado", cls: "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400" },
  failed: { label: "Falhou", cls: "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400" },
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
      <div className="w-full max-w-lg rounded-xl bg-white shadow-xl dark:bg-slate-900 max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 flex items-center justify-between border-b bg-white px-5 py-4 dark:bg-slate-900 dark:border-slate-800">
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

// ─── View Modal ───────────────────────────────────────────────────────────────

function OrderDetailModal({ order, onClose }: { order: Order; onClose: () => void }) {
  const { data: items = [] } = useOrderItems(order.id);
  return (
    <Modal title={`Comanda #${order.id.slice(0, 8).toUpperCase()}`} onClose={onClose}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <span className="text-slate-500">Cliente</span>
            <p className="font-medium">{order.clients?.name ?? "—"}</p>
          </div>
          <div>
            <span className="text-slate-500">Barbeiro</span>
            <p className="font-medium">{order.barbers?.name ?? "—"}</p>
          </div>
          <div>
            <span className="text-slate-500">Data</span>
            <p className="font-medium">{format(new Date(order.created_at), "dd/MM/yyyy HH:mm")}</p>
          </div>
          <div>
            <span className="text-slate-500">Status</span>
            <p>
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_LABELS[order.payment_status]?.cls}`}>
                {STATUS_LABELS[order.payment_status]?.label}
              </span>
            </p>
          </div>
        </div>

        <div className="rounded-lg border dark:border-slate-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/50">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-slate-500">Item</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-slate-500">Qtd</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-slate-500">Preco</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-slate-500">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y dark:divide-slate-800">
              {items.map((i) => (
                <tr key={i.id}>
                  <td className="px-3 py-2">{i.description}</td>
                  <td className="px-3 py-2 text-right">{i.quantity}</td>
                  <td className="px-3 py-2 text-right">R$ {i.unit_price.toFixed(2)}</td>
                  <td className="px-3 py-2 text-right">R$ {i.total_price.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="space-y-1 text-sm">
          <div className="flex justify-between text-slate-600 dark:text-slate-400">
            <span>Subtotal</span>
            <span>R$ {order.subtotal.toFixed(2)}</span>
          </div>
          {order.discount > 0 && (
            <div className="flex justify-between text-red-500">
              <span>Desconto</span>
              <span>- R$ {order.discount.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between border-t pt-1 font-semibold dark:border-slate-800">
            <span>Total</span>
            <span>R$ {order.total.toFixed(2)}</span>
          </div>
        </div>
      </div>
    </Modal>
  );
}

// ─── Create Form ──────────────────────────────────────────────────────────────

function CreateOrderModal({ onClose }: { onClose: () => void }) {
  const { data: selects } = useSelectData();
  const createOrder = useCreateOrder();

  const [orderForm, setOrderForm] = useState<{
    client_id: string;
    barber_id: string;
    discount: number;
    payment_status: "pending" | "paid" | "refunded" | "failed";
  }>({
    client_id: "",
    barber_id: "",
    discount: 0,
    payment_status: "pending",
  });
  const [items, setItems] = useState([
    { description: "", quantity: 1, unit_price: 0, item_type: "service" as const },
  ]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function addItem() {
    setItems((prev) => [
      ...prev,
      { description: "", quantity: 1, unit_price: 0, item_type: "service" as const },
    ]);
  }

  function removeItem(idx: number) {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  }

  function updateItem(idx: number, key: string, value: string | number) {
    setItems((prev) => prev.map((item, i) => (i === idx ? { ...item, [key]: value } : item)));
  }

  function onServiceSelect(idx: number, serviceId: string) {
    const svc = selects?.services.find((s) => s.id === serviceId);
    if (svc) {
      setItems((prev) =>
        prev.map((item, i) =>
          i === idx
            ? { ...item, description: svc.name, unit_price: svc.price, item_type: "service" as const }
            : item
        )
      );
    }
  }

  const subtotal = items.reduce((s, i) => s + i.quantity * i.unit_price, 0);
  const total = Math.max(0, subtotal - orderForm.discount);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const orderResult = orderSchema.safeParse({
      ...orderForm,
      discount: Number(orderForm.discount),
    });
    if (!orderResult.success) {
      const errs: Record<string, string> = {};
      orderResult.error.issues.forEach((i) => {
        errs[i.path[0] as string] = i.message;
      });
      setErrors(errs);
      return;
    }

    const parsedItems = items.map((i) => ({
      ...i,
      quantity: Number(i.quantity),
      unit_price: Number(i.unit_price),
    }));

    try {
      await createOrder.mutateAsync({ order: orderResult.data, items: parsedItems });
      onClose();
    } catch {
      setErrors({ client_id: "Erro ao salvar comanda." });
    }
  }

  return (
    <Modal title="Nova comanda" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-sm font-medium">Cliente *</label>
            <select
              className={inputCls(!!errors.client_id)}
              value={orderForm.client_id}
              onChange={(e) => setOrderForm((f) => ({ ...f, client_id: e.target.value }))}
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
          <div className="space-y-1">
            <label className="text-sm font-medium">Barbeiro *</label>
            <select
              className={inputCls(!!errors.barber_id)}
              value={orderForm.barber_id}
              onChange={(e) => setOrderForm((f) => ({ ...f, barber_id: e.target.value }))}
            >
              <option value="">Selecione...</option>
              {selects?.barbers.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <label className="text-sm font-medium">Itens</label>
            <button
              type="button"
              onClick={addItem}
              className="flex items-center gap-1 rounded text-xs text-blue-600 hover:underline"
            >
              <Plus className="h-3 w-3" /> Adicionar item
            </button>
          </div>
          <div className="space-y-3">
            {items.map((item, idx) => (
              <div key={idx} className="rounded-lg border p-3 dark:border-slate-700 space-y-2">
                <div className="flex items-start gap-2">
                  <div className="flex-1 space-y-1">
                    <label className="text-xs text-slate-500">Servico rapido</label>
                    <select
                      className={inputCls()}
                      onChange={(e) => onServiceSelect(idx, e.target.value)}
                      defaultValue=""
                    >
                      <option value="">Selecionar servico...</option>
                      {selects?.services.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} — R$ {s.price.toFixed(2)}
                        </option>
                      ))}
                    </select>
                  </div>
                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeItem(idx)}
                      className="mt-5 rounded p-1 hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      <X className="h-3.5 w-3.5 text-red-400" />
                    </button>
                  )}
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-slate-500">Descricao</label>
                  <input
                    className={inputCls()}
                    value={item.description}
                    onChange={(e) => updateItem(idx, "description", e.target.value)}
                    placeholder="Ex: Corte + barba"
                  />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <label className="text-xs text-slate-500">Qtd</label>
                    <input
                      type="number"
                      min="1"
                      className={inputCls()}
                      value={item.quantity}
                      onChange={(e) => updateItem(idx, "quantity", parseInt(e.target.value))}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-slate-500">Preco unit.</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      className={inputCls()}
                      value={item.unit_price}
                      onChange={(e) => updateItem(idx, "unit_price", parseFloat(e.target.value))}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-slate-500">Total</label>
                    <div className="rounded-lg border bg-slate-50 px-3 py-2 text-sm dark:bg-slate-800 dark:border-slate-700">
                      R$ {(item.quantity * item.unit_price).toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-sm font-medium">Desconto (R$)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              className={inputCls()}
              value={orderForm.discount}
              onChange={(e) =>
                setOrderForm((f) => ({ ...f, discount: parseFloat(e.target.value) || 0 }))
              }
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Pagamento</label>
            <select
              className={inputCls()}
              value={orderForm.payment_status}
              onChange={(e) =>
                setOrderForm((f) => ({ ...f, payment_status: e.target.value as "pending" | "paid" }))
              }
            >
              <option value="pending">Pendente</option>
              <option value="paid">Pago</option>
            </select>
          </div>
        </div>

        <div className="rounded-lg bg-slate-50 p-3 text-sm space-y-1 dark:bg-slate-800">
          <div className="flex justify-between text-slate-600 dark:text-slate-400">
            <span>Subtotal</span>
            <span>R$ {subtotal.toFixed(2)}</span>
          </div>
          {orderForm.discount > 0 && (
            <div className="flex justify-between text-red-500">
              <span>Desconto</span>
              <span>- R$ {Number(orderForm.discount).toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between font-semibold border-t pt-1 dark:border-slate-700">
            <span>Total</span>
            <span>R$ {total.toFixed(2)}</span>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className={btnSecondary}>
            Cancelar
          </button>
          <button type="submit" disabled={createOrder.isPending} className={btnPrimary}>
            {createOrder.isPending ? "Salvando..." : "Criar comanda"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ComandasPage() {
  const { data: orders = [], isLoading, error } = useOrders();
  const deleteOrder = useDeleteOrder();
  const [creating, setCreating] = useState(false);
  const [viewing, setViewing] = useState<Order | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Order | null>(null);
  const [filterStatus, setFilterStatus] = useState("all");

  const filtered =
    filterStatus === "all" ? orders : orders.filter((o) => o.payment_status === filterStatus);

  const totalPaid = orders
    .filter((o) => o.payment_status === "paid")
    .reduce((s, o) => s + o.total, 0);

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Comandas</h1>
          <p className="text-sm text-slate-500">{orders.length} comandas no total</p>
        </div>
        <button onClick={() => setCreating(true)} className={btnPrimary + " flex items-center gap-2"}>
          <Plus className="h-4 w-4" />
          Nova comanda
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border p-4 dark:border-slate-800">
          <p className="text-xs text-slate-500">Total recebido</p>
          <p className="mt-1 text-2xl font-bold text-green-600">
            R$ {totalPaid.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="rounded-xl border p-4 dark:border-slate-800">
          <p className="text-xs text-slate-500">Comandas pagas</p>
          <p className="mt-1 text-2xl font-bold">
            {orders.filter((o) => o.payment_status === "paid").length}
          </p>
        </div>
        <div className="rounded-xl border p-4 dark:border-slate-800">
          <p className="text-xs text-slate-500">Pendentes</p>
          <p className="mt-1 text-2xl font-bold text-yellow-600">
            {orders.filter((o) => o.payment_status === "pending").length}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {[
          ["all", "Todos"],
          ...Object.entries(STATUS_LABELS).map(([v, { label }]) => [v, label]),
        ].map(([value, label]) => (
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
        ))}
      </div>

      <div className="overflow-hidden rounded-xl border dark:border-slate-800">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-800/50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-400">Data</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-400">Cliente</th>
              <th className="hidden px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-400 md:table-cell">
                Barbeiro
              </th>
              <th className="px-4 py-3 text-right font-medium text-slate-600 dark:text-slate-400">Total</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-400">Status</th>
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
                  Erro ao carregar comandas.
                </td>
              </tr>
            )}
            {!isLoading && filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                  Nenhuma comanda encontrada.
                </td>
              </tr>
            )}
            {filtered.map((o) => {
              const st = STATUS_LABELS[o.payment_status];
              return (
                <tr key={o.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                    {format(new Date(o.created_at), "dd/MM/yyyy HH:mm")}
                  </td>
                  <td className="px-4 py-3 font-medium">{o.clients?.name ?? "—"}</td>
                  <td className="hidden px-4 py-3 text-slate-600 dark:text-slate-400 md:table-cell">
                    {o.barbers?.name ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-right font-medium">
                    R$ {o.total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${st?.cls}`}>
                      {st?.label}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => setViewing(o)}
                        className="rounded p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700"
                      >
                        <Eye className="h-3.5 w-3.5 text-slate-500" />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(o)}
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

      {creating && <CreateOrderModal onClose={() => setCreating(false)} />}

      {viewing && <OrderDetailModal order={viewing} onClose={() => setViewing(null)} />}

      {deleteTarget && (
        <Modal title="Confirmar exclusao" onClose={() => setDeleteTarget(null)}>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Deseja excluir a comanda de <strong>{deleteTarget.clients?.name}</strong>? Esta acao nao
            pode ser desfeita.
          </p>
          <div className="mt-4 flex justify-end gap-2">
            <button onClick={() => setDeleteTarget(null)} className={btnSecondary}>
              Cancelar
            </button>
            <button
              onClick={async () => {
                await deleteOrder.mutateAsync(deleteTarget.id);
                setDeleteTarget(null);
              }}
              disabled={deleteOrder.isPending}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
            >
              {deleteOrder.isPending ? "Excluindo..." : "Excluir"}
            </button>
          </div>
        </Modal>
      )}
    </section>
  );
}
