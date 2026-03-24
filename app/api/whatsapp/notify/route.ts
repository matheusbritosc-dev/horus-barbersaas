import { z } from "zod";

const schema = z.object({
  phone: z.string().min(8),
  message: z.string().min(3)
});

export async function POST(request: Request) {
  const payload = schema.safeParse(await request.json());

  if (!payload.success) {
    return Response.json({ error: payload.error.flatten() }, { status: 400 });
  }

  const response = await fetch(process.env.WHATSAPP_API_URL ?? "", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.WHATSAPP_API_TOKEN}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload.data)
  });

  if (!response.ok) {
    return Response.json({ error: "Falha ao enviar WhatsApp" }, { status: 502 });
  }

  return Response.json({ success: true });
}
