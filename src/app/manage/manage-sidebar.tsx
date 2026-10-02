"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

type Item = { href: string; label: string; icon: ReactNode; exact?: boolean };

function IconPanel() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3 3v18h18" />
      <rect x="7" y="11" width="3" height="7" rx="1" />
      <rect x="13" y="7" width="3" height="11" rx="1" />
    </svg>
  );
}
function IconVideos() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="2" y="5" width="15" height="14" rx="2.5" />
      <path d="m17 9 5-3v12l-5-3" />
    </svg>
  );
}
function IconTracks() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="m12 3 9 5-9 5-9-5 9-5Z" />
      <path d="m3 13 9 5 9-5" />
    </svg>
  );
}
function IconUsers() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3.5 19a5.5 5.5 0 0 1 11 0" />
      <path d="M16 6.2a3 3 0 0 1 0 5.6M18.5 19a5.5 5.5 0 0 0-3-4.9" />
    </svg>
  );
}
function IconExternal() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M15 3h6v6M21 3l-9 9" />
      <path d="M19 13.5V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h5.5" />
    </svg>
  );
}

function items(isAdmin: boolean): Item[] {
  const base: Item[] = [
    { href: "/manage", label: "Painel", icon: <IconPanel />, exact: true },
    { href: "/manage/videos", label: "Vídeos", icon: <IconVideos /> },
    { href: "/manage/tracks", label: "Trilhas", icon: <IconTracks /> },
  ];
  if (isAdmin) {
    base.push({ href: "/manage/access", label: "Acessos", icon: <IconUsers /> });
  }
  return base;
}

function isActive(pathname: string, item: Item): boolean {
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

// Menu lateral da gestão (desktop ≥1024px).
export function ManageSidebar({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();
  const list = items(isAdmin);
  return (
    <aside className="rk-side">
      <Link href="/manage" className="rk-side-brand" aria-label="Reko">
        <span className="rk-glyph" aria-hidden>
          R
        </span>
        <span className="font-display text-[20px] font-extrabold tracking-tight">Reko</span>
      </Link>
      <nav className="flex flex-col gap-1" aria-label="Gestão">
        {list.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="rk-nav-item"
            aria-current={isActive(pathname, item)}
          >
            {item.icon}
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>
      <Link href="/" className="rk-nav-item mt-auto">
        <IconExternal />
        <span>Ver site</span>
      </Link>
    </aside>
  );
}

// Navegação da gestão em telas pequenas (pílulas roláveis no topo).
export function ManageMobileNav({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();
  const list = items(isAdmin);
  return (
    <div className="mx-auto w-full max-w-6xl px-6">
      <nav className="rk-nav-mobile" aria-label="Gestão">
        {list.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="rk-nav-pill"
            aria-current={isActive(pathname, item)}
          >
            {item.icon}
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
