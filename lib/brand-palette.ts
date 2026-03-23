const STORAGE_KEY = "school-branding-overrides:v1";
const DEFAULT_PRIMARY = "#4f8cff";
const DEFAULT_SECONDARY = "#79d7ff";

export type StoredSchoolBranding = {
  primaryColor: string | null;
  secondaryColor: string | null;
  source: "manual" | "derived";
  updatedAt: string;
};

function isBrowser() {
  return typeof window !== "undefined";
}

export function sanitizeColor(value: string | null | undefined) {
  if (!value) return null;
  const trimmed = value.trim();
  return /^#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/.test(trimmed) ? trimmed : null;
}

function normalizeHex(hex: string) {
  const trimmed = sanitizeColor(hex) || DEFAULT_PRIMARY;
  const raw = trimmed.replace("#", "");
  return raw.length === 3 ? raw.split("").map((part) => part + part).join("") : raw;
}

export function hexToRgb(hex: string) {
  const normalized = normalizeHex(hex);
  const value = Number.parseInt(normalized, 16);
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  };
}

function rgbToHex(r: number, g: number, b: number) {
  return `#${[r, g, b]
    .map((channel) => Math.max(0, Math.min(255, Math.round(channel))).toString(16).padStart(2, "0"))
    .join("")}`;
}

export function shiftColor(hex: string, ratio: number) {
  const { r, g, b } = hexToRgb(hex);
  const blend = (channel: number) => {
    if (ratio >= 0) {
      return channel + (255 - channel) * ratio;
    }
    return channel * (1 + ratio);
  };

  return rgbToHex(blend(r), blend(g), blend(b));
}

export function mixColors(first: string, second: string, weight = 0.5) {
  const a = hexToRgb(first);
  const b = hexToRgb(second);
  const ratio = Math.max(0, Math.min(1, weight));
  return rgbToHex(
    a.r * (1 - ratio) + b.r * ratio,
    a.g * (1 - ratio) + b.g * ratio,
    a.b * (1 - ratio) + b.b * ratio,
  );
}

export function toRgba(hex: string, alpha: number) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function derivePaletteFromSeed(seed: string | null | undefined) {
  const normalized = (seed || "school-brand").trim() || "school-brand";
  let hash = 0;
  for (let index = 0; index < normalized.length; index += 1) {
    hash = normalized.charCodeAt(index) + ((hash << 5) - hash);
  }

  const hue = Math.abs(hash) % 360;
  const primary = hslToHex(hue, 68, 52);
  const secondary = hslToHex((hue + 28) % 360, 74, 68);
  return {
    primaryColor: primary,
    secondaryColor: secondary,
  };
}

function hslToHex(h: number, s: number, l: number) {
  const saturation = s / 100;
  const lightness = l / 100;
  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
  const x = chroma * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = lightness - chroma / 2;

  let r = 0;
  let g = 0;
  let b = 0;

  if (h < 60) {
    r = chroma;
    g = x;
  } else if (h < 120) {
    r = x;
    g = chroma;
  } else if (h < 180) {
    g = chroma;
    b = x;
  } else if (h < 240) {
    g = x;
    b = chroma;
  } else if (h < 300) {
    r = x;
    b = chroma;
  } else {
    r = chroma;
    b = x;
  }

  return rgbToHex((r + m) * 255, (g + m) * 255, (b + m) * 255);
}

async function loadImage(url: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    if (!isBrowser()) {
      reject(new Error("Image palette extraction requires a browser."));
      return;
    }

    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Unable to load brand image."));
    image.src = url;
  });
}

export async function derivePaletteFromLogo(
  logoUrl: string | null | undefined,
  schoolName?: string | null,
) {
  const fallback = derivePaletteFromSeed(logoUrl || schoolName || "school-brand");
  if (!logoUrl || !isBrowser()) {
    return fallback;
  }

  try {
    const image = await loadImage(logoUrl);
    const canvas = document.createElement("canvas");
    const size = 24;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });

    if (!ctx) {
      return fallback;
    }

    ctx.drawImage(image, 0, 0, size, size);
    const pixels = ctx.getImageData(0, 0, size, size).data;

    let totalWeight = 0;
    let weightedR = 0;
    let weightedG = 0;
    let weightedB = 0;
    let accent: { saturation: number; r: number; g: number; b: number } | null = null;

    for (let index = 0; index < pixels.length; index += 4) {
      const alpha = pixels[index + 3] / 255;
      if (alpha < 0.2) continue;

      const r = pixels[index];
      const g = pixels[index + 1];
      const b = pixels[index + 2];
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const saturation = max === 0 ? 0 : (max - min) / max;
      const brightness = (r + g + b) / 3;
      const weight = alpha * (0.7 + saturation) * (brightness > 245 ? 0.35 : 1);

      totalWeight += weight;
      weightedR += r * weight;
      weightedG += g * weight;
      weightedB += b * weight;

      if (!accent || saturation > accent.saturation) {
        accent = { saturation, r, g, b };
      }
    }

    if (totalWeight <= 0) {
      return fallback;
    }

    const primaryColor = rgbToHex(weightedR / totalWeight, weightedG / totalWeight, weightedB / totalWeight);
    const accentColor = accent ? rgbToHex(accent.r, accent.g, accent.b) : primaryColor;

    return {
      primaryColor,
      secondaryColor: mixColors(accentColor, "#ffffff", 0.38),
    };
  } catch {
    return fallback;
  }
}

function readStore() {
  if (!isBrowser()) return {};

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, StoredSchoolBranding>;
    return typeof parsed === "object" && parsed ? parsed : {};
  } catch {
    return {};
  }
}

function writeStore(nextValue: Record<string, StoredSchoolBranding>) {
  if (!isBrowser()) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextValue));
}

export function getStoredSchoolBranding(schoolId: string | null | undefined) {
  if (!schoolId) return null;
  const store = readStore();
  return store[schoolId] ?? null;
}

export function setStoredSchoolBranding(
  schoolId: string,
  value: Pick<StoredSchoolBranding, "primaryColor" | "secondaryColor" | "source">,
) {
  const primaryColor = sanitizeColor(value.primaryColor);
  const secondaryColor = sanitizeColor(value.secondaryColor);
  const store = readStore();
  store[schoolId] = {
    primaryColor,
    secondaryColor,
    source: value.source,
    updatedAt: new Date().toISOString(),
  };
  writeStore(store);
}

export function clearStoredSchoolBranding(schoolId: string) {
  const store = readStore();
  delete store[schoolId];
  writeStore(store);
}

export function resolveBrandPalette(input: {
  primaryColor?: string | null;
  secondaryColor?: string | null;
}) {
  const primaryColor = sanitizeColor(input.primaryColor) || DEFAULT_PRIMARY;
  const secondaryColor = sanitizeColor(input.secondaryColor) || DEFAULT_SECONDARY;
  return {
    primaryColor,
    secondaryColor,
    primaryStrong: shiftColor(primaryColor, -0.12),
    primaryDeep: shiftColor(primaryColor, -0.28),
    accentSoft: mixColors(primaryColor, "#ffffff", 0.82),
  };
}

export { DEFAULT_PRIMARY, DEFAULT_SECONDARY };
