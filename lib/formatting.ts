export const formatNumber = (n: number) => n?.toLocaleString("en-US") || "0";

export const formatDate = (d: string | Date) => new Date(d).toLocaleDateString("en-US");