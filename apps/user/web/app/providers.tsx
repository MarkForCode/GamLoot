'use client';

import { Provider } from '@repo/ui';

export function Providers({ children }: { children: React.ReactNode }) {
  return <Provider>{children}</Provider>;
}
