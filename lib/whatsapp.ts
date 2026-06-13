/**
 * WhatsApp deep-link generator.
 * No API or token needed — uses the universal wa.me link format.
 */

const APP_DOWNLOAD_LINK = "https://school-app.example.com/download";

export interface WhatsAppCardMessage {
  username: string;
  password: string;
  studentName?: string;
  appLink?: string;
}

export function buildWhatsAppLink(phone: string, message: string): string {
  const cleaned = phone.replace(/[^0-9]/g, "");
  return `https://wa.me/${cleaned}?text=${encodeURIComponent(message)}`;
}

export function buildLoginCardMessage({
  username,
  password,
  studentName,
  appLink = APP_DOWNLOAD_LINK,
}: WhatsAppCardMessage): string {
  const lines = [
    "بطاقة دخول التطبيق",
    "",
    ...(studentName ? [`الطالب: ${studentName}`, ""] : []),
    `اسم المستخدم: ${username}`,
    `كلمة المرور: ${password}`,
    "",
    `رابط التحميل: ${appLink}`,
  ];
  return lines.join("\n");
}

export function buildWhatsAppShareLink(
  phone: string,
  card: WhatsAppCardMessage,
): string {
  return buildWhatsAppLink(phone, buildLoginCardMessage(card));
}
