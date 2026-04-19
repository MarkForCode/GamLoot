'use client';

import { TamaguiProvider, createTamagui } from 'tamagui';
import { getDefaultTamaguiConfig } from '@tamagui/config-default';

const tamagui = createTamagui(getDefaultTamaguiConfig('web'));

export const Provider = ({ children }: { children: React.ReactNode }) => {
  return <TamaguiProvider config={tamagui}>{children}</TamaguiProvider>;
};

export { tamagui };
export default tamagui;
