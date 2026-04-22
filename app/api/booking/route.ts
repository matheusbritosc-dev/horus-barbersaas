import { createSupabaseAdminClient } from "@/lib/supabase-server";
import { sendWhatsAppMessage } from "@/lib/whatsapp";
import { NextResponse } from "next/server";
import { z } from "zod";

const bookingSchema = z.object({
  slug: z.string().min(1),
  service_id: z.string().uuid(),
  barber_id: z.string().uuid().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^\d{2}:\d{2}$/),
  client_name: z.string().min(2),
  client_phone: z.string().min(8)
});

export async function POST(request: Request) {
  const parsed = bookingSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { slug, service_id, barber_id, date, time, client_name, client_phone } = parsed.data;
  const supabase = createSupabaseAdminClient();

  const { data: barbershop } = await supabase
    .from("barbershops")
    .select("id, name")
    .eq("slug", slug)
    .eq("active", true)
    .maybeSingle();

  if (!barbershop) {
    return NextResponse.json({ error: "Barbearia nao encontrada" }, { status: 404 });
  }

  // Find or create client by phone within this tenant
  let { data: client } = await supabase
    .from("clients")
    .select("id")
    .eq("tenant_id", barbershop.id)
    .eq("phone", client_phone)
    .maybeSingle();

  if (!client) {
    const { data: newClient, error: clientError } = await supabase
      .from("clients")
      .insert({ tenant_id: barbershop.id, name: client_name, phone: client_phone })
      .select("id")
      .single();

    if (clientError) {
      return NextResponse.json({ error: clientError.message }, { status: 500 });
    }
    client = newClient;
  }

  // Resolve barber: use provided or auto-assign first active barber
  let finalBarberId = barber_id;
  if (!finalBarberId) {
    const { data: firstBarber } = await supabase
      .from("barbers")
      .select("id")
      .eq("tenant_id", barbershop.id)
      .eq("active", true)
      .limit(1)
      .maybeSingle();

    if (!firstBarber) {
      return NextResponse.json({ error: "Nenhum barbeiro disponivel" }, { status: 400 });
    }
    finalBarberId = firstBarber.id;
  }

  // Get service duration to compute end_at
  const { data: service } = await supabase
    .from("services")
    .select("duration_minutes")
    .eq("id", service_id)
    .single();

  const startAt = new Date(`${date}T${time}:00`);
  const endAt = new Date(startAt.getTime() + (service?.duration_minutes ?? 30) * 60_000);

  const { data: appointment, error: aptError } = await supabase
    .from("appointments")
    .insert({
      tenant_id: barbershop.id,
      client_id: client!.id,
      barber_id: finalBarberId,
      service_id,
      start_at: startAt.toISOString(),
      end_at: endAt.toISOString(),
      source: "public_link"
    })
    .select()
    .single();

  if (aptError) {
    return NextResponse.json({ error: aptError.message }, { status: 500 });
  }

  const formattedDate = date.split("-").reverse().join("/");
  await sendWhatsAppMessage(
    client_phone,
    `Ola ${client_name}! Seu agendamento na ${barbershop.name} foi confirmado para ${formattedDate} as ${time}. Ate logo!`
  );

  return NextResponse.json({ appointment }, { status: 201 });
}
