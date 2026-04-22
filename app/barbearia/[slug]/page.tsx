import { createSupabaseAdminClient } from "@/lib/supabase-server";
import { BookingForm } from "./booking-form";

interface PageProps {
  params: { slug: string };
}

export default async function PublicBookingPage({ params }: PageProps) {
  const supabase = createSupabaseAdminClient();

  const { data: barbershop } = await supabase
    .from("barbershops")
    .select("id, name, phone, address")
    .eq("slug", params.slug)
    .eq("active", true)
    .maybeSingle();

  if (!barbershop) {
    return (
      <main className="flex min-h-screen items-center justify-center p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Barbearia nao encontrada</h1>
          <p className="mt-2 text-slate-500">
            O link pode estar incorreto ou a barbearia foi desativada.
          </p>
        </div>
      </main>
    );
  }

  const [servicesRes, barbersRes] = await Promise.all([
    supabase
      .from("services")
      .select("id, name, duration_minutes, price")
      .eq("tenant_id", barbershop.id)
      .eq("active", true)
      .order("name"),
    supabase
      .from("barbers")
      .select("id, name")
      .eq("tenant_id", barbershop.id)
      .eq("active", true)
      .order("name")
  ]);

  return (
    <main className="mx-auto max-w-xl space-y-8 p-6 py-12">
      <div>
        <h1 className="text-3xl font-bold">{barbershop.name}</h1>
        {barbershop.address && (
          <p className="mt-1 text-slate-500">{barbershop.address}</p>
        )}
        <p className="mt-1 text-sm text-slate-400">Agende seu horario online</p>
      </div>

      <BookingForm
        slug={params.slug}
        services={servicesRes.data ?? []}
        barbers={barbersRes.data ?? []}
      />
    </main>
  );
}
