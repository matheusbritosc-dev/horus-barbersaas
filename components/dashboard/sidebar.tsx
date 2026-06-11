"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  CalendarDays,
  Users,
  Scissors,
  ClipboardList,
  DollarSign,
  Package,
  CreditCard,
  BarChart3,
  Building2,
  Zap,
  LayoutDashboard,
  LogOut,
} from "lucide-react";
import { createClient } from "@/lib/supabase-client";

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Agenda", href: "/dashboard/agenda", icon: CalendarDays },
  { label: "Clientes", href: "/dashboard/clientes", icon: Users },
  { label: "Barbeiros", href: "/dashboard/barbeiros", icon: Scissors },
  { label: "Comandas", href: "/dashboard/comandas", icon: ClipboardList },
  { label: "Financeiro", href: "/dashboard/financeiro", icon: DollarSign },
  { label: "Estoque", href: "/dashboard/estoque", icon: Package },
  { label: "Assinaturas", href: "/dashboard/assinaturas", icon: CreditCard },
  { label: "Relatorios", href: "/dashboard/relatorios", icon: BarChart3 },
  { label: "Multi unidades", href: "/dashboard/unidades", icon: Building2 },
  { label: "Automacoes", href: "/dashboard/automacoes", icon: Zap },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="flex w-full flex-col rounded-xl border bg-white p-4 dark:bg-slate-900 dark:border-slate-800 lg:w-64">
      <div className="mb-6 px-2">
        <h1 className="text-xl font-bold tracking-tight">HORUS</h1>
        <p className="text-xs text-slate-500">Gestao de barbearias</p>
      </div>

      <nav className="flex-1 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                isActive
                  ? "bg-blue-50 text-blue-700 font-medium dark:bg-blue-900/30 dark:text-blue-400"
                  : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-4 border-t pt-4 dark:border-slate-800">
        <button
          onClick={handleSignOut}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Sair
        </button>
      </div>
    </aside>
  );
}
