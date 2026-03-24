import Link from "next/link";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-8 px-6 py-14">
      <h1 className="text-4xl font-bold">HORUS Barber SaaS</h1>
      <p className="max-w-3xl text-lg text-slate-600 dark:text-slate-300">
        Plataforma completa para gestao de barbearias com agenda, financeiro, CRM, estoque,
        assinaturas, WhatsApp automatico e painel multi-unidades.
      </p>
      <div className="flex gap-3">
        <Link href="/dashboard" className="rounded-lg bg-blue-600 px-5 py-3 font-medium text-white">
          Abrir dashboard
        </Link>
        <Link href="/barbearia/demo-barber" className="rounded-lg border px-5 py-3 font-medium">
          Ver pagina publica
        </Link>
      </div>
    </main>
  );
}
