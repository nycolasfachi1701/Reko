"use client";

function SunIcon() {
  return (
    <svg
      className="theme-ico-sun h-[18px] w-[18px]"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden
    >
      <circle cx="12" cy="12" r="4.5" />
      <path d="M12 2v2M12 20v2M4 12H2M22 12h-2M5 5 3.6 3.6M20.4 20.4 19 19M19 5l1.4-1.4M3.6 20.4 5 19" />
    </svg>
  );
}
function MoonIcon() {
  return (
    <svg
      className="theme-ico-moon h-[18px] w-[18px]"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
    >
      <path d="M20 14.5A8 8 0 0 1 9.5 4a.6.6 0 0 0-.82-.7A9 9 0 1 0 20.7 15.3a.6.6 0 0 0-.7-.8z" />
    </svg>
  );
}

export function ThemeToggle({ className = "" }: { className?: string }) {
  function toggle() {
    const root = document.documentElement;
    const current = root.getAttribute("data-theme");
    const system = window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
    const effective = current ?? system;
    const next = effective === "dark" ? "light" : "dark";
    root.setAttribute("data-theme", next);
    try {
      localStorage.setItem("reko-theme", next);
    } catch {
      /* ignora */
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Alternar tema claro/escuro"
      className={`grid h-10 w-10 place-items-center rounded-sm border border-[var(--border-strong)] bg-surface-1 text-fg-lo transition-colors hover:bg-surface-2 hover:text-fg-hi ${className}`}
    >
      <SunIcon />
      <MoonIcon />
    </button>
  );
}
