'use client';

import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { useLocale } from 'next-intl/hooks';

export async function I18nProvider({ children }: { children: React.ReactNode }) {
  const locale = useLocale();

  const messages = await getMessages();

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      {children}
    </NextIntlClientProvider>
  );
}