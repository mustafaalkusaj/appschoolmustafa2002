import path from "node:path";

import { buildProductionEnv, writeEnvFile } from "./env-utils.mjs";

const requiredEnvKeys = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "RBAC_COOKIE_SECRET",
  "HEALTHCHECK_TOKEN",
];

const outputPath = process.argv[2];

if (!outputPath) {
  console.error("Usage: node scripts/render-production-env.mjs <output-path>");
  process.exit(1);
}

const { env, loadedFiles } = buildProductionEnv();
const missingRequired = requiredEnvKeys.filter(
  (key) => typeof env[key] !== "string" || env[key].trim().length === 0,
);

if (missingRequired.length > 0) {
  console.error(
    `[render-production-env] Missing required env vars: ${missingRequired.join(", ")}`,
  );
  process.exit(1);
}

writeEnvFile(path.resolve(outputPath), env);

if (loadedFiles.length > 0) {
  console.log(
    `[render-production-env] Wrote ${outputPath} using ${loadedFiles.join(", ")} and process.env.`,
  );
} else {
  console.log(`[render-production-env] Wrote ${outputPath} using process.env only.`);
}
