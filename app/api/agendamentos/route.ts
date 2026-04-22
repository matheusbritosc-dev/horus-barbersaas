import { createSupabaseServerClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";
import { z } from "zod";

const appointmentSchema = z.object({
  client_id: z.string().uuid(),
  barber_id: z.string().uuid(),
  service_id: z.string().uuid(),
  start_at: z.string().datetime(),
  end_at: z.string().datetime(),
  unit_id: z.string().uuid().optional(),
  source: z.string().default("dashboard"),
  waitlist: z.boolean().default(false)
});

async function requireTenant() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return { supabase, tenantId: null };

  const { data } = await supabase
    .from("users")
    .select("tenant_id")
    .eq("id", user.id)
    .maybeSingle();

  return { supabase, tenantId: (data?.tenant_id as string) ?? null };
}

export async function GET(request: Request) {
  const { supabase, tenantId } = await requireTenant();
  if (!tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date") ?? new Date().toISOString().split("T")[0];

  const { data, error } = await supabase
    .from("appointments")
    .select("*, clients(name, phone), barbers(name), services(name, price, duration_minutes)")
    .eq("tenant_id", tenantId)
    .gte("start_at", `${date}T00:00:00`)
    .lte("start_at", `${date}T23:59:59`)
    .order("start_at");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const { supabase, tenantId } = await requireTenant();
  if (!tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = appointmentSchema.safeParse(await request.json());
  if (!body.success) return NextResponse.json({ error: body.error.flatten() }, { status: 400 });

  const { data, error } = await supabase
    .from("appointments")
    .insert({ ...body.data, tenant_id: tenantId })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
