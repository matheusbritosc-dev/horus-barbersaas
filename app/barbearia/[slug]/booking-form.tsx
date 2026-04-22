"use client";

import { useState } from "react";

interface Service {
  id: string;
  name: string;
  duration_minutes: number;
  price: number;
}

interface Barber {
  id: string;
  name: string;
}

interface Props {
  slug: string;
  services: Service[];
  barbers: Barber[];
}

const TIME_SLOTS = Array.from({ length: 22 }, (_, i) => {
  const hour = Math.floor(i / 2) + 8;
  const min = i % 2 === 0 ? "00" : "30";
  return `${String(hour).padStart(2, "0")}:${min}`;
});

export function BookingForm({ slug, services, barbers }: Props) {
  const [step, setStep] = useState(1);
  const [serviceId, setServiceId] = useState("");
  const [barberId, setBarberId] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const selectedService = services.find(s => s.id === serviceId);
  const selectedBarber = barbers.find(b => b.id === barberId);
  const today = new Date().toISOString().split("T")[0];

  const fmt = (v: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

  function reset() {
    setStep(1);
    setServiceId("");
    setBarberId("");
    setDate("");
    setTime("");
    setClientName("");
    setClientPhone("");
    setError("");
    setSuccess(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/booking", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        slug,
        service_id: serviceId,
        barber_id: barberId || undefined,
        date,
        time,
        client_name: clientName,
        client_phone: clientPhone
      })
    });

    if (!res.ok) {
      const json = await res.json();
      setError(typeof json.error === "string" ? json.error : "Erro ao realizar agendamento");
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
  }

  if (!services.length) {
    return (
      <div className="rounded-xl border border-dashed p-10 text-center text-slate-500">
        Esta barbearia ainda nao possui servicos disponiveis para agendamento online.
      </div>
    );
  }

  if (success) {
    return (
      <div className="rounded-xl border bg-green-50 p-10 text-center dark:bg-green-950">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-200 text-3xl dark:bg-green-800">
          ✓
        </div>
        <h2 className="text-xl font-bold text-green-800 dark:text-green-200">
          Agendamento confirmado!
        </h2>
        <p className="mt-2 text-green-700 dark:text-green-300">
          {clientName}, seu horario das {time} no dia {date.split("-").reverse().join("/")} foi
          confirmado.
        </p>
        {selectedService && (
          <p className="mt-1 text-sm text-green-600 dark:text-green-400">
            {selectedService.name} — {fmt(selectedService.price)}
          </p>
        )}
        <button onClick={reset} className="mt-6 text-sm text-green-700 underline dark:text-green-400">
          Fazer novo agendamento
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Step progress */}
      <div className="flex gap-2">
        {[1, 2, 3].map(s => (
          <div
            key={s}
            className={`h-1.5 flex-1 rounded-full transition-colors ${
              s <= step ? "bg-blue-600" : "bg-slate-200"
            }`}
          />
        ))}
      </div>

      {/* Step 1: Service */}
      {step === 1 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">1. Escolha o servico</h2>
          <div className="grid gap-3">
            {services.map(service => (
              <button
                key={service.id}
                type="button"
                onClick={() => setServiceId(service.id)}
                className={`rounded-xl border p-4 text-left transition-colors ${
                  serviceId === service.id
                    ? "border-blue-600 bg-blue-50 dark:bg-blue-950"
                    : "hover:bg-slate-50 dark:hover:bg-slate-800"
                }`}
              >
                <div className="flex items-center justify-between">
                  <p className="font-medium">{service.name}</p>
                  <p className="font-semibold text-blue-600">{fmt(service.price)}</p>
                </div>
                <p className="text-sm text-slate-500">{service.duration_minutes} minutos</p>
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setStep(2)}
            disabled={!serviceId}
            className="w-full rounded-lg bg-blue-600 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-40"
          >
            Continuar
          </button>
        </div>
      )}

      {/* Step 2: Barber + Date + Time */}
      {step === 2 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">2. Barbeiro e horario</h2>

          {barbers.length > 0 && (
            <div>
              <label className="mb-1 block text-sm font-medium">Barbeiro</label>
              <select
                value={barberId}
                onChange={e => setBarberId(e.target.value)}
                className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Sem preferencia</option>
                {barbers.map(b => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium">Data</label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              min={today}
              required
              className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">Horario</label>
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
              {TIME_SLOTS.map(slot => (
                <button
                  key={slot}
                  type="button"
                  onClick={() => setTime(slot)}
                  className={`rounded-lg border py-2 text-sm transition-colors ${
                    time === slot
                      ? "border-blue-600 bg-blue-600 text-white"
                      : "hover:bg-slate-50 dark:hover:bg-slate-800"
                  }`}
                >
                  {slot}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="flex-1 rounded-lg border py-2.5 text-sm font-medium"
            >
              Voltar
            </button>
            <button
              type="button"
              onClick={() => setStep(3)}
              disabled={!date || !time}
              className="flex-1 rounded-lg bg-blue-600 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-40"
            >
              Continuar
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Client info + confirm */}
      {step === 3 && (
        <form onSubmit={handleSubmit} className="space-y-4">
          <h2 className="text-lg font-semibold">3. Seus dados</h2>

          <div className="rounded-xl bg-slate-50 p-4 text-sm dark:bg-slate-800">
            <p>
              <span className="text-slate-500">Servico: </span>
              <span className="font-medium">{selectedService?.name}</span>
            </p>
            {selectedBarber && (
              <p>
                <span className="text-slate-500">Barbeiro: </span>
                <span className="font-medium">{selectedBarber.name}</span>
              </p>
            )}
            <p>
              <span className="text-slate-500">Data: </span>
              <span className="font-medium">{date.split("-").reverse().join("/")}</span>
            </p>
            <p>
              <span className="text-slate-500">Horario: </span>
              <span className="font-medium">{time}</span>
            </p>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Seu nome</label>
            <input
              type="text"
              value={clientName}
              onChange={e => setClientName(e.target.value)}
              required
              placeholder="Joao Silva"
              className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Telefone / WhatsApp</label>
            <input
              type="tel"
              value={clientPhone}
              onChange={e => setClientPhone(e.target.value)}
              required
              placeholder="(11) 99999-9999"
              className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950 dark:text-red-400">
              {error}
            </p>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="flex-1 rounded-lg border py-2.5 text-sm font-medium"
            >
              Voltar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 rounded-lg bg-blue-600 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-40"
            >
              {loading ? "Agendando..." : "Confirmar agendamento"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
