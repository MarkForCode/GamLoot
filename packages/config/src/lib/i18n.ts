import { getRequestConfig } from 'next-intl/server';
import { routing } from './routing';

export const locales = routing.locales;
export const defaultLocale = routing.defaultLocale;

type SupportedLocale = (typeof routing.locales)[number];

export default getRequestConfig(async ({ locale }) => {
  if (!routing.locales.includes(locale as SupportedLocale)) {
    return {
      locale: routing.defaultLocale,
      messages: (await import(`../messages/${routing.defaultLocale}.json`)).default,
    };
  }

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
