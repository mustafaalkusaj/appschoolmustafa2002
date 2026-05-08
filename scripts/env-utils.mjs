import fs from "node:fs";
import path from "node:path";

const ENV_FILE_ORDER = [
  ".env",
  ".env.production",
  ".env.local",
  ".env.production.local",
];

function stripInlineComment(value) {
  let inSingleQuotes = false;
  let inDoubleQuotes = false;

  for (let index = 0; index < value.length; index += 1) {
    const current = value[index];
    const previous = value[index - 1];

    if (current === "'" && !inDoubleQuotes && previous !== "\\") {
      inSingleQuotes = !inSingleQuotes;
      continue;
    }

    if (current === '"' && !inSingleQuotes && previous !== "\\") {
      inDoubleQuotes = !inDoubleQuotes;
      continue;
    }

    if (current === "#" && !inSingleQuotes && !inDoubleQuotes) {
      return value.slice(0, index).trimEnd();
    }
  }

  return value.trimEnd();
}

function unquote(value) {
  const trimmed = value.trim();

  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    const inner = trimmed.slice(1, -1);
    return inner
      .replace(/\\n/g, "\n")
      .replace(/\\r/g, "\r")
      .replace(/\\"/g, '"')
      .replace(/\\'/g, "'");
  }

  return trimmed;
}

export function parseEnvFile(filePath) {
  const contents = fs.readFileSync(filePath, "utf8");
  const parsed = {};

  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    const equalsIndex = rawLine.indexOf("=");
    if (equalsIndex <= 0) {
      continue;
    }

    const key = rawLine.slice(0, equalsIndex).trim();
    if (!key || !/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) {
      continue;
    }

    const rawValue = rawLine.slice(equalsIndex + 1);
    parsed[key] = unquote(stripInlineComment(rawValue));
  }

  return parsed;
}

export function loadProductionEnv(cwd = process.cwd(), { skipLocalOverrides = false } = {}) {
  const env = {};
  const loadedFiles = [];

  const filesToLoad = skipLocalOverrides
    ? ENV_FILE_ORDER.filter((f) => f !== ".env.local" && f !== ".env.production.local")
    : ENV_FILE_ORDER;

  for (const fileName of filesToLoad) {
    const filePath = path.join(cwd, fileName);
    if (!fs.existsSync(filePath)) {
      continue;
    }

    Object.assign(env, parseEnvFile(filePath));
    loadedFiles.push(fileName);
  }

  for (const [key, value] of Object.entries(process.env)) {
    if (typeof value === "string" && value.length > 0) {
      env[key] = value;
    }
  }

  return { env, loadedFiles };
}

function normalizeProductionDbUrl(value) {
  const trimmed = value?.trim();
  if (!trimmed) {
    return "";
  }

  if (
    /(^|[@/:])(localhost|127\.0\.0\.1|\[::1\]|::1)([:/]|$)/i.test(trimmed)
  ) {
    return "";
  }

  return trimmed;
}

export function buildProductionEnv(cwd = process.cwd()) {
  const { env, loadedFiles } = loadProductionEnv(cwd);
  const output = { ...env };

  output.NODE_ENV = "production";
  output.HOSTNAME = env.HOSTNAME?.trim() || "127.0.0.1";
  output.PORT = env.PORT?.trim() || "3001";
  output.APP_URL =
    env.APP_URL?.trim() ||
    env.NEXT_PUBLIC_APP_URL?.trim() ||
    "https://school-iraq.com";
  output.SESSION_COOKIE_SECURE = env.SESSION_COOKIE_SECURE?.trim() || "true";

  const databaseUrl = normalizeProductionDbUrl(output.DATABASE_URL);
  const supabaseDbUrl = normalizeProductionDbUrl(output.SUPABASE_DB_URL);

  if (databaseUrl) {
    output.DATABASE_URL = databaseUrl;
  } else {
    delete output.DATABASE_URL;
  }

  if (supabaseDbUrl) {
    output.SUPABASE_DB_URL = supabaseDbUrl;
  } else {
    delete output.SUPABASE_DB_URL;
  }

  if (!output.SUPABASE_DB_URL && output.DATABASE_URL) {
    output.SUPABASE_DB_URL = output.DATABASE_URL;
  }

  if (!output.DATABASE_URL && output.SUPABASE_DB_URL) {
    output.DATABASE_URL = output.SUPABASE_DB_URL;
  }

  return { env: output, loadedFiles };
}

export function writeEnvFile(filePath, env) {
  const lines = [];

  for (const [key, value] of Object.entries(env)) {
    if (typeof value !== "string" || value.length === 0) {
      continue;
    }

    if (/[\r\n]/.test(value)) {
      throw new Error(`Environment value for ${key} contains a newline and cannot be written safely.`);
    }

    lines.push(`${key}=${value}`);
  }

  fs.writeFileSync(filePath, `${lines.join("\n")}\n`, "utf8");
}
