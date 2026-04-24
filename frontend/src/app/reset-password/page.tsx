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
      <div className="text-center">
        <p className="text-red-500 mb-4">Token reset tidak valid atau tidak ditemukan.</p>
        <Link href="/signin" className="text-sm font-medium text-brand-500 hover:underline">
          Kembali ke Sign In
        </Link>
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
      setTimeout(() => { router.push("/signin"); }, 3000);
    } catch (err: any) {
      setError(err.message || "Gagal mereset password");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="text-center space-y-4">
        <p className="text-lg font-medium text-gray-800 dark:text-white">Password Berhasil Diubah!</p>
        <p className="text-sm text-gray-500">Mengarahkan Anda ke halaman Sign In...</p>
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
    // PEMBUNGKUS LUAR (SAMA PERSIS DENGAN FORGOT PASSWORD)
    <div className="flex min-h-screen items-center justify-center bg-white px-4 py-10 dark:bg-gray-900">
      {/* KOTAK PUTIH (SAMA PERSIS DENGAN FORGOT PASSWORD) */}
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-sm dark:border-gray-800 dark:bg-white/5">
        
        <h1 className="mb-2 text-2xl font-semibold text-gray-800 dark:text-white/90">
          Reset Password
        </h1>
        <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
          Silakan masukkan password baru Anda untuk memulihkan akses akun.
        </p>
        
        <Suspense fallback={<p className="text-center text-gray-500">Loading...</p>}>
          <ResetPasswordForm />
        </Suspense>

        <div className="mt-6 border-t border-gray-100 pt-5 text-center dark:border-gray-800">
          <Link href="/signin" className="text-sm font-medium text-gray-500 hover:text-brand-500 transition-colors">
            ← Kembali ke Halaman Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}