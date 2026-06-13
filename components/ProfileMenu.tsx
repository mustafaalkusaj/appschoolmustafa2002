"use client";

/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronDown,
  LogOut,
  Copy,
  Check,
  Settings,
  LifeBuoy,
  Keyboard,
  BellRing,
  BellOff,
  ExternalLink,
  Shield,
  Command,
} from "@/lib/icons";
import { usePathname, useRouter } from "next/navigation";

import { getRoleLabel, signOutClient } from "@/lib/auth";
import { getLocaleFromPath, localizeAppPath } from "@/lib/locale-routing";
import { ThemeModeToggle } from "@/components/ThemeModeToggle";
import { LanguageToggle } from "@/components/LanguageToggle";
import { useRole } from "@/hooks/useRole";

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function getAvatarInitials(value: string | null | undefined) {
  const parts = (value || "")
    .split(" ")
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 2);

  if (parts.length === 0) return "U";
  return parts.map((part) => part.charAt(0)).join("").toUpperCase();
}

const SHORTCUTS = [
  { keys: ["G", "D"], label: { ar: "لوحة التحكم", en: "Dashboard" } },
  { keys: ["G", "S"], label: { ar: "الطلاب", en: "Students" } },
  { keys: ["G", "T"], label: { ar: "المعلمون", en: "Teachers" } },
  { keys: ["G", "P"], label: { ar: "المدفوعات", en: "Payments" } },
  { keys: ["G", "A"], label: { ar: "الحضور", en: "Attendance" } },
  { keys: ["Esc"], label: { ar: "إغلاق النوافذ", en: "Close panels" } },
];

const SHORTCUT_ROUTES: Record<string, string> = {
  D: "/dashboard",
  S: "/students",
  T: "/teachers",
  P: "/payments",
  A: "/attendance",
};

const NOTIF_PREF_KEY = "profile-notif-enabled";

