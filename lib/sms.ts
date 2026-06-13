/**
 * SMS deep-link generator.
 * Uses the standard sms: URI scheme — no API needed.
 */

export function buildSmsLink(phone: string, message: string): string {
  const cleaned = phone.replace(/[^0-9+]/g, "");
  return `sms:${cleaned}?body=${encodeURIComponent(message)}`;
}
