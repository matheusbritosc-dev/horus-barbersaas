"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, AlertTriangle, X, Package } from "lucide-react";
import { createClient } from "@/lib/supabase-client";
import { z } from "zod";
import { format } from "date-fns";

// ─── Types ────────────────────────────────────────────────────────────────────

type Product = {
  id: string;
  name: string;
  sku: string | null;
  sale_price: number;
  cost_price: number | null;
  min_stock: number;
  active: boolean;
  current_stock: number;
};

type Movement = {
  id: string;
  movement_type: string;
  quantity: number;
  reason: string | null;
  created_at: string;
  products: { name: string } | null;
};

// ─── Schema ───────────────────────────────────────────────────────────────────

const productSchema = z.object({
  name: z.string().min(1, "Nome obrigatorio"),
  sku: z.string().optional(),
  sale_price: z.number().min(0.01, "Preco invalido"),
  cost_price: z.number().min(0).optional(),
  min_stock: z.number().int().min(0),
});

const movementSchema = z.object({
  product_id: z.string().uuid("Selecione um produto"),
  movement_type: z.enum(["in", "out", "adjustment"]),
  quantity: z.number().int().min(1, "Quantidade invalida"),
  reason: z.string().optional(),
});

type ProductInput = z.infer<typeof productSchema>;
type MovementInput = z.infer<typeof movementSchema>;

// ─── Hooks ────────────────────────────────────────────────────────────────────

function useProducts() {
  const supabase = createClient();
  return useQuery<Product[]>({
    queryKey: ["products"],
    queryFn: async () => {
      const { data: products, error } = await supabase
        .from("products")
        .select("id, name, sku, sale_price, cost_price, min_stock, active")
        .eq("active", true)
        .order("name");
      if (error) throw error;

      const { data: inv } = await supabase
        .from("inventory")
        .select("product_id, movement_type, quantity");

      const stockMap: Record<string, number> = {};
      (inv ?? []).forEach((i) => {
        if (!stockMap[i.product_id]) stockMap[i.product_id] = 0;
        if (i.movement_type === "in") stockMap[i.product_id] += i.quantity;
        else if (i.movement_type === "out") stockMap[i.product_id] -= i.quantity;
        else stockMap[i.product_id] = i.quantity;
      });

      return (products ?? []).map((p) => ({ ...p, current_stock: stockMap[p.id] ?? 0 }));
    },
  });
}

function useMovements() {
  const supabase = createClient();
  return useQuery<Movement[]>({
    queryKey: ["inventory-movements"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inventory")
        .select("id, movement_type, quantity, reason, created_at, products(name)")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data as unknown as Movement[]) ?? [];
    },
  });
}

function useCreateProduct() {
  const qc = useQueryClient();
  const supabase = createClient();
  return useMutation({
    mutationFn: async (input: ProductInput) => {
      const { error } = await supabase
        .from("products")
        .insert({ ...input, cost_price: input.cost_price ?? null });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["products"] }),
  });
}

function useAddMovement() {
  const qc = useQueryClient();
  const supabase = createClient();
  return useMutation({
    mutationFn: async (input: MovementInput) => {
      const { error } = await supabase.from("inventory").insert(input);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["inventory-movements"] });
    },
  });
}

// ─── Shared ───────────────────────────────────────────────────────────────────

const inputCls = (err = false) =>
  `w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:border-slate-700 ${
    err ? "border-red-500" : ""
  }`;
const btnPrimary =
  "rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors";
const btnSecondary =
  "rounded-lg border px-4 py-2 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors";

const MOVEMENT_LABELS: Record<string, { label: string; cls: string; sign: string }> = {
  in: { label: "Entrada", cls: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400", sign: "+" },
  out: { label: "Saida", cls: "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400", sign: "-" },
  adjustment: { label: "Ajuste", cls: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400", sign: "=" },
};

// ─── Modal ────────────────────────────────────────────────────────────────────

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl bg-white shadow-xl dark:bg-slate-900">
        <div className="flex items-center justify-between border-b px-5 py-4 dark:border-slate-800">
          <h2 className="font-semibold">{title}</h2>
          <button onClick={onClose} className="rounded p-1 hover:bg-slate-100 dark:hover:bg-slate-800">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

// ─── Product Form ─────────────────────────────────────────────────────────────

function ProductForm({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState<{ name: string; sku: string; sale_price: string; cost_price: string; min_stock: string }>({
    name: "",
    sku: "",
    sale_price: "",
    cost_price: "",
    min_stock: "5",
  });
  const [errors, setErrors] = useState<Partial<Record<keyof ProductInput, string>>>({});
  const mutation = useCreateProduct();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const result = productSchema.safeParse({
      name: form.name,
      sku: form.sku || undefined,
      sale_price: parseFloat(form.sale_price),
      cost_price: form.cost_price ? parseFloat(form.cost_price) : undefined,
      min_stock: parseInt(form.min_stock),
    });
    if (!result.success) {
      const errs: typeof errors = {};
      result.error.issues.forEach((i) => {
        errs[i.path[0] as keyof ProductInput] = i.message;
      });
      setErrors(errs);
      return;
    }
    try {
      await mutation.mutateAsync(result.data);
      onClose();
    } catch {
      setErrors({ name: "Erro ao salvar produto." });
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1">
        <label className="text-sm font-medium">Nome *</label>
        <input
          className={inputCls(!!errors.name)}
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
        />
        {errors.name && <p className="text-xs text-red-500">{errors.name}</p>}
      </div>
      <div className="space-y-1">
        <label className="text-sm font-medium">SKU</label>
        <input
          className={inputCls()}
          value={form.sku}
          onChange={(e) => setForm((f) => ({ ...f, sku: e.target.value }))}
          placeholder="Ex: PROD-001"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-sm font-medium">Preco de venda *</label>
          <input
            type="number"
            min="0"
            step="0.01"
            className={inputCls(!!errors.sale_price)}
            value={form.sale_price}
            onChange={(e) => setForm((f) => ({ ...f, sale_price: e.target.value }))}
          />
          {errors.sale_price && <p className="text-xs text-red-500">{errors.sale_price}</p>}
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">Custo</label>
          <input
            type="number"
            min="0"
            step="0.01"
            className={inputCls()}
            value={form.cost_price}
            onChange={(e) => setForm((f) => ({ ...f, cost_price: e.target.value }))}
          />
        </div>
      </div>
      <div className="space-y-1">
        <label className="text-sm font-medium">Estoque minimo</label>
        <input
          type="number"
          min="0"
          className={inputCls()}
          value={form.min_stock}
          onChange={(e) => setForm((f) => ({ ...f, min_stock: e.target.value }))}
        />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={onClose} className={btnSecondary}>
          Cancelar
        </button>
        <button type="submit" disabled={mutation.isPending} className={btnPrimary}>
          {mutation.isPending ? "Salvando..." : "Salvar"}
        </button>
      </div>
    </form>
  );
}

// ─── Movement Form ────────────────────────────────────────────────────────────

function MovementForm({
  products,
  preselectedProductId,
  onClose,
}: {
  products: Product[];
  preselectedProductId?: string;
  onClose: () => void;
}) {
  const [form, setForm] = useState<Partial<MovementInput>>({
    product_id: preselectedProductId ?? "",
    movement_type: "in",
    quantity: 1,
    reason: "",
  });
  const [errors, setErrors] = useState<Partial<Record<keyof MovementInput, string>>>({});
  const mutation = useAddMovement();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const result = movementSchema.safeParse({
      ...form,
      quantity: Number(form.quantity),
    });
    if (!result.success) {
      const errs: typeof errors = {};
      result.error.issues.forEach((i) => {
        errs[i.path[0] as keyof MovementInput] = i.message;
      });
      setErrors(errs);
      return;
    }
    try {
      await mutation.mutateAsync(result.data);
      onClose();
    } catch {
      setErrors({ product_id: "Erro ao registrar movimentacao." });
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1">
        <label className="text-sm font-medium">Produto *</label>
        <select
          className={inputCls(!!errors.product_id)}
          value={form.product_id}
          onChange={(e) => setForm((f) => ({ ...f, product_id: e.target.value }))}
        >
          <option value="">Selecione...</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} (estoque: {p.current_stock})
            </option>
          ))}
        </select>
        {errors.product_id && <p className="text-xs text-red-500">{errors.product_id}</p>}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-sm font-medium">Tipo</label>
          <select
            className={inputCls()}
            value={form.movement_type}
            onChange={(e) =>
              setForm((f) => ({ ...f, movement_type: e.target.value as MovementInput["movement_type"] }))
            }
          >
            <option value="in">Entrada</option>
            <option value="out">Saida</option>
            <option value="adjustment">Ajuste</option>
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">Quantidade *</label>
          <input
            type="number"
            min="1"
            className={inputCls(!!errors.quantity)}
            value={form.quantity}
            onChange={(e) => setForm((f) => ({ ...f, quantity: parseInt(e.target.value) }))}
          />
          {errors.quantity && <p className="text-xs text-red-500">{errors.quantity}</p>}
        </div>
      </div>
      <div className="space-y-1">
        <label className="text-sm font-medium">Motivo</label>
        <input
          className={inputCls()}
          value={form.reason}
          onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
          placeholder="Ex: Compra de fornecedor, venda avulsa..."
        />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={onClose} className={btnSecondary}>
          Cancelar
        </button>
        <button type="submit" disabled={mutation.isPending} className={btnPrimary}>
          {mutation.isPending ? "Salvando..." : "Registrar"}
        </button>
      </div>
    </form>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function EstoquePage() {
  const { data: products = [], isLoading } = useProducts();
  const { data: movements = [] } = useMovements();
  const [tab, setTab] = useState<"products" | "movements">("products");
  const [addingProduct, setAddingProduct] = useState(false);
  const [addingMovement, setAddingMovement] = useState<string | undefined>();

  const lowStock = products.filter((p) => p.current_stock <= p.min_stock);

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Estoque</h1>
          <p className="text-sm text-slate-500">
            {products.length} produtos · {lowStock.length} com estoque baixo
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setAddingMovement("")}
            className={`rounded-lg border px-4 py-2 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center gap-2`}
          >
            <Plus className="h-4 w-4" />
            Movimentacao
          </button>
          <button
            onClick={() => setAddingProduct(true)}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <Package className="h-4 w-4" />
            Novo produto
          </button>
        </div>
      </div>

      {lowStock.length > 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-900/30 dark:bg-yellow-900/10">
          <AlertTriangle className="mt-0.5 h-5 w-5 text-yellow-600 shrink-0" />
          <div>
            <p className="text-sm font-medium text-yellow-800 dark:text-yellow-400">
              {lowStock.length} produto(s) com estoque abaixo do minimo
            </p>
            <p className="mt-0.5 text-xs text-yellow-700 dark:text-yellow-500">
              {lowStock.map((p) => p.name).join(", ")}
            </p>
          </div>
        </div>
      )}

      <div className="flex gap-1 border-b dark:border-slate-800">
        {(["products", "movements"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === t
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            {t === "products" ? "Produtos" : "Movimentacoes"}
          </button>
        ))}
      </div>

      {tab === "products" && (
        <div className="overflow-hidden rounded-xl border dark:border-slate-800">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-400">Produto</th>
                <th className="hidden px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-400 md:table-cell">SKU</th>
                <th className="px-4 py-3 text-right font-medium text-slate-600 dark:text-slate-400">Estoque</th>
                <th className="hidden px-4 py-3 text-right font-medium text-slate-600 dark:text-slate-400 lg:table-cell">Preco</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y dark:divide-slate-800">
              {isLoading && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                    Carregando...
                  </td>
                </tr>
              )}
              {!isLoading && products.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                    Nenhum produto cadastrado.
                  </td>
                </tr>
              )}
              {products.map((p) => {
                const isLow = p.current_stock <= p.min_stock;
                return (
                  <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                    <td className="px-4 py-3">
                      <p className="font-medium">{p.name}</p>
                      {isLow && (
                        <p className="text-xs text-yellow-600 dark:text-yellow-400">
                          Estoque baixo (min: {p.min_stock})
                        </p>
                      )}
                    </td>
                    <td className="hidden px-4 py-3 text-slate-500 md:table-cell">
                      {p.sku ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          isLow
                            ? "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"
                            : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                        }`}
                      >
                        {p.current_stock}
                      </span>
                    </td>
                    <td className="hidden px-4 py-3 text-right text-slate-600 dark:text-slate-400 lg:table-cell">
                      R$ {p.sale_price.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setAddingMovement(p.id)}
                        className="rounded-lg border px-2.5 py-1 text-xs hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                      >
                        Movimentar
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {tab === "movements" && (
        <div className="overflow-hidden rounded-xl border dark:border-slate-800">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-400">Data</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-400">Produto</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-400">Tipo</th>
                <th className="px-4 py-3 text-right font-medium text-slate-600 dark:text-slate-400">Qtd</th>
                <th className="hidden px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-400 md:table-cell">Motivo</th>
              </tr>
            </thead>
            <tbody className="divide-y dark:divide-slate-800">
              {movements.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                    Nenhuma movimentacao registrada.
                  </td>
                </tr>
              )}
              {movements.map((m) => {
                const mt = MOVEMENT_LABELS[m.movement_type];
                return (
                  <tr key={m.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                      {format(new Date(m.created_at), "dd/MM/yyyy")}
                    </td>
                    <td className="px-4 py-3 font-medium">{m.products?.name ?? "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${mt?.cls}`}>
                        {mt?.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-medium">
                      {mt?.sign}
                      {m.quantity}
                    </td>
                    <td className="hidden px-4 py-3 text-slate-500 md:table-cell">
                      {m.reason ?? "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {addingProduct && (
        <Modal title="Novo produto" onClose={() => setAddingProduct(false)}>
          <ProductForm onClose={() => setAddingProduct(false)} />
        </Modal>
      )}

      {addingMovement !== undefined && (
        <Modal title="Registrar movimentacao" onClose={() => setAddingMovement(undefined)}>
          <MovementForm
            products={products}
            preselectedProductId={addingMovement || undefined}
            onClose={() => setAddingMovement(undefined)}
          />
        </Modal>
      )}
    </section>
  );
}
