import { createSupabaseServerClient } from "@/lib/supabase-server";

export default async function ServicosPage() {
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

  const { data: services } = tenantId
    ? await supabase
        .from("services")
        .select("id, name, duration_minutes, price, active")
        .eq("tenant_id", tenantId)
        .order("name")
    : { data: [] };

  const fmt = (v: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Servicos</h1>
        <p className="mt-1 text-sm text-slate-500">{services?.length ?? 0} servicos cadastrados</p>
      </div>

      {!services?.length ? (
        <div className="rounded-xl border border-dashed p-12 text-center">
          <p className="font-medium text-slate-500">Nenhum servico cadastrado ainda.</p>
          <p className="mt-1 text-xs text-slate-400">
            Cadastre os servicos para exibi-los na pagina de agendamento online.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Servico</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Duracao</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Preco</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {services.map((service: any) => (
                <tr key={service.id} className="hover:bg-slate-50 dark:hover:bg-slate-800">
                  <td className="px-4 py-3 font-medium">{service.name}</td>
                  <td className="px-4 py-3">{service.duration_minutes} min</td>
                  <td className="px-4 py-3">{fmt(Number(service.price))}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-medium ${
                        service.active
                          ? "bg-green-100 text-green-800"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {service.active ? "Ativo" : "Inativo"}
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
