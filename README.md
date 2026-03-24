# HORUS Barber SaaS

![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue?logo=typescript&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-2.49-3ECF8E?logo=supabase&logoColor=white)
![Stripe](https://img.shields.io/badge/Stripe-17-635BFF?logo=stripe&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-3.4-38BDF8?logo=tailwindcss&logoColor=white)
![License](https://img.shields.io/badge/license-MIT-green)

SaaS multi-tenant para gestao de barbearias construido com **Next.js 14 + Supabase + Stripe + WhatsApp API**.

---

## Modulos implementados

- **Multi-tenant** com isolamento por `tenant_id` e base para RLS.
- **Painel moderno** com KPIs (faturamento, agendamentos, ticket medio, clientes ativos) e grafico de faturamento mensal.
- **Pagina publica** por barbearia em `/barbearia/[slug]` para agendamento online.
- **Estrutura completa** para agendamentos, CRM, comandas, estoque, fidelidade, assinatura e relatorios.
- **Webhook Stripe** para sincronizar status de assinatura SaaS.
- **Endpoint WhatsApp** para envio de notificacoes automaticas.
- **Schema SQL completo** com tabelas principais + extras (QR check-in, avaliacoes, notificacoes internas, multi-unidades).
- **RBAC** com 4 perfis de acesso: `platform_admin`, `barbershop_owner`, `barber`, `client`.

---

## Stack de tecnologias

| Camada | Tecnologia |
|---|---|
| Frontend/BFF | Next.js 14 (App Router + API Routes) |
| Banco de dados | Supabase (PostgreSQL + RLS) |
| Autenticacao | Supabase Auth + JWT claims |
| Pagamentos | Stripe (webhooks) |
| Mensageria | WhatsApp Cloud API |
| Formularios | React Hook Form + Zod |
| UI | Tailwind CSS + Recharts |
| Deploy | Vercel |

---

## Estrutura do projeto

```
horus-barbersaas/
├── app/
│   ├── (dashboard)/dashboard/   # Painel admin
│   ├── (marketing)/             # Landing page
│   ├── api/stripe/webhook/      # Webhook Stripe
│   ├── api/whatsapp/notify/     # Notificacoes WhatsApp
│   └── barbearia/[slug]/        # Pagina publica de agendamento
├── components/dashboard/        # KpiCard, RevenueChart, Sidebar
├── lib/
│   ├── rbac.ts                  # Controle de permissoes
│   ├── supabase-client.ts       # Cliente Supabase
│   └── types.ts                 # Tipos TypeScript
├── supabase/
│   └── schema.sql               # Schema completo multi-tenant
└── middleware.ts                 # Protecao de rotas
```

---

## Setup local

### 1. Clone o repositorio

```bash
git clone https://github.com/matheusbritosc-dev/horus-barbersaas.git
cd horus-barbersaas
```

### 2. Instale as dependencias

```bash
npm install
```

### 3. Configure as variaveis de ambiente

```bash
cp .env.example .env.local
```

Edite `.env.local` com suas chaves:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
WHATSAPP_API_URL=https://...
WHATSAPP_API_TOKEN=...
```

### 4. Aplique o schema no Supabase

Acesse o **SQL Editor** do seu projeto Supabase e execute o arquivo `supabase/schema.sql`.

### 5. Rode localmente

```bash
npm run dev
```

Acesse `http://localhost:3000`.

---

## Arquitetura de producao

- **Frontend/Backend BFF:** Next.js 14 (App Router + API Routes) hospedado na Vercel.
- **Banco/Auth/Storage:** Supabase.
- **Pagamentos:** Stripe (ou Mercado Pago no mesmo padrao de webhook).
- **Mensageria:** endpoint generico para provedores de WhatsApp Cloud API.
- **Seguranca:** RLS + JWT claims com `tenant_id` e `role`.

---

## Proximos passos

- [ ] Implementar telas CRUD por modulo com React Query + Supabase.
- [ ] Aplicar politicas RLS para todas as tabelas.
- [ ] Adicionar jobs (lembrete de agendamento, aniversario, campanhas).
- [ ] Integrar upload de logo e assets no Supabase Storage.
- [ ] Evoluir observabilidade (Sentry, Logflare, metricas de API).
- [ ] Implementar autenticacao completa com Supabase Auth.

---

## Licenca

MIT License - veja o arquivo [LICENSE](LICENSE) para detalhes.
