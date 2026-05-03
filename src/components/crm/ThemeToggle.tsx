"use client";

import { useState } from "react";
import { type Theme, THEME_COOKIE } from "@/lib/theme";

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof document === "undefined") return "dark";
    const current = document.documentElement.dataset.theme as Theme | undefined;
    return current ?? "dark";
  });

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    document.cookie = `${THEME_COOKIE}=${next}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
    setTheme(next);
  }

  return (
    <button
      onClick={toggle}
      className="px-3 py-1 rounded border border-border-crm text-text-body hover:bg-bg-card text-sm"
      aria-label="Toggle theme"
    >
      {theme === "dark" ? "🌙" : "☀️"}
    </button>
  );
}
