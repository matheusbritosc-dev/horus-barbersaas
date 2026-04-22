import { createSupabaseServerClient } from "@/lib/supabase-server";

const STATUS_LABEL: Record<string, string> = {
  scheduled: "Agendado",
  confirmed: "Confirmado",
  completed: "Concluido",
  cancelled: "Cancelado",
  no_show: "Nao compareceu"
};

const STATUS_COLOR: Record<string, string> = {
  scheduled: "bg-yellow-100 text-yellow-800",
  confirmed: "bg-blue-100 text-blue-800",
  completed: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
  no_show: "bg-slate-100 text-slate-600"
};

export default async function AgendaPage() {
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
  const today = new Date().toISOString().split("T")[0];

  const { data: appointments } = tenantId
    ? await supabase
        .from("appointments")
        .select("*, clients(name, phone), barbers(name), services(name, price)")
        .eq("tenant_id", tenantId)
        .gte("start_at", `${today}T00:00:00`)
        .lte("start_at", `${today}T23:59:59`)
        .order("start_at")
    : { data: [] };

  function fmtTime(iso: string) {
    return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  }

  function fmtCurrency(v: number) {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Agenda</h1>
        <p className="mt-1 text-sm text-slate-500">
          Agendamentos de hoje — {new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}
        </p>
      </div>

      {!appointments?.length ? (
        <div className="rounded-xl border border-dashed p-12 text-center">
          <p className="font-medium text-slate-500">Nenhum agendamento para hoje.</p>
          <p className="mt-1 text-xs text-slate-400">
            Agendamentos feitos pela pagina publica ou pelo painel aparecerao aqui.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Horario</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Cliente</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Servico</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Barbeiro</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Valor</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {appointments.map((apt: any) => (
                <tr key={apt.id} className="hover:bg-slate-50 dark:hover:bg-slate-800">
                  <td className="px-4 py-3 font-medium">{fmtTime(apt.start_at)}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium">{apt.clients?.name}</p>
                    <p className="text-xs text-slate-500">{apt.clients?.phone}</p>
                  </td>
                  <td className="px-4 py-3">{apt.services?.name}</td>
                  <td className="px-4 py-3">{apt.barbers?.name}</td>
                  <td className="px-4 py-3">{fmtCurrency(Number(apt.services?.price ?? 0))}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-medium ${STATUS_COLOR[apt.status] ?? "bg-slate-100 text-slate-600"}`}
                    >
                      {STATUS_LABEL[apt.status] ?? apt.status}
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
