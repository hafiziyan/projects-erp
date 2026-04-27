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
    confirmPassword: "",
    roleName: "Kasir",
  });

  useEffect(() => {
    setMerchant(getActiveMerchant());
    setMounted(true);
    loadUsers();
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

  const validatePassword = (pass: string) => {
    const minLength = pass.length >= 8;
    const hasUpper = /[A-Z]/.test(pass);
    const hasLower = /[a-z]/.test(pass);
    const hasNumber = /[0-9]/.test(pass);
    if (!minLength) return "Password minimal 8 karakter";
    if (!hasUpper || !hasLower) return "Password harus kombinasi huruf besar dan kecil";
    if (!hasNumber) return "Password harus mengandung angka";
    return null;
  };

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (form.password !== form.confirmPassword) {
      setError("Konfirmasi password tidak cocok");
      return;
    }
    const passError = validatePassword(form.password);
    if (passError) {
      setError(passError);
      return;
    }
    try {
      setSubmitting(true);
      setError("");
      await api.post("/merchant-users", {
        name: form.name,
        email: form.email,
        password: form.password,
        roleName: form.roleName,
      }, true);
      setForm({ name: "", email: "", password: "", confirmPassword: "", roleName: "Kasir" });
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

  async function handleToggleStatus(user: MerchantUser) {
    const isCurrentlyActive = user.userStatus === "active";
    const nextStatus = isCurrentlyActive ? "inactive" : "active";
    if (!confirm(`${isCurrentlyActive ? 'Nonaktifkan' : 'Aktifkan'} user ${user.name}?`)) return;

    try {
      setError("");
      await api.patch(`/merchant-users/${user.merchantUserId}/status`, { 
        status: nextStatus 
      }, true);
      await loadUsers();
    } catch (err: any) {
      setError(err.message || "Gagal mengubah status user");
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-sm dark:border-gray-800 dark:bg-white/5">
        <h1 className="text-2xl font-semibold text-gray-800 dark:text-white/90">Users & Roles</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Merchant: {mounted ? merchant?.merchantName || "-" : "-"}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-sm dark:border-gray-800 dark:bg-white/5 xl:col-span-1 h-fit">
          <h2 className="mb-4 text-lg font-semibold">Add User Merchant</h2>
          <form onSubmit={handleCreate} className="space-y-4">
            <Input label="Name" value={form.name} onChange={(v: string) => setForm((p) => ({ ...p, name: v }))} placeholder="Nama user" />
            <Input label="Email" value={form.email} onChange={(v: string) => setForm((p) => ({ ...p, email: v }))} placeholder="email@mail.com" />
            <Input label="Password" isPassword value={form.password} onChange={(v: string) => setForm((p) => ({ ...p, password: v }))} placeholder="Min. 8 char, A, a, 1" />
            <Input label="Confirm Password" isPassword value={form.confirmPassword} onChange={(v: string) => setForm((p) => ({ ...p, confirmPassword: v }))} placeholder="Ulangi password" />
            <div>
              <label className="mb-2 block text-sm font-medium">Role</label>
              <select
                value={form.roleName}
                onChange={(e) => setForm((p) => ({ ...p, roleName: e.target.value }))}
                className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-800"
              >
                <option value="Kasir">Kasir</option>
                <option value="Gudang">Gudang</option>
              </select>
            </div>
            {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-500/10">{error}</div>}
            <button type="submit" disabled={submitting} className="w-full rounded-lg bg-brand-500 px-4 py-3 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-60 transition-all active:scale-[0.98]">
              {submitting ? "Saving..." : "Add User"}
            </button>
          </form>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-sm dark:border-gray-800 dark:bg-white/5 xl:col-span-2">
          <h2 className="mb-4 text-lg font-semibold">User Merchant List</h2>
          {loading ? (
            <p className="text-sm text-gray-500 animate-pulse">Loading...</p>
          ) : items.length === 0 ? (
            <p className="text-sm text-gray-500">Belum ada user merchant.</p>
          ) : (
            <div className="space-y-3">
              {items.map((item) => (
                <div key={item.merchantUserId} className={`rounded-xl border border-gray-200 p-4 transition-all ${item.userStatus === 'inactive' ? 'bg-gray-50/50 opacity-70 grayscale-[30%]' : 'hover:bg-gray-50/50'}`}>
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <h3 className={`font-semibold ${item.userStatus === 'inactive' ? 'text-gray-400' : 'text-gray-800'}`}>{item.name}</h3>
                      <p className="text-sm text-gray-500">{item.email}</p>
                      <span className={`mt-1 inline-block text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${item.userStatus === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                        {item.userStatus}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {item.role === "Owner" ? (
                        <span className="rounded-lg border border-brand-200 bg-brand-50 px-4 py-2 text-sm font-bold text-brand-700">Owner</span>
                      ) : (
                        <>
                          <select
                            value={item.role}
                            onChange={(e) => handleChangeRole(item.merchantUserId, e.target.value)}
                            className="h-10 rounded-lg border border-gray-300 bg-transparent px-3 text-sm outline-none"
                          >
                            <option value="Kasir">Kasir</option>
                            <option value="Gudang">Gudang</option>
                          </select>
                          <button
                            onClick={() => handleToggleStatus(item)}
                            className={`rounded-lg px-4 py-2 text-sm font-medium text-white transition-all ${
                              item.userStatus === 'active' ? 'bg-rose-500 hover:bg-rose-600' : 'bg-emerald-500 hover:bg-emerald-600'
                            }`}
                          >
                            {item.userStatus === 'active' ? 'Deactivate' : 'Activate'}
                          </button>
                        </>
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

function Input({ label, value, onChange, placeholder, isPassword = false }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; isPassword?: boolean; }) {
  const [show, setShow] = useState(false);
  return (
    <div>
      <label className="mb-2 block text-sm font-medium">{label}</label>
      <div className="relative">
        <input
          type={isPassword ? (show ? "text" : "password") : "text"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="h-11 w-full rounded-lg border border-gray-300 bg-transparent pl-4 pr-11 text-sm outline-none focus:border-brand-500 transition-all shadow-sm"
        />
        {isPassword && (
          <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-brand-500 transition-colors flex items-center justify-center">
            {show ? (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" /></svg>
            )}
          </button>
        )}
      </div>
    </div>
  );
}