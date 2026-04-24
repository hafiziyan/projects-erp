"use client";

import Link from "next/link";
import React, { useEffect, useRef, useState } from "react";

type RevealProps = {
  children: React.ReactNode;
  delay?: number;
  className?: string;
};

function Reveal({ children, delay = 0, className = "" }: RevealProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const current = ref.current;
    if (!current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.unobserve(current);
        }
      },
      { threshold: 0.15 }
    );

    observer.observe(current);

    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`transform transition-all duration-700 ease-out ${className} ${
        visible ? "translate-y-0 opacity-100" : "translate-y-10 opacity-0"
      }`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

function FloatingShape({
  className,
}: {
  className?: string;
}) {
  return (
    <div
      className={`absolute rounded-full blur-3xl animate-pulse ${className || ""}`}
    />
  );
}

export default function LandingPage() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-white text-gray-900 dark:bg-gray-950 dark:text-white">
      <section className="relative overflow-hidden">
        <FloatingShape className="left-[-60px] top-[60px] h-72 w-72 bg-brand-200/40 dark:bg-brand-500/10" />
        <FloatingShape className="right-[-40px] top-[100px] h-80 w-80 bg-purple-200/40 dark:bg-purple-500/10" />
        <FloatingShape className="bottom-[-80px] left-[30%] h-72 w-72 bg-cyan-200/40 dark:bg-cyan-500/10" />

        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <header className="flex items-center justify-between rounded-2xl border border-gray-200/70 bg-white/80 px-4 py-4 shadow-sm backdrop-blur dark:border-gray-800 dark:bg-white/5">
            <div>
              <h1 className="text-lg font-bold sm:text-xl">ERP Multi Merchant</h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Mini ERP untuk UMKM modern
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href="/signin"
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/10"
              >
                Sign In
              </Link>
              <Link
                href="/signup"
                className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-600"
              >
                Sign Up
              </Link>
            </div>
          </header>
        </div>

        <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-12 px-4 pb-20 pt-10 sm:px-6 lg:grid-cols-2 lg:px-8 lg:pb-28 lg:pt-16">
          <Reveal>
            <div className="max-w-2xl">
              <div className="mb-5 inline-flex rounded-full border border-brand-200 bg-brand-50 px-4 py-1.5 text-xs font-medium text-brand-700 dark:border-brand-500/20 dark:bg-brand-500/10 dark:text-brand-300">
                Web ERP Multi-Merchant • Owner, Kasir, Gudang
              </div>

              <h2 className="text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl">
                Kelola bisnis UMKM dalam{" "}
                <span className="text-brand-500">satu dashboard</span>
              </h2>

              <p className="mt-6 max-w-xl text-base leading-7 text-gray-600 dark:text-gray-400 sm:text-lg">
                Atur produk, stok, penjualan, pembelian, dan user merchant
                dengan sistem role yang jelas. Cocok untuk owner, kasir, dan
                gudang dalam satu platform yang rapi.
              </p>

              <div className="mt-8 flex flex-wrap gap-4">
                <Link
                  href="/signup"
                  className="rounded-xl bg-brand-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-500/20 transition hover:-translate-y-0.5 hover:bg-brand-600"
                >
                  Daftar Sekarang
                </Link>
                <Link
                  href="/signin"
                  className="rounded-xl border border-gray-300 px-6 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/10"
                >
                  Saya Sudah Punya Akun
                </Link>
              </div>

              <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3">
                {[
                  { title: "Multi Merchant", desc: "Banyak toko dalam 1 sistem" },
                  { title: "Role Akses", desc: "Owner, Kasir, Gudang" },
                  { title: "Realtime Stock", desc: "Stok update otomatis" },
                ].map((item, index) => (
                  <Reveal key={item.title} delay={index * 120}>
                    <div className="rounded-2xl border border-gray-200 bg-white/80 p-4 shadow-sm backdrop-blur dark:border-gray-800 dark:bg-white/5">
                      <h3 className="text-sm font-semibold">{item.title}</h3>
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        {item.desc}
                      </p>
                    </div>
                  </Reveal>
                ))}
              </div>
            </div>
          </Reveal>

          <Reveal delay={150}>
            <div className="relative">
                <div className="absolute -left-6 top-10 h-24 w-24 rounded-3xl bg-brand-500/10 blur-2xl" />
                <div className="absolute -right-4 bottom-10 h-32 w-32 rounded-full bg-purple-500/10 blur-3xl" />

                <div className="relative rounded-[28px] border border-gray-200 bg-white p-5 shadow-2xl dark:border-gray-800 dark:bg-gray-900">
                <div className="mb-5">
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Alur Sistem ERP
                    </p>
                    <h3 className="text-xl font-semibold">Dari pendaftaran sampai operasional</h3>
                </div>

                <div className="space-y-4">
                    {[
                    {
                        step: "01",
                        title: "Register Owner",
                        desc: "Owner membuat akun untuk masuk ke sistem ERP.",
                    },
                    {
                        step: "02",
                        title: "Create Merchant",
                        desc: "Setelah login, owner membuat merchant pertamanya.",
                    },
                    {
                        step: "03",
                        title: "Kelola Master Data",
                        desc: "Tambahkan kategori, unit, produk, dan stok awal.",
                    },
                    {
                        step: "04",
                        title: "Atur User & Role",
                        desc: "Owner dapat menambahkan kasir dan petugas gudang.",
                    },
                    {
                        step: "05",
                        title: "Sales & Purchase",
                        desc: "Transaksi penjualan dan pembelian tercatat otomatis.",
                    },
                    {
                        step: "06",
                        title: "Monitor Dashboard",
                        desc: "Lihat ringkasan performa, stok menipis, dan transaksi terbaru.",
                    },
                    ].map((item, index) => (
                    <div
                        key={item.step}
                        className={`flex items-start gap-4 rounded-2xl border border-gray-200 p-4 transition hover:shadow-md dark:border-gray-800 ${
                        index % 2 === 0 ? "translate-x-0" : "translate-x-2"
                        }`}
                    >
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-sm font-bold text-brand-600 dark:bg-brand-500/10 dark:text-brand-300">
                        {item.step}
                        </div>

                        <div>
                        <h4 className="text-sm font-semibold text-gray-800 dark:text-white/90">
                            {item.title}
                        </h4>
                        <p className="mt-1 text-sm leading-6 text-gray-500 dark:text-gray-400">
                            {item.desc}
                        </p>
                        </div>
                    </div>
                    ))}
                </div>
                </div>
            </div>
            </Reveal>
        </div>
      </section>

      <section className="bg-gray-50 py-20 dark:bg-gray-900/60">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Reveal>
            <div className="mx-auto mb-14 max-w-2xl text-center">
              <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-brand-500">
                Fitur Utama
              </p>
              <h2 className="text-3xl font-bold sm:text-4xl">
                Semua yang dibutuhkan bisnis kamu
              </h2>
              <p className="mt-4 text-gray-600 dark:text-gray-400">
                Dibuat untuk membantu alur kerja merchant dari produk sampai laporan.
              </p>
            </div>
          </Reveal>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
            {[
              {
                title: "Master Data",
                desc: "Kelola category, unit, dan produk secara terstruktur.",
              },
              {
                title: "Stock Management",
                desc: "Pantau stok, low stock, dan lakukan adjustment dengan mudah.",
              },
              {
                title: "POS & Sales",
                desc: "Transaksi penjualan cepat dengan pengurangan stok otomatis.",
              },
              {
                title: "Purchase",
                desc: "Barang masuk langsung menambah stok dan tercatat rapi.",
              },
              {
                title: "Multi Role",
                desc: "Owner, Kasir, dan Gudang punya hak akses yang berbeda.",
              },
              {
                title: "Multi Merchant",
                desc: "Satu akun bisa mengelola lebih dari satu merchant.",
              },
              {
                title: "Dashboard Insight",
                desc: "Lihat ringkasan penjualan, stok, dan performa merchant.",
              },
              {
                title: "Audit Log",
                desc: "Setiap aksi penting terekam untuk pelacakan sistem.",
              },
            ].map((feature, index) => (
              <Reveal key={feature.title} delay={index * 90}>
                <div className="group rounded-3xl border border-gray-200 bg-white p-6 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl dark:border-gray-800 dark:bg-white/5">
                  <div className="mb-4 h-12 w-12 rounded-2xl bg-brand-50 transition group-hover:bg-brand-500/10 dark:bg-brand-500/10" />
                  <h3 className="text-lg font-semibold">{feature.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-400">
                    {feature.desc}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-10 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
          <Reveal>
            <div className="rounded-3xl border border-gray-200 bg-white p-8 shadow-sm dark:border-gray-800 dark:bg-white/5">
              <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-brand-500">
                Kenapa ERP ini?
              </p>
              <h2 className="text-3xl font-bold">
                Fokus pada kebutuhan nyata UMKM
              </h2>
              <div className="mt-6 space-y-5">
                {[
                  "Tampilan sederhana dan mudah dipahami",
                  "Role akses memudahkan pembagian tugas",
                  "Mendukung multi-merchant",
                  "Integrasi stok, pembelian, dan penjualan",
                ].map((point, index) => (
                  <Reveal key={point} delay={index * 100}>
                    <div className="flex items-start gap-3">
                      <div className="mt-1 h-3 w-3 rounded-full bg-brand-500" />
                      <p className="text-gray-700 dark:text-gray-300">{point}</p>
                    </div>
                  </Reveal>
                ))}
              </div>
            </div>
          </Reveal>

          <Reveal delay={150}>
            <div className="rounded-3xl border border-gray-200 bg-gradient-to-br from-brand-500 to-purple-600 p-8 text-white shadow-xl">
              <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-white/80">
                Mulai Sekarang
              </p>
              <h2 className="text-3xl font-bold">
                Bangun sistem bisnis yang lebih rapi dan efisien
              </h2>
              <p className="mt-4 text-sm leading-7 text-white/80">
                Daftar sebagai owner, buat merchant pertama kamu, lalu kelola
                seluruh operasional bisnis dari satu tempat.
              </p>

              <div className="mt-8 flex flex-wrap gap-4">
                <Link
                  href="/signup"
                  className="rounded-xl bg-white px-6 py-3 text-sm font-semibold text-brand-600 transition hover:bg-gray-100"
                >
                  Sign Up
                </Link>
                <Link
                  href="/signin"
                  className="rounded-xl border border-white/30 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
                >
                  Sign In
                </Link>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <footer className="border-t border-gray-200 bg-white/80 py-8 dark:border-gray-800 dark:bg-gray-950">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 text-sm text-gray-500 dark:text-gray-400 sm:flex-row sm:px-6 lg:px-8">
          <p>© 2026 ERP Multi Merchant. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <Link href="/signin" className="hover:text-brand-500">
              Sign In
            </Link>
            <Link href="/signup" className="hover:text-brand-500">
              Sign Up
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}