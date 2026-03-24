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

    if (event.type === "customer.subscription.updated") {
      // TODO: atualizar tabela subscriptions com status ativo/inativo da barbearia
    }

    return new Response("ok");
  } catch {
    return new Response("Assinatura invalida", { status: 400 });
  }
}
