'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Button, Input, Paragraph, Text, XStack, YStack } from '@repo/ui';
import { Eyebrow, Muted, Panel, Pill, SectionTitle, Shell, Title, formatBody, readError } from '../../components/ui';
import type { Listing, ListingBid, UserSession } from '../../types';

export default function ListingDetailPage({ params }: { params: { id: string } }) {
  const listingId = Number(params.id);
  const [listing, setListing] = useState<Listing | null>(null);
  const [bids, setBids] = useState<ListingBid[]>([]);
  const [buyer, setBuyer] = useState<UserSession | null>(null);
  const [bidAmount, setBidAmount] = useState('320');
  const [responseText, setResponseText] = useState('登入買家後可以下標。');

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

  async function loadDetail() {
    const detail = await callApi<{ listing: Listing; bids: ListingBid[] }>(`/api/user/listings/${listingId}`);
    setListing(detail.listing);
    setBids(detail.bids);
  }

  async function loginBuyer() {
    const session = await callApi<UserSession>('/api/user/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        username_or_email: 'demo-buyer',
        password_hash: 'buyer-password-hash',
      }),
    });
    setBuyer(session);
  }

  async function placeBid() {
    const actor = buyer || (await callApi<UserSession>('/api/user/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        username_or_email: 'demo-buyer',
        password_hash: 'buyer-password-hash',
      }),
    }));
    setBuyer(actor);
    await callApi(`/api/user/listings/${listingId}/bids`, {
      method: 'POST',
      body: JSON.stringify({
        tenant_id: 1,
        bidder_user_id: actor.user_id,
        bidder_guild_id: actor.guild_id,
        currency_id: 1,
        amount: bidAmount,
      }),
    });
    await loadDetail();
  }

  useEffect(() => {
    loadDetail().catch(() => undefined);
  }, [listingId]);

  return (
    <Shell>
      <XStack flexWrap="wrap" gap={18} alignItems="stretch">
        <Panel flex={2} minWidth={340} padding={24} gap={16}>
          <XStack gap={8} flexWrap="wrap">
            <Pill>{listing?.status || 'loading'}</Pill>
            <Pill>{listing?.mode || 'auction'}</Pill>
            <Pill>Guild #{listing?.guild_id || 1}</Pill>
          </XStack>
          <YStack gap={8}>
            <Eyebrow>商品詳情</Eyebrow>
            <Title>{listing?.title || `Listing #${listingId}`}</Title>
            <Muted>{listing?.description || 'Loading listing detail.'}</Muted>
          </YStack>
          <XStack flexWrap="wrap" gap={12}>
            <Metric label="起標價" value={listing?.start_price || '-'} />
            <Metric label="直購價" value={listing?.buyout_price || '-'} />
            <Metric label="最高出價" value={listing?.top_bid_amount || '-'} />
            <Metric label="出價數" value={String(listing?.bid_count ?? 0)} />
          </XStack>
          <Link href="/zh-TW/market" style={{ textDecoration: 'none' }}>
            <Button borderRadius={8}>回交易市場</Button>
          </Link>
        </Panel>

        <Panel flex={1} minWidth={320} padding={18} gap={14}>
          <SectionTitle>買家出價</SectionTitle>
          <Button borderRadius={8} onPress={loginBuyer}>
            登入 demo-buyer
          </Button>
          <Panel padding={12} backgroundColor="#f7fbfa">
            <Muted>{buyer ? `目前身份：${buyer.username} / user #${buyer.user_id}` : '尚未登入，出價時會自動用 demo buyer 登入。'}</Muted>
          </Panel>
          <Input borderRadius={8} value={bidAmount} onChangeText={setBidAmount} />
          <Button backgroundColor="#24745f" borderRadius={8} color="#ffffff" disabled={listing?.status !== 'active'} onPress={placeBid}>
            送出競標
          </Button>
          <Muted>{listing?.status === 'active' ? '商品已上架，可以下標。' : '只有 active 商品可以下標。'}</Muted>
        </Panel>
      </XStack>

      <XStack flexWrap="wrap" gap={18} alignItems="stretch">
        <Panel flex={1} minWidth={340} padding={18} gap={12}>
          <SectionTitle>出價紀錄</SectionTitle>
          {bids.length === 0 ? (
            <Muted>目前沒有出價。</Muted>
          ) : (
            bids.map((bid) => (
              <XStack key={bid.id} justifyContent="space-between" borderBottomColor="#edf2f0" borderBottomWidth={1} paddingVertical={10}>
                <YStack>
                  <Text color="#1f2421" fontWeight="800">
                    Bid #{bid.id}
                  </Text>
                  <Paragraph color="#53615c" fontSize={13}>
                    user #{bid.bidder_user_id} · {bid.status}
                  </Paragraph>
                </YStack>
                <Text color="#1f2421" fontSize={18} fontWeight="800">
                  {bid.amount}
                </Text>
              </XStack>
            ))
          )}
        </Panel>

        <Panel flex={1} minWidth={340} padding={18} gap={12}>
          <SectionTitle>API 結果</SectionTitle>
          <Text
            backgroundColor="#18211f"
            borderRadius={8}
            color="#ecf4ef"
            fontFamily="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
            fontSize={13}
            lineHeight={20}
            maxHeight={420}
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

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <Panel padding={12} minWidth={130}>
      <Text color="#60706a" fontSize={12} fontWeight="800">
        {label}
      </Text>
      <Text color="#1f2421" fontSize={22} fontWeight="800">
        {value}
      </Text>
    </Panel>
  );
}
