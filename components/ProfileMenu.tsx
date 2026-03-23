"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, LogOut } from "lucide-react";
import { usePathname } from "next/navigation";

import { ROLE_LABELS, signOutClient } from "@/lib/auth";
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

export function ProfileMenu({ className }: { className?: string }) {
  const pathname = usePathname();
  const locale = getLocaleFromPath(pathname);
  const { profile } = useRole();
  const ref = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [avatarBroken, setAvatarBroken] = useState(false);

  const displayName = profile?.full_name || profile?.email || (locale === "en" ? "Current user" : "المستخدم الحالي");
  const roleLabel = profile?.role ? ROLE_LABELS[profile.role] : locale === "en" ? "Current user" : "المستخدم الحالي";
  const emailLabel = profile?.email || roleLabel;
  const avatarLabel = useMemo(() => getAvatarInitials(profile?.full_name || profile?.email), [profile?.email, profile?.full_name]);
  const avatarSrc = profile?.avatar_url || null;

  useEffect(() => {
    setAvatarBroken(false);
  }, [avatarSrc]);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!ref.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  async function handleLogout() {
    await signOutClient();
    window.location.href = localizeAppPath("/login", locale);
  }

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
            <img src={avatarSrc} alt={displayName} className="profile-menu__avatar-image" onError={() => setAvatarBroken(true)} />
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

      {open ? (
        <div className="profile-menu__panel" role="menu">
          <div className="profile-menu__identity">
            <span className="profile-menu__avatar profile-menu__avatar--large">
              {avatarSrc && !avatarBroken ? (
                <img src={avatarSrc} alt={displayName} className="profile-menu__avatar-image" onError={() => setAvatarBroken(true)} />
              ) : (
                <span>{avatarLabel}</span>
              )}
            </span>
            <div className="profile-menu__identity-copy">
              <strong>{displayName}</strong>
              <span>{emailLabel}</span>
            </div>
          </div>

          <div className="profile-menu__group">
            <LanguageToggle className="profile-menu__action" />
          </div>

          <div className="profile-menu__group">
            <div className="profile-menu__group-label">{locale === "en" ? "Theme" : "المظهر"}</div>
            <ThemeModeToggle variant="inline" className="profile-menu__theme-switch" showLabels compact />
          </div>

          <div className="profile-menu__group">
            <button
              type="button"
              className="profile-menu__action profile-menu__action--danger"
              role="menuitem"
              onClick={() => void handleLogout()}
            >
              <LogOut size={16} aria-hidden="true" />
              <span>{locale === "en" ? "Sign out" : "تسجيل الخروج"}</span>
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
