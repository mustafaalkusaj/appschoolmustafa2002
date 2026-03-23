"use client";

import { useEffect, useState } from "react";

import { useLanguage } from "@/hooks/useLanguage";
import type { SystemSettings } from "@/lib/types";

interface SettingsPanelProps {
  settings: SystemSettings;
  onSave: (patch: Partial<SystemSettings>) => void;
}

export function SettingsPanel({ settings, onSave }: SettingsPanelProps) {
  const [form, setForm] = useState<SystemSettings>(settings);
  const { t } = useLanguage();

  useEffect(() => {
    setForm(settings);
  }, [settings]);

  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white/90 p-5 dark:border-slate-800 dark:bg-slate-900/70">
      <h2 className="mb-4 text-sm font-semibold text-slate-800 dark:text-slate-100">{t.superAdmin.settings.title}</h2>
      <div className="grid gap-3 md:grid-cols-2">
        <label className="text-sm text-slate-600 dark:text-slate-300">
          {t.superAdmin.settings.systemName}
          <input
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none ring-sky-500 focus:ring dark:border-slate-700 dark:bg-slate-950"
            value={form.systemName}
            onChange={(event) => setForm((current) => ({ ...current, systemName: event.target.value }))}
          />
        </label>
        <label className="text-sm text-slate-600 dark:text-slate-300">
          {t.superAdmin.settings.logoUrl}
          <input
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none ring-sky-500 focus:ring dark:border-slate-700 dark:bg-slate-950"
            value={form.logoUrl}
            onChange={(event) => setForm((current) => ({ ...current, logoUrl: event.target.value }))}
          />
        </label>
        <label className="text-sm text-slate-600 dark:text-slate-300">
          {t.superAdmin.settings.timezone}
          <input
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none ring-sky-500 focus:ring dark:border-slate-700 dark:bg-slate-950"
            value={form.timezone}
            onChange={(event) => setForm((current) => ({ ...current, timezone: event.target.value }))}
          />
        </label>
        <label className="text-sm text-slate-600 dark:text-slate-300">
          {t.superAdmin.settings.currency}
          <input
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none ring-sky-500 focus:ring dark:border-slate-700 dark:bg-slate-950"
            value={form.currency}
            onChange={(event) => setForm((current) => ({ ...current, currency: event.target.value }))}
          />
        </label>
      </div>

      <label className="mt-3 inline-flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
        <input
          type="checkbox"
          checked={form.allowSelfRegistration}
          onChange={(event) =>
            setForm((current) => ({
              ...current,
              allowSelfRegistration: event.target.checked,
            }))
          }
          className="h-4 w-4 rounded border-slate-300 text-sky-600"
        />
        {t.superAdmin.settings.allowSelfRegistration}
      </label>

      <div className="mt-4">
        <button
          type="button"
          onClick={() => onSave(form)}
          className="rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-500"
        >
          {t.superAdmin.settings.saveSettings}
        </button>
      </div>
    </section>
  );
}
