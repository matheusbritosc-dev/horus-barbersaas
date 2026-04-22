import { createSupabaseServerClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";
import { z } from "zod";

const barberSchema = z.object({
  name: z.string().min(2),
  commission_percent: z.number().min(0).max(100).default(40),
  monthly_goal: z.number().min(0).default(0),
  unit_id: z.string().uuid().optional()
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

export async function GET() {
  const { supabase, tenantId } = await requireTenant();
  if (!tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("barbers")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("name");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const { supabase, tenantId } = await requireTenant();
  if (!tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = barberSchema.safeParse(await request.json());
  if (!body.success) return NextResponse.json({ error: body.error.flatten() }, { status: 400 });

  const { data, error } = await supabase
    .from("barbers")
    .insert({ ...body.data, tenant_id: tenantId })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
