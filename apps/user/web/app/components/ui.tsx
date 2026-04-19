'use client';

import Link from 'next/link';
import { ComponentProps, ReactNode } from 'react';
import { Button, Paragraph, Text, XStack, YStack } from '@repo/ui';

type StackProps = ComponentProps<typeof YStack>;

export function Shell({ children }: { children: ReactNode }) {
  return (
    <YStack minHeight="100vh" backgroundColor="#f2f7f7">
      <Nav />
      <YStack padding={20} gap={18}>
        {children}
      </YStack>
    </YStack>
  );
}

export function Nav() {
  return (
    <XStack
      alignItems="center"
      backgroundColor="#ffffff"
      borderBottomColor="#d7e3df"
      borderBottomWidth={1}
      flexWrap="wrap"
      gap={12}
      justifyContent="space-between"
      paddingHorizontal={20}
      paddingVertical={14}
    >
      <Link href="/zh-TW/market" style={{ color: '#1f2421', fontSize: 18, fontWeight: 800, textDecoration: 'none' }}>
        GAM Trade
      </Link>
      <XStack gap={8} flexWrap="wrap">
        <NavLink href="/zh-TW/market">交易市場</NavLink>
        <NavLink href="/zh-TW/seller/listings">商品管理</NavLink>
        <NavLink href="/zh-TW/login">登入</NavLink>
      </XStack>
    </XStack>
  );
}

export function NavLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} style={{ textDecoration: 'none' }}>
      <Button borderRadius={8} size="$3">
        {children}
      </Button>
    </Link>
  );
}

export function Panel({ children, ...props }: StackProps) {
  return (
    <YStack backgroundColor="#ffffff" borderColor="#d7e3df" borderWidth={1} borderRadius={8} {...props}>
      {children}
    </YStack>
  );
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <Text color="#60706a" fontSize={12} fontWeight="700" letterSpacing={0} textTransform="uppercase">
      {children}
    </Text>
  );
}

export function Title({ children }: { children: ReactNode }) {
  return (
    <Text color="#1f2421" fontSize={30} fontWeight="800" lineHeight={36} letterSpacing={0}>
      {children}
    </Text>
  );
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <Text color="#1f2421" fontSize={20} fontWeight="800" lineHeight={26} letterSpacing={0}>
      {children}
    </Text>
  );
}

export function Muted({ children }: { children: ReactNode }) {
  return (
    <Paragraph color="#53615c" fontSize={14} lineHeight={20}>
      {children}
    </Paragraph>
  );
}

export function Pill({ children, tone = 'default' }: { children: ReactNode; tone?: 'default' | 'good' | 'warn' }) {
  const colors = {
    default: '#d6ece4',
    good: '#edf8f0',
    warn: '#fff3dd',
  };
  return (
    <Text backgroundColor={colors[tone]} borderRadius={8} color="#1f2421" fontSize={12} fontWeight="800" paddingHorizontal={10} paddingVertical={6}>
      {children}
    </Text>
  );
}

export function formatBody(text: string) {
  try {
    return JSON.stringify(JSON.parse(text), null, 2);
  } catch {
    return text || 'No response body';
  }
}

export function readError(text: string) {
  try {
    const parsed = JSON.parse(text);
    return parsed.error || parsed.message || text;
  } catch {
    return text;
  }
}