export function ProfileMenu({ className }: { className?: string }) {
  const pathname = usePathname();
  const locale = getLocaleFromPath(pathname);
  const router = useRouter();
  const { profile } = useRole();
  const ref = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [avatarBroken, setAvatarBroken] = useState(false);
  const [copied, setCopied] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [notifEnabled, setNotifEnabled] = useState(() => {
    if (typeof window === "undefined") return true;
    const stored = localStorage.getItem(NOTIF_PREF_KEY);
    return stored === null ? true : stored === "true";
  });

  const displayName = profile?.full_name || profile?.email || (locale === "en" ? "Current user" : "المستخدم الحالي");
  const roleLabel = profile?.role ? getRoleLabel(profile.role, locale) : locale === "en" ? "Current user" : "المستخدم الحالي";
  const emailLabel = profile?.email || roleLabel;
  const avatarLabel = useMemo(() => getAvatarInitials(profile?.full_name || profile?.email), [profile?.email, profile?.full_name]);
  const avatarSrc = profile?.avatar_url || null;

  useEffect(() => {
    setAvatarBroken(false);
  }, [avatarSrc]);

  // Close on outside click / Escape
  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!ref.current?.contains(event.target as Node)) {
        setOpen(false);
        setShortcutsOpen(false);
      }
    }
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        setShortcutsOpen(false);
      }
    }
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  // Global keyboard shortcuts: G + letter
  useEffect(() => {
    let gPressed = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    function handleKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      if (e.key === "g" || e.key === "G") {
        gPressed = true;
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => { gPressed = false; }, 1500);
        return;
      }

      if (gPressed) {
        const key = e.key.toUpperCase();
        const route = SHORTCUT_ROUTES[key];
        if (route) {
          e.preventDefault();
          gPressed = false;
          router.push(localizeAppPath(route, locale));
        }
      }
    }

    window.addEventListener("keydown", handleKey);
    return () => {
      window.removeEventListener("keydown", handleKey);
      if (timer) clearTimeout(timer);
    };
  }, [locale, router]);

  async function handleLogout() {
    await signOutClient();
    window.location.href = localizeAppPath("/login", locale);
  }

  function handleCopyEmail() {
    if (!profile?.email) return;
    navigator.clipboard.writeText(profile.email).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function toggleNotif() {
    const next = !notifEnabled;
    setNotifEnabled(next);
    localStorage.setItem(NOTIF_PREF_KEY, String(next));
  }

  const roleBadgeStyle: Record<string, { bg: string; color: string }> = {
    super_admin: { bg: "rgba(245,158,11,0.12)", color: "var(--warning)" },
    admin:       { bg: "rgba(99,102,241,0.12)", color: "var(--primary)" },
    employee:    { bg: "rgba(16,185,129,0.12)", color: "var(--success)" },
  };
  const roleBadge = profile?.role ? roleBadgeStyle[profile.role] : null;

  return (
    <div ref={ref} className={cx("profile-menu", className)}>
      <button
        type="button"
        className={cx("profile-menu__trigger", open && "is-open")}
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((current) => !current)}
      >
        <span className="profile-menu__avatar">
          {avatarSrc && !avatarBroken ? (
            <img
              src={avatarSrc}
              alt={displayName}
              className="profile-menu__avatar-image"
              width={40}
              height={40}
              onError={() => setAvatarBroken(true)}
            />
          ) : (
            <span>{avatarLabel}</span>
          )}
        </span>
        <span className="profile-menu__copy">
          <strong>{displayName}</strong>
          <span>{roleLabel}</span>
        </span>
        <ChevronDown size={16} className={cx("profile-menu__caret", open && "is-open")} aria-hidden="true" />
      </button>

      {open && (
        <div className="profile-menu__panel" role="menu">

          {/* Header */}
          <div className="profile-menu__header">
            <div className="profile-menu__header-bg" aria-hidden="true" />
            <span className="profile-menu__avatar profile-menu__avatar--large">
              {avatarSrc && !avatarBroken ? (
                <img
                  src={avatarSrc}
                  alt={displayName}
                  className="profile-menu__avatar-image"
                  width={64}
                  height={64}
                  onError={() => setAvatarBroken(true)}
                />
              ) : (
                <span>{avatarLabel}</span>
              )}
            </span>
            <div className="profile-menu__identity-copy">
              <strong>{displayName}</strong>
              <div className="profile-menu__email-row">
                <span className="profile-menu__email-text">{emailLabel}</span>
                {profile?.email && (
                  <button
                    type="button"
                    className="profile-menu__copy-btn"
                    onClick={handleCopyEmail}
                    title={locale === "en" ? "Copy email" : "نسخ الإيميل"}
                  >
                    {copied
                      ? <Check size={11} />
                      : <Copy size={11} />}
                  </button>
                )}
              </div>
              {roleBadge && (
                <span
                  className="profile-menu__role-badge"
                  style={{ background: roleBadge.bg, color: roleBadge.color }}
                >
                  <Shield size={9} />
                  {roleLabel}
                </span>
              )}
            </div>
          </div>

          {/* Body */}
          <div className="profile-menu__body">

            {/* Quick links */}
            <div className="profile-menu__group">
              <div className="profile-menu__quick-links">
                <a
                  href={localizeAppPath("/dashboard/settings", locale)}
                  className="profile-menu__quick-link"
                  onClick={() => setOpen(false)}
                >
                  <Settings size={14} />
                  <span>{locale === "en" ? "Settings" : "الإعدادات"}</span>
                  <ExternalLink size={10} className="profile-menu__quick-link-arrow" />
                </a>
                <a
                  href="https://wa.me/9647735003050"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="profile-menu__quick-link"
                >
                  <LifeBuoy size={14} />
                  <span>{locale === "en" ? "Support" : "الدعم"}</span>
                  <ExternalLink size={10} className="profile-menu__quick-link-arrow" />
                </a>
              </div>
            </div>

            {/* Language */}
            <div className="profile-menu__group">
              <LanguageToggle className="profile-menu__action" />
            </div>

            {/* Theme */}
            <div className="profile-menu__group">
              <div className="profile-menu__group-label">{locale === "en" ? "Theme" : "المظهر"}</div>
              <ThemeModeToggle variant="inline" className="profile-menu__theme-switch" showLabels compact />
            </div>

            {/* Notification toggle */}
            <div className="profile-menu__group">
              <button
                type="button"
                className="profile-menu__action profile-menu__action--toggle"
                onClick={toggleNotif}
              >
                <div className="profile-menu__action-start">
                  {notifEnabled
                    ? <BellRing size={14} style={{ color: "var(--primary)" }} />
                    : <BellOff size={14} style={{ color: "var(--text-tertiary)" }} />}
                  <span>{locale === "en" ? "Notifications" : "الإشعارات"}</span>
                </div>
                <div className={cx("profile-menu__toggle", notifEnabled && "profile-menu__toggle--on")} aria-hidden="true">
                  <div className="profile-menu__toggle-knob" />
                </div>
              </button>
            </div>

            {/* Keyboard shortcuts */}
            <div className="profile-menu__group">
              <button
                type="button"
                className="profile-menu__action"
                onClick={() => setShortcutsOpen((s) => !s)}
              >
                <div className="profile-menu__action-start">
                  <Keyboard size={14} />
                  <span>{locale === "en" ? "Keyboard shortcuts" : "اختصارات لوحة المفاتيح"}</span>
                </div>
                <kbd className="profile-menu__kbd">?</kbd>
              </button>

              {shortcutsOpen && (
                <div className="profile-menu__shortcuts">
                  {SHORTCUTS.map((s) => (
                    <div key={s.keys.join("+")} className="profile-menu__shortcut-row">
                      <span className="profile-menu__shortcut-label">{s.label[locale]}</span>
                      <div className="profile-menu__shortcut-keys">
                        {s.keys[0] === "G" && s.keys.length === 2 ? (
                          <>
                            <kbd><Command size={9} /></kbd>
                            <kbd>{s.keys[1]}</kbd>
                          </>
                        ) : (
                          s.keys.map((k) => <kbd key={k}>{k}</kbd>)
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Logout */}
            <div className="profile-menu__group">
              <button
                type="button"
                className="profile-menu__action profile-menu__action--danger"
                role="menuitem"
                onClick={() => void handleLogout()}
              >
                <div className="profile-menu__action-start">
                  <LogOut size={14} aria-hidden="true" />
                  <span>{locale === "en" ? "Sign out" : "تسجيل الخروج"}</span>
                </div>
              </button>
            </div>

            {/* Footer: version */}
            <div className="profile-menu__footer">
              <span>v0.1.0</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
