import { FlatCompat } from "@eslint/eslintrc";
const compat = new FlatCompat({ baseDirectory: import.meta.dirname });
const config = [
  { ignores: [".next/**", "out/**", "**/dist/**", "**/node_modules/**", "**/.aws-sam/**", "next-env.d.ts"] },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  // Existing prototype uses broad types and native camera image previews.
  { rules: { "@typescript-eslint/no-explicit-any": "off", "@typescript-eslint/no-unused-vars": ["warn", { "argsIgnorePattern": "^_", "varsIgnorePattern": "^_" }], "@next/next/no-img-element": "off", "react-hooks/exhaustive-deps": "warn" } }
];

export default config;
