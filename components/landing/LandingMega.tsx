"use client";

import * as React from "react";
import { useEffect, useMemo, useState } from "react";
import {
  CHECK_ICON,
  DOWNLOAD_ICON,
  PLAY_ICON,
  type LandingContent,
} from "@/lib/landing-content";
import {
  CheckCircle2,
  MapPin,
  MessageSquare,
  Server,
  ShieldCheck,
  Sparkles,
  XCircle,
} from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/ui/form-field";
import { Reveal } from "@/components/landing/Reveal";
import { Counter, LiveActivity } from "@/components/landing/motion-primitives";
import {
  AutoCarousel,
  ProgressRing,
  SectionAccent,
} from "@/components/landing/motion-extras";
import { EyebrowPill, SectionHeading } from "@/components/landing/LandingSections";

const SECTION = "scroll-mt-24 px-4 py-20 sm:px-6 sm:py-28 lg:px-8";

// ── Inline send icon (lib/icons has no Send) ────────────────────────────────

function SendIcon({ size = 16, className }: { size?: number; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M22 2 11 13" />
      <path d="M22 2 15 22l-4-9-9-4Z" />
    </svg>
  );
}

// ── Live system counter ─────────────────────────────────────────────────────

export function LiveSystemSection({ content }: { content: LandingContent["liveSystem"] }) {
  return (
    <section id="live-system" className={SECTION}>
      <div className="mx-auto max-w-7xl">
        <SectionHeading eyebrow={content.eyebrow} title={content.title} description={content.description} center />
        <Reveal index={1}>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {content.counts.map((stat, i) => (
              <div
                key={stat.label}
                className="rounded-[var(--radius-2xl)] border border-[var(--border)] bg-[var(--surface-strong)] p-6 text-center shadow-[var(--shadow-sm)]"
              >
                <div dir="ltr" className="text-3xl font-black text-[var(--text-primary)] sm:text-4xl">
                  <Counter to={stat.to} suffix={stat.suffix} />
                </div>
                <div className="mt-2 text-sm font-bold text-[var(--text-secondary)]">{stat.label}</div>
                {i === 0 ? (
                  <SectionAccent className="mt-4 block h-0.5 w-full origin-left rounded-full bg-[linear-gradient(90deg,var(--primary),var(--secondary),transparent)]" />
                ) : null}
              </div>
            ))}
          </div>
        </Reveal>
        <p className="mt-6 text-center text-xs font-semibold text-[var(--text-tertiary)]">{content.label}</p>
      </div>
    </section>
  );
}

// ── Iraq map ────────────────────────────────────────────────────────────────

