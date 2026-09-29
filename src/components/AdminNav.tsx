"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/admin", label: "Tamu" },
  { href: "/admin/scan", label: "Scan QR" },
];

export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav className="flex w-full rounded-xl bg-zinc-100 p-1 text-sm font-medium sm:w-auto">
      {LINKS.map((link) => (
        <Link key={link.href} href={link.href}
          className={`flex-1 rounded-lg px-4 py-2 text-center transition sm:flex-none ${
            pathname === link.href ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-900"
          }`}>
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
