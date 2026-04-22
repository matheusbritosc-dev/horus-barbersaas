import { KpiCard } from "@/components/dashboard/kpi-card";
import { RevenueChart } from "@/components/dashboard/revenue-chart";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export default async function DashboardPage() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  const { data: userData } = await supabase
    .from("users")
    .select("tenant_id, name, barbershops(name)")
    .eq("id", user!.id)
    .maybeSingle();

  const tenantId = userData?.tenant_id as string | undefined;
  const today = new Date().toISOString().split("T")[0];

  const [appointmentsRes, clientsRes, ordersRes] = await Promise.all([
    tenantId
      ? supabase
          .from("appointments")
          .select("*", { count: "exact", head: true })
          .eq("tenant_id", tenantId)
          .gte("start_at", `${today}T00:00:00`)
          .lte("start_at", `${today}T23:59:59`)
      : Promise.resolve({ count: 0, data: null }),
    tenantId
      ? supabase
          .from("clients")
          .select("*", { count: "exact", head: true })
          .eq("tenant_id", tenantId)
      : Promise.resolve({ count: 0, data: null }),
    tenantId
      ? supabase
          .from("orders")
          .select("total")
          .eq("tenant_id", tenantId)
          .eq("payment_status", "paid")
          .gte("created_at", `${today}T00:00:00`)
      : Promise.resolve({ data: [] as { total: string }[], error: null })
  ]);

  const dailyRevenue = (ordersRes.data ?? []).reduce(
    (sum, o) => sum + Number((o as { total: string }).total),
    0
  );

  const fmt = (v: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

  const barbershopName =
    ((userData?.barbershops as { name: string } | null)?.name) ?? "Barbearia";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{barbershopName}</h1>
        <p className="mt-1 text-sm text-slate-500">Visao geral do dia</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title="Faturamento hoje"
          value={fmt(dailyRevenue)}
          subtitle="Pagamentos confirmados"
        />
        <KpiCard
          title="Agendamentos hoje"
          value={String((appointmentsRes as { count: number | null }).count ?? 0)}
          subtitle="Total do dia"
        />
        <KpiCard
          title="Clientes cadastrados"
          value={String((clientsRes as { count: number | null }).count ?? 0)}
          subtitle="Total na base"
        />
        <KpiCard
          title="Bem-vindo"
          value={userData?.name ?? user?.email?.split("@")[0] ?? ""}
          subtitle="Painel administrativo"
        />
      </div>

      <RevenueChart />
    </div>
  );
}
