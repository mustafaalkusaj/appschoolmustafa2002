import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    ".next_bak_*/**",
    ".next_tmp_build_*/**",
    ".vercel/**",
    "out/**",
    "build/**",
    "dist/**",
    "node_modules/**",
    "next-env.d.ts",
    ".claude/**",
    // Ignore sibling projects and standalone artifacts that are not part of this Next.js app.
    "00990090/**",
    "school-acc-system/**",
    "school-saas-next/**",
    "artifacts/**",
    "app/____/**",
    "figma-handoff/**",
    "figma-handoff-backup-20260408/**",
    "output/**",
    "scripts/**/*.cjs",
    "load-test.js",
  ]),
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      "react-hooks/immutability": "off",
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/purity": "off",
      "react/no-unescaped-entities": "off",
      "prefer-const": "warn",
      "@typescript-eslint/no-unused-vars": ["error", { "argsIgnorePattern": "^_", "varsIgnorePattern": "^_" }],
    },
  },
]);

export default eslintConfig;
