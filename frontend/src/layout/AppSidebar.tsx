"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useSidebar } from "@/context/SidebarContext";
import { useMerchantModal } from "@/context/MerchantModalContext";
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
  subItems?: { name: string; path: string; pro?: boolean; new?: boolean }[];
};

const navItems: NavItem[] = [
  {
    icon: <GridIcon />,
    name: "Dashboard",
    path: "/admin/dashboard",
  },
  {
    icon: <BoxCubeIcon />,
    name: "Master Data",
    subItems: [
      { name: "Categories", path: "/admin/categories" },
      { name: "Units", path: "/admin/units" },
      { name: "Products", path: "/admin/products" },
      { name: "Stocks", path: "/admin/stocks" },
    ],
  },
  {
    icon: <TableIcon />,
    name: "Transactions",
    subItems: [
      { name: "Sales", path: "/admin/sales" },
      { name: "Purchases", path: "/admin/purchases" },
    ],
  },
  {
    icon: <UserCircleIcon />,
    name: "Users & Roles",
    path: "/admin/users",
  },
];

const othersItems: NavItem[] = [
  {
    icon: <ListIcon />,
    name: "Merchant",
    subItems: [
      { name: "Manage Branches", path: "/admin/merchants" },
      { name: "Create Merchant", path: "/create-merchant" },
      // MODIFIKASI: Tambahkan ?from=dashboard di sini
      { name: "Switch Shop", path: "/select-merchant?from=dashboard" },
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
    (subItems?: { name: string; path: string }[]) => {
      if (!subItems) return false;
      return subItems.some((item) => pathname === item.path.split('?')[0]);
    },
    [pathname]
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
      <ul className="flex flex-col gap-4">
        {items.map((nav, index) => {
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
                    {nav.subItems.map((subItem) => {
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
                            }`}
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