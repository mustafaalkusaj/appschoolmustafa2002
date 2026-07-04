"use client";

import { useEffect, useState } from "react";
import { Menu, XCircle } from "@/lib/icons";
import { SchoolLogo } from "@/components/brand";
import { LanguageToggle } from "@/components/LanguageToggle";
import { ThemeModeToggle } from "@/components/ThemeModeToggle";
import type { LandingContent } from "@/lib/landing-content";

interface LandingNavProps {
  brandName: string;
  brandSubtitle: string;
  logoUrl: string;
  nav: LandingContent["nav"];
}

export function LandingNav({ brandName, brandSubtitle, logoUrl, nav }: LandingNavProps) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={[
        "fixed inset-x-0 top-0 z-50 transition-all duration-300",
        scrolled
          ? "border-b border-[var(--border)] bg-[color-mix(in_srgb,var(--surface-strong)_82%,transparent)] shadow-[var(--shadow-sm)] backdrop-blur-xl"
          : "border-b border-transparent bg-transparent",
      ].join(" ")}
    >
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        {/* Brand */}
        <a href="#top" className="flex items-center gap-3" aria-label={brandName}>
          <SchoolLogo
            src={logoUrl}
            alt={brandName}
            label={brandName}
            size={40}
            className="shadow-[var(--shadow-sm)] ring-1 ring-[var(--border)]"
          />
          <span className="flex flex-col leading-tight">
            <span className="text-[0.95rem] font-black tracking-tight text-[var(--text-primary)]">{brandName}</span>
            <span className="text-[0.7rem] font-semibold text-[var(--text-tertiary)]">{brandSubtitle}</span>
          </span>
        </a>

        {/* Desktop links */}
        <div className="hidden items-center gap-1 lg:flex">
          {nav.links.map((link) => (
            <a
              key={link.id}
              href={`#${link.id}`}
              className="rounded-full px-4 py-2 text-sm font-bold text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
            >
              {link.label}
            </a>
          ))}
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-2">
          <div className="hidden items-center gap-2 sm:flex">
            <LanguageToggle className="shell-utility-button" />
            <ThemeModeToggle variant="inline" compact />
          </div>
          <a
            href="#login"
            className="hidden rounded-full bg-[var(--primary)] px-5 py-2.5 text-sm font-extrabold text-white shadow-[var(--shadow-primary)] transition-all hover:brightness-110 hover:shadow-[var(--shadow-md)] sm:inline-flex"
          >
            {nav.login}
          </a>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label={nav.login}
            aria-expanded={open}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface-strong)] text-[var(--text-primary)] transition hover:bg-[var(--surface-hover)] lg:hidden"
          >
            {open ? <XCircle size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </nav>

      {/* Mobile panel */}
      {open ? (
        <div className="border-t border-[var(--border)] bg-[var(--surface-strong)] px-4 pb-5 pt-3 shadow-[var(--shadow-md)] lg:hidden">
          <div className="flex flex-col gap-1">
            {nav.links.map((link) => (
              <a
                key={link.id}
                href={`#${link.id}`}
                onClick={() => setOpen(false)}
                className="rounded-[var(--radius-md)] px-4 py-3 text-sm font-bold text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
              >
                {link.label}
              </a>
            ))}
            <a
              href="#login"
              onClick={() => setOpen(false)}
              className="mt-2 rounded-full bg-[var(--primary)] px-5 py-3 text-center text-sm font-extrabold text-white shadow-[var(--shadow-primary)]"
            >
              {nav.login}
            </a>
            <div className="mt-3 flex items-center gap-2 sm:hidden">
              <LanguageToggle className="shell-utility-button" />
              <ThemeModeToggle variant="inline" compact />
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
}