export function IraqMapSection({ content }: { content: LandingContent["iraqMap"] }) {
  return (
    <section id="map" className={`${SECTION} bg-[var(--background-subtle)]`}>
      <div className="mx-auto max-w-7xl">
        <SectionHeading eyebrow={content.eyebrow} title={content.title} description={content.description} center />
        <Reveal index={1}>
          <div className="mx-auto mt-12 max-w-3xl">
            <div className="relative aspect-[4/5] overflow-hidden rounded-[var(--radius-2xl)] border border-[var(--border)] bg-[linear-gradient(180deg,var(--surface-strong),var(--background-subtle))] shadow-[var(--shadow-md)]">
              <svg viewBox="0 0 100 125" className="absolute inset-0 h-full w-full" preserveAspectRatio="none" aria-hidden="true">
                <defs>
                  <linearGradient id="mapGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.08" />
                    <stop offset="100%" stopColor="var(--secondary)" stopOpacity="0.05" />
                  </linearGradient>
                </defs>
                <path
                  d="M 38 8 L 52 6 L 64 14 L 70 24 L 66 36 L 70 48 L 58 60 L 52 70 L 60 78 L 70 86 L 66 100 L 50 112 L 36 108 L 30 96 L 36 84 L 30 70 L 36 56 L 30 42 L 34 28 Z"
                  fill="url(#mapGrad)"
                  stroke="var(--border-strong)"
                  strokeWidth="0.4"
                  strokeDasharray="0.6 0.4"
                />
              </svg>
              {content.cities.map((c, i) => (
                <div
                  key={c.name}
                  className="absolute -translate-x-1/2 -translate-y-1/2"
                  style={{ left: `${c.x}%`, top: `${c.y}%` }}
                >
                  <div className="relative">
                    <span
                      className="absolute inset-0 -m-2 inline-block rounded-full bg-[var(--primary)]/30 motion-safe:animate-ping"
                      style={{ animationDelay: `${i * 0.25}s` }}
                    />
                    <span className="relative inline-block h-2.5 w-2.5 rounded-full bg-[var(--primary)] shadow-[0_0_10px_rgba(79,140,255,0.6)]" />
                    <span className="absolute top-3 start-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] font-extrabold text-[var(--text-primary)]">
                      {c.name}
                    </span>
                  </div>
                </div>
              ))}
              <div className="absolute bottom-3 end-3 inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface-strong)] px-3 py-1.5 text-xs font-bold text-[var(--text-secondary)] shadow-[var(--shadow-xs)]">
                <MapPin size={14} className="text-[var(--primary)]" />
                {content.cities.length}+
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

// ── Savings calculator ──────────────────────────────────────────────────────

const HOURS_PER_STUDENT_PER_DAY = 4 / 60;
const SCHOOL_DAYS = 200;
const HOURLY_WAGE = 5000;

function formatNumber(n: number) {
  return n.toLocaleString("en-US");
}

export function SavingsCalculatorSection({ content }: { content: LandingContent["savingsCalc"] }) {
  const [students, setStudents] = useState(300);
  const hours = Math.round(students * HOURS_PER_STUDENT_PER_DAY * SCHOOL_DAYS);
  const days = Math.round(hours / 8);
  const money = hours * HOURLY_WAGE;

  return (
    <section id="savings" className={SECTION}>
      <div className="mx-auto max-w-5xl">
        <SectionHeading eyebrow={content.eyebrow} title={content.title} description={content.description} center />
        <Reveal index={1}>
          <div className="mt-12 rounded-[var(--radius-2xl)] border border-[var(--border)] bg-[var(--surface-strong)] p-8 shadow-[var(--shadow-lg)] sm:p-10">
            <label className="block text-sm font-bold text-[var(--text-secondary)]" htmlFor="students-input">
              {content.studentsLabel}
            </label>
            <div className="mt-4 flex items-center gap-5">
              <input
                id="students-input"
                type="range"
                min={50}
                max={3000}
                step={10}
                value={students}
                onChange={(e) => setStudents(Number(e.target.value))}
                className="h-2 flex-1 cursor-pointer appearance-none rounded-full bg-[var(--background-subtle)] accent-[var(--primary)]"
              />
              <span dir="ltr" className="w-24 text-end text-2xl font-black text-[var(--primary)]">
                {formatNumber(students)}
              </span>
            </div>
            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              {[
                { value: formatNumber(hours), label: content.hoursPerYearLabel },
                { value: formatNumber(days), label: content.daysPerYearLabel },
                { value: `${formatNumber(money)} ${content.moneySuffix}`, label: content.moneyPerYearLabel },
              ].map((row) => (
                <div key={row.label} className="rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface-soft)] p-5 text-center">
                  <div dir="ltr" className="text-2xl font-black text-[var(--text-primary)]">{row.value}</div>
                  <div className="mt-1 text-xs font-bold text-[var(--text-secondary)]">{row.label}</div>
                </div>
              ))}
            </div>
            <p className="mt-6 text-xs text-[var(--text-tertiary)]">{content.note}</p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

// ── Timeline ───────────────────────────────────────────────────────────────

export function TimelineSection({ content }: { content: LandingContent["timeline"] }) {
  return (
    <section id="day-timeline" className={`${SECTION} bg-[var(--background-subtle)]`}>
      <div className="mx-auto max-w-4xl">
        <SectionHeading eyebrow={content.eyebrow} title={content.title} description={content.description} center />
        <div className="relative mt-12">
          <div
            aria-hidden="true"
            className="absolute bottom-0 top-0 w-0.5 bg-[linear-gradient(180deg,var(--primary),var(--secondary),transparent)] start-5 sm:start-[calc(50%-1px)]"
          />
          <ul className="space-y-8">
            {content.events.map((ev, i) => {
              const Icon = ev.icon;
              const left = i % 2 === 0;
              return (
                <Reveal key={ev.title} index={i} as="li">
                  <div className="relative ps-12 sm:ps-0 sm:grid sm:grid-cols-2 sm:gap-12">
                    <div className={`${left ? "sm:order-1 sm:pe-8 sm:text-end" : "sm:order-3 sm:col-start-2 sm:ps-8"}`}>
                      <div className="inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-wide text-[var(--primary-strong)]">
                        <span className="font-mono" dir="ltr">{ev.time}</span>
                      </div>
                      <h3 className="mt-2 text-lg font-black text-[var(--text-primary)]">{ev.title}</h3>
                      <p className="mt-1 text-sm leading-7 text-[var(--text-secondary)]">{ev.desc}</p>
                    </div>
                    <div className="absolute top-1 start-0 sm:static sm:order-2 sm:flex sm:items-center sm:justify-center">
                      <span className="relative inline-flex h-10 w-10 items-center justify-center rounded-full bg-[linear-gradient(135deg,var(--primary),var(--secondary))] text-white shadow-[var(--shadow-primary)]">
                        <Icon size={18} />
                      </span>
                    </div>
                  </div>
                </Reveal>
              );
            })}
          </ul>
        </div>
      </div>
    </section>
  );
}

// ── Roles selector ─────────────────────────────────────────────────────────

export function RolesSection({ content }: { content: LandingContent["roles"] }) {
  const [active, setActive] = useState(0);
  const tab = content.tabs[active];
  return (
    <section id="roles" className={SECTION}>
      <div className="mx-auto max-w-7xl">
        <SectionHeading eyebrow={content.eyebrow} title={content.title} description={content.description} center />
        <div className="mt-10 flex flex-wrap justify-center gap-2">
          {content.tabs.map((t, i) => {
            const Icon = t.icon;
            const isActive = i === active;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setActive(i)}
                aria-pressed={isActive}
                className={[
                  "inline-flex items-center gap-2 rounded-full border px-5 py-2.5 text-sm font-extrabold transition-all",
                  isActive
                    ? "border-[var(--primary)] bg-[var(--primary)] text-white shadow-[var(--shadow-primary)]"
                    : "border-[var(--border)] bg-[var(--surface-strong)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]",
                ].join(" ")}
              >
                <Icon size={16} />
                {t.label}
              </button>
            );
          })}
        </div>
        <Reveal index={1} key={tab.key}>
          <div className="mt-10 rounded-[var(--radius-2xl)] border border-[var(--border)] bg-[var(--surface-strong)] p-8 shadow-[var(--shadow-md)] sm:p-10">
            <p className="text-center text-base font-bold text-[var(--text-secondary)]">{tab.description}</p>
            <div className="mt-8 grid gap-5 sm:grid-cols-3">
              {tab.features.map((f) => {
                const Icon = f.icon;
                return (
                  <div key={f.title} className="rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface-soft)] p-5">
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-[var(--radius-md)] bg-[var(--primary-soft)] text-[var(--primary)]">
                      <Icon size={18} />
                    </span>
                    <h4 className="mt-3 text-base font-black text-[var(--text-primary)]">{f.title}</h4>
                    <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">{f.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

// ── Template bank ──────────────────────────────────────────────────────────

export function TemplateBankSection({ content }: { content: LandingContent["templates"] }) {
  const [focused, setFocused] = useState<number | null>(null);
  return (
    <section id="templates" className={`${SECTION} bg-[var(--background-subtle)]`}>
      <div className="mx-auto max-w-7xl">
        <SectionHeading eyebrow={content.eyebrow} title={content.title} description={content.description} center />
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {content.items.map((it, i) => {
            const Icon = it.icon;
            const isFocused = focused === i;
            return (
              <Reveal key={it.title} index={i}>
                <button
                  type="button"
                  onClick={() => setFocused(isFocused ? null : i)}
                  className={[
                    "group flex w-full items-start gap-4 rounded-[var(--radius-2xl)] border bg-[var(--surface-strong)] p-6 text-start shadow-[var(--shadow-sm)] transition-all duration-300",
                    isFocused
                      ? "scale-[1.02] border-[var(--primary)] shadow-[var(--shadow-lg)]"
                      : "border-[var(--border)] hover:-translate-y-1 hover:shadow-[var(--shadow-md)]",
                  ].join(" ")}
                >
                  <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[linear-gradient(135deg,var(--primary),var(--secondary))] text-white">
                    <Icon size={22} />
                  </span>
                  <span className="flex-1">
                    <span className="block text-base font-black text-[var(--text-primary)]">{it.title}</span>
                    <span className="mt-1 inline-flex rounded-full bg-[var(--primary-soft)] px-2 py-0.5 text-[10px] font-extrabold text-[var(--primary-strong)]">
                      {it.type}
                    </span>
                  </span>
                  <span className="self-center text-xs font-extrabold text-[var(--primary)]">{content.preview}</span>
                </button>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ── Receipt demo generator ─────────────────────────────────────────────────

function pad(n: number, w: number) {
  return String(n).padStart(w, "0");
}

export function ReceiptDemoSection({ content }: { content: LandingContent["receiptDemo"] }) {
  const [student, setStudent] = useState(content.studentPlaceholder);
  const [amount, setAmount] = useState(content.amountPlaceholder);
  const [fee, setFee] = useState(content.feePlaceholder);
  const [num, setNum] = useState(48127);
  const [bump, setBump] = useState(0);
  const today = useMemo(() => {
    const d = new Date(2026, 5, 1);
    return `${pad(d.getDate(), 2)}/${pad(d.getMonth() + 1, 2)}/${d.getFullYear()}`;
  }, []);

  const handleGenerate = () => {
    setNum((n) => n + 1);
    setBump((b) => b + 1);
  };

  return (
    <section id="receipt-demo" className={SECTION}>
      <div className="mx-auto max-w-6xl">
        <SectionHeading eyebrow={content.eyebrow} title={content.title} description={content.description} center />
        <div className="mt-12 grid gap-8 lg:grid-cols-2">
          <Reveal>
            <div className="rounded-[var(--radius-2xl)] border border-[var(--border)] bg-[var(--surface-strong)] p-7 shadow-[var(--shadow-md)]">
              <div className="space-y-5">
                <FormField label={content.studentLabel} htmlFor="rd-student">
                  <Input id="rd-student" value={student} onChange={(e) => setStudent(e.target.value)} placeholder={content.studentPlaceholder} />
                </FormField>
                <FormField label={content.amountLabel} htmlFor="rd-amount">
                  <Input id="rd-amount" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder={content.amountPlaceholder} dir="ltr" />
                </FormField>
                <FormField label={content.feeLabel} htmlFor="rd-fee">
                  <Input id="rd-fee" value={fee} onChange={(e) => setFee(e.target.value)} placeholder={content.feePlaceholder} />
                </FormField>
                <Button
                  type="button"
                  variant="primary"
                  size="lg"
                  onClick={handleGenerate}
                  className="w-full"
                  style={{ background: "linear-gradient(135deg, var(--primary), var(--secondary))" }}
                >
                  {content.generate}
                </Button>
              </div>
            </div>
          </Reveal>
          <Reveal direction="left">
            <div key={bump} className="motion-safe:animate-[receiptPop_0.5s_ease]">
              <div className="overflow-hidden rounded-[var(--radius-2xl)] border-2 border-dashed border-[var(--border-strong)] bg-[var(--surface-strong)] p-8 shadow-[var(--shadow-lg)]">
                <div className="border-b border-[var(--border)] pb-4 text-center">
                  <div className="text-xs font-extrabold uppercase tracking-widest text-[var(--text-tertiary)]">
                    {content.receiptIssuer}
                  </div>
                  <h3 className="mt-2 text-2xl font-black text-[var(--text-primary)]">{content.receiptTitle}</h3>
                </div>
                <dl className="mt-5 space-y-3 text-sm">
                  <div className="flex justify-between">
                    <dt className="font-bold text-[var(--text-secondary)]">{content.receiptNumberLabel}</dt>
                    <dd dir="ltr" className="font-mono font-black text-[var(--text-primary)]">#{num}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="font-bold text-[var(--text-secondary)]">{content.receiptDateLabel}</dt>
                    <dd dir="ltr" className="font-mono text-[var(--text-primary)]">{today}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="font-bold text-[var(--text-secondary)]">{content.receiptFromLabel}</dt>
                    <dd className="font-black text-[var(--text-primary)]">{student || content.studentPlaceholder}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="font-bold text-[var(--text-secondary)]">{content.receiptForLabel}</dt>
                    <dd className="text-[var(--text-primary)]">{fee || content.feePlaceholder}</dd>
                  </div>
                </dl>
                <div className="mt-6 rounded-[var(--radius-lg)] bg-[var(--primary-soft)] p-4 text-center">
                  <div className="text-xs font-bold text-[var(--primary-strong)]">{content.receiptAmountLabel}</div>
                  <div dir="ltr" className="mt-1 text-3xl font-black text-[var(--primary-strong)]">
                    {amount || content.amountPlaceholder} {content.receiptCurrency}
                  </div>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

// ── Security badge ─────────────────────────────────────────────────────────

export function SecurityBadgeSection({ content }: { content: LandingContent["securityBadge"] }) {
  return (
    <section id="security" className={`${SECTION} bg-[var(--background-subtle)]`}>
      <div className="mx-auto max-w-5xl">
        <Reveal>
          <div className="grid items-center gap-8 rounded-[var(--radius-2xl)] border border-[var(--border)] bg-[var(--surface-strong)] p-8 shadow-[var(--shadow-md)] sm:p-12 lg:grid-cols-[auto_1fr]">
            <div className="relative mx-auto inline-flex h-32 w-32 items-center justify-center rounded-full bg-[linear-gradient(135deg,var(--primary),var(--secondary))] text-white shadow-[var(--shadow-primary)] lg:mx-0">
              <Server size={48} />
              <span className="absolute -bottom-2 -end-2 inline-flex h-10 w-10 items-center justify-center rounded-full border-4 border-[var(--surface-strong)] bg-[var(--success)] text-white">
                <ShieldCheck size={18} />
              </span>
            </div>
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-[color-mix(in_srgb,var(--success)_30%,transparent)] bg-[color-mix(in_srgb,var(--success)_14%,transparent)] px-3 py-1 text-xs font-extrabold text-[var(--success)]">
                <MapPin size={14} />
                {content.location}
              </span>
              <h2 className="mt-3 text-2xl font-black text-[var(--text-primary)] sm:text-3xl">{content.title}</h2>
              <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">{content.badge}</p>
              <ul className="mt-5 grid gap-2 sm:grid-cols-2">
                {content.points.map((p) => (
                  <li key={p} className="flex items-start gap-2 text-sm font-bold text-[var(--text-primary)]">
                    <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-[var(--success)]" />
                    {p}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

// ── Learning center ─────────────────────────────────────────────────────────

export function LearningSection({ content }: { content: LandingContent["learning"] }) {
  return (
    <section id="learning" className={SECTION}>
      <div className="mx-auto max-w-7xl">
        <SectionHeading eyebrow={content.eyebrow} title={content.title} description={content.description} center />
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {content.items.map((v, i) => (
            <Reveal key={v.title} index={i}>
              <article className="group flex h-full flex-col overflow-hidden rounded-[var(--radius-2xl)] border border-[var(--border)] bg-[var(--surface-strong)] shadow-[var(--shadow-sm)] transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[var(--shadow-lg)]">
                <div className="relative aspect-video bg-[linear-gradient(135deg,var(--primary-soft),color-mix(in_srgb,var(--secondary)_25%,transparent))]">
                  <span className="absolute inset-0 grid place-items-center">
                    <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-white text-[var(--primary)] shadow-[var(--shadow-md)] transition-transform group-hover:scale-110">
                      <PLAY_ICON size={22} fill="currentColor" />
                    </span>
                  </span>
                  <span className="absolute bottom-2 end-2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-bold text-white" dir="ltr">
                    {v.duration}
                  </span>
                </div>
                <div className="p-5">
                  <h3 className="text-sm font-black text-[var(--text-primary)]">{v.title}</h3>
                  <button type="button" className="mt-3 inline-flex items-center gap-1 text-xs font-extrabold text-[var(--primary)]">
                    <PLAY_ICON size={12} />
                    {content.play}
                  </button>
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Template library (download links) ───────────────────────────────────────

const DUMMY_PDF_DATA_URL =
  "data:application/pdf;base64,JVBERi0xLjENCjEgMCBvYmoNCjw8L1R5cGUgL0NhdGFsb2cgL1BhZ2VzIDIgMCBSPj4NCmVuZG9iag0KMiAwIG9iag0KPDwvVHlwZSAvUGFnZXMgL0tpZHMgWzMgMCBSXSAvQ291bnQgMT4+DQplbmRvYmoNCjMgMCBvYmoNCjw8L1R5cGUgL1BhZ2UgL1BhcmVudCAyIDAgUiAvTWVkaWFCb3ggWzAgMCA2MTIgNzkyXSAvUmVzb3VyY2VzIDw8Pj4+Pg0KZW5kb2JqDQp4cmVmDQowIDQNCjAwMDAwMDAwMDAgNjU1MzUgZg0KMDAwMDAwMDAwOSAwMDAwMCBuDQowMDAwMDAwMDU4IDAwMDAwIG4NCjAwMDAwMDAxMTUgMDAwMDAgbg0KdHJhaWxlcg0KPDwvU2l6ZSA0IC9Sb290IDEgMCBSPj4NCnN0YXJ0eHJlZg0KMTk0DQolJUVPRg==";

export function TemplateLibrarySection({ content }: { content: LandingContent["templateLibrary"] }) {
  return (
    <section id="template-library" className={`${SECTION} bg-[var(--background-subtle)]`}>
      <div className="mx-auto max-w-5xl">
        <SectionHeading eyebrow={content.eyebrow} title={content.title} description={content.description} center />
        <div className="mt-12 divide-y divide-[var(--border)] rounded-[var(--radius-2xl)] border border-[var(--border)] bg-[var(--surface-strong)] shadow-[var(--shadow-sm)]">
          {content.items.map((f, i) => (
            <Reveal key={f.name} index={i}>
              <div className="flex items-center justify-between gap-4 p-5">
                <div className="flex items-center gap-4">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-[var(--radius-md)] bg-[var(--primary-soft)] text-[var(--primary)]">
                    <DOWNLOAD_ICON size={18} />
                  </span>
                  <span>
                    <span className="block text-sm font-black text-[var(--text-primary)]">{f.name}</span>
                    <span className="block text-xs font-semibold text-[var(--text-tertiary)]">
                      <span dir="ltr">{f.format}</span> · <span dir="ltr">{f.size}</span>
                    </span>
                  </span>
                </div>
                <a
                  href={DUMMY_PDF_DATA_URL}
                  download={`${f.name}.pdf`}
                  className="inline-flex items-center gap-1.5 rounded-full bg-[var(--primary)] px-4 py-2 text-xs font-extrabold text-white shadow-[var(--shadow-primary)] transition-transform hover:scale-105"
                >
                  <DOWNLOAD_ICON size={14} />
                  {content.download}
                </a>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── API ─────────────────────────────────────────────────────────────────────

const SNIPPET = `fetch('https://api.schooliraq.app/v1/students', {
  headers: { Authorization: 'Bearer YOUR_TOKEN' }
})
  .then(r => r.json())
  .then(console.log)`;

export function ApiSection({ content }: { content: LandingContent["api"] }) {
  return (
    <section id="api" className={SECTION}>
      <div className="mx-auto max-w-7xl">
        <SectionHeading eyebrow={content.eyebrow} title={content.title} description={content.description} center />
        <div className="mt-10 flex flex-wrap justify-center gap-2">
          {content.badges.map((b) => (
            <span
              key={b}
              className="inline-flex rounded-full border border-[var(--border)] bg-[var(--surface-strong)] px-3 py-1 text-xs font-extrabold text-[var(--text-secondary)]"
              dir="ltr"
            >
              {b}
            </span>
          ))}
        </div>
        <div className="mt-12 grid gap-8 lg:grid-cols-[1fr_1.1fr]">
          <Reveal>
            <div className="grid gap-4 sm:grid-cols-2">
              {content.features.map((f) => {
                const Icon = f.icon;
                return (
                  <div key={f.title} className="rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface-strong)] p-5 shadow-[var(--shadow-sm)]">
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-[var(--radius-md)] bg-[var(--primary-soft)] text-[var(--primary)]">
                      <Icon size={18} />
                    </span>
                    <h3 className="mt-3 text-sm font-black text-[var(--text-primary)]">{f.title}</h3>
                    <p className="mt-1 text-xs leading-6 text-[var(--text-secondary)]">{f.desc}</p>
                  </div>
                );
              })}
            </div>
          </Reveal>
          <Reveal direction="left">
            <div className="overflow-hidden rounded-[var(--radius-2xl)] border border-[var(--border)] bg-[#0f172a] shadow-[var(--shadow-lg)]">
              <div className="flex items-center gap-1.5 border-b border-white/10 bg-black/30 px-4 py-3">
                <span className="h-2.5 w-2.5 rounded-full bg-red-500/70" />
                <span className="h-2.5 w-2.5 rounded-full bg-yellow-500/70" />
                <span className="h-2.5 w-2.5 rounded-full bg-green-500/70" />
                <span className="ms-3 text-[10px] font-bold uppercase tracking-wider text-white/50">api.schooliraq.app</span>
              </div>
              <pre
                dir="ltr"
                className="overflow-x-auto p-5 text-[12px] leading-relaxed text-white/85"
                style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}
              >
                <code>{SNIPPET}</code>
              </pre>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

// ── Schools strip ──────────────────────────────────────────────────────────

export function SchoolsStripSection({ content }: { content: LandingContent["schoolsStrip"] }) {
  return (
    <section className="border-y border-[var(--border)] bg-[var(--background-subtle)] py-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <p className="mb-5 text-center text-xs font-extrabold uppercase tracking-widest text-[var(--text-tertiary)]">
          {content.label}
        </p>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {content.items.map((name) => (
            <div
              key={name}
              className="grid h-14 place-items-center rounded-[var(--radius-md)] border border-dashed border-[var(--border-strong)] bg-[var(--surface-strong)] text-center text-sm font-black text-[var(--text-tertiary)]"
            >
              {name}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Plans compare ──────────────────────────────────────────────────────────

export function PlansCompareSection({ content }: { content: LandingContent["plansCompare"] }) {
  return (
    <section id="plans" className={SECTION}>
      <div className="mx-auto max-w-5xl">
        <SectionHeading eyebrow={content.eyebrow} title={content.title} description={content.description} center />
        <div className="mt-12 grid gap-5 md:grid-cols-2">
          {[content.lite, content.full].map((plan, i) => {
            const featured = i === 1;
            return (
              <Reveal key={plan.label} index={i}>
                <div
                  className={[
                    "h-full rounded-[var(--radius-2xl)] border bg-[var(--surface-strong)] p-7 shadow-[var(--shadow-sm)] transition-all hover:-translate-y-1 hover:shadow-[var(--shadow-lg)]",
                    featured ? "border-[var(--primary)] ring-2 ring-[var(--primary)]/20" : "border-[var(--border)]",
                  ].join(" ")}
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-black text-[var(--text-primary)]">{plan.label}</h3>
                    {featured ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[var(--primary)] px-2.5 py-1 text-[10px] font-extrabold text-white">
                        <Sparkles size={12} />
                        ★
                      </span>
                    ) : null}
                  </div>
                  <ul className="mt-6 space-y-3">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm text-[var(--text-primary)]">
                        <CHECK_ICON size={16} className="mt-0.5 shrink-0 text-[var(--success)]" />
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ── Wall of love ───────────────────────────────────────────────────────────

export function WallSection({ content }: { content: LandingContent["wall"] }) {
  return (
    <section id="wall" className={`${SECTION} bg-[var(--background-subtle)]`}>
      <div className="mx-auto max-w-7xl">
        <SectionHeading eyebrow={content.eyebrow} title={content.title} center />
        <div className="mt-12 columns-1 gap-5 sm:columns-2 lg:columns-3">
          {content.items.map((it, i) => (
            <Reveal key={it.handle + i} index={i}>
              <figure className="mb-5 break-inside-avoid rounded-[var(--radius-2xl)] border border-[var(--border)] bg-[var(--surface-strong)] p-6 shadow-[var(--shadow-sm)]">
                <blockquote className="text-sm leading-7 text-[var(--text-primary)]">&ldquo;{it.text}&rdquo;</blockquote>
                <figcaption className="mt-4 flex items-center justify-between text-xs">
                  <span className="font-bold text-[var(--text-primary)]" dir="auto">{it.handle}</span>
                  <span className="rounded-full bg-[var(--primary-soft)] px-2 py-0.5 font-extrabold text-[var(--primary-strong)]">
                    {it.source}
                  </span>
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Parents testimonials (carousel) ────────────────────────────────────────

export function ParentsTestimonialsSection({ content }: { content: LandingContent["parentsTestimonials"] }) {
  return (
    <section id="parents" className={SECTION}>
      <div className="mx-auto max-w-3xl">
        <SectionHeading eyebrow={content.eyebrow} title={content.title} center />
        <div className="mt-12">
          <AutoCarousel
            items={content.items}
            interval={4500}
            renderItem={(item) => (
              <figure className="rounded-[var(--radius-2xl)] border border-[var(--border)] bg-[var(--surface-strong)] p-8 text-center shadow-[var(--shadow-md)]">
                <blockquote className="text-base leading-8 text-[var(--text-primary)]">&ldquo;{item.text}&rdquo;</blockquote>
                <figcaption className="mt-5">
                  <div className="text-sm font-black text-[var(--text-primary)]">{item.author}</div>
                  <div className="text-xs text-[var(--text-tertiary)]">{item.role}</div>
                </figcaption>
              </figure>
            )}
          />
        </div>
      </div>
    </section>
  );
}

// ── Before / After ─────────────────────────────────────────────────────────

export function BeforeAfterSection({ content }: { content: LandingContent["beforeAfter"] }) {
  const [pos, setPos] = useState(50);

  return (
    <section id="before-after" className={`${SECTION} bg-[var(--background-subtle)]`}>
      <div className="mx-auto max-w-5xl">
        <SectionHeading eyebrow={content.eyebrow} title={content.title} description={content.description} center />
        <Reveal index={1}>
          <div className="relative mt-12 overflow-hidden rounded-[var(--radius-2xl)] border border-[var(--border)] bg-[var(--surface-strong)] shadow-[var(--shadow-lg)]">
            <div className="grid h-72 grid-cols-2 sm:h-80">
              <div className="relative grid place-items-center bg-[linear-gradient(135deg,#fde68a40,#fcd34d20)] p-6">
                <div className="text-center">
                  <span className="inline-flex rounded-full bg-[var(--warning-soft)] px-3 py-1 text-xs font-extrabold text-[var(--warning)]">
                    {content.beforeLabel}
                  </span>
                  <ul className="mt-4 space-y-1.5 text-sm font-bold text-[var(--text-secondary)]">
                    {content.beforeItems.map((b) => (
                      <li key={b}>— {b}</li>
                    ))}
                  </ul>
                </div>
              </div>
              <div className="relative grid place-items-center bg-[linear-gradient(135deg,var(--primary-soft),color-mix(in_srgb,var(--secondary)_25%,transparent))] p-6">
                <div className="text-center">
                  <span className="inline-flex rounded-full bg-[color-mix(in_srgb,var(--success)_18%,transparent)] px-3 py-1 text-xs font-extrabold text-[var(--success)]">
                    {content.afterLabel}
                  </span>
                  <ul className="mt-4 space-y-1.5 text-sm font-bold text-[var(--text-primary)]">
                    {content.afterItems.map((a) => (
                      <li key={a} className="flex items-center justify-center gap-1.5">
                        <CHECK_ICON size={14} className="text-[var(--success)]" />
                        {a}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 start-0 transition-[width] duration-100"
              style={{ width: `${pos}%`, background: "linear-gradient(135deg, #fde68a40, #fcd34d20)" }}
            />
            <input
              type="range"
              min={0}
              max={100}
              value={pos}
              onChange={(e) => setPos(Number(e.target.value))}
              aria-label="before-after handle"
              className="absolute inset-0 z-10 h-full w-full cursor-ew-resize appearance-none bg-transparent"
              style={{ WebkitAppearance: "none" }}
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 z-20 w-[3px] bg-[var(--surface-strong)] shadow-[0_0_0_1px_var(--border-strong)]"
              style={{ left: `${pos}%`, transform: "translateX(-50%)" }}
            >
              <span className="absolute top-1/2 inline-flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface-strong)] text-[var(--primary)] shadow-[var(--shadow-md)]">
                ↔
              </span>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

// ── Countdown ──────────────────────────────────────────────────────────────

export function CountdownSection({ content }: { content: LandingContent["countdown"] }) {
  const [left, setLeft] = useState({ d: 30, h: 0, m: 0, s: 0 });
  useEffect(() => {
    let stored = 0;
    try {
      const v = localStorage.getItem("landingCountdownEnd");
      if (v) stored = Number(v);
      if (!stored) {
        stored = Date.now() + 30 * 24 * 3600 * 1000;
        localStorage.setItem("landingCountdownEnd", String(stored));
      }
    } catch {
      stored = Date.now() + 30 * 24 * 3600 * 1000;
    }
    const tick = () => {
      const diff = Math.max(0, stored - Date.now());
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff / 3600000) % 24);
      const m = Math.floor((diff / 60000) % 60);
      const s = Math.floor((diff / 1000) % 60);
      setLeft({ d, h, m, s });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const cells = [
    { v: left.d, lbl: content.days },
    { v: left.h, lbl: "H" },
    { v: left.m, lbl: "M" },
    { v: left.s, lbl: "S" },
  ];

  return (
    <section id="countdown" className={SECTION}>
      <div className="mx-auto max-w-5xl">
        <Reveal>
          <div className="rounded-[var(--radius-2xl)] border border-[var(--border)] bg-[linear-gradient(135deg,var(--primary),var(--primary-strong))] p-10 text-center text-white shadow-[var(--shadow-xl)] sm:p-14">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-3 py-1 text-xs font-extrabold uppercase tracking-wide">
              <Sparkles size={14} />
              {content.eyebrow}
            </span>
            <h2 className="mx-auto mt-4 max-w-xl text-3xl font-black tracking-tight sm:text-4xl">{content.title}</h2>
            <p className="mx-auto mt-3 max-w-md text-base leading-8 text-white/85">{content.description}</p>
            <div className="mx-auto mt-8 flex max-w-xl justify-center gap-3" dir="ltr">
              {cells.map((c, i) => (
                <div key={i} className="min-w-[64px] rounded-[var(--radius-lg)] bg-white/15 px-3 py-3 backdrop-blur-sm">
                  <div className="text-2xl font-black tabular-nums sm:text-3xl">{String(c.v).padStart(2, "0")}</div>
                  <div className="text-[10px] font-extrabold uppercase tracking-widest text-white/75">{c.lbl}</div>
                </div>
              ))}
            </div>
            <a
              href="#login"
              className="mt-8 inline-flex items-center justify-center rounded-full bg-white px-7 py-3.5 text-base font-extrabold text-[var(--primary-strong)] shadow-[var(--shadow-md)] transition-transform hover:scale-105"
            >
              {content.cta}
            </a>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

// ── Last signup pill ───────────────────────────────────────────────────────

export function LastSignupBadge({ content }: { content: LandingContent["lastSignup"] }) {
  const text = content.template.replace("{ago}", content.relative);
  return (
    <div className="mx-auto mt-4 inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface-strong)] px-3 py-1.5 text-xs font-bold text-[var(--text-secondary)] shadow-[var(--shadow-xs)]">
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full rounded-full bg-[var(--success)] opacity-60 motion-safe:animate-ping" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--success)]" />
      </span>
      {text}
    </div>
  );
}

// ── API status pill ────────────────────────────────────────────────────────

export function ApiStatusPill({ content }: { content: LandingContent["apiStatus"] }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface-strong)] px-3 py-1.5 text-xs font-bold text-[var(--text-secondary)] shadow-[var(--shadow-xs)]">
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full rounded-full bg-[var(--success)] opacity-60 motion-safe:animate-ping" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--success)]" />
      </span>
      <span dir="auto">{content.label}: {content.operational}</span>
    </span>
  );
}

// ── Chat bubble ────────────────────────────────────────────────────────────

interface ChatMessage { from: "us" | "you"; text: string }

export function ChatBubble({ content, email }: { content: LandingContent["chat"]; email: string }) {
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState("");
  const [history, setHistory] = useState<ChatMessage[]>([{ from: "us", text: content.greeting }]);

  const send = (text: string) => {
    if (!text.trim()) return;
    const next: ChatMessage[] = [...history, { from: "you", text }];
    setHistory(next);
    setMsg("");
    setTimeout(() => {
      setHistory([
        ...next,
        { from: "us", text: `📧 ${email}` },
      ]);
    }, 700);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={content.openLabel}
        className="fixed bottom-5 start-5 z-40 inline-flex h-14 w-14 items-center justify-center rounded-full bg-[linear-gradient(135deg,var(--primary),var(--secondary))] text-white shadow-[var(--shadow-lg)] transition-transform hover:scale-110"
      >
        {open ? <XCircle size={22} /> : <MessageSquare size={22} />}
      </button>
      {open ? (
        <div className="fixed bottom-24 start-5 z-40 w-[min(360px,calc(100vw-2.5rem))] overflow-hidden rounded-[var(--radius-2xl)] border border-[var(--border)] bg-[var(--surface-strong)] shadow-[var(--shadow-xl)]">
          <div className="bg-[linear-gradient(135deg,var(--primary),var(--primary-strong))] px-5 py-4 text-white">
            <div className="text-sm font-black">{content.greeting}</div>
          </div>
          <div className="max-h-72 space-y-2 overflow-y-auto p-4">
            {history.map((m, i) => (
              <div key={i} className={`flex ${m.from === "us" ? "justify-start" : "justify-end"}`}>
                <div
                  className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                    m.from === "us"
                      ? "bg-[var(--background-subtle)] text-[var(--text-primary)]"
                      : "bg-[var(--primary)] text-white"
                  }`}
                >
                  {m.text}
                </div>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-1.5 border-t border-[var(--border)] p-3">
            {content.suggestions.map((s) => (
              <button
                key={s}
                onClick={() => send(s)}
                type="button"
                className="rounded-full border border-[var(--border)] bg-[var(--surface-soft)] px-2.5 py-1 text-xs font-bold text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]"
              >
                {s}
              </button>
            ))}
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(msg);
            }}
            className="flex items-center gap-2 border-t border-[var(--border)] p-3"
          >
            <Input value={msg} onChange={(e) => setMsg(e.target.value)} placeholder={content.placeholder} />
            <button
              type="submit"
              aria-label={content.send}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[var(--primary)] text-white shadow-[var(--shadow-primary)]"
            >
              <SendIcon size={16} />
            </button>
          </form>
        </div>
      ) : null}
    </>
  );
}

// ── Hero side: live activity + progress ring ───────────────────────────────

export function HeroSideExtras({
  activity,
  ringLabel,
}: {
  activity: LandingContent["hero"]["activity"];
  ringLabel: string;
}) {
  return (
    <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_auto]">
      <LiveActivity
        label={activity.label}
        events={activity.events}
        className="rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface-strong)] p-5 text-start shadow-[var(--shadow-sm)]"
      />
      <div className="flex items-center justify-center rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface-strong)] p-4 shadow-[var(--shadow-sm)]">
        <ProgressRing value={96} size={96} stroke={8} label={ringLabel} />
      </div>
    </div>
  );
}

void EyebrowPill;
