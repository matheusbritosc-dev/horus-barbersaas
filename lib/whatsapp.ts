export async function sendWhatsAppMessage(phone: string, message: string): Promise<void> {
  if (!process.env.WHATSAPP_API_URL || !process.env.WHATSAPP_API_TOKEN) return;

  fetch(process.env.WHATSAPP_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.WHATSAPP_API_TOKEN}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ phone, message })
  }).catch(() => {});
}
