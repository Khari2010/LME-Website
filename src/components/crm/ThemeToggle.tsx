"use client";

import { useState } from "react";
import { type Theme, THEME_COOKIE } from "@/lib/theme";

export function ThemeToggle({ initialTheme }: { initialTheme: Theme }) {
  const [theme, setTheme] = useState<Theme>(initialTheme);

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
    document.cookie = `${THEME_COOKIE}=${next}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax${secure}`;
    setTheme(next);
  }

  return (
    <button
      onClick={toggle}
      className="px-3 py-1 rounded border border-border-crm text-text-body hover:bg-bg-card text-sm"
      aria-label="Toggle theme"
      aria-pressed={theme === "dark"}
    >
      {theme === "dark" ? "🌙" : "☀️"}
    </button>
  );
}
