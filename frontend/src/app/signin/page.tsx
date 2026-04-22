"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { FormEvent, useState, useEffect } from "react";
import { api } from "@/lib/api";
import { saveActiveMerchant, getActiveMerchant } from "@/lib/auth";

export default function SignInPage() {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({
    email: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    // Cek apakah ada merchant aktif (indikator sudah login)
    const activeMerchant = getActiveMerchant();
    if (activeMerchant) {
      setIsLoggedIn(true);
    }
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // 1. Tembak API Login Backend
      const response = await api.post("/auth/login", form);
      
      // --- BAGIAN WAJIB UNTUK MENYIMPAN TOKEN ---
      // Kita cek tokennya ada di mana (bisa di response.token atau response.data.token)
      const token = response.token || response.data?.token;
      
      if (token) {
        // Simpan ke localStorage dengan nama "token" sesuai dengan yang dicari di api.ts
        localStorage.setItem("token", token);
        console.log("Login sukses! Token berhasil disimpan."); // Pesan bantuan untuk ngecek di console
      } else {
        console.warn("PENTING: Backend membalas sukses, tapi tidak ada token di dalamnya:", response);
      }
      // ------------------------------------------

      // 2. Jika sukses, baru arahkan ke dashboard
      router.push("/admin/dashboard");
    } catch (err: any) {
      // Tangkap error dari backend
      setError(err.message || "Login gagal. Coba cek kembali email dan password Anda.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-4 py-10 dark:bg-gray-900">
      <div className="w-full max-w-md">
        <div className="mb-5">
          <Link
            href={isLoggedIn ? "/admin/dashboard" : "/"}
            className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
          >
            ← {isLoggedIn ? "Back to Dashboard" : "Back to Home"}
          </Link>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-sm dark:border-gray-800 dark:bg-white/5">
          <div className="mb-6">
            <h1 className="mb-2 text-2xl font-semibold text-gray-800 dark:text-white/90">
              Sign In
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Enter your email and password to sign in.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Email
              </label>
              <input
                type="email"
                required
                placeholder="info@gmail.com"
                value={form.email}
                onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 outline-none focus:border-brand-500 dark:border-gray-700 dark:text-white/90"
              />
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Password
                </label>
                <Link href="/forgot-password" className="text-sm text-brand-500 hover:text-brand-600">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="Enter your password"
                  value={form.password}
                  onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
                  className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 pr-14 text-sm text-gray-800 outline-none focus:border-brand-500 dark:border-gray-700 dark:text-white/90"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-gray-500">
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            {error && <div className="rounded-lg bg-red-50 p-3 text-xs text-red-600 dark:bg-red-500/10">{error}</div>}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-brand-500 py-3 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-60 transition"
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-gray-700 dark:text-gray-400">
            Don't have an account? <Link href="/signup" className="text-brand-500 font-medium">Sign Up</Link>
          </p>

          {/* Quick Login Section - Development Only */}
          <div className="mt-8 border-t border-gray-100 pt-6 dark:border-gray-800">
            <p className="mb-4 text-center text-xs font-medium uppercase tracking-wider text-gray-400">
              Quick Login (Dev Only)
            </p>
            <div className="grid grid-cols-1 gap-3">
              {[
                { label: "Owner (owner@pos.com)", email: "owner@pos.com" },
                { label: "Kasir (kasir@pos.com)", email: "kasir@pos.com" },
                { label: "Gudang (gudang@pos.com)", email: "gudang@pos.com" },
              ].map((user) => (
                <button
                  key={user.email}
                  type="button"
                  onClick={() => {
                    setForm({ email: user.email, password: "Password123" });
                    // Give a tiny timeout to ensure state is updated before submitting
                    setTimeout(() => {
                      const loginBtn = document.querySelector('button[type="submit"]') as HTMLButtonElement;
                      loginBtn?.click();
                    }, 100);
                  }}
                  className="flex items-center justify-center rounded-lg border border-gray-200 bg-gray-50 py-2 text-xs font-medium text-gray-600 hover:bg-gray-100 dark:border-gray-700 dark:bg-white/5 dark:text-gray-400 dark:hover:bg-white/10 transition"
                >
                  Login as {user.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}