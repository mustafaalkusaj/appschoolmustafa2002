export function getAcademicYearLabel(date = new Date(), _locale: "ar" | "en" = "ar") {
  const iraq = new Date(date.toLocaleString("en-US", { timeZone: "Asia/Baghdad" }));
  const d = iraq.getDate();
  const m = iraq.getMonth() + 1;
  const y = iraq.getFullYear();
  return `${d} / ${m} / ${y}`;
}
