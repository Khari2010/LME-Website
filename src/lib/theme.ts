export type Theme = "light" | "dark";
export const THEME_COOKIE = "lme_theme";

export function resolveInitialTheme(input: {
  cookie: Theme | string | null | undefined;
  systemPrefersDark: boolean;
}): Theme {
  if (input.cookie === "dark") return "dark";
  if (input.cookie === "light") return "light";
  return input.systemPrefersDark ? "dark" : "light";
}
