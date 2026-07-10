
import * as React from "react";
import { BarChart3, CheckCircle2, FileText, ReceiptText, TrendingUp, Users, Wallet } from "@/lib/icons";
import { SchoolLogo } from "@/components/brand";
import { Reveal } from "@/components/landing/Reveal";
import { AnimatedBar, FloatingChip, Marquee, Parallax, TiltCard } from "@/components/landing/motion-primitives";
import { type LandingContent, type MockupVariant, type ShowcaseContent } from "@/lib/landing-content";

// ── Shared building blocks ──────────────────────────────────────────────────

export function EyebrowPill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-[color-mix(in_srgb,var(--primary)_25%,transparent)] bg-[var(--primary-soft)] px-3 py-1 text-xs font-extrabold uppercase tracking-wide text-[var(--primary-strong)]">
      <span className="h-1.5 w-1.5 rounded-full bg-[var(--primary)]" />
      {children}
    </span>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  center,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  center?: boolean;
}) {
  return (
    <div className={center ? "mx-auto max-w-2xl text-center" : "max-w-2xl"}>
      <Reveal>
        <EyebrowPill>{eyebrow}</EyebrowPill>
      </Reveal>
      <Reveal index={1}>
        <h2 className="mt-4 text-3xl font-black leading-tight tracking-tight text-[var(--text-primary)] sm:text-4xl">
          {title}
        </h2>
      </Reveal>
      {description ? (
        <Reveal index={2}>
          <p className="mt-4 text-base leading-8 text-[var(--text-secondary)]">{description}</p>
        </Reveal>
      ) : null}
    </div>
  );
}

const SECTION = "scroll-mt-24 px-4 py-20 sm:px-6 sm:py-28 lg:px-8";

// ── Stylized in-product mockup (pure CSS + animated chart, floating chips) ───

const BAR_HEIGHTS = [42, 64, 38, 78, 56, 88, 50, 72];

export function AppMockup({ variant }: { variant: MockupVariant }) {
  const stats =
    variant === "students"
      ? [
          { icon: Users, label: "الطلاب", value: "1,284" },
          { icon: CheckCircle2, label: "حضور اليوم", value: "%96" },
          { icon: BarChart3, label: "الصفوف", value: "32" },
        ]
      : variant === "finance"
        ? [
            { icon: Wallet, label: "محصّل", value: "12.4M" },
            { icon: TrendingUp, label: "متبقٍ", value: "3.1M" },
            { icon: BarChart3, label: "مصاريف", value: "5.2M" },
          ]
        : [
            { icon: FileText, label: "تقارير", value: "148" },
            { icon: BarChart3, label: "رسوم", value: "24" },
            { icon: ReceiptText, label: "مُصدّر", value: "PDF" },
          ];

  return (
    <div className="relative">
      <div
        aria-hidden="true"
        className="absolute -inset-6 -z-10 rounded-[var(--radius-2xl)] bg-[radial-gradient(60%_60%_at_70%_20%,color-mix(in_srgb,var(--primary)_22%,transparent),transparent)] blur-2xl"
      />
      <div className="overflow-hidden rounded-[var(--radius-2xl)] border border-[var(--border)] bg-[var(--surface-strong)] shadow-[var(--shadow-xl)]">
        <div className="flex items-center gap-1.5 border-b border-[var(--border)] bg-[var(--background-subtle)] px-4 py-3">
          <span className="h-2.5 w-2.5 rounded-full bg-[var(--danger)]/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-[var(--warning)]/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-[var(--success)]/70" />
        </div>
        <div className="space-y-4 p-5">
          <div className="grid grid-cols-3 gap-3">
            {stats.map((s) => {
              const Icon = s.icon;
              return (
                <div key={s.label} className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-soft)] p-3">
                  <Icon size={16} className="text-[var(--primary)]" />
                  <div className="mt-2 text-lg font-black text-[var(--text-primary)]">{s.value}</div>
                  <div className="text-[0.65rem] font-semibold text-[var(--text-tertiary)]">{s.label}</div>
                </div>
              );
            })}
          </div>
          <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-soft)] p-4">
            <div className="flex h-28 items-end gap-2">
              {BAR_HEIGHTS.map((h, i) => (
                <AnimatedBar key={i} height={h} index={i} />
              ))}
            </div>
          </div>
          <div className="space-y-2">
            {[0, 1, 2].map((r) => (
              <div key={r} className="flex items-center gap-3 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-soft)] px-3 py-2.5">
                <span className="h-7 w-7 rounded-full bg-[var(--primary-soft)]" />
                <span className="h-2.5 flex-1 rounded-full bg-[var(--background-subtle)]" />
                <span className="h-2.5 w-12 rounded-full bg-[color-mix(in_srgb,var(--primary)_35%,transparent)]" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Floating chips — language-neutral */}
      <FloatingChip
        delay={0.3}
        className="absolute -top-5 end-6 z-10 inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface-strong)] px-3.5 py-2 shadow-[var(--shadow-lg)]"
      >
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--success)_16%,transparent)] text-[var(--success)]">
          <CheckCircle2 size={15} />
        </span>
        <span className="text-sm font-black text-[var(--text-primary)]">96%</span>
      </FloatingChip>
      <FloatingChip
        delay={0.6}
        amplitude={8}
        className="absolute -bottom-5 start-4 z-10 inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface-strong)] px-3.5 py-2 shadow-[var(--shadow-lg)]"
      >
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[var(--primary-soft)] text-[var(--primary)]">
          <TrendingUp size={15} />
        </span>
        <span className="text-sm font-black text-[var(--text-primary)]">+24%</span>
      </FloatingChip>
    </div>
  );
}

