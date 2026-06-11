"use client";

import { useQuery } from "@tanstack/react-query";
import { TrendingUp, TrendingDown, Clock, CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase-client";
import { format, startOfMonth, endOfMonth } from "date-fns";

// ─── Types ────────────────────────────────────────────────────────────────────

type Payment = {
  id: string;
  amount: number;
  method: string;
  status: string;
  paid_at: string | null;
  created_at: string;
  orders: { clients: { name: string } | null; total: number } | null;
};

// ─── Hooks ────────────────────────────────────────────────────────────────────

function usePayments() {
  const supabase = createClient();
  return useQuery<Payment[]>({
    queryKey: ["payments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payments")
        .select("id, amount, method, status, paid_at, created_at, orders(total, clients(name))")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data as unknown as Payment[]) ?? [];
    },
  });
}

// ─── Shared ───────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  pending: { label: "Pendente", cls: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" },
  paid: { label: "Pago", cls: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
  refunded: { label: "Reembolsado", cls: "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400" },
  failed: { label: "Falhou", cls: "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400" },
};

const METHOD_LABELS: Record<string, string> = {
  cash: "Dinheiro",
  credit_card: "Cartao credito",
  debit_card: "Cartao debito",
  pix: "PIX",
  bank_transfer: "Transferencia",
};

function fmt(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// ─── KPI Cards ────────────────────────────────────────────────────────────────

function KpiBox({
  icon: Icon,
  label,
  value,
  sub,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub?: string;
  color: string;
}) {
  return (
    <div className="rounded-xl border p-5 dark:border-slate-800">
      <div className={`mb-3 inline-flex rounded-lg p-2 ${color}`}>
        <Icon className="h-5 w-5" />
      </div>
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-0.5 text-2xl font-bold">{value}</p>
      {sub && <p className="mt-1 text-xs text-slate-400">{sub}</p>}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function FinanceiroPage() {
  const { data: payments = [], isLoading, error } = usePayments();

  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  const thisMonth = payments.filter((p) => {
    const d = new Date(p.created_at);
    return d >= monthStart && d <= monthEnd;
  });

  const totalPaid = thisMonth
    .filter((p) => p.status === "paid")
    .reduce((s, p) => s + p.amount, 0);

  const totalPending = thisMonth
    .filter((p) => p.status === "pending")
    .reduce((s, p) => s + p.amount, 0);

  const totalRefunded = thisMonth
    .filter((p) => p.status === "refunded")
    .reduce((s, p) => s + p.amount, 0);

  const paidCount = thisMonth.filter((p) => p.status === "paid").length;

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Financeiro</h1>
        <p className="text-sm text-slate-500">
          Resumo de {format(monthStart, "MMMM yyyy")}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiBox
          icon={TrendingUp}
          label="Recebido no mes"
          value={fmt(totalPaid)}
          sub={`${paidCount} pagamentos`}
          color="bg-green-100 text-green-600 dark:bg-green-900/20"
        />
        <KpiBox
          icon={Clock}
          label="A receber"
          value={fmt(totalPending)}
          color="bg-yellow-100 text-yellow-600 dark:bg-yellow-900/20"
        />
        <KpiBox
          icon={TrendingDown}
          label="Reembolsos"
          value={fmt(totalRefunded)}
          color="bg-red-100 text-red-500 dark:bg-red-900/20"
        />
        <KpiBox
          icon={CheckCircle2}
          label="Total do mes"
          value={fmt(totalPaid + totalPending)}
          color="bg-blue-100 text-blue-600 dark:bg-blue-900/20"
        />
      </div>

      <div className="overflow-hidden rounded-xl border dark:border-slate-800">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-800/50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-400">Data</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-400">Cliente</th>
              <th className="hidden px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-400 md:table-cell">
                Metodo
              </th>
              <th className="px-4 py-3 text-right font-medium text-slate-600 dark:text-slate-400">
                Valor
              </th>
              <th className="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-400">
                Status
              </th>
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
                  Erro ao carregar pagamentos.
                </td>
              </tr>
            )}
            {!isLoading && payments.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                  Nenhum pagamento registrado.
                </td>
              </tr>
            )}
            {payments.map((p) => {
              const st = STATUS_LABELS[p.status];
              return (
                <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                    {format(new Date(p.created_at), "dd/MM/yyyy")}
                  </td>
                  <td className="px-4 py-3 font-medium">
                    {p.orders?.clients?.name ?? "—"}
                  </td>
                  <td className="hidden px-4 py-3 text-slate-600 dark:text-slate-400 md:table-cell">
                    {METHOD_LABELS[p.method] ?? p.method}
                  </td>
                  <td className="px-4 py-3 text-right font-medium">{fmt(p.amount)}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${st?.cls}`}>
                      {st?.label}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
