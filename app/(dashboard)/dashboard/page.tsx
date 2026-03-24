import { KpiCard } from "@/components/dashboard/kpi-card";
import { RevenueChart } from "@/components/dashboard/revenue-chart";
import { Sidebar } from "@/components/dashboard/sidebar";

export default function DashboardPage() {
  return (
    <main className="mx-auto grid min-h-screen max-w-7xl gap-6 p-6 lg:grid-cols-[260px_1fr]">
      <Sidebar />
      <section className="space-y-6">
        <h1 className="text-3xl font-bold">Painel da barbearia</h1>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard title="Faturamento diario" value="R$ 2.340" subtitle="+12% vs ontem" />
          <KpiCard title="Agendamentos hoje" value="28" subtitle="3 em fila de espera" />
          <KpiCard title="Ticket medio" value="R$ 84" subtitle="Meta: R$ 90" />
          <KpiCard title="Clientes ativos" value="1.248" subtitle="35 novos no mes" />
        </div>
        <RevenueChart />
      </section>
    </main>
  );
}
