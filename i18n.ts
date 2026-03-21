import { notFound } from 'next/navigation';
import { getRequestConfig } from 'next-intl/server';

const SUPPORTED_LOCALES = new Set(['ar']);

export default getRequestConfig(async ({ locale }) => {
  const normalizedLocale = locale ?? 'ar';

  if (!SUPPORTED_LOCALES.has(normalizedLocale)) {
    notFound();
  }

  return {
    locale: normalizedLocale,
    messages: (await import(`./messages/${normalizedLocale}.json`)).default,
  };
});
