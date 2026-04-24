"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { api } from "@/lib/api";
import { clearActiveMerchant, getActiveMerchant } from "@/lib/auth";
import { useMerchantModal } from "@/context/MerchantModalContext";

// Dynamic import for ApexCharts to prevent SSR issues
const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

type DashboardResponse = {
  success: boolean;
  data: {
    metrics: {
      totalProducts: number;
      totalCategories: number;
      totalUsers: number;
      totalStockQuantity: number;
      lowStockCount: number;
      todaySales: number;
      monthSales: number;
      monthPurchases: number;
    };
    recentSales: {
      saleId: string;
      invoiceNumber: string;
      totalAmount: number;
      totalItems: number;
      cashier: {
        id: string;
        name: string;
      } | null;
      createdAt: string;
    }[];
    lowStockItems: {
      productId: string;
      productName: string;
      sku: string | null;
      quantity: number;
      reorderPoint: number;
      category: {
        id: string;
        name: string;
      } | null;
      unit: {
        id: string;
        name: string;
      } | null;
    }[];
  };
};

type MeResponse = {
  success: boolean;
  data: {
    user: {
      id: string;
      name: string;
      email: string;
      status: string;
    };
    merchants: {
      merchantUserId: string;
      merchantId: string;
      merchantName: string;
      merchantStatus: string;
      role: string;
    }[];
  };
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function DashboardPage() {
  const router = useRouter();
  const { openSelectMerchant, openCreateMerchant } = useMerchantModal();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dashboard, setDashboard] = useState<DashboardResponse["data"] | null>(null);
  const [user, setUser] = useState<MeResponse["data"]["user"] | null>(null);
  const [merchantName, setMerchantName] = useState("");
  const [merchantRole, setMerchantRole] = useState("");

  const metrics = useMemo(() => dashboard?.metrics, [dashboard]);

  useEffect(() => {
    async function initDashboard() {
      try {
        const activeMerchant = getActiveMerchant();

        // 1. Panggil API Me SATU KALI SAJA dengan parameter 'true' agar token ikut terkirim
        const meResult = await api.get<MeResponse>("/auth/me", true);
        setUser(meResult.data.user);

        if (!activeMerchant?.merchantId) {
          const merchants = meResult.data.merchants || [];

          if (merchants.length === 0) {
            openCreateMerchant();
            setLoading(false);
            return;
          }

          if (merchants.length === 1) {
            localStorage.setItem("merchantId", merchants[0].merchantId);
            localStorage.setItem("merchantName", merchants[0].merchantName);
            localStorage.setItem("merchantRole", merchants[0].role);

            setMerchantName(merchants[0].merchantName);
            setMerchantRole(merchants[0].role);
          } else {
            openSelectMerchant();
            setLoading(false);
            return;
          }
        } else {
          setMerchantName(activeMerchant.merchantName || "");
          setMerchantRole(activeMerchant.role || "");
        }

        // 2. Panggil API Summary dengan parameter 'true'
        const dashboardResult = await api.get<DashboardResponse>(
          "/dashboard/summary",
          true
        );

        setDashboard(dashboardResult.data);
      } catch (err: any) {
        const msg = err.message || "";
        console.error("Dashboard init error:", err); 
        
        if (msg.includes("Unauthorized") || msg.includes("401") || err.status === 401) {
          // Jika unauthorized, bersihkan SEMUA storage dan balik ke login
          localStorage.removeItem("token");
          localStorage.removeItem("merchantId");
          localStorage.removeItem("merchantName");
          localStorage.removeItem("merchantRole");
          window.location.href = "/signin";
        } else {
          setError(msg || "Gagal memuat dashboard");
        }
      } finally {
        setLoading(false);
      }
    }

    initDashboard();
  }, [router, openCreateMerchant, openSelectMerchant]);

  async function handleLogout() {
    try {
      await api.post("/auth/logout");
    } catch {
      // ignore
    } finally {
      clearActiveMerchant();
      // PENYESUAIAN PENTING: Pastikan token juga dihancurkan saat logout
      if (typeof window !== "undefined") {
        localStorage.removeItem("token");
      }
      router.push("/signin");
    }
  }

  const chartOptions: any = {
    chart: {
      type: 'area',
      height: 350,
      zoom: { enabled: false },
      toolbar: { show: false },
      fontFamily: 'Inter, sans-serif'
    },
    dataLabels: { enabled: false },
    stroke: { curve: 'smooth', width: 3 },
    colors: ['#4f46e5'],
    fill: {
      type: 'gradient',
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.45,
        opacityTo: 0.05,
        stops: [20, 100, 100, 100]
      }
    },
    xaxis: {
      categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    },
    yaxis: {
      labels: {
        formatter: (val: number) => `Rp ${(val / 1000000).toFixed(1)}M`
      }
    },
    tooltip: {
      y: {
        formatter: (val: number) => formatCurrency(val)
      }
    }
  };

  const chartSeries = [{
    name: 'Total Sales',
    data: [30, 40, 35, 50, 49, 60, 70, 91, 125, 110, 140, 110].map(v => v * 100000) 
  }];

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center rounded-2xl border border-gray-200 bg-white p-6 text-sm text-gray-500 shadow-theme-sm dark:border-gray-800 dark:bg-white/5 dark:text-gray-400">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-brand-500"></div>
          <p>Loading your dashboard analytics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-600 shadow-theme-sm dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10">
      {/* Header Section */}
      <div className="flex flex-col gap-4 rounded-3xl bg-gradient-to-br from-brand-600 to-brand-800 p-6 text-white shadow-xl dark:from-brand-500/10 dark:to-brand-800/20 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-md">
            <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {merchantName || "Antigravity ERP"}
            </h1>
            <div className="mt-1 flex items-center gap-2 text-sm text-white/80">
              <span className="flex items-center gap-1">
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                {merchantRole}
              </span>
              <span>•</span>
              <span>{user?.name}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/select-merchant"
            className="flex items-center gap-2 rounded-xl bg-white/10 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-white/20 backdrop-blur-md"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
            Switch Shop
          </Link>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-brand-600 transition hover:bg-white/90 shadow-lg"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Logout
          </button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-12 gap-6">
        {/* Left Column - Stats and Chart */}
        <div className="col-span-12 space-y-6 lg:col-span-8">
          {/* Metrics Grid */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard 
              title="Products" 
              value={String(metrics?.totalProducts || 0)} 
              icon={<svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>}
              color="indigo"
              trend="+12%"
            />
            <MetricCard 
              title="Today Sales" 
              value={formatCurrency(metrics?.todaySales || 0)} 
              icon={<svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 1.343-3 3s1.343 3 3 3 3-1.343 3-3-1.343-3-3-3zM12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2z" /></svg>}
              color="emerald"
              trend="+5.4%"
            />
            <MetricCard 
              title="Current Stocks" 
              value={String(metrics?.totalStockQuantity || 0)} 
              icon={<svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}
              color="amber"
              trend="In Range"
            />
            <MetricCard 
              title="Low Stock" 
              value={String(metrics?.lowStockCount || 0)} 
              icon={<svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>}
              color="rose"
              trend={metrics?.lowStockCount ? "Action Required" : "Safe"}
            />
          </div>

          {/* Sales Chart Area */}
          <section className="rounded-3xl border border-gray-100 bg-white p-6 shadow-theme-sm dark:border-gray-800 dark:bg-white/5">
            <div className="mb-8 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-800 dark:text-white">
                  Sales Analytics
                </h2>
                <p className="text-sm text-gray-500">Monthly revenue trend for this year</p>
              </div>
              <div className="flex gap-2">
                <button className="rounded-lg bg-gray-50 px-3 py-1 text-xs font-semibold text-gray-600 hover:bg-gray-100 dark:bg-white/5 dark:text-gray-400">1W</button>
                <button className="rounded-lg bg-brand-50 px-3 py-1 text-xs font-bold text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">1M</button>
                <button className="rounded-lg bg-gray-50 px-3 py-1 text-xs font-semibold text-gray-600 hover:bg-gray-100 dark:bg-white/5 dark:text-gray-400">1Y</button>
              </div>
            </div>
            
            <div className="h-[350px] w-full">
              <Chart options={chartOptions} series={chartSeries} type="area" height="100%" />
            </div>
          </section>

          {/* Recent Sales Table */}
          <section className="rounded-3xl border border-gray-100 bg-white shadow-theme-sm dark:border-gray-800 dark:bg-white/5 overflow-hidden">
            <div className="flex items-center justify-between p-6">
              <h2 className="text-xl font-bold text-gray-800 dark:text-white">Recent Transactions</h2>
              <Link href="/admin/sales" className="text-sm font-semibold text-brand-500 hover:underline">View All</Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-50/50 text-xs font-bold uppercase tracking-wider text-gray-400 dark:bg-white/2">
                  <tr>
                    <th className="px-6 py-4">Invoice</th>
                    <th className="px-6 py-4">Cashier</th>
                    <th className="px-6 py-4 text-center">Items</th>
                    <th className="px-6 py-4">Amount</th>
                    <th className="px-6 py-4">Date & Time</th>
                    <th className="px-6 py-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                  {dashboard?.recentSales?.length ? (
                    dashboard.recentSales.map((sale) => (
                      <tr key={sale.saleId} className="group hover:bg-gray-50/50 dark:hover:bg-white/2 transition">
                        <td className="px-6 py-4 text-sm font-bold text-gray-900 dark:text-white">
                          #{sale.invoiceNumber}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                          <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-xs">
                              {sale.cashier?.name?.charAt(0) || "U"}
                            </div>
                            {sale.cashier?.name || "System"}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center text-sm font-medium text-gray-600 dark:text-gray-400">
                          {sale.totalItems}
                        </td>
                        <td className="px-6 py-4 text-sm font-bold text-gray-900 dark:text-white text-nowrap">
                          {formatCurrency(sale.totalAmount)}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                         <div className="flex flex-col">
                           <span>{formatDate(sale.createdAt)}</span>
                           <span className="text-[10px] opacity-70">{formatTime(sale.createdAt)}</span>
                         </div>
                        </td>
                        <td className="px-6 py-4 text-xs font-bold">
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-1 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-400">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                            Success
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-6 py-10 text-center text-sm text-gray-400">
                        <div className="flex flex-col items-center gap-2">
                          <svg className="h-10 w-10 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                          </svg>
                          No transactions found
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        {/* Right Column - Inventory & Quick Actions */}
        <div className="col-span-12 space-y-6 lg:col-span-4">
          {/* Revenue Summary Card */}
          <section className="rounded-3xl border border-gray-100 bg-white p-6 shadow-theme-sm dark:border-gray-800 dark:bg-white/5">
            <h2 className="mb-6 text-xl font-bold text-gray-800 dark:text-white">Business Summary</h2>
            <div className="space-y-4">
              <SummaryItem label="This Month Sales" value={formatCurrency(metrics?.monthSales || 0)} color="indigo" />
              <SummaryItem label="This Month Purchase" value={formatCurrency(metrics?.monthPurchases || 0)} color="rose" />
              <div className="mt-8 rounded-2xl bg-indigo-50 p-5 dark:bg-indigo-500/5">
                <p className="text-xs font-bold uppercase tracking-wider text-indigo-400">Estimated Net Flow</p>
                <h3 className="mt-2 text-2xl font-black text-indigo-700 dark:text-indigo-400">
                  {formatCurrency((metrics?.monthSales || 0) - (metrics?.monthPurchases || 0))}
                </h3>
              </div>
            </div>
          </section>

          {/* Low Stock Alerts */}
          <section className="rounded-3xl border border-gray-100 bg-white p-6 shadow-theme-sm dark:border-gray-800 dark:bg-white/5">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-800 dark:text-white">Critical Alerts</h2>
              <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-black uppercase text-rose-600 dark:bg-rose-500/10 dark:text-rose-400">
                {metrics?.lowStockCount || 0} Issues
              </span>
            </div>

            <div className="space-y-4">
              {dashboard?.lowStockItems?.length ? (
                dashboard.lowStockItems.slice(0, 5).map((item) => (
                  <div key={item.productId} className="group relative flex items-center gap-4 rounded-2xl border border-gray-50 p-4 hover:border-rose-100 dark:border-gray-800 dark:hover:border-rose-500/20 transition">
                    <div className="h-10 w-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-rose-50 group-hover:text-rose-500 transition">
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="truncate text-sm font-bold text-gray-900 dark:text-white">{item.productName}</h4>
                      <p className="text-[10px] text-gray-500 uppercase tracking-widest">{item.sku || "No SKU"}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-black text-rose-600">{item.quantity} Left</p>
                      <p className="text-[10px] text-gray-400">Threshold: {item.reorderPoint}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-10 text-center">
                  <div className="mx-auto h-12 w-12 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-500">
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <p className="mt-4 text-sm font-semibold text-gray-500">All inventory levels healthy</p>
                </div>
              )}
            </div>
            
            {dashboard?.lowStockItems?.length ? (
               <button className="mt-6 w-full rounded-2xl bg-gray-50 py-3 text-xs font-bold text-gray-600 hover:bg-gray-100 dark:bg-white/5 dark:text-gray-400 transition">
                 Create Purchase Order
               </button>
            ) : null}
          </section>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ 
  title, 
  value, 
  icon, 
  color,
  trend 
}: { 
  title: string; 
  value: string; 
  icon: React.ReactNode;
  color: 'indigo' | 'emerald' | 'amber' | 'rose';
  trend: string;
}) {
  const themes = {
    indigo: "from-indigo-500 to-indigo-600 shadow-indigo-200 dark:shadow-none bg-indigo-50 border-indigo-100 text-indigo-600",
    emerald: "from-emerald-500 to-emerald-600 shadow-emerald-200 dark:shadow-none bg-emerald-50 border-emerald-100 text-emerald-600",
    amber: "from-amber-500 to-amber-600 shadow-amber-200 dark:shadow-none bg-amber-50 border-amber-100 text-amber-600",
    rose: "from-rose-500 to-rose-600 shadow-rose-200 dark:shadow-none bg-rose-50 border-rose-100 text-rose-600",
  };

  return (
    <div className="group relative rounded-3xl border border-gray-100 bg-white p-6 shadow-theme-sm transition hover:shadow-xl dark:border-gray-800 dark:bg-white/5">
      <div className={`mb-5 flex h-12 w-12 items-center justify-center rounded-2xl ${themes[color]}`}>
        {icon}
      </div>
      <p className="text-xs font-bold uppercase tracking-wider text-gray-400">{title}</p>
      <div className="mt-2 flex items-baseline gap-2">
        <h3 className="text-2xl font-black text-gray-900 dark:text-white">
          {value}
        </h3>
      </div>
      <div className="mt-4 flex items-center justify-between">
        <span className={`text-[10px] font-black uppercase tracking-tighter ${
            color === 'rose' ? 'text-rose-500' : 'text-emerald-500'
        }`}>
          {trend}
        </span>
        <div className="h-1.5 w-16 overflow-hidden rounded-full bg-gray-50 dark:bg-white/5">
          <div className={`h-full w-2/3 bg-current ${themes[color].split('text-')[1] === 'rose-600' ? 'bg-rose-500' : 'bg-brand-500'}`}></div>
        </div>
      </div>
    </div>
  );
}

function SummaryItem({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="flex flex-col gap-1">
       <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{label}</span>
       <span className="text-lg font-black text-gray-900 dark:text-white">{value}</span>
       <div className={`h-1 w-full rounded-full bg-gray-50 dark:bg-white/5 mt-1 overflow-hidden`}>
          <div className={`h-full w-3/4 rounded-full ${color === 'indigo' ? 'bg-indigo-500' : 'bg-rose-500'}`}></div>
       </div>
    </div>
  );
}