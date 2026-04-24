"use client";

import React, { FormEvent, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { getActiveMerchant } from "@/lib/auth";

type Product = {
  id: string;
  name: string;
  price: number;
  stock: number;
  status: string;
};

type Purchase = {
  purchaseId: string;
  invoiceNumber: string;
  totalAmount: number;
  totalItems: number;
  user: {
    id: string;
    name: string;
    email: string;
  } | null;
  createdAt: string;
};

type PurchaseItemForm = {
  productId: string;
  quantity: string;
  cost: string;
};

type ActiveMerchant = {
  merchantId: string;
  merchantName: string | null;
  role: string | null;
} | null;

export default function PurchasesPage() {
  const [merchant, setMerchant] = useState<ActiveMerchant>(null);
  const [mounted, setMounted] = useState(false);

  const [products, setProducts] = useState<Product[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [items, setItems] = useState<PurchaseItemForm[]>([
    { productId: "", quantity: "", cost: "" },
  ]);
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setMerchant(getActiveMerchant());
    setMounted(true);
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      setError("");

      const [productRes, purchaseRes] = await Promise.all([
        api.get<{ success: boolean; data: Product[] }>("/master/products", true),
        api.get<{ success: boolean; data: Purchase[] }>("/purchases", true),
      ]);

      setProducts(productRes.data || []);
      setPurchases(purchaseRes.data || []);
    } catch (err: any) {
      setError(err.message || "Gagal memuat data purchase");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  function addItemRow() {
    setItems((prev) => [...prev, { productId: "", quantity: "", cost: "" }]);
  }

  function removeItemRow(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  function updateItem(index: number, field: keyof PurchaseItemForm, value: string) {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault();

    try {
      setSubmitting(true);
      setError("");

      await api.post(
        "/purchases",
        {
          invoiceNumber: invoiceNumber || undefined,
          items: items.map((item) => ({
            productId: Number(item.productId),
            quantity: Number(item.quantity),
            cost: Number(item.cost),
          })),
        },
        true
      );

      setInvoiceNumber("");
      setItems([{ productId: "", quantity: "", cost: "" }]);
      await loadData();
    } catch (err: any) {
      setError(err.message || "Gagal membuat purchase");
    } finally {
      setSubmitting(false);
    }
  }

  const totalAmount = items.reduce(
    (sum, item) => sum + Number(item.quantity || 0) * Number(item.cost || 0),
    0
  );

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-sm dark:border-gray-800 dark:bg-white/5">
        <h1 className="text-2xl font-semibold text-gray-800 dark:text-white/90">
          Purchases
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Merchant: {mounted ? merchant?.merchantName || "-" : "-"}
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-sm dark:border-gray-800 dark:bg-white/5 xl:col-span-1">
          <h2 className="mb-4 text-lg font-semibold text-gray-800 dark:text-white/90">
            Create Purchase
          </h2>

          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Invoice Number
              </label>
              <input
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                placeholder="Optional"
                className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm outline-none dark:border-gray-700"
              />
            </div>

            <div className="space-y-3">
              {items.map((item, index) => (
                <div
                  key={index}
                  className="rounded-xl border border-gray-200 p-3 dark:border-gray-800"
                >
                  <div className="space-y-3">
                    <select
                      value={item.productId}
                      onChange={(e) => updateItem(index, "productId", e.target.value)}
                      className="h-10 w-full rounded-lg border border-gray-300 bg-transparent px-3 text-sm outline-none dark:border-gray-700"
                    >
                      <option value="">Select Product</option>
                      {products.map((product) => (
                        <option key={product.id} value={product.id}>
                          {product.name}
                        </option>
                      ))}
                    </select>

                    <input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => updateItem(index, "quantity", e.target.value)}
                      placeholder="Quantity"
                      className="h-10 w-full rounded-lg border border-gray-300 bg-transparent px-3 text-sm outline-none dark:border-gray-700"
                    />

                    <input
                      type="number"
                      value={item.cost}
                      onChange={(e) => updateItem(index, "cost", e.target.value)}
                      placeholder="Cost"
                      className="h-10 w-full rounded-lg border border-gray-300 bg-transparent px-3 text-sm outline-none dark:border-gray-700"
                    />

                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeItemRow(index)}
                        className="w-full rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white"
                      >
                        Remove Item
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={addItemRow}
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm font-medium dark:border-gray-700"
            >
              Add Item Row
            </button>

            <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
              <div className="flex items-center justify-between font-semibold">
                <span>Total</span>
                <span>Rp {totalAmount.toLocaleString("id-ID")}</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-lg bg-brand-500 px-4 py-3 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-60"
            >
              {submitting ? "Saving..." : "Create Purchase"}
            </button>
          </form>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-sm dark:border-gray-800 dark:bg-white/5 xl:col-span-2">
          <h2 className="mb-4 text-lg font-semibold text-gray-800 dark:text-white/90">
            Purchase History
          </h2>

          {loading ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">Loading...</p>
          ) : purchases.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Belum ada data purchase.
            </p>
          ) : (
            <div className="space-y-3">
              {purchases.map((purchase) => (
                <div
                  key={purchase.purchaseId}
                  className="rounded-xl border border-gray-200 p-4 dark:border-gray-800"
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-800 dark:text-white/90">
                        {purchase.invoiceNumber || "-"}
                      </h3>
                      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        User: {purchase.user?.name || "-"} • Items: {purchase.totalItems}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="font-semibold text-gray-800 dark:text-white/90">
                        Rp {purchase.totalAmount.toLocaleString("id-ID")}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {new Date(purchase.createdAt).toLocaleString("id-ID")}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}