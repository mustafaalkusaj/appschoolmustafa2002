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
    "out/**",
    "build/**",
    "next-env.d.ts",
    ".claude/**",
    // Ignore sibling projects and standalone artifacts that are not part of this Next.js app.
    "00990090/**",
    "school-acc-system/**",
    "school-saas-next/**",
    "artifacts/**",
    "scripts/**/*.cjs",
    "load-test.js",
  ]),
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "react-hooks/immutability": "off",
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/purity": "off",
      "react/no-unescaped-entities": "off",
      "prefer-const": "off",
    },
  },
]);

export default eslintConfig;
