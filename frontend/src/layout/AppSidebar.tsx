"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useSidebar } from "@/context/SidebarContext";
import { useMerchantModal } from "@/context/MerchantModalContext";
import { getActiveMerchant } from "@/lib/auth";
import {
  BoxCubeIcon,
  ChevronDownIcon,
  GridIcon,
  HorizontaLDots,
  ListIcon,
  PlugInIcon,
  TableIcon,
  UserCircleIcon,
} from "@/icons";

type NavItem = {
  name: string;
  icon: React.ReactNode;
  path?: string;
  roles?: string[]; // Mendefinisikan role apa saja yang bisa melihat menu ini
  subItems?: { name: string; path: string; pro?: boolean; new?: boolean; roles?: string[] }[];
};

const navItems: NavItem[] = [
  {
    icon: <GridIcon />,
    name: "Dashboard",
    path: "/admin/dashboard",
    roles: ["Owner", "Kasir", "Gudang"],
  },
  {
    icon: <BoxCubeIcon />,
    name: "Master Data",
    roles: ["Owner", "Gudang"],
    subItems: [
      { name: "Categories", path: "/admin/categories", roles: ["Owner", "Gudang"] },
      { name: "Units", path: "/admin/units", roles: ["Owner", "Gudang"] },
      { name: "Products", path: "/admin/products", roles: ["Owner", "Gudang"] },
      { name: "Stocks", path: "/admin/stocks", roles: ["Owner", "Gudang"] },
    ],
  },
  {
    icon: <TableIcon />,
    name: "Transactions",
    roles: ["Owner", "Kasir", "Gudang"],
    subItems: [
      { name: "Sales", path: "/admin/sales", roles: ["Owner", "Kasir"] },
      { name: "Purchases", path: "/admin/purchases", roles: ["Owner", "Gudang"] },
    ],
  },
  {
    icon: <UserCircleIcon />,
    name: "Users & Roles",
    path: "/admin/users",
    roles: ["Owner"],
  },
];

const othersItems: NavItem[] = [
  {
    icon: <ListIcon />,
    name: "Merchant",
    roles: ["Owner", "Kasir", "Gudang"],
    subItems: [
      { name: "Manage Branches", path: "/admin/merchants", roles: ["Owner"] },
      { name: "Create Merchant", path: "/create-merchant", roles: ["Owner"] },
      { name: "Switch Shop", path: "/select-merchant?from=dashboard", roles: ["Owner", "Kasir", "Gudang"] },
    ],
  },
  {
    icon: <PlugInIcon />,
    name: "Authentication",
    subItems: [
      { name: "Sign In", path: "/signin" },
      { name: "Sign Up", path: "/signup" },
    ],
  },
];

