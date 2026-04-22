import { Sidebar } from "@/components/dashboard/sidebar";

export default function DashboardShellLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto grid min-h-screen max-w-7xl gap-6 p-6 lg:grid-cols-[260px_1fr]">
      <Sidebar />
      <main className="min-w-0">{children}</main>
    </div>
  );
}
