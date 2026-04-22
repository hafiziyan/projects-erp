"use client";

import React, { FormEvent, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { getActiveMerchant } from "@/lib/auth";

type MerchantUser = {
  merchantUserId: string;
  userId: string;
  name: string;
  email: string;
  userStatus: string;
  membershipStatus: string;
  role: string;
  merchantId: string;
  merchantName: string;
};

type ActiveMerchant = {
  merchantId: string;
  merchantName: string | null;
  role: string | null;
} | null;

export default function UsersPage() {
  const [merchant, setMerchant] = useState<ActiveMerchant>(null);
  const [mounted, setMounted] = useState(false);

  const [items, setItems] = useState<MerchantUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // --- STATE UNTUK MODAL ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    roleName: "Kasir",
  });

  useEffect(() => {
    setMerchant(getActiveMerchant());
    setMounted(true);
  }, []);

  async function loadUsers() {
    try {
      setLoading(true);
      setError("");

      const result = await api.get<{ success: boolean; data: MerchantUser[] }>(
        "/merchant-users",
        true
      );

      setItems(result.data || []);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Gagal memuat user merchant";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUsers();
  }, []);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();

    try {
      setSubmitting(true);
      setError("");

      await api.post(
        "/merchant-users",
        {
          name: form.name,
          email: form.email,
          password: form.password,
          roleName: form.roleName,
        },
        true
      );

      setForm({
        name: "",
        email: "",
        password: "",
        roleName: "Kasir",
      });

      setIsModalOpen(false); // Tutup modal setelah sukses
      await loadUsers();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Gagal menambah user merchant";
      setError(errorMessage);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleChangeRole(id: string, roleName: string) {
    try {
      setError("");
      await api.patch(`/merchant-users/${id}/role`, { roleName }, true);
      await loadUsers();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Gagal mengubah role";
      setError(errorMessage);
    }
  }

  async function handleDeactivate(id: string) {
    const ok = window.confirm("Nonaktifkan user ini?");
    if (!ok) return;

    try {
      setError("");
      await api.patch(`/merchant-users/${id}/deactivate`, {}, true);
      await loadUsers();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Gagal menonaktifkan user";
      setError(errorMessage);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-sm dark:border-gray-800 dark:bg-white/5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="text-left">
          <h1 className="text-2xl font-semibold text-gray-800 dark:text-white/90">
            Users & Roles
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Merchant: {mounted ? merchant?.merchantName || "-" : "-"}
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center justify-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600 transition-colors"
        >
          <span className="text-lg">+</span> Add New User
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
          {error}
        </div>
      )}

      {/* Main List Section */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-sm dark:border-gray-800 dark:bg-white/5 text-left">
        <h2 className="mb-4 text-lg font-semibold text-gray-800 dark:text-white/90">
          User Merchant List
        </h2>

        {loading ? (
          <p className="text-sm text-gray-500 dark:text-gray-400 py-10 text-center">Loading user list...</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400 py-10 text-center">
            Belum ada user merchant selain Owner.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {items.map((item) => (
              <div
                key={item.merchantUserId}
                className="rounded-xl border border-gray-200 p-4 dark:border-gray-800 hover:bg-gray-50/50 dark:hover:bg-white/5 transition-all text-left"
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-500/10 text-brand-600 font-bold uppercase">
                      {item.name.charAt(0)}
                    </div>
                    <div className="text-left">
                      <h3 className="font-semibold text-gray-800 dark:text-white/90">
                        {item.name} {item.role === "Owner" && <span className="ml-2 text-[10px] bg-brand-500 text-white px-2 py-0.5 rounded-full">OWNER</span>}
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {item.email}
                      </p>
                      <p className="text-[11px] text-gray-400 mt-1">
                        Status: <span className={item.membershipStatus === 'active' ? 'text-green-500' : 'text-red-500'}>{item.membershipStatus}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex flex-col gap-1 text-left">
                      <span className="text-[10px] font-medium text-gray-400 uppercase">Change Role</span>
                      <select
                        value={item.role}
                        onChange={(e) =>
                          handleChangeRole(item.merchantUserId, e.target.value)
                        }
                        disabled={item.role === "Owner"}
                        className="h-10 rounded-lg border border-gray-300 bg-transparent px-3 text-sm outline-none dark:border-gray-700 dark:text-white focus:border-brand-500 dark:bg-gray-900"
                      >
                        <option value="Kasir">Kasir</option>
                        <option value="Gudang">Gudang</option>
                        <option value="Owner">Owner</option>
                      </select>
                    </div>

                    {item.role !== "Owner" && item.membershipStatus === "active" && (
                      <button
                        onClick={() => handleDeactivate(item.merchantUserId)}
                        className="mt-4 md:mt-0 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-100 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300 transition-colors"
                      >
                        Deactivate
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* --- MODAL POP-UP TAMBAH USER --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-999 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-900 border dark:border-gray-800 animate-in fade-in zoom-in duration-200 text-left">
            <div className="mb-6 flex items-center justify-between border-b pb-4 dark:border-gray-800">
              <h3 className="text-xl font-bold dark:text-white">Add User Merchant</h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-3xl leading-none"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <Input
                label="Full Name"
                value={form.name}
                onChange={(v) => setForm((p) => ({ ...p, name: v }))}
                placeholder="John Doe"
                required
              />
              <Input
                label="Email Address"
                value={form.email}
                onChange={(v) => setForm((p) => ({ ...p, email: v }))}
                placeholder="john@example.com"
                type="email"
                required
              />
              <Input
                label="Password"
                type="password"
                value={form.password}
                onChange={(v) => setForm((p) => ({ ...p, password: v }))}
                placeholder="Minimal 6 karakter"
                required
              />

              <div className="text-left">
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Assigned Role
                </label>
                <select
                  value={form.roleName}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, roleName: e.target.value }))
                  }
                  className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm outline-none dark:border-gray-700 dark:text-white focus:border-brand-500 dark:bg-gray-900"
                >
                  <option value="Kasir">Kasir (Akses Penjualan)</option>
                  <option value="Gudang">Gudang (Akses Stok)</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 rounded-lg border border-gray-300 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 rounded-lg bg-brand-500 py-3 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60 transition-colors"
                >
                  {submitting ? "Processing..." : "Create Account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// --- REUSABLE INPUT COMPONENT ---
function Input({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <div className="text-left">
      <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm outline-none focus:border-brand-500 dark:border-gray-700 dark:text-white"
      />
    </div>
  );
}