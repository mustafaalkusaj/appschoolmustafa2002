export const formatNumber = (n: number) => n?.toLocaleString("en-US") || "0";

export const formatDate = (d: string | Date) => new Date(d).toLocaleDateString("en-US");

export const formatDateTime = (d: string | Date) => {
  const date = new Date(d);
  return date.toLocaleString("ar-IQ", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};