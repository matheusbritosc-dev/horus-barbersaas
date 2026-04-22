import { createSupabaseServerClient } from "@/lib/supabase-server";

export default async function BarbeirosPage() {
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

  const { data: barbers } = tenantId
    ? await supabase
        .from("barbers")
        .select("id, name, commission_percent, monthly_goal, active, created_at")
        .eq("tenant_id", tenantId)
        .order("name")
    : { data: [] };

  const fmt = (v: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Barbeiros</h1>
        <p className="mt-1 text-sm text-slate-500">{barbers?.length ?? 0} barbeiros cadastrados</p>
      </div>

      {!barbers?.length ? (
        <div className="rounded-xl border border-dashed p-12 text-center">
          <p className="font-medium text-slate-500">Nenhum barbeiro cadastrado ainda.</p>
          <p className="mt-1 text-xs text-slate-400">
            Adicione barbeiros para gerenciar a agenda, comissoes e metas.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Nome</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Comissao</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Meta mensal</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {barbers.map((barber: any) => (
                <tr key={barber.id} className="hover:bg-slate-50 dark:hover:bg-slate-800">
                  <td className="px-4 py-3 font-medium">{barber.name}</td>
                  <td className="px-4 py-3">{barber.commission_percent}%</td>
                  <td className="px-4 py-3">{fmt(Number(barber.monthly_goal))}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-medium ${
                        barber.active
                          ? "bg-green-100 text-green-800"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {barber.active ? "Ativo" : "Inativo"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
