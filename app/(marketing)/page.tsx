import Link from "next/link";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-10 px-6 py-20">
      <div className="space-y-4">
        <p className="text-sm font-medium uppercase tracking-widest text-blue-600">HORUS Barber SaaS</p>
        <h1 className="text-5xl font-bold leading-tight">
          Gerencie sua barbearia
          <br />
          com inteligencia
        </h1>
        <p className="max-w-2xl text-lg text-slate-600 dark:text-slate-300">
          Plataforma completa para gestao de barbearias com agenda online, financeiro, CRM,
          estoque, assinaturas de clientes, WhatsApp automatico e painel multi-unidades.
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <Link
          href="/register"
          className="rounded-lg bg-blue-600 px-6 py-3 font-medium text-white hover:bg-blue-700"
        >
          Criar conta gratis
        </Link>
        <Link
          href="/login"
          className="rounded-lg border px-6 py-3 font-medium hover:bg-slate-50 dark:hover:bg-slate-800"
        >
          Entrar
        </Link>
        <Link
          href="/barbearia/demo-barber"
          className="rounded-lg border px-6 py-3 font-medium hover:bg-slate-50 dark:hover:bg-slate-800"
        >
          Ver pagina publica
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[
          { title: "Agenda online", desc: "Clientes agendam pelo link da barbearia com confirmacao via WhatsApp." },
          { title: "Financeiro", desc: "Controle de faturamento, comandas, comissoes e metas por barbeiro." },
          { title: "CRM de clientes", desc: "Historico completo, aniversarios, pontos de fidelidade e notas." },
          { title: "Estoque", desc: "Controle de produtos com alertas de estoque minimo." },
          { title: "Assinaturas", desc: "Planos mensais para clientes com cortes incluidos e renovacao automatica." },
          { title: "Multi-unidades", desc: "Gerencie varias unidades em um unico painel centralizado." }
        ].map(f => (
          <div key={f.title} className="rounded-xl border p-5">
            <p className="font-semibold">{f.title}</p>
            <p className="mt-1 text-sm text-slate-500">{f.desc}</p>
          </div>
        ))}
      </div>
    </main>
  );
}
