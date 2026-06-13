import "server-only";

import type { InlineKeyboard } from "@/lib/ops/telegram-bot-api";

const VERCEL_API = "https://api.vercel.com";

function escHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function vercelHeaders(): Record<string, string> {
  return {
    Authorization: `Bearer ${process.env.VERCEL_API_TOKEN ?? ""}`,
    "Content-Type": "application/json",
  };
}

function checkToken(): string | null {
  if (!process.env.VERCEL_API_TOKEN) {
    return "⚠️ VERCEL_API_TOKEN غير مضبوط";
  }
  return null;
}

function getProjectId(): string {
  return process.env.VERCEL_PROJECT_ID ?? "";
}

function getTeamId(): string {
  return process.env.VERCEL_TEAM_ID ?? "";
}

function teamParam(): string {
  const teamId = getTeamId();
  return teamId ? `&teamId=${teamId}` : "";
}

// ─── getDeployments ───────────────────────────────────────────────────────────

export async function getDeployments(): Promise<string> {
  const tokenErr = checkToken();
  if (tokenErr) return tokenErr;

  try {
    const projectId = getProjectId();
    const url = `${VERCEL_API}/v6/deployments?projectId=${projectId}${teamParam()}&limit=5`;

    const res = await fetch(url, {
      headers: vercelHeaders(),
      signal: AbortSignal.timeout(15_000),
    });

    if (!res.ok) {
      return `❌ Vercel API: ${res.status} ${escHtml(res.statusText)}`;
    }

    const json = (await res.json()) as {
      deployments?: Array<{
        uid: string;
        state: string;
        created: number;
        meta?: { githubCommitMessage?: string };
        url?: string;
      }>;
    };

    const deps = json.deployments ?? [];
    if (deps.length === 0) {
      return "🚀 لا توجد deployments.";
    }

    const lines = [`🚀 <b>آخر Deployments</b>`, ""];

    for (const d of deps) {
      const icon = d.state === "READY" ? "✅" : d.state === "ERROR" ? "❌" : "⏳";
      const shortId = d.uid.slice(0, 12);
      const date = new Date(d.created).toLocaleDateString("ar-IQ", { timeZone: "Asia/Baghdad" });
      const commitMsg = d.meta?.githubCommitMessage
        ? escHtml(d.meta.githubCommitMessage.slice(0, 50))
        : "—";
      lines.push(`${icon} <code>${escHtml(shortId)}</code> — ${escHtml(d.state)}`);
      lines.push(`   ${date} — ${commitMsg}`);
    }

    return lines.join("\n").slice(0, 4000);
  } catch (err) {
    return `❌ خطأ: ${escHtml(String(err instanceof Error ? err.message : err ?? ""))}`;
  }
}

// ─── getBuildLogs ─────────────────────────────────────────────────────────────

export async function getBuildLogs(deploymentId: string): Promise<string> {
  const tokenErr = checkToken();
  if (tokenErr) return tokenErr;

  if (!deploymentId) {
    return "⚠️ مطلوب: deployment ID";
  }

  try {
    const url = `${VERCEL_API}/v2/deployments/${encodeURIComponent(deploymentId)}/events?direction=forward&limit=20${teamParam()}`;

    const res = await fetch(url, {
      headers: vercelHeaders(),
      signal: AbortSignal.timeout(15_000),
    });

    if (!res.ok) {
      return `❌ Vercel API: ${res.status} ${escHtml(res.statusText)}`;
    }

    const events = (await res.json()) as Array<{
      type?: string;
      text?: string;
      date?: number;
    }>;

    if (!events || events.length === 0) {
      return `📋 لا توجد سجلات للـ deployment: <code>${escHtml(deploymentId.slice(0, 12))}</code>`;
    }

    const lines = [
      `📋 <b>Build Logs — ${escHtml(deploymentId.slice(0, 12))}</b>`,
      "",
    ];

    for (const e of events.slice(-20)) {
      if (e.text) {
        lines.push(escHtml(e.text.slice(0, 150)));
      }
    }

    return lines.join("\n").slice(0, 4000);
  } catch (err) {
    return `❌ خطأ: ${escHtml(String(err instanceof Error ? err.message : err ?? ""))}`;
  }
}

// ─── getRuntimeLogs ───────────────────────────────────────────────────────────

export async function getRuntimeLogs(): Promise<string> {
  const tokenErr = checkToken();
  if (tokenErr) return tokenErr;

  try {
    // Get latest deployment first
    const projectId = getProjectId();
    const depsUrl = `${VERCEL_API}/v6/deployments?projectId=${projectId}${teamParam()}&limit=1&state=READY`;

    const depsRes = await fetch(depsUrl, {
      headers: vercelHeaders(),
      signal: AbortSignal.timeout(15_000),
    });

    if (!depsRes.ok) {
      return `❌ Vercel API: ${depsRes.status}`;
    }

    const depsJson = (await depsRes.json()) as {
      deployments?: Array<{ uid: string }>;
    };
    const latestId = depsJson.deployments?.[0]?.uid;

    if (!latestId) {
      return "⚠️ لا يوجد deployment جاهز.";
    }

    const logsUrl = `${VERCEL_API}/v2/deployments/${encodeURIComponent(latestId)}/events?direction=backward&limit=20${teamParam()}`;

    const logsRes = await fetch(logsUrl, {
      headers: vercelHeaders(),
      signal: AbortSignal.timeout(15_000),
    });

    if (!logsRes.ok) {
      return `❌ Vercel Logs API: ${logsRes.status}`;
    }

    const events = (await logsRes.json()) as Array<{
      type?: string;
      text?: string;
      level?: string;
    }>;

    if (!events || events.length === 0) {
      return `📋 لا توجد سجلات runtime حديثة.`;
    }

    const filtered = events.filter(
      (e) => e.text && (e.level === "error" || e.level === "warning" || !e.level),
    );

    const toShow = filtered.length > 0 ? filtered : events;

    const lines = [`📋 <b>Runtime Logs — ${escHtml(latestId.slice(0, 12))}</b>`, ""];

    for (const e of toShow.slice(-20)) {
      if (e.text) {
        const icon = e.level === "error" ? "❌" : e.level === "warning" ? "⚠️" : "•";
        lines.push(`${icon} ${escHtml(e.text.slice(0, 150))}`);
      }
    }

    return lines.join("\n").slice(0, 4000);
  } catch (err) {
    return `❌ خطأ: ${escHtml(String(err instanceof Error ? err.message : err ?? ""))}`;
  }
}

