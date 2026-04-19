'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Button, Input, Paragraph, Text, TextArea, XStack, YStack } from '@repo/ui';
import { Eyebrow, Muted, Panel, Pill, SectionTitle, Shell, Title, formatBody, readError } from '../../components/ui';
import type { Listing, UserSession } from '../../types';

export default function SellerListingsPage() {
  const [owner, setOwner] = useState<UserSession | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [selected, setSelected] = useState<Listing | null>(null);
  const [title, setTitle] = useState('Starter sword bundle');
  const [description, setDescription] = useState('Ready for guild review. Includes sword, shield, and potion stack.');
  const [startPrice, setStartPrice] = useState('120');
  const [buyoutPrice, setBuyoutPrice] = useState('280');
  const [donationAmount, setDonationAmount] = useState('20');
  const [responseText, setResponseText] = useState('商品管理動作結果會顯示在這裡。');

  async function callApi<T>(path: string, init?: RequestInit) {
    const response = await fetch(path, {
      ...init,
      headers: init?.body ? { 'content-type': 'application/json', ...init.headers } : init?.headers,
    });
    const text = await response.text();
    setResponseText(`${response.status} ${response.statusText}\n${formatBody(text)}`);
    if (!response.ok) throw new Error(readError(text));
    return JSON.parse(text || '{}') as T;
  }

  async function loginOwner() {
    const session = await callApi<UserSession>('/api/user/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        username_or_email: 'flow-owner',
        password_hash: 'temporary-password-hash',
      }),
    });
    setOwner(session);
  }

  async function loadListings() {
    const rows = await callApi<Listing[]>('/api/user/tenants/1/listings');
    setListings(rows);
    setSelected(rows[0] || null);
  }

  async function createListing() {
    const actor = owner || (await callApi<UserSession>('/api/user/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        username_or_email: 'flow-owner',
        password_hash: 'temporary-password-hash',
      }),
    }));
    setOwner(actor);

    const result = await callApi<{ id: number }>('/api/user/guilds/1/listings', {
      method: 'POST',
      body: JSON.stringify({
        tenant_id: 1,
        seller_user_id: actor.user_id,
        title,
        description,
        mode: 'auction_open_bid',
        visibility: 'guild_only',
        game_id: 1,
        currency_id: 1,
        start_price: startPrice,
        buyout_price: buyoutPrice,
      }),
    });
    await loadListings();
    const detail = await callApi<{ listing: Listing }>(`/api/user/listings/${result.id}`);
    setSelected(detail.listing);
  }

  async function approveListing() {
    if (!selected) return;
    await callApi(`/api/user/listings/${selected.id}/approve`, {
      method: 'POST',
      body: JSON.stringify({ tenant_id: 1, approved_by: owner?.user_id || 4 }),
    });
    await loadListings();
  }

  async function settleListing() {
    if (!selected) return;
    await callApi(`/api/user/listings/${selected.id}/settle`, {
      method: 'POST',
      body: JSON.stringify({ tenant_id: 1, completed_by: owner?.user_id || 4, guild_donation_amount: donationAmount }),
    });
    await loadListings();
  }

  useEffect(() => {
    loadListings().catch(() => undefined);
  }, []);

  return (
    <Shell>
      <Panel padding={24} gap={10}>
        <Eyebrow>賣家中心</Eyebrow>
        <Title>商品管理、審核、成交。</Title>
        <Muted>這裡才是賣家/公會管理員操作刊登商品的地方，不再塞在交易市場首頁。</Muted>
      </Panel>

      <XStack flexWrap="wrap" gap={18} alignItems="stretch">
        <Panel flex={1} minWidth={340} padding={18} gap={14}>
          <XStack justifyContent="space-between" alignItems="center" gap={12}>
            <SectionTitle>建立拍賣</SectionTitle>
            <Button borderRadius={8} onPress={loginOwner}>
              登入 flow-owner
            </Button>
          </XStack>
          <YStack gap={8}>
            <Input borderRadius={8} value={title} onChangeText={setTitle} />
            <TextArea borderRadius={8} minHeight={110} value={description} onChangeText={setDescription} />
            <XStack gap={10}>
              <Input flex={1} borderRadius={8} value={startPrice} onChangeText={setStartPrice} />
              <Input flex={1} borderRadius={8} value={buyoutPrice} onChangeText={setBuyoutPrice} />
            </XStack>
            <Button backgroundColor="#24745f" borderRadius={8} color="#ffffff" onPress={createListing}>
              建立商品
            </Button>
          </YStack>
          <Panel padding={12} backgroundColor="#f7fbfa">
            <Muted>{owner ? `目前身份：${owner.username} / user #${owner.user_id}` : '尚未登入，建立商品時會自動用 demo owner 登入。'}</Muted>
          </Panel>
        </Panel>

        <Panel flex={1} minWidth={340} padding={18} gap={14}>
          <XStack justifyContent="space-between" alignItems="center" gap={12}>
            <SectionTitle>我的商品</SectionTitle>
            <Button borderRadius={8} onPress={loadListings}>
              重新整理
            </Button>
          </XStack>
          <YStack gap={10}>
            {listings.map((listing) => (
              <Button
                key={listing.id}
                alignItems="flex-start"
                backgroundColor={selected?.id === listing.id ? '#d6ece4' : '#f7fbfa'}
                borderColor={selected?.id === listing.id ? '#24745f' : '#d7e3df'}
                borderRadius={8}
                borderWidth={1}
                flexDirection="column"
                height="auto"
                justifyContent="flex-start"
                onPress={() => setSelected(listing)}
                padding={12}
              >
                <Text color="#1f2421" fontSize={15} fontWeight="800">
                  #{listing.id} {listing.title}
                </Text>
                <Paragraph color="#53615c" fontSize={13} lineHeight={18}>
                  {listing.status} · top bid {listing.top_bid_amount || '-'} · bids {listing.bid_count}
                </Paragraph>
              </Button>
            ))}
          </YStack>
        </Panel>

        <Panel flex={1} minWidth={340} padding={18} gap={14}>
          <SectionTitle>商品操作</SectionTitle>
          {selected ? (
            <YStack gap={12}>
              <XStack gap={8} flexWrap="wrap">
                <Pill>#{selected.id}</Pill>
                <Pill>{selected.status}</Pill>
                <Pill>bid {selected.top_bid_amount || '-'}</Pill>
              </XStack>
              <Text color="#1f2421" fontSize={22} fontWeight="800">
                {selected.title}
              </Text>
              <Muted>{selected.description}</Muted>
              <XStack gap={8} flexWrap="wrap">
                <Button borderRadius={8} disabled={selected.status !== 'draft'} onPress={approveListing}>
                  審核上架
                </Button>
                <Input width={120} borderRadius={8} value={donationAmount} onChangeText={setDonationAmount} />
                <Button borderRadius={8} disabled={!['bidding', 'ended', 'matched'].includes(selected.status)} onPress={settleListing}>
                  成交
                </Button>
                <Link href={`/zh-TW/listings/${selected.id}`} style={{ textDecoration: 'none' }}>
                  <Button borderRadius={8}>查看前台</Button>
                </Link>
              </XStack>
            </YStack>
          ) : (
            <Muted>選一個商品後可以審核或成交。</Muted>
          )}
          <Text
            backgroundColor="#18211f"
            borderRadius={8}
            color="#ecf4ef"
            fontFamily="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
            fontSize={13}
            lineHeight={20}
            maxHeight={280}
            padding={14}
            whiteSpace="pre-wrap"
          >
            {responseText}
          </Text>
        </Panel>
      </XStack>
    </Shell>
  );
}
