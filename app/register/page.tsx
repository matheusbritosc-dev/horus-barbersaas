"use client";

import { createClient } from "@/lib/supabase-client";
import Link from "next/link";
import { useState } from "react";

export default function RegisterPage() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    barbershopName: "",
    phone: ""
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const supabase = createClient();

  function field(key: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm(prev => ({ ...prev, [key]: e.target.value }));
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const slug = form.barbershopName
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "");

    const { error: authError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: {
          name: form.name,
          barbershop_name: form.barbershopName,
          barbershop_slug: slug,
          phone: form.phone,
          role: "barbershop_owner"
        },
        emailRedirectTo: `${window.location.origin}/auth/callback`
      }
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
  }

  if (success) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="w-full max-w-md space-y-4 rounded-2xl border bg-white p-8 text-center shadow-sm dark:bg-slate-900">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-3xl dark:bg-green-900">
            ✓
          </div>
          <h1 className="text-xl font-bold">Cadastro realizado!</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Verifique seu e-mail para confirmar o cadastro e acessar o painel da barbearia.
          </p>
          <Link
            href="/login"
            className="inline-block rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
          >
            Ir para login
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 py-12 dark:bg-slate-950">
      <div className="w-full max-w-md space-y-6 rounded-2xl border bg-white p-8 shadow-sm dark:bg-slate-900">
        <div>
          <h1 className="text-2xl font-bold">Criar conta HORUS</h1>
          <p className="mt-1 text-sm text-slate-500">14 dias gratis, sem cartao de credito</p>
        </div>

        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Seu nome</label>
            <input
              type="text"
              value={form.name}
              onChange={field("name")}
              required
              placeholder="Joao Silva"
              className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Nome da barbearia</label>
            <input
              type="text"
              value={form.barbershopName}
              onChange={field("barbershopName")}
              required
              placeholder="Barbearia do Joao"
              className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Telefone / WhatsApp</label>
            <input
              type="tel"
              value={form.phone}
              onChange={field("phone")}
              placeholder="(11) 99999-9999"
              className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">E-mail</label>
            <input
              type="email"
              value={form.email}
              onChange={field("email")}
              required
              placeholder="voce@email.com"
              className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Senha</label>
            <input
              type="password"
              value={form.password}
              onChange={field("password")}
              required
              minLength={6}
              placeholder="Minimo 6 caracteres"
              className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950 dark:text-red-400">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-blue-600 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Criando conta..." : "Criar conta gratis"}
          </button>
        </form>

        <p className="text-center text-sm text-slate-500">
          Ja tem conta?{" "}
          <Link href="/login" className="font-medium text-blue-600 hover:underline">
            Entrar
          </Link>
        </p>
      </div>
    </main>
  );
}