// ── Trusted-by marquee ───────────────────────────────────────────────────────

export function MarqueeSection({ content }: { content: LandingContent["marquee"] }) {
  return (
    <section className="border-y border-[var(--border)] bg-[var(--surface-strong)] py-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <p className="mb-5 text-center text-xs font-extrabold uppercase tracking-widest text-[var(--text-tertiary)]">
          {content.label}
        </p>
        <Marquee items={content.items} />
      </div>
    </section>
  );
}

// ── Platform / "work from anywhere" ─────────────────────────────────────────

export function PlatformSection({ content }: { content: LandingContent["platform"] }) {
  return (
    <section id="platform" className={SECTION}>
      <div className="mx-auto max-w-7xl">
        <SectionHeading eyebrow={content.eyebrow} title={content.title} description={content.description} center />
        <div className="mt-12 grid gap-5 sm:grid-cols-3">
          {content.cards.map((card, i) => {
            const Icon = card.icon;
            return (
              <Reveal key={card.title} index={i} as="article">
                <div className="group relative h-full overflow-hidden rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface-strong)] p-7 shadow-[var(--shadow-sm)] transition-all duration-300 hover:-translate-y-1.5 hover:border-[color-mix(in_srgb,var(--primary)_40%,transparent)] hover:shadow-[var(--shadow-lg)]">
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute -end-10 -top-10 h-32 w-32 rounded-full bg-[var(--primary-soft)] opacity-0 blur-2xl transition-opacity duration-300 group-hover:opacity-100"
                  />
                  <span className="relative inline-flex h-12 w-12 items-center justify-center rounded-[var(--radius-md)] bg-[var(--primary-soft)] text-[var(--primary)] transition-all duration-300 group-hover:scale-110 group-hover:bg-[var(--primary)] group-hover:text-white">
                    <Icon size={22} />
                  </span>
                  <h3 className="relative mt-5 text-lg font-black text-[var(--text-primary)]">{card.title}</h3>
                  <p className="relative mt-2 text-sm leading-7 text-[var(--text-secondary)]">{card.desc}</p>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ── Showcase (alternating) ───────────────────────────────────────────────────

export function ShowcaseSection({ content, index }: { content: ShowcaseContent; index: number }) {
  const reversed = index % 2 === 1;
  return (
    <section id={content.id} className={`${SECTION} ${reversed ? "bg-[var(--background-subtle)]" : ""}`}>
      <div className="mx-auto max-w-7xl">
        <div
          className={[
            "grid items-center gap-12 lg:grid-cols-2",
            reversed ? "lg:[&>*:first-child]:order-2" : "",
          ].join(" ")}
        >
          <div>
            <Reveal>
              <EyebrowPill>{content.eyebrow}</EyebrowPill>
            </Reveal>
            <Reveal index={1}>
              <h2 className="mt-4 text-3xl font-black leading-tight tracking-tight text-[var(--text-primary)] sm:text-4xl">
                {content.title}
              </h2>
            </Reveal>
            <Reveal index={2}>
              <p className="mt-4 text-base leading-8 text-[var(--text-secondary)]">{content.description}</p>
            </Reveal>
            <ul className="mt-8 space-y-4">
              {content.bullets.map((b, i) => {
                const Icon = b.icon;
                return (
                  <Reveal key={b.title} index={3 + i} as="li">
                    <div className="group flex items-start gap-4">
                      <span className="mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--primary-soft)] text-[var(--primary)] transition-transform duration-300 group-hover:scale-110">
                        <Icon size={20} />
                      </span>
                      <div>
                        <div className="text-base font-bold text-[var(--text-primary)]">{b.title}</div>
                        <div className="text-sm leading-6 text-[var(--text-secondary)]">{b.desc}</div>
                      </div>
                    </div>
                  </Reveal>
                );
              })}
            </ul>
          </div>
          <Reveal direction={reversed ? "right" : "left"}>
            <Parallax speed={24}>
              <AppMockup variant={content.variant} />
            </Parallax>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

// ── Feature bento grid ───────────────────────────────────────────────────────

export function FeaturesSection({ content }: { content: LandingContent["features"] }) {
  // Asymmetric bento: cards 0 and 3 span two columns on large screens.
  const spans = ["lg:col-span-2", "", "", "lg:col-span-2"];
  return (
    <section id="features" className={SECTION}>
      <div className="mx-auto max-w-7xl">
        <SectionHeading eyebrow={content.eyebrow} title={content.title} description={content.description} center />
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {content.cards.map((card, i) => {
            const Icon = card.icon;
            const wide = spans[i] === "lg:col-span-2";
            return (
              <Reveal key={card.title} index={i} as="article" className={spans[i]}>
                <TiltCard className="h-full">
                <div className="group relative flex h-full flex-col overflow-hidden rounded-[var(--radius-2xl)] border border-[var(--border)] bg-[var(--surface-strong)] p-7 shadow-[var(--shadow-sm)] transition-all duration-300 hover:-translate-y-1.5 hover:border-[color-mix(in_srgb,var(--primary)_40%,transparent)] hover:shadow-[var(--shadow-lg)]">
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-x-0 -top-16 h-32 bg-[radial-gradient(60%_100%_at_50%_0%,var(--primary-soft),transparent)] opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                  />
                  <span className="relative inline-flex h-12 w-12 items-center justify-center rounded-[var(--radius-md)] bg-[linear-gradient(135deg,var(--primary),var(--secondary))] text-white shadow-[var(--shadow-primary)] transition-transform duration-300 group-hover:scale-110">
                    <Icon size={22} />
                  </span>
                  <h3 className={`relative mt-5 font-black text-[var(--text-primary)] ${wide ? "text-xl" : "text-base"}`}>
                    {card.title}
                  </h3>
                  <p className="relative mt-2 max-w-md text-sm leading-7 text-[var(--text-secondary)]">{card.desc}</p>
                </div>
                </TiltCard>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ── Testimonials ─────────────────────────────────────────────────────────────

export function TestimonialsSection({ content }: { content: LandingContent["testimonials"] }) {
  return (
    <section id="testimonials" className={`${SECTION} bg-[var(--background-subtle)]`}>
      <div className="mx-auto max-w-7xl">
        <SectionHeading eyebrow={content.eyebrow} title={content.title} center />
        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {content.items.map((item, i) => (
            <Reveal key={item.author} index={i} as="article">
              <figure className="group flex h-full flex-col rounded-[var(--radius-2xl)] border border-[var(--border)] bg-[var(--surface-strong)] p-7 shadow-[var(--shadow-sm)] transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[var(--shadow-lg)]">
                <div className="mb-4 inline-flex h-9 w-9 items-center justify-center rounded-full bg-[var(--primary-soft)] text-2xl font-black leading-none text-[var(--primary)]">
                  &ldquo;
                </div>
                <blockquote className="flex-1 text-sm leading-7 text-[var(--text-primary)]">{item.text}</blockquote>
                <figcaption className="mt-6 flex items-center gap-3 border-t border-[var(--border)] pt-4">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[linear-gradient(135deg,var(--primary),var(--secondary))] text-sm font-black text-white">
                    {item.author.charAt(0)}
                  </span>
                  <span>
                    <span className="block text-sm font-bold text-[var(--text-primary)]">{item.author}</span>
                    <span className="block text-xs text-[var(--text-tertiary)]">{item.role}</span>
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

// ── Get-started timeline ───────────────────────────────────────────────────

export function StepsSection({ content }: { content: LandingContent["steps"] }) {
  return (
    <section id="start" className={SECTION}>
      <div className="mx-auto max-w-7xl">
        <SectionHeading eyebrow={content.eyebrow} title={content.title} description={content.description} center />
        <div className="relative mt-12 grid gap-6 sm:grid-cols-3">
          {/* Connecting line */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-[16%] top-12 hidden h-0.5 bg-[linear-gradient(90deg,transparent,var(--border-strong),transparent)] sm:block"
          />
          {content.items.map((step, i) => {
            const Icon = step.icon;
            return (
              <Reveal key={step.title} index={i} as="article">
                <div className="relative flex h-full flex-col items-center rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface-strong)] p-7 text-center shadow-[var(--shadow-sm)]">
                  <span className="relative inline-flex h-16 w-16 items-center justify-center rounded-full bg-[linear-gradient(135deg,var(--primary),var(--secondary))] text-white shadow-[var(--shadow-primary)]">
                    <Icon size={26} />
                    <span className="absolute -end-1 -top-1 inline-flex h-7 w-7 items-center justify-center rounded-full border-2 border-[var(--surface-strong)] bg-[var(--text-primary)] text-xs font-black text-white">
                      {i + 1}
                    </span>
                  </span>
                  <h3 className="mt-5 text-lg font-black text-[var(--text-primary)]">{step.title}</h3>
                  <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">{step.desc}</p>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ── Contact / final CTA band ─────────────────────────────────────────────────

function EyebrowChip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-white/25 bg-white/10 px-3 py-1 text-xs font-extrabold uppercase tracking-wide text-white">
      {children}
    </span>
  );
}

export function ContactSection({ content }: { content: LandingContent["contact"] }) {
  return (
    <section id="contact" className={SECTION}>
      <div className="mx-auto max-w-5xl">
        <Reveal>
          <div className="relative overflow-hidden rounded-[var(--radius-2xl)] bg-[linear-gradient(135deg,var(--primary),var(--primary-strong))] p-10 text-center shadow-[var(--shadow-xl)] sm:p-16">
            <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/15 blur-2xl" />
            <div aria-hidden="true" className="pointer-events-none absolute -bottom-20 -left-10 h-64 w-64 rounded-full bg-[var(--secondary)]/30 blur-3xl" />
            <div className="relative">
              <EyebrowChip>{content.eyebrow}</EyebrowChip>
              <h2 className="mx-auto mt-4 max-w-2xl text-3xl font-black leading-tight tracking-tight text-white sm:text-4xl">
                {content.title}
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-base leading-8 text-white/85">{content.description}</p>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                <a
                  href="#login"
                  className="inline-flex items-center justify-center rounded-full bg-white px-7 py-3.5 text-base font-extrabold text-[var(--primary-strong)] shadow-[var(--shadow-md)] transition-transform hover:scale-[1.03]"
                >
                  {content.cta}
                </a>
                {content.socials.map((s) => {
                  const Icon = s.icon;
                  return (
                    <a
                      key={s.label}
                      href={s.href}
                      className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-5 py-3.5 text-sm font-bold text-white backdrop-blur-sm transition-colors hover:bg-white/20"
                    >
                      <Icon size={18} />
                      <span>{s.handle}</span>
                    </a>
                  );
                })}
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

// ── Footer ─────────────────────────────────────────────────────────────────

export function LandingFooter({
  brandName,
  brandSubtitle,
  logoUrl,
  nav,
  footer,
  year,
}: {
  brandName: string;
  brandSubtitle: string;
  logoUrl: string;
  nav: LandingContent["nav"];
  footer: LandingContent["footer"];
  year: number;
}) {
  return (
    <footer className="border-t border-[var(--border)] bg-[var(--surface-strong)] px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col items-start justify-between gap-8 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <SchoolLogo src={logoUrl} alt={brandName} label={brandName} size={44} className="ring-1 ring-[var(--border)]" />
            <div>
              <div className="text-base font-black text-[var(--text-primary)]">{brandName}</div>
              <div className="text-xs font-semibold text-[var(--text-tertiary)]">{brandSubtitle}</div>
            </div>
          </div>
          <nav className="flex flex-wrap items-center gap-x-6 gap-y-2">
            {nav.links.map((link) => (
              <a
                key={link.id}
                href={`#${link.id}`}
                className="text-sm font-bold text-[var(--text-secondary)] transition-colors hover:text-[var(--primary)]"
              >
                {link.label}
              </a>
            ))}
          </nav>
        </div>
        <p className="mt-8 max-w-md text-sm leading-7 text-[var(--text-tertiary)]">{footer.tagline}</p>
        <div className="mt-8 flex flex-col gap-2 border-t border-[var(--border)] pt-6 text-xs text-[var(--text-tertiary)] sm:flex-row sm:items-center sm:justify-between">
          <span>
            © {year} {brandName}
          </span>
          <span>{footer.rights}</span>
        </div>
      </div>
    </footer>
  );
}
