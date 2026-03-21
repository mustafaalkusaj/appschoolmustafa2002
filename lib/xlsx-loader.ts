let xlsxPromise: Promise<typeof import("xlsx")> | null = null;

export function loadXLSX() {
  if (!xlsxPromise) {
    xlsxPromise = import("xlsx");
  }
  return xlsxPromise;
}
