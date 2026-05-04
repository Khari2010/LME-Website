// Flat-config eslint setup. `next lint` was deprecated in Next.js 16, so the
// `pnpm lint` script invokes `eslint .` directly against this config.
//
// Goal: lint runs at all. Warnings are acceptable; errors should be 0 or
// disabled-with-comment. Don't burn time chasing pre-existing style nits —
// this is a guardrail for new code, not a code mod.

import nextPlugin from "@next/eslint-plugin-next";
import tsParser from "@typescript-eslint/parser";
import tsPlugin from "@typescript-eslint/eslint-plugin";
import reactPlugin from "eslint-plugin-react";
import reactHooksPlugin from "eslint-plugin-react-hooks";

export default [
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "convex/_generated/**",
      "out/**",
      ".vercel/**",
      ".convex/**",
      "next-env.d.ts",
      "tsconfig.tsbuildinfo",
      "LME_Brand_Kit_V5.html",
    ],
  },
  {
    files: ["**/*.{ts,tsx,js,jsx,mjs}"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaFeatures: { jsx: true },
        ecmaVersion: "latest",
        sourceType: "module",
      },
    },
    plugins: {
      "@typescript-eslint": tsPlugin,
      react: reactPlugin,
      "react-hooks": reactHooksPlugin,
      "@next/next": nextPlugin,
    },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs["core-web-vitals"].rules,
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
    },
    settings: {
      react: { version: "detect" },
    },
  },
];
