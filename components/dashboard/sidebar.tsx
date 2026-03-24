const sections = [
  "Agenda",
  "Clientes",
  "Barbeiros",
  "Comandas",
  "Financeiro",
  "Estoque",
  "Assinaturas",
  "Relatorios",
  "Multi unidades",
  "Automacoes"
];

export function Sidebar() {
  return (
    <aside className="w-full rounded-xl border bg-white p-4 dark:bg-slate-900 lg:w-64">
      <h2 className="mb-4 text-sm font-semibold uppercase text-slate-500">Menu</h2>
      <ul className="space-y-2">
        {sections.map((item) => (
          <li key={item} className="rounded-lg px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-800">
            {item}
          </li>
        ))}
      </ul>
    </aside>
  );
}
