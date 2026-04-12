"use client";

import { useRouter, useSearchParams } from "next/navigation";
import React, { FormEvent, useState, Suspense } from "react";
import { api } from "@/lib/api";
import Link from "next/link";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  if (!token) {
    return (
      <div className="text-center text-red-500">
        Token reset tidak valid atau tidak ditemukan.
      </div>
    );
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await api.post<{ success: boolean; message: string }>("/auth/reset-password", {
        token,
        newPassword: password,
      });
      setSuccess(res.message);
      setTimeout(() => {
        router.push("/login");
      }, 3000);
    } catch (err: any) {
      setError(err.message || "Gagal mereset password");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="text-center">
        <p className="mb-4 text-green-600 dark:text-green-400">{success}</p>
        <p className="text-sm text-gray-500">Mengarahkan ke halaman login...</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-lg bg-red-50 p-4 text-sm text-red-600 dark:bg-red-500/10 dark:text-red-400">
          {error}
        </div>
      )}
      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
          Password Baru
        </label>
        <input
          type="password"
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Minimal 6 karakter"
          className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 outline-none focus:border-brand-500 dark:border-gray-700 dark:text-white"
        />
      </div>
      <button
        type="submit"
        disabled={loading || password.length < 6}
        className="h-11 w-full rounded-lg bg-brand-500 px-4 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-60"
      >
        {loading ? "Menyimpan..." : "Simpan Password Baru"}
      </button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-4 py-10 dark:bg-gray-900">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-sm dark:border-gray-800 dark:bg-white/5">
        <h1 className="mb-6 text-2xl font-semibold text-gray-800 dark:text-white/90">
          Reset Password
        </h1>
        {/* Suspense diperlukan di Next.js saat menggunakan useSearchParams() */}
        <Suspense fallback={<p>Loading...</p>}>
          <ResetPasswordForm />
        </Suspense>
        <div className="mt-5 text-center">
          <Link href="/login" className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
            Batal & Kembali ke Login
          </Link>
        </div>
      </div>
    </div>
  );
}