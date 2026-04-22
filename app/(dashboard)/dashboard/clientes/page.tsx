import { createSupabaseServerClient } from "@/lib/supabase-server";

export default async function ClientesPage() {
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

  const { data: clients } = tenantId
    ? await supabase
        .from("clients")
        .select("id, name, phone, email, loyalty_points, created_at")
        .eq("tenant_id", tenantId)
        .order("name")
    : { data: [] };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Clientes</h1>
        <p className="mt-1 text-sm text-slate-500">{clients?.length ?? 0} clientes cadastrados</p>
      </div>

      {!clients?.length ? (
        <div className="rounded-xl border border-dashed p-12 text-center">
          <p className="font-medium text-slate-500">Nenhum cliente cadastrado ainda.</p>
          <p className="mt-1 text-xs text-slate-400">
            Clientes aparecem aqui quando realizam agendamentos pela pagina publica ou sao cadastrados manualmente.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Nome</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Telefone</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">E-mail</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Pontos</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Cadastrado em</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {clients.map((client: any) => (
                <tr key={client.id} className="hover:bg-slate-50 dark:hover:bg-slate-800">
                  <td className="px-4 py-3 font-medium">{client.name}</td>
                  <td className="px-4 py-3">{client.phone}</td>
                  <td className="px-4 py-3 text-slate-500">{client.email ?? "—"}</td>
                  <td className="px-4 py-3">{client.loyalty_points}</td>
                  <td className="px-4 py-3 text-slate-500">
                    {new Date(client.created_at).toLocaleDateString("pt-BR")}
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