const AppSidebar: React.FC = () => {
  const { isExpanded, isMobileOpen, isHovered, setIsHovered } = useSidebar();
  const pathname = usePathname();
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    const active = getActiveMerchant();
    setUserRole(active?.role || null);
  }, []);

  const [openSubmenu, setOpenSubmenu] = useState<{
    type: "main" | "others";
    index: number;
  } | null>(null);

  const [subMenuHeight, setSubMenuHeight] = useState<Record<string, number>>(
    {}
  );

  const subMenuRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // MODIFIKASI: Agar menu tetap "active" meskipun ada query parameter (?from=dashboard)
  const isActive = useCallback((path: string) => {
    const purePath = path.split('?')[0];
    return purePath === pathname;
  }, [pathname]);

  const isParentActive = useCallback(
    (subItems?: { name: string; path: string; roles?: string[] }[]) => {
      if (!subItems) return false;
      return subItems.some((item) => {
        // Cek apakah item aktif berdasarkan path
        const pathMatch = pathname === item.path.split('?')[0];
        // Cek apakah user punya akses ke subitem ini
        const roleMatch = !item.roles || (userRole && item.roles.includes(userRole));
        return pathMatch && roleMatch;
      });
    },
    [pathname, userRole]
  );

  const handleSubmenuToggle = (index: number, menuType: "main" | "others") => {
    setOpenSubmenu((prevOpenSubmenu) => {
      if (
        prevOpenSubmenu &&
        prevOpenSubmenu.type === menuType &&
        prevOpenSubmenu.index === index
      ) {
        return null;
      }
      return { type: menuType, index };
    });
  };

  const renderMenuItems = (
    items: NavItem[],
    menuType: "main" | "others"
  ) => {
    const { openCreateMerchant, openSelectMerchant } = useMerchantModal();

    return (
      <div className="flex flex-col h-full justify-between pb-8">
        <ul className="flex flex-col gap-4">
          {items
            .filter((nav) => !nav.roles || (userRole && nav.roles.includes(userRole)))
            .map((nav, index) => {
              const filteredSubItems = nav.subItems?.filter(
                (si) => !si.roles || (userRole && si.roles.includes(userRole))
              );

              // Jika nav memiliki subItems tapi semuanya terfilter (tidak ada akses), jangan tampilkan menu induk
              if (nav.subItems && (!filteredSubItems || filteredSubItems.length === 0)) {
                return null;
              }

              const submenuActive = isParentActive(nav.subItems);
              const isSubmenuOpen =
                openSubmenu?.type === menuType && openSubmenu?.index === index;

              return (
                <li key={nav.name}>
                  {nav.subItems ? (
                    <button
                      onClick={() => handleSubmenuToggle(index, menuType)}
                      className={`menu-item group cursor-pointer ${
                        submenuActive || isSubmenuOpen
                          ? "menu-item-active"
                          : "menu-item-inactive"
                      } ${
                        !isExpanded && !isHovered
                          ? "lg:justify-center"
                          : "lg:justify-start"
                      }`}
                    >
                      <span
                        className={`${
                          submenuActive || isSubmenuOpen
                            ? "menu-item-icon-active"
                            : "menu-item-icon-inactive"
                        }`}
                      >
                        {nav.icon}
                      </span>

                      {(isExpanded || isHovered || isMobileOpen) && (
                        <span className="menu-item-text">{nav.name}</span>
                      )}

                      {(isExpanded || isHovered || isMobileOpen) && (
                        <span
                          className={`ml-auto flex h-5 w-5 items-center justify-center transition-transform duration-200 ${
                            isSubmenuOpen ? "rotate-180 text-brand-500" : ""
                          }`}
                        >
                          <ChevronDownIcon />
                        </span>
                      )}
                    </button>
                  ) : (
                    nav.path && (
                      <Link
                        href={nav.path}
                        className={`menu-item group ${
                          isActive(nav.path)
                            ? "menu-item-active"
                            : "menu-item-inactive"
                        }`}
                      >
                        <span
                          className={`${
                            isActive(nav.path)
                              ? "menu-item-icon-active"
                              : "menu-item-icon-inactive"
                          }`}
                        >
                          {nav.icon}
                        </span>

                        {(isExpanded || isHovered || isMobileOpen) && (
                          <span className="menu-item-text">{nav.name}</span>
                        )}
                      </Link>
                    )
                  )}

                  {nav.subItems && (isExpanded || isHovered || isMobileOpen) && (
                    <div
                      ref={(el) => {
                        subMenuRefs.current[`${menuType}-${index}`] = el;
                      }}
                      className="overflow-hidden transition-all duration-300"
                      style={{
                        height: isSubmenuOpen
                          ? `${subMenuHeight[`${menuType}-${index}`] || 0}px`
                          : "0px",
                      }}
                    >
                      <ul className="ml-9 mt-2 space-y-1">
                        {filteredSubItems?.map((subItem) => {
                          // Handle Special Modal Triggers
                          const isCreateMerchant = subItem.path === "/create-merchant";
                          const isSelectMerchant = subItem.path.startsWith("/select-merchant");

                          if (isCreateMerchant || isSelectMerchant) {
                            return (
                              <li key={subItem.name}>
                                <button
                                  onClick={isCreateMerchant ? openCreateMerchant : openSelectMerchant}
                                  className={`menu-dropdown-item w-full text-left cursor-pointer ${
                                    isActive(subItem.path)
                                      ? "menu-dropdown-item-active"
                                      : "menu-dropdown-item-inactive"
                                  }`}
                                >
                                  {subItem.name}
                                </button>
                              </li>
                            );
                          }

                          return (
                            <li key={subItem.name}>
                              <Link
                                href={subItem.path}
                                className={`menu-dropdown-item ${
                                  isActive(subItem.path)
                                    ? "menu-dropdown-item-active"
                                    : "menu-dropdown-item-inactive"
                                }}`}
                              >
                                {subItem.name}
                              </Link>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}
                </li>
              );
            })}
        </ul>

        {menuType === "others" && (
          <button
            onClick={async () => {
              try {
                // Hapus data lokal
                localStorage.removeItem("merchantId");
                localStorage.removeItem("merchantName");
                localStorage.removeItem("merchantRole");
                // Logout dari server
                await api.post("/auth/logout");
                window.location.href = "/signin";
              } catch (err) {
                window.location.href = "/signin";
              }
            }}
            className={`menu-item group mt-4 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 ${
              !isExpanded && !isHovered ? "lg:justify-center" : "lg:justify-start"
            }`}
          >
            <span className="menu-item-icon-inactive text-red-500">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                className="w-5 h-5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9"
                />
              </svg>
            </span>
            {(isExpanded || isHovered || isMobileOpen) && (
              <span className="menu-item-text font-bold">Logout</span>
            )}
          </button>
        )}
      </div>
    );
  };

  useEffect(() => {
    let submenuMatched = false;
    [
      { type: "main" as const, items: navItems },
      { type: "others" as const, items: othersItems },
    ].forEach(({ type, items }) => {
      items.forEach((nav, index) => {
        if (nav.subItems) {
          nav.subItems.forEach((subItem) => {
            if (pathname === subItem.path.split('?')[0]) {
              setOpenSubmenu({ type, index });
              submenuMatched = true;
            }
          });
        }
      });
    });
    if (!submenuMatched) setOpenSubmenu(null);
  }, [pathname]);

  useEffect(() => {
    if (openSubmenu !== null) {
      const key = `${openSubmenu.type}-${openSubmenu.index}`;
      if (subMenuRefs.current[key]) {
        setSubMenuHeight((prevHeights) => ({
          ...prevHeights,
          [key]: subMenuRefs.current[key]?.scrollHeight || 0,
        }));
      }
    }
  }, [openSubmenu]);

  return (
    <aside
      className={`fixed left-0 top-0 z-50 mt-16 flex h-screen flex-col border-r border-gray-200 bg-white px-5 text-gray-900 transition-all duration-300 ease-in-out dark:border-gray-800 dark:bg-gray-900 lg:mt-0
      ${isExpanded || isMobileOpen ? "w-[290px]" : isHovered ? "w-[290px]" : "w-[90px]"}
      ${isMobileOpen ? "translate-x-0" : "-translate-x-full"}
      lg:translate-x-0`}
      onMouseEnter={() => !isExpanded && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className={`flex py-8 ${!isExpanded && !isHovered ? "lg:justify-center" : "justify-start"}`}>
        <Link href="/admin/dashboard">
          <Image src="/images/logo/logo.svg" alt="Logo" width={150} height={40} className="dark:hidden" />
          <Image src="/images/logo/logo-dark.svg" alt="Logo" width={150} height={40} className="hidden dark:block" />
        </Link>
      </div>
      <div className="no-scrollbar flex flex-col overflow-y-auto">
        <nav className="mb-6">
          <div className="flex flex-col gap-4">
            <div>
              <h2 className={`mb-4 flex text-xs uppercase text-gray-400 ${!isExpanded && !isHovered ? "lg:justify-center" : "justify-start"}`}>ERP Menu</h2>
              {renderMenuItems(navItems, "main")}
            </div>
            <div>
              <h2 className={`mb-4 flex text-xs uppercase text-gray-400 ${!isExpanded && !isHovered ? "lg:justify-center" : "justify-start"}`}>Others</h2>
              {renderMenuItems(othersItems, "others")}
            </div>
          </div>
        </nav>
      </div>
    </aside>
  );
};

export default AppSidebar;