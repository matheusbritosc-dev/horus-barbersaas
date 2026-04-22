import { createSupabaseServerClient } from "@/lib/supabase-server";

export default async function FinanceiroPage() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  const { data: userData } = await supabase
    .from("users")
    .select("tenant_id")
    .eq("id", user!.id)
    .maybeSingle();

  const tenantId = userData?.tenant_id as string | undefined;

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const [monthOrdersRes, pendingOrdersRes] = await Promise.all([
    tenantId
      ? supabase
          .from("orders")
          .select("total, payment_status")
          .eq("tenant_id", tenantId)
          .gte("created_at", startOfMonth)
      : Promise.resolve({ data: [] as { total: string; payment_status: string }[] }),
    tenantId
      ? supabase
          .from("orders")
          .select("id, total, created_at, clients(name)")
          .eq("tenant_id", tenantId)
          .eq("payment_status", "pending")
          .order("created_at", { ascending: false })
          .limit(10)
      : Promise.resolve({ data: [] })
  ]);

  const monthOrders = monthOrdersRes.data ?? [];
  const pendingOrders = pendingOrdersRes.data ?? [];

  const monthRevenue = monthOrders
    .filter((o: any) => o.payment_status === "paid")
    .reduce((sum: number, o: any) => sum + Number(o.total), 0);

  const monthPending = monthOrders
    .filter((o: any) => o.payment_status === "pending")
    .reduce((sum: number, o: any) => sum + Number(o.total), 0);

  const fmt = (v: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Financeiro</h1>
        <p className="mt-1 text-sm text-slate-500">
          Resumo de {now.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border bg-white p-5 dark:bg-slate-900">
          <p className="text-sm text-slate-500">Faturamento do mes</p>
          <p className="mt-1 text-2xl font-bold text-green-600">{fmt(monthRevenue)}</p>
          <p className="mt-1 text-xs text-slate-400">Pagamentos confirmados</p>
        </div>
        <div className="rounded-xl border bg-white p-5 dark:bg-slate-900">
          <p className="text-sm text-slate-500">A receber</p>
          <p className="mt-1 text-2xl font-bold text-yellow-600">{fmt(monthPending)}</p>
          <p className="mt-1 text-xs text-slate-400">Pagamentos pendentes</p>
        </div>
        <div className="rounded-xl border bg-white p-5 dark:bg-slate-900">
          <p className="text-sm text-slate-500">Total de comandas</p>
          <p className="mt-1 text-2xl font-bold">{monthOrders.length}</p>
          <p className="mt-1 text-xs text-slate-400">Neste mes</p>
        </div>
      </div>

      {pendingOrders.length > 0 && (
        <div>
          <h2 className="mb-3 text-lg font-semibold">Pagamentos pendentes</h2>
          <div className="overflow-x-auto rounded-xl border">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Cliente</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Valor</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Data</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {pendingOrders.map((order: any) => (
                  <tr key={order.id} className="hover:bg-slate-50 dark:hover:bg-slate-800">
                    <td className="px-4 py-3">{order.clients?.name ?? "—"}</td>
                    <td className="px-4 py-3 font-medium text-yellow-600">
                      {fmt(Number(order.total))}
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {new Date(order.created_at).toLocaleDateString("pt-BR")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!tenantId && (
        <div className="rounded-xl border border-dashed p-12 text-center">
          <p className="text-slate-500">Configure sua barbearia para visualizar dados financeiros.</p>
        </div>
      )}
    </div>
  );
}
