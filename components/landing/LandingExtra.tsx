"use client";

import * as React from "react";
import { useState } from "react";
import { CheckCircle2, ChevronDown, ChevronLeft, MailCheck } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/ui/form-field";
import { Reveal } from "@/components/landing/Reveal";
import { AppMockup, EyebrowPill, SectionHeading } from "@/components/landing/LandingSections";
import type { LandingContent } from "@/lib/landing-content";

const SECTION = "scroll-mt-24 px-4 py-20 sm:px-6 sm:py-28 lg:px-8";

// ── Gallery (framed mockups) ─────────────────────────────────────────────────

export function GallerySection({ content }: { content: LandingContent["gallery"] }) {
  return (
    <section id="gallery" className={SECTION}>
      <div className="mx-auto max-w-7xl">
        <SectionHeading eyebrow={content.eyebrow} title={content.title} description={content.description} center />
        <div className="mt-12 grid gap-8 lg:grid-cols-3">
          {content.items.map((item, i) => (
            <Reveal key={item.label} index={i}>
              <figure>
                <AppMockup variant={item.variant} />
                <figcaption className="mt-8 text-center text-sm font-bold text-[var(--text-secondary)]">
                  {item.label}
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Integrations strip ───────────────────────────────────────────────────────

export function IntegrationsSection({ content }: { content: LandingContent["integrations"] }) {
  return (
    <section id="integrations" className={`${SECTION} bg-[var(--background-subtle)]`}>
      <div className="mx-auto max-w-7xl">
        <SectionHeading eyebrow={content.eyebrow} title={content.title} description={content.description} center />
        <div className="mt-12 grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {content.items.map((item, i) => {
            const Icon = item.icon;
            return (
              <Reveal key={item.title} index={i} as="article">
                <div className="group flex h-full flex-col items-center rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface-strong)] p-6 text-center shadow-[var(--shadow-sm)] transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[var(--shadow-lg)]">
                  <span className="inline-flex h-12 w-12 items-center justify-center rounded-[var(--radius-md)] bg-[var(--primary-soft)] text-[var(--primary)] transition-transform duration-300 group-hover:scale-110">
                    <Icon size={22} />
                  </span>
                  <h3 className="mt-4 text-sm font-black text-[var(--text-primary)]">{item.title}</h3>
                  <p className="mt-1 text-xs leading-5 text-[var(--text-tertiary)]">{item.desc}</p>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ── Comparison table ─────────────────────────────────────────────────────────

function Cell({ on, accent }: { on: boolean; accent?: boolean }) {
  if (on) {
    return (
      <span className={`inline-flex h-7 w-7 items-center justify-center rounded-full ${accent ? "bg-[color-mix(in_srgb,var(--success)_16%,transparent)] text-[var(--success)]" : "bg-[var(--surface-inset)] text-[var(--text-tertiary)]"}`}>
        <CheckCircle2 size={18} />
      </span>
    );
  }
  return <span className="text-lg font-black text-[var(--text-tertiary)]">—</span>;
}

export function ComparisonSection({ content }: { content: LandingContent["comparison"] }) {
  return (
    <section id="compare" className={SECTION}>
      <div className="mx-auto max-w-4xl">
        <SectionHeading eyebrow={content.eyebrow} title={content.title} description={content.description} center />
        <Reveal index={1}>
          <div className="mt-12 overflow-hidden rounded-[var(--radius-2xl)] border border-[var(--border)] bg-[var(--surface-strong)] shadow-[var(--shadow-md)]">
            <div className="grid grid-cols-[1fr_auto_auto] items-center gap-x-6 border-b border-[var(--border)] bg-[var(--background-subtle)] px-6 py-4 text-sm font-black sm:gap-x-10">
              <span className="text-[var(--text-tertiary)]">&nbsp;</span>
              <span className="w-20 text-center text-[var(--primary-strong)]">{content.usLabel}</span>
              <span className="w-20 text-center text-[var(--text-tertiary)]">{content.themLabel}</span>
            </div>
            {content.rows.map((row, i) => (
              <div
                key={row.label}
                className={`grid grid-cols-[1fr_auto_auto] items-center gap-x-6 px-6 py-4 sm:gap-x-10 ${i % 2 ? "bg-[var(--surface-soft)]" : ""}`}
              >
                <span className="text-sm font-bold text-[var(--text-primary)]">{row.label}</span>
                <span className="flex w-20 justify-center">
                  <Cell on={row.us} accent />
                </span>
                <span className="flex w-20 justify-center">
                  <Cell on={row.them} />
                </span>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

// ── Trust / security ─────────────────────────────────────────────────────────

export function TrustSection({ content }: { content: LandingContent["trust"] }) {
  return (
    <section id="trust" className={`${SECTION} bg-[var(--background-subtle)]`}>
      <div className="mx-auto max-w-7xl">
        <SectionHeading eyebrow={content.eyebrow} title={content.title} center />
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {content.items.map((item, i) => {
            const Icon = item.icon;
            return (
              <Reveal key={item.title} index={i} as="article">
                <div className="h-full rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface-strong)] p-6 shadow-[var(--shadow-sm)]">
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-[var(--radius-md)] bg-[color-mix(in_srgb,var(--success)_14%,transparent)] text-[var(--success)]">
                    <Icon size={20} />
                  </span>
                  <h3 className="mt-4 text-base font-black text-[var(--text-primary)]">{item.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{item.desc}</p>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ── News / articles ──────────────────────────────────────────────────────────

export function NewsSection({ content }: { content: LandingContent["news"] }) {
  return (
    <section id="news" className={SECTION}>
      <div className="mx-auto max-w-7xl">
        <SectionHeading eyebrow={content.eyebrow} title={content.title} description={content.description} center />
        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {content.items.map((item, i) => (
            <Reveal key={item.title} index={i} as="article">
              <article className="group flex h-full flex-col rounded-[var(--radius-2xl)] border border-[var(--border)] bg-[var(--surface-strong)] p-6 shadow-[var(--shadow-sm)] transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[var(--shadow-lg)]">
                <div className="aspect-[16/9] overflow-hidden rounded-[var(--radius-lg)] bg-[linear-gradient(135deg,var(--primary-soft),color-mix(in_srgb,var(--secondary)_25%,transparent))]" />
                <div className="mt-5 flex items-center gap-2 text-xs font-bold">
                  <span className="rounded-full bg-[var(--primary-soft)] px-2.5 py-1 text-[var(--primary-strong)]">{item.tag}</span>
                  <span className="text-[var(--text-tertiary)]">{item.date}</span>
                </div>
                <h3 className="mt-3 text-lg font-black text-[var(--text-primary)]">{item.title}</h3>
                <p className="mt-2 flex-1 text-sm leading-6 text-[var(--text-secondary)]">{item.excerpt}</p>
                <span className="mt-4 inline-flex items-center gap-1 text-sm font-extrabold text-[var(--primary)]">
                  {content.readMore}
                  <ChevronLeft size={16} className="transition-transform duration-300 group-hover:-translate-x-1 rtl:rotate-180 rtl:group-hover:translate-x-1" />
                </span>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── FAQ accordion ────────────────────────────────────────────────────────────

export function FaqSection({ content }: { content: LandingContent["faq"] }) {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section id="faq" className={`${SECTION} bg-[var(--background-subtle)]`}>
      <div className="mx-auto max-w-3xl">
        <SectionHeading eyebrow={content.eyebrow} title={content.title} center />
        <div className="mt-12 space-y-3">
          {content.items.map((item, i) => {
            const isOpen = open === i;
            return (
              <Reveal key={item.q} index={i}>
                <div className="overflow-hidden rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface-strong)] shadow-[var(--shadow-xs)]">
                  <button
                    type="button"
                    onClick={() => setOpen(isOpen ? null : i)}
                    aria-expanded={isOpen}
                    className="flex w-full items-center justify-between gap-4 px-6 py-5 text-start"
                  >
                    <span className="text-base font-bold text-[var(--text-primary)]">{item.q}</span>
                    <ChevronDown
                      size={20}
                      className={`shrink-0 text-[var(--primary)] transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`}
                    />
                  </button>
                  <div className={`grid transition-[grid-template-rows] duration-300 ease-out ${isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
                    <div className="overflow-hidden">
                      <p className="px-6 pb-5 text-sm leading-7 text-[var(--text-secondary)]">{item.a}</p>
                    </div>
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ── Demo request (builds a mailto, no backend) ───────────────────────────────

export function DemoSection({ content, email }: { content: LandingContent["demo"]; email: string }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [sent, setSent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const body = `${content.nameLabel}: ${name}\n${content.phoneLabel}: ${phone}`;
    const href = `mailto:${email}?subject=${encodeURIComponent(content.mailSubject)}&body=${encodeURIComponent(body)}`;
    window.location.href = href;
    setSent(true);
  };

  return (
    <section id="demo" className={SECTION}>
      <div className="mx-auto max-w-3xl">
        <Reveal>
          <div className="rounded-[var(--radius-2xl)] border border-[var(--border)] bg-[var(--surface-strong)] p-8 shadow-[var(--shadow-lg)] sm:p-12">
            <div className="text-center">
              <EyebrowPill>{content.eyebrow}</EyebrowPill>
              <h2 className="mt-4 text-2xl font-black tracking-tight text-[var(--text-primary)] sm:text-3xl">{content.title}</h2>
              <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-[var(--text-secondary)]">{content.description}</p>
            </div>
            <form onSubmit={handleSubmit} className="mx-auto mt-8 grid max-w-xl gap-4 sm:grid-cols-2">
              <FormField label={content.nameLabel} htmlFor="demo-name">
                <Input
                  id="demo-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={content.namePlaceholder}
                  required
                />
              </FormField>
              <FormField label={content.phoneLabel} htmlFor="demo-phone">
                <Input
                  id="demo-phone"
                  type="tel"
                  inputMode="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder={content.phonePlaceholder}
                  required
                  dir="ltr"
                />
              </FormField>
              <div className="sm:col-span-2">
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  className="w-full"
                  style={{ background: "linear-gradient(135deg, var(--primary), var(--secondary))" }}
                >
                  {content.submit}
                </Button>
              </div>
            </form>
            {sent ? (
              <p className="mt-5 flex items-center justify-center gap-2 text-sm font-bold text-[var(--success)]">
                <MailCheck size={18} />
                {content.success}
              </p>
            ) : null}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
