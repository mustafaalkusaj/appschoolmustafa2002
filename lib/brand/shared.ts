const PLACEHOLDER_PATTERN = /\{\{.+\}\}/;

export function isPlaceholderValue(value: string | null | undefined) {
  return Boolean(value && PLACEHOLDER_PATTERN.test(value.trim()));
}

export function resolvePlaceholderText(value: string | null | undefined, fallback: string) {
  if (!value || isPlaceholderValue(value)) {
    return fallback;
  }

  return value;
}

export function resolvePlaceholderAsset(value: string | null | undefined) {
  if (!value || isPlaceholderValue(value)) {
    return null;
  }

  return value;
}
