"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { usePathname } from "next/navigation";
import { readApiData } from "@/lib/api-contract";
import {
  DEFAULT_PLATFORM_BRANDING,
  PLATFORM_BRANDING_CHANGE_EVENT,
  getPlatformBrandBrowserTitle,
  getPlatformBrandIconUrl,
  normalizePlatformBranding,
  readPlatformBranding,
  storePlatformBranding,
  type PlatformBranding,
} from "@/lib/platform-branding";
import { getLocaleFromPath } from "@/lib/locale-routing";

type PlatformBrandingContextValue = {
  branding: PlatformBranding;
};

const PlatformBrandingContext = createContext<PlatformBrandingContextValue>({
  branding: DEFAULT_PLATFORM_BRANDING,
});

function ensureHeadLink(rel: string) {
  let link = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!link) {
    link = document.createElement("link");
    link.rel = rel;
    document.head.appendChild(link);
  }
  return link;
}

function ensureThemeColorMeta() {
  let meta = document.head.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement("meta");
    meta.name = "theme-color";
    document.head.appendChild(meta);
  }
  return meta;
}

function applyBrandingDocument(branding: PlatformBranding, locale: string) {
  document.title = getPlatformBrandBrowserTitle(branding, locale);
  ensureThemeColorMeta().content = branding.theme.light.brand.primary;

  const iconUrl = getPlatformBrandIconUrl(branding);
  if (!iconUrl) {
    return;
  }

  ensureHeadLink("icon").href = iconUrl;
  ensureHeadLink("shortcut icon").href = iconUrl;
  ensureHeadLink("apple-touch-icon").href = iconUrl;
}

export function PlatformBrandingProvider({
  children,
  initialBranding,
}: {
  children: React.ReactNode;
  initialBranding?: PlatformBranding;
}) {
  const pathname = usePathname();
  const locale = getLocaleFromPath(pathname);
  const initialResolvedBranding = useMemo(
    () => normalizePlatformBranding(initialBranding ?? readPlatformBranding()),
    [initialBranding],
  );
  const [branding, setBranding] = useState<PlatformBranding>(initialResolvedBranding);

  useEffect(() => {
    let cancelled = false;

    const syncBranding = () => {
      const nextBranding = readPlatformBranding();
      setBranding(nextBranding);
      applyBrandingDocument(nextBranding, locale);
    };

    setBranding(initialResolvedBranding);
    applyBrandingDocument(initialResolvedBranding, locale);
    storePlatformBranding(initialResolvedBranding, { emitEvent: false });

    const syncFromServer = async () => {
      try {
        const response = await fetch("/api/platform-branding", {
          method: "GET",
          cache: "no-store",
        });
        const payload = await response.json().catch(() => null);
        const data = readApiData<{
          branding?: PlatformBranding;
          persisted?: boolean;
        }>(payload);

        if (!response.ok || !data?.branding || data.persisted !== true) {
          return;
        }

        if (cancelled) {
          return;
        }

        storePlatformBranding(data.branding, { emitEvent: false });
        setBranding(data.branding);
        applyBrandingDocument(data.branding, locale);
      } catch {
        // Local cache remains the fallback when the route or server config is unavailable.
      }
    };

    void syncFromServer();

    const onStorage = () => syncBranding();
    const onBrandingChange = () => syncBranding();

    window.addEventListener("storage", onStorage);
    window.addEventListener(PLATFORM_BRANDING_CHANGE_EVENT, onBrandingChange);

    return () => {
      cancelled = true;
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(PLATFORM_BRANDING_CHANGE_EVENT, onBrandingChange);
    };
  }, [initialResolvedBranding, locale]);

  const value = useMemo(
    () => ({ branding }),
    [branding],
  );

  return (
    <PlatformBrandingContext.Provider value={value}>
      {children}
    </PlatformBrandingContext.Provider>
  );
}

export function usePlatformBranding() {
  return useContext(PlatformBrandingContext);
}
