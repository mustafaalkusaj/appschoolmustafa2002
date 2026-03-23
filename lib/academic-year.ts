export function getAcademicYearLabel(date = new Date(), locale: "ar" | "en" = "ar") {
  const currentYear = date.getFullYear();
  const startYear = date.getMonth() >= 7 ? currentYear : currentYear - 1;
  const formatter = new Intl.NumberFormat(locale === "en" ? "en-US" : "ar-IQ");
  return `${formatter.format(startYear)} / ${formatter.format(startYear + 1)}`;
}
