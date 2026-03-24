"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis } from "recharts";

const data = [
  { month: "Jan", revenue: 12900 },
  { month: "Fev", revenue: 16200 },
  { month: "Mar", revenue: 17400 },
  { month: "Abr", revenue: 19800 },
  { month: "Mai", revenue: 22100 }
];

export function RevenueChart() {
  return (
    <div className="h-[280px] rounded-xl border bg-white p-4 dark:bg-slate-900">
      <p className="mb-3 text-sm font-medium">Faturamento mensal</p>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id="fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#2563eb" stopOpacity={0.8} />
              <stop offset="95%" stopColor="#2563eb" stopOpacity={0.1} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="month" />
          <Tooltip />
          <Area type="monotone" dataKey="revenue" stroke="#2563eb" fill="url(#fill)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
