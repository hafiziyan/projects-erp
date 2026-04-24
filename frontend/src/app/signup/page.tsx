"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { FormEvent, useMemo, useState, useEffect } from "react";
import { api } from "@/lib/api";
import { getActiveMerchant } from "@/lib/auth";

export default function SignUpPage() {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    agree: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    const activeMerchant = getActiveMerchant();
    if (activeMerchant) {
      setIsLoggedIn(true);
    }
  }, []);

  const fullName = useMemo(() => `${form.firstName} ${form.lastName}`.trim(), [form.firstName, form.lastName]);

  const passwordCriteria = useMemo(() => {
    const pwd = form.password;
    return {
      length: pwd.length >= 8,
      upper: /[A-Z]/.test(pwd),
      lower: /[a-z]/.test(pwd),
      number: /[0-9]/.test(pwd),
    };
  }, [form.password]);

  const isPasswordStrong = Object.values(passwordCriteria).every(Boolean);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (!form.agree) {
      setError("Anda harus menyetujui Terms dan Privacy Policy.");
      setLoading(false);
      return;
    }

    if (!isPasswordStrong) {
      setError("Password belum memenuhi syarat keamanan.");
      setLoading(false);
      return;
    }

    try {
      const result = await api.post("/auth/register", {
        name: fullName,
        email: form.email,
        password: form.password,
      });

      setSuccess(result.message || "Registrasi berhasil");
      setTimeout(() => router.push("/signin"), 1500);
    } catch (err: any) {
      setError(err.message || "Registrasi gagal");
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
            <h1 className="mb-2 text-2xl font-semibold text-gray-800 dark:text-white">Sign Up</h1>
            <p className="text-sm text-gray-500">Buat akun untuk mengelola bisnis Anda.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <input type="text" placeholder="First Name" value={form.firstName} onChange={(e) => setForm({...form, firstName: e.target.value})} className="h-11 w-full rounded-lg border border-gray-300 px-4 text-sm bg-transparent outline-none focus:border-brand-500 dark:border-gray-700 dark:text-white" />
              <input type="text" placeholder="Last Name" value={form.lastName} onChange={(e) => setForm({...form, lastName: e.target.value})} className="h-11 w-full rounded-lg border border-gray-300 px-4 text-sm bg-transparent outline-none focus:border-brand-500 dark:border-gray-700 dark:text-white" />
            </div>

            <input type="email" required placeholder="Email" value={form.email} onChange={(e) => setForm({...form, email: e.target.value})} className="h-11 w-full rounded-lg border border-gray-300 px-4 text-sm bg-transparent outline-none focus:border-brand-500 dark:border-gray-700 dark:text-white" />

            <div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="Password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="h-11 w-full rounded-lg border border-gray-300 px-4 text-sm bg-transparent outline-none focus:border-brand-500 dark:border-gray-700 dark:text-white"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-gray-500">
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-x-2 gap-y-1">
                <p className={`text-[10px] flex items-center gap-1 ${passwordCriteria.length ? 'text-green-500' : 'text-gray-400'}`}>
                  <span className={`h-1 w-1 rounded-full ${passwordCriteria.length ? 'bg-green-500' : 'bg-gray-300'}`} /> Min. 8 Karakter
                </p>
                <p className={`text-[10px] flex items-center gap-1 ${passwordCriteria.upper ? 'text-green-500' : 'text-gray-400'}`}>
                  <span className={`h-1 w-1 rounded-full ${passwordCriteria.upper ? 'bg-green-500' : 'bg-gray-300'}`} /> Huruf Besar
                </p>
                <p className={`text-[10px] flex items-center gap-1 ${passwordCriteria.lower ? 'text-green-500' : 'text-gray-400'}`}>
                  <span className={`h-1 w-1 rounded-full ${passwordCriteria.lower ? 'bg-green-500' : 'bg-gray-300'}`} /> Huruf Kecil
                </p>
                <p className={`text-[10px] flex items-center gap-1 ${passwordCriteria.number ? 'text-green-500' : 'text-gray-400'}`}>
                  <span className={`h-1 w-1 rounded-full ${passwordCriteria.number ? 'bg-green-500' : 'bg-gray-300'}`} /> Angka
                </p>
              </div>
            </div>

            <label className="flex items-start gap-3">
              <input type="checkbox" checked={form.agree} onChange={(e) => setForm({...form, agree: e.target.checked})} className="mt-1" />
              <span className="text-xs text-gray-500">I agree to the Terms and Privacy Policy.</span>
            </label>

            {error && <div className="rounded-lg bg-red-50 p-3 text-xs text-red-600 dark:bg-red-500/10">{error}</div>}
            {success && <div className="rounded-lg bg-green-50 p-3 text-xs text-green-600 dark:bg-green-500/10">{success}</div>}

            <button type="submit" disabled={loading} className="w-full rounded-lg bg-brand-500 py-3 text-sm font-medium text-white hover:bg-brand-600 transition">
              {loading ? "Signing up..." : "Sign Up"}
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-gray-700">
            Already have an account? <Link href="/signin" className="text-brand-500 font-medium">Sign In</Link>
          </p>
        </div>
      </div>
    </div>
  );
}