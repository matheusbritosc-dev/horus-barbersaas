"use client";

import { createClient } from "@/lib/supabase-client";
import {
  BarChart2,
  Building2,
  Calendar,
  CreditCard,
  DollarSign,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  Package,
  Scissors,
  ShoppingCart,
  Users
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const sections = [
  { label: "Painel", href: "/dashboard", icon: LayoutDashboard, exact: true },
  { label: "Agenda", href: "/dashboard/agenda", icon: Calendar },
  { label: "Clientes", href: "/dashboard/clientes", icon: Users },
  { label: "Barbeiros", href: "/dashboard/barbeiros", icon: Scissors },
  { label: "Comandas", href: "/dashboard/comandas", icon: ShoppingCart },
  { label: "Financeiro", href: "/dashboard/financeiro", icon: DollarSign },
  { label: "Estoque", href: "/dashboard/estoque", icon: Package },
  { label: "Assinaturas", href: "/dashboard/assinaturas", icon: CreditCard },
  { label: "Relatorios", href: "/dashboard/relatorios", icon: BarChart2 },
  { label: "Multi unidades", href: "/dashboard/unidades", icon: Building2 },
  { label: "Automacoes", href: "/dashboard/automacoes", icon: MessageSquare }
] as const;

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="flex w-full flex-col rounded-xl border bg-white p-4 dark:bg-slate-900 lg:w-64">
      <div className="mb-6">
        <h1 className="text-lg font-bold text-blue-600">HORUS</h1>
        <p className="text-xs text-slate-500">Gestao de barbearias</p>
      </div>

      <nav className="flex-1 space-y-1">
        {sections.map(({ label, href, icon: Icon, exact }) => {
          const active = exact
            ? pathname === href
            : pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={label}
              href={href}
              className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors ${
                active
                  ? "bg-blue-50 font-medium text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                  : "text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-4 border-t pt-4">
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
        >
          <LogOut className="h-4 w-4" />
          Sair
        </button>
      </div>
    </aside>
  );
}
