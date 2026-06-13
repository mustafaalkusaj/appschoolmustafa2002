export function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#x27;",
  };
  return text.replace(/[&<>"']/g, (char) => map[char]);
}

export function buildCsvContent<T extends object>(data: T[], headers: (keyof T)[]): string {
  const csvHeaders = headers.join(",");
  const rows = data.map((row) =>
    headers
      .map((header) => {
        const val = row[header];
        if (typeof val === "string") return `"${val.replace(/"/g, '""')}"`;
        if (val === null || val === undefined) return "";
        return String(val);
      })
      .join(","),
  );
  return [csvHeaders, ...rows].join("\n");
}

export function exportToCSV<T extends object>(data: T[], filename: string) {
  if (data.length === 0) return;

  const firstRow = data[0] as Record<string, unknown>;
  const headers = Object.keys(firstRow);
  const csvContent = [
    headers.join(","),
    ...data.map((row) =>
      headers
        .map((header) => {
          const val = (row as Record<string, unknown>)[header];
          if (typeof val === "string") return `"${val.replace(/"/g, '""')}"`;
          if (val === null || val === undefined) return "";
          return String(val);
        })
        .join(","),
    ),
  ].join("\n");

  const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `${filename}_${new Date().toISOString().split("T")[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
