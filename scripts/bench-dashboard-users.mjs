import fs from "node:fs";
import { performance } from "node:perf_hooks";

const storage = JSON.parse(
  fs.readFileSync(new URL("../artifacts/reliability-audit/admin-storage-state.json", import.meta.url), "utf8"),
);
const cookie = storage.cookies.map((entry) => `${entry.name}=${entry.value}`).join("; ");
const baseUrl = process.env.BENCH_URL ?? "http://127.0.0.1:3100/api/dashboard/users?role=teacher&page=1&pageSize=25";

async function measure(url, runs) {
  const rows = [];

  for (let index = 0; index < runs; index += 1) {
    const startedAt = performance.now();
    const response = await fetch(url, {
      headers: {
        Cookie: cookie,
      },
    });

    await response.text();
    rows.push({
      ms: Math.round(performance.now() - startedAt),
      cache: response.headers.get("x-managed-users-cache") ?? "NONE",
      status: response.status,
    });
  }

  return rows;
}

function summarize(rows) {
  const sorted = [...rows].sort((left, right) => left.ms - right.ms);

  return {
    avg: Math.round(rows.reduce((sum, row) => sum + row.ms, 0) / rows.length),
    p95: sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * 0.95) - 1)].ms,
    rows,
  };
}

const uncached = await measure(`${baseUrl}&cache=0`, 5);
await measure(baseUrl, 1);
const cached = await measure(baseUrl, 5);

console.log(JSON.stringify({ uncached: summarize(uncached), cached: summarize(cached) }, null, 2));
