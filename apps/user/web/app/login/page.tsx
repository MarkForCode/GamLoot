'use client';

import { useState } from 'react';
import { Button, Input, Text, XStack, YStack } from '@repo/ui';
import { Eyebrow, Muted, Panel, SectionTitle, Shell, Title, formatBody } from '../components/ui';
import type { UserSession } from '../types';

export default function LoginPage() {
  const [owner, setOwner] = useState<UserSession | null>(null);
  const [buyer, setBuyer] = useState<UserSession | null>(null);
  const [ownerName, setOwnerName] = useState('flow-owner');
  const [ownerPassword, setOwnerPassword] = useState('temporary-password-hash');
  const [buyerName, setBuyerName] = useState('demo-buyer');
  const [buyerPassword, setBuyerPassword] = useState('buyer-password-hash');
  const [response, setResponse] = useState('選一個身份登入。');

  async function login(kind: 'owner' | 'buyer') {
    const response = await fetch('/api/user/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        username_or_email: kind === 'owner' ? ownerName : buyerName,
        password_hash: kind === 'owner' ? ownerPassword : buyerPassword,
      }),
    });
    const text = await response.text();
    setResponse(`${response.status} ${response.statusText}\n${formatBody(text)}`);
    if (response.ok) {
      const session = JSON.parse(text) as UserSession;
      if (kind === 'owner') setOwner(session);
      if (kind === 'buyer') setBuyer(session);
    }
  }

  return (
    <Shell>
      <Panel padding={24} gap={10}>
        <Eyebrow>會員登入</Eyebrow>
        <Title>選身份進入市場或商品管理。</Title>
        <Muted>正式版會換成真 auth/session。現在先用 demo identity 跑 MVP 流程。</Muted>
      </Panel>

      <XStack flexWrap="wrap" gap={18}>
        <LoginPanel
          title="公會主 / 賣家"
          username={ownerName}
          password={ownerPassword}
          onUsername={setOwnerName}
          onPassword={setOwnerPassword}
          onLogin={() => login('owner')}
          session={owner}
        />
        <LoginPanel
          title="買家"
          username={buyerName}
          password={buyerPassword}
          onUsername={setBuyerName}
          onPassword={setBuyerPassword}
          onLogin={() => login('buyer')}
          session={buyer}
        />
        <Panel flex={1} minWidth={320} padding={18} gap={10}>
          <SectionTitle>登入結果</SectionTitle>
          <Text
            backgroundColor="#18211f"
            borderRadius={8}
            color="#ecf4ef"
            fontFamily="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
            fontSize={13}
            lineHeight={20}
            padding={14}
            whiteSpace="pre-wrap"
          >
            {response}
          </Text>
        </Panel>
      </XStack>
    </Shell>
  );
}

function LoginPanel({
  title,
  username,
  password,
  onUsername,
  onPassword,
  onLogin,
  session,
}: {
  title: string;
  username: string;
  password: string;
  onUsername: (value: string) => void;
  onPassword: (value: string) => void;
  onLogin: () => void;
  session: UserSession | null;
}) {
  return (
    <Panel flex={1} minWidth={300} padding={18} gap={12}>
      <SectionTitle>{title}</SectionTitle>
      <YStack gap={8}>
        <Input borderRadius={8} value={username} onChangeText={onUsername} />
        <Input borderRadius={8} value={password} onChangeText={onPassword} />
        <Button backgroundColor="#24745f" borderRadius={8} color="#ffffff" onPress={onLogin}>
          登入
        </Button>
      </YStack>
      <Panel padding={12} backgroundColor="#f7fbfa" gap={4}>
        <Text color="#60706a" fontSize={12} fontWeight="800">
          SESSION
        </Text>
        <Text color="#1f2421" fontSize={16} fontWeight="800">
          {session ? session.username : '尚未登入'}
        </Text>
        <Muted>{session ? `user #${session.user_id}, tenant ${session.tenant_id}, guild ${session.guild_id}` : '登入後可進行後續流程。'}</Muted>
      </Panel>
    </Panel>
  );
}
