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

type Sale = {
  saleId: string;
  invoiceNumber: string;
  subtotal: number;
  discountAmount: number;
  totalAmount: number;
  paymentMethod: string;
  totalItems: number;
  cashier: {
    id: string;
    name: string;
    email: string;
  } | null;
  items?: {
    id: string;
    product: { name: string };
    price: number;
    quantity: number;
    subtotal: number;
  }[];
  createdAt: string;
};

type CartItem = {
  productId: string;
  productName: string;
  price: number;
  quantity: number;
  stock: number;
};

export default function SalesPage() {
  const merchant = getActiveMerchant();

  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [discountAmount, setDiscountAmount] = useState("0");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);

  // --- FUNGSI PRINT ---
  const handlePrint = () => {
    window.print();
  };

  async function loadData() {
    try {
      setLoading(true);
      setError("");

      const [productRes, salesRes] = await Promise.all([
        api.get<{ success: boolean; data: Product[] }>(
          "/master/products?status=active",
          true
        ),
        api.get<{ success: boolean; data: Sale[] }>("/sales", true),
      ]);

      const activeProducts = (productRes.data || []).filter(
        (item) => item.status === "active" && item.stock > 0
      );

      setProducts(activeProducts);
      setSales(salesRes.data || []);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Gagal memuat data penjualan";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  function addToCart(product: Product) {
    setCart((prev) => {
      const existing = prev.find((item) => item.productId === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) return prev;
        return prev.map((item) =>
          item.productId === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }

      return [
        ...prev,
        {
          productId: product.id,
          productName: product.name,
          price: product.price,
          quantity: 1,
          stock: product.stock,
        },
      ];
    });
  }

  function updateQty(productId: string, type: "plus" | "minus") {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.productId !== productId) return item;

          if (type === "plus" && item.quantity < item.stock) {
            return { ...item, quantity: item.quantity + 1 };
          }

          if (type === "minus") {
            return { ...item, quantity: item.quantity - 1 };
          }

          return item;
        })
        .filter((item) => item.quantity > 0)
    );
  }

  async function handleCreateSale(e: FormEvent) {
    e.preventDefault();
    if (cart.length === 0) {
      setError("Keranjang masih kosong");
      return;
    }

    try {
      setSubmitting(true);
      setError("");

      await api.post(
        "/sales",
        {
          paymentMethod,
          discountAmount: Number(discountAmount),
          items: cart.map((item) => ({
            productId: Number(item.productId),
            quantity: item.quantity,
          })),
        },
        true
      );

      setCart([]);
      setPaymentMethod("cash");
      setDiscountAmount("0");
      await loadData();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Gagal membuat transaksi penjualan";
      setError(errorMessage);
    } finally {
      setSubmitting(false);
    }
  }

  const filteredProducts = products.filter((item) =>
    item.name.toLowerCase().includes(search.toLowerCase())
  );

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const total = subtotal - Number(discountAmount || 0);

  return (
    <div className="space-y-6">
      {/* CSS PRINT */}
      <style jsx global>{`
        @media print {
          body * { visibility: hidden; }
          #print-area, #print-area * { visibility: visible; }
          #print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            max-width: 80mm;
            background: white;
            color: black !important;
          }
          .no-print { display: none !important; }
        }
      `}</style>

      {/* Header */}
      <div className="no-print rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-sm dark:border-gray-800 dark:bg-white/5">
        <h1 className="text-2xl font-semibold text-gray-800 dark:text-white/90">
          Sales / POS
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Merchant: {merchant?.merchantName || "-"}
        </p>
      </div>

      {error && (
        <div className="no-print rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
          {error}
        </div>
      )}

      {/* POS Grid */}
      <div className="no-print grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-sm dark:border-gray-800 dark:bg-white/5 xl:col-span-2 h-fit">
          <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">
              Available Products
            </h2>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search product..."
              className="h-10 rounded-lg border border-gray-300 bg-transparent px-3 text-sm outline-none focus:border-brand-500 dark:border-gray-700 dark:text-white"
            />
          </div>

          {/* PERBAIKAN: Menggunakan variabel loading di sini */}
          {loading ? (
            <div className="py-10 text-center text-sm text-gray-500 animate-pulse">
              Memuat daftar produk...
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="py-10 text-center text-sm text-gray-500">
              Tidak ada produk tersedia.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {filteredProducts.map((item) => (
                <div key={item.id} className="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
                  <h3 className="font-semibold text-gray-800 dark:text-white/90">{item.name}</h3>
                  <div className="mt-1 flex justify-between items-center">
                    <p className="text-sm text-gray-500">Rp {item.price.toLocaleString("id-ID")}</p>
                    <p className="text-xs text-gray-400 italic">Stok: {item.stock}</p>
                  </div>
                  <button
                    onClick={() => addToCart(item)}
                    className="mt-4 w-full rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 transition-colors"
                  >
                    Add to Cart
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Cart */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-sm dark:border-gray-800 dark:bg-white/5 h-fit text-left">
          <h2 className="mb-4 text-lg font-semibold dark:text-white">Cart</h2>
          <form onSubmit={handleCreateSale} className="space-y-4">
            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
              {cart.map((item) => (
                <div key={item.productId} className="rounded-xl border border-gray-200 p-3 dark:border-gray-800 text-left">
                  <p className="font-medium dark:text-white">{item.productName}</p>
                  <div className="mt-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => updateQty(item.productId, "minus")} className="h-8 w-8 border rounded dark:text-white">-</button>
                      <span className="min-w-6 text-center text-sm dark:text-white">{item.quantity}</span>
                      <button type="button" onClick={() => updateQty(item.productId, "plus")} className="h-8 w-8 border rounded dark:text-white">+</button>
                    </div>
                    <p className="text-sm font-semibold dark:text-white">Rp {(item.price * item.quantity).toLocaleString("id-ID")}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-4 space-y-4 border-t dark:border-gray-800 text-left">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500">Payment Method</label>
                <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="w-full rounded-lg border p-2 text-sm dark:bg-gray-900 dark:text-white">
                  <option value="cash">Cash</option>
                  <option value="qris">QRIS</option>
                  <option value="transfer">Transfer</option>
                </select>
              </div>
              <div className="rounded-xl bg-gray-50 p-4 dark:bg-white/5 space-y-2">
                <div className="flex justify-between text-sm"><span>Subtotal</span><span>Rp {subtotal.toLocaleString()}</span></div>
                <div className="flex justify-between font-bold text-lg dark:text-white"><span>Total</span><span className="text-brand-500">Rp {Math.max(total, 0).toLocaleString()}</span></div>
              </div>
              <button type="submit" disabled={submitting || cart.length === 0} className="w-full rounded-lg bg-brand-500 py-3 text-white font-bold">
                {submitting ? "Processing..." : "Create Sale"}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* History */}
      <div className="no-print rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-sm dark:border-gray-800 dark:bg-white/5">
        <h2 className="mb-4 text-lg font-semibold dark:text-white">Sales History</h2>
        {/* Menggunakan loading juga di sini agar konsisten */}
        {loading ? (
           <p className="py-5 text-center text-sm text-gray-500">Memuat riwayat...</p>
        ) : (
          <div className="space-y-3">
            {sales.map((sale) => (
              <div key={sale.saleId} onClick={() => setSelectedSale(sale)} className="rounded-xl border border-gray-200 p-4 hover:bg-gray-50 dark:hover:bg-white/5 cursor-pointer">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-bold dark:text-white">{sale.invoiceNumber}</p>
                    <p className="text-xs text-gray-500">Cashier: {sale.cashier?.name || "-"}</p>
                  </div>
                  <p className="font-bold text-brand-500">Rp {sale.totalAmount.toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal Detail + Print Area */}
      {selectedSale && (
        <div className="fixed inset-0 z-999 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 text-left">
          <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-900 border dark:border-gray-800 flex flex-col text-left">
            
            {/* PRINT AREA */}
            <div id="print-area" className="hidden print:block p-4">
              <div className="text-center border-b border-dashed pb-2 mb-4">
                <h2 className="text-lg font-bold">{merchant?.merchantName || "Receipt"}</h2>
                <p className="text-[10px]">{selectedSale.invoiceNumber}</p>
              </div>
              <div className="space-y-1 mb-4">
                {selectedSale.items?.map((item, idx) => (
                  <div key={idx} className="text-[10px] flex justify-between">
                    <span>{item.product?.name} ({item.quantity}x)</span>
                    <span>{item.subtotal.toLocaleString()}</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-dashed pt-2 text-[10px] font-bold flex justify-between">
                <span>TOTAL</span><span>Rp {selectedSale.totalAmount.toLocaleString()}</span>
              </div>
            </div>

            {/* UI MODAL */}
            <div className="no-print flex-1 flex flex-col text-left">
              <div className="flex justify-between border-b pb-3 items-center">
                <h3 className="text-xl font-bold dark:text-white">Sale Detail</h3>
                <button onClick={() => setSelectedSale(null)} className="text-2xl text-gray-400">&times;</button>
              </div>
              <div className="py-4 space-y-4 overflow-y-auto text-left">
                <div className="text-sm bg-gray-50 p-3 rounded-xl dark:bg-white/5">
                  <p>Invoice: <span className="font-mono">{selectedSale.invoiceNumber}</span></p>
                  <p>Cashier: {selectedSale.cashier?.name || "-"}</p>
                </div>
                <div className="rounded-xl border overflow-hidden dark:border-gray-800">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 dark:bg-gray-800">
                      <tr><th className="p-3">Product</th><th className="p-3 text-center">Qty</th><th className="p-3 text-right">Total</th></tr>
                    </thead>
                    <tbody className="divide-y dark:divide-gray-800">
                      {selectedSale.items?.map((item, idx) => (
                        <tr key={idx} className="dark:text-gray-300">
                          <td className="p-3">{item.product?.name}</td>
                          <td className="p-3 text-center">{item.quantity}</td>
                          <td className="p-3 text-right">Rp {item.subtotal.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="mt-6 flex gap-3">
                <button onClick={handlePrint} className="flex-1 bg-brand-500 text-white py-3 rounded-xl font-bold">Print Receipt</button>
                <button onClick={() => setSelectedSale(null)} className="flex-1 bg-gray-100 py-3 rounded-xl font-bold dark:bg-gray-800 dark:text-white">Close</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}