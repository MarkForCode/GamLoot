import { TamaguiProvider, createTamagui } from '@tamagui/core';
import { config as defaultConfig } from '@tamagui/config';

const tamagui = createTamagui(defaultConfig);

export const Provider = ({ children }: { children: React.ReactNode }) => {
  return <TamaguiProvider value={tamagui}>{children}</TamaguiProvider>;
};

export { tamagui };
export default tamagui;