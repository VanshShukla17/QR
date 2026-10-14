"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavItem {
  name: string;
  href: string;
  icon: (active: boolean) => React.ReactNode;
}

const navItems: NavItem[] = [
  {
    name: "Home",
    href: "/dashboard",
    icon: (active: boolean) => (
      <svg
        className={`w-6 h-6 ${active ? "text-[var(--primary)]" : "text-[var(--muted-text)]"}`}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={active ? 2.5 : 2}
          d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
        />
      </svg>
    ),
  },
  {
    name: "Scan",
    href: "/audit/run",
    icon: (active: boolean) => (
      <div
        className={`w-10 h-10 rounded-full flex items-center justify-center -mt-3 shadow-md transition-transform ${
          active
            ? "bg-[var(--primary)] text-white scale-105"
            : "bg-[var(--secondary)] text-white"
        }`}
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2.5}
            d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"
          />
        </svg>
      </div>
    ),
  },
  {
    name: "History",
    href: "/audit/history",
    icon: (active: boolean) => (
      <svg
        className={`w-6 h-6 ${active ? "text-[var(--primary)]" : "text-[var(--muted-text)]"}`}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={active ? 2.5 : 2}
          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
  },
  {
    name: "Settings",
    href: "/settings",
    icon: (active: boolean) => (
      <svg
        className={`w-6 h-6 ${active ? "text-[var(--primary)]" : "text-[var(--muted-text)]"}`}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={active ? 2.5 : 2}
          d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={active ? 2.5 : 2}
          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
        />
      </svg>
    ),
  },
];

export function BottomNav() {
  const pathname = usePathname();

  // Hide on admin routes per PRD navigation rules (desktop sidebar for admin)
  if (pathname.startsWith("/admin")) {
    return null;
  }

  return (
    <nav
      aria-label="Bottom Navigation"
      className="fixed bottom-0 left-0 right-0 z-40 bg-[var(--surface)] border-t border-[var(--border)] max-w-md mx-auto"
    >
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-col items-center justify-center flex-1 h-full py-1 text-xs transition-colors"
            >
              {item.icon(isActive)}
              <span
                className={`mt-1 font-medium ${
                  isActive
                    ? "text-[var(--primary)] font-semibold"
                    : "text-[var(--muted-text)]"
                }`}
              >
                {item.name}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
