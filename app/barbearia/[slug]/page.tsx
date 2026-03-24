interface PageProps {
  params: { slug: string };
}

export default function PublicBookingPage({ params }: PageProps) {
  return (
    <main className="mx-auto max-w-4xl space-y-6 p-6">
      <h1 className="text-3xl font-bold">Agendar na barbearia: {params.slug}</h1>
      <p className="text-slate-600 dark:text-slate-300">
        Pagina publica para clientes agendarem servicos online com selecao de barbeiro, horario,
        remarcacao, cancelamento e lista de espera.
      </p>
      <div className="rounded-xl border p-4">
        <p className="font-medium">Fluxo de agendamento</p>
        <ol className="ml-5 mt-2 list-decimal space-y-1 text-sm text-slate-600 dark:text-slate-300">
          <li>Selecionar servico e unidade</li>
          <li>Escolher barbeiro e horario disponivel</li>
          <li>Confirmar dados de contato</li>
          <li>Receber confirmacao por WhatsApp</li>
        </ol>
      </div>
    </main>
  );
}