// ─── getVercelEnvVars ─────────────────────────────────────────────────────────

export async function getVercelEnvVars(): Promise<string> {
  const tokenErr = checkToken();
  if (tokenErr) return tokenErr;

  try {
    const projectId = getProjectId();
    const url = `${VERCEL_API}/v9/projects/${encodeURIComponent(projectId)}/env${getTeamId() ? `?teamId=${getTeamId()}` : ""}`;

    const res = await fetch(url, {
      headers: vercelHeaders(),
      signal: AbortSignal.timeout(15_000),
    });

    if (!res.ok) {
      return `❌ Vercel API: ${res.status} ${escHtml(res.statusText)}`;
    }

    const json = (await res.json()) as {
      envs?: Array<{
        key: string;
        value?: string;
        type: string;
        target?: string[];
      }>;
    };

    const envs = json.envs ?? [];
    if (envs.length === 0) {
      return "⚙️ لا توجد متغيرات بيئة.";
    }

    // Group by type
    const groups: Record<string, typeof envs> = {};
    for (const e of envs) {
      const t = e.type ?? "plain";
      if (!groups[t]) groups[t] = [];
      groups[t].push(e);
    }

    const lines = [`⚙️ <b>Vercel Env Vars (${envs.length})</b>`, ""];

    for (const [type, vars] of Object.entries(groups)) {
      lines.push(`<b>${escHtml(type)}</b>:`);
      for (const v of vars.slice(0, 20)) {
        const masked =
          v.value && v.value.length > 4
            ? "***" + v.value.slice(-4)
            : v.value
              ? "****"
              : "[encrypted]";
        lines.push(`  • <code>${escHtml(v.key)}</code> = ${escHtml(masked)}`);
      }
    }

    return lines.join("\n").slice(0, 4000);
  } catch (err) {
    return `❌ خطأ: ${escHtml(String(err instanceof Error ? err.message : err ?? ""))}`;
  }
}

// ─── setVercelEnvVar ──────────────────────────────────────────────────────────

export async function setVercelEnvVar(key: string, value: string): Promise<string> {
  const tokenErr = checkToken();
  if (tokenErr) return tokenErr;

  if (!key) return "⚠️ مطلوب: key و value";

  try {
    const projectId = getProjectId();
    const teamQuery = getTeamId() ? `?teamId=${getTeamId()}` : "";

    // First get existing env to find id
    const listUrl = `${VERCEL_API}/v9/projects/${encodeURIComponent(projectId)}/env${teamQuery}`;
    const listRes = await fetch(listUrl, {
      headers: vercelHeaders(),
      signal: AbortSignal.timeout(15_000),
    });

    const listJson = listRes.ok
      ? ((await listRes.json()) as { envs?: Array<{ id: string; key: string }> })
      : null;

    const existing = listJson?.envs?.find((e) => e.key === key);

    if (existing) {
      // PATCH existing
      const patchUrl = `${VERCEL_API}/v9/projects/${encodeURIComponent(projectId)}/env/${existing.id}${teamQuery}`;
      const patchRes = await fetch(patchUrl, {
        method: "PATCH",
        headers: vercelHeaders(),
        body: JSON.stringify({ value, target: ["production", "preview"] }),
        signal: AbortSignal.timeout(15_000),
      });

      if (!patchRes.ok) {
        return `❌ فشل التحديث: ${patchRes.status}`;
      }

      return `✅ تم تحديث <code>${escHtml(key)}</code>`;
    }

    // POST new
    const postUrl = `${VERCEL_API}/v9/projects/${encodeURIComponent(projectId)}/env${teamQuery}`;
    const postRes = await fetch(postUrl, {
      method: "POST",
      headers: vercelHeaders(),
      body: JSON.stringify([{ key, value, type: "encrypted", target: ["production", "preview"] }]),
      signal: AbortSignal.timeout(15_000),
    });

    if (!postRes.ok) {
      return `❌ فشل الإنشاء: ${postRes.status}`;
    }

    return `✅ تم إنشاء المتغير <code>${escHtml(key)}</code>`;
  } catch (err) {
    return `❌ خطأ: ${escHtml(String(err instanceof Error ? err.message : err ?? ""))}`;
  }
}

// ─── vercelMenuKeyboard ───────────────────────────────────────────────────────

export function vercelMenuKeyboard(): InlineKeyboard {
  return [
    [
      { text: "🚀 Deployments", callback_data: "cmd_deploys" },
      { text: "📋 Logs", callback_data: "cmd_vcllogs" },
    ],
    [
      { text: "⚙️ Env Vars", callback_data: "cmd_vclenv" },
      { text: "🔙 الرئيسية", callback_data: "menu_main" },
    ],
  ];
}
