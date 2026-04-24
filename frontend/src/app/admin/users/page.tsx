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
    } catch (err: any) {
      setError(err.message || "Gagal memuat user merchant");
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

      await loadUsers();
    } catch (err: any) {
      setError(err.message || "Gagal menambah user merchant");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleChangeRole(id: string, roleName: string) {
    try {
      setError("");
      await api.patch(`/merchant-users/${id}/role`, { roleName }, true);
      await loadUsers();
    } catch (err: any) {
      setError(err.message || "Gagal mengubah role");
    }
  }

  async function handleDeactivate(id: string) {
    const ok = window.confirm("Nonaktifkan user ini?");
    if (!ok) return;

    try {
      setError("");
      await api.patch(`/merchant-users/${id}/deactivate`, {}, true);
      await loadUsers();
    } catch (err: any) {
      setError(err.message || "Gagal menonaktifkan user");
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-sm dark:border-gray-800 dark:bg-white/5">
        <h1 className="text-2xl font-semibold text-gray-800 dark:text-white/90">
          Users & Roles
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Merchant: {mounted ? merchant?.merchantName || "-" : "-"}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-sm dark:border-gray-800 dark:bg-white/5 xl:col-span-1">
          <h2 className="mb-4 text-lg font-semibold text-gray-800 dark:text-white/90">
            Add User Merchant
          </h2>

          <form onSubmit={handleCreate} className="space-y-4">
            <Input
              label="Name"
              value={form.name}
              onChange={(v) => setForm((p) => ({ ...p, name: v }))}
              placeholder="Nama user"
            />
            <Input
              label="Email"
              value={form.email}
              onChange={(v) => setForm((p) => ({ ...p, email: v }))}
              placeholder="email@mail.com"
            />
            <Input
              label="Password"
              type="password"
              value={form.password}
              onChange={(v) => setForm((p) => ({ ...p, password: v }))}
              placeholder="******"
            />

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Role
              </label>
              <select
                value={form.roleName}
                onChange={(e) =>
                  setForm((p) => ({ ...p, roleName: e.target.value }))
                }
                className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm outline-none dark:border-gray-700"
              >
                <option value="Kasir">Kasir</option>
                <option value="Gudang">Gudang</option>
              </select>
            </div>

            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-lg bg-brand-500 px-4 py-3 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-60"
            >
              {submitting ? "Saving..." : "Add User"}
            </button>
          </form>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-sm dark:border-gray-800 dark:bg-white/5 xl:col-span-2">
          <h2 className="mb-4 text-lg font-semibold text-gray-800 dark:text-white/90">
            User Merchant List
          </h2>

          {loading ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">Loading...</p>
          ) : items.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Belum ada user merchant.
            </p>
          ) : (
            <div className="space-y-3">
              {items.map((item) => (
                <div
                  key={item.merchantUserId}
                  className="rounded-xl border border-gray-200 p-4 dark:border-gray-800"
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-800 dark:text-white/90">
                        {item.name}
                      </h3>
                      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        {item.email}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        User Status: {item.userStatus} • Membership: {item.membershipStatus}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <select
                        value={item.role}
                        onChange={(e) =>
                          handleChangeRole(item.merchantUserId, e.target.value)
                        }
                        disabled={item.role === "Owner"}
                        className="h-10 rounded-lg border border-gray-300 bg-transparent px-3 text-sm outline-none dark:border-gray-700"
                      >
                        <option value="Kasir">Kasir</option>
                        <option value="Gudang">Gudang</option>
                        <option value="Owner">Owner</option>
                      </select>

                      {item.role !== "Owner" && item.membershipStatus === "active" && (
                        <button
                          onClick={() => handleDeactivate(item.merchantUserId)}
                          className="rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white"
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
      </div>
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm outline-none focus:border-brand-500 dark:border-gray-700"
      />
    </div>
  );
}