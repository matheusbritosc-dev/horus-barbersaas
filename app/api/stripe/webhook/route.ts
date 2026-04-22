import { createSupabaseAdminClient } from "@/lib/supabase-server";
import { headers } from "next/headers";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "", {
  apiVersion: "2024-11-20.acacia"
});

export async function POST(request: Request) {
  const body = await request.text();
  const signature = headers().get("stripe-signature");

  if (!signature || !process.env.STRIPE_WEBHOOK_SECRET) {
    return new Response("Webhook invalido", { status: 400 });
  }

  try {
    const event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET);

    if (
      event.type === "customer.subscription.updated" ||
      event.type === "customer.subscription.deleted"
    ) {
      const subscription = event.data.object as Stripe.Subscription;
      const isActive =
        subscription.status === "active" || subscription.status === "trialing";

      const supabase = createSupabaseAdminClient();
      await supabase
        .from("subscriptions")
        .update({ active: isActive })
        .eq("stripe_subscription_id", subscription.id);
    }

    return new Response("ok");
  } catch {
    return new Response("Assinatura invalida", { status: 400 });
  }
}
