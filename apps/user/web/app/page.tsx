'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Button, Image, Input, Paragraph, ScrollView, Text, XStack, YStack } from '@repo/ui';
import { Eyebrow, Muted, Panel, Pill, SectionTitle, Shell, Title } from './components/ui';
import type { Listing } from './types';

export default function MarketPage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<'all' | 'active' | 'settled' | 'draft'>('all');
  const [loading, setLoading] = useState(true);

  async function loadListings() {
    setLoading(true);
    const response = await fetch('/api/user/tenants/1/listings');
    const rows = response.ok ? ((await response.json()) as Listing[]) : [];
    setListings(rows);
    setLoading(false);
  }

  useEffect(() => {
    loadListings();
  }, []);

  const filtered = useMemo(() => {
    return listings.filter((listing) => {
      const matchesQuery = `${listing.title} ${listing.description}`.toLowerCase().includes(query.toLowerCase());
      const matchesStatus = status === 'all' || listing.status === status;
      return matchesQuery && matchesStatus;
    });
  }, [listings, query, status]);

  return (
    <Shell>
      <XStack flexWrap="wrap" gap={16} alignItems="stretch">
        <Panel flex={1} minWidth={320} padding={24} gap={16} justifyContent="space-between">
          <YStack gap={8}>
            <Eyebrow>交易市場</Eyebrow>
            <Title>找裝備、看價格、直接下標。</Title>
            <Muted>像 8591 的交易入口：搜尋、篩選、進商品詳情，再由買家出價。</Muted>
          </YStack>
          <XStack flexWrap="wrap" gap={10}>
            <Pill>Tenant 1</Pill>
            <Pill>Guild 1</Pill>
            <Pill>{listings.length} listings</Pill>
          </XStack>
        </Panel>
        <Image
          alt="Fantasy game marketplace with dice and items"
          borderRadius={8}
          height={230}
          minWidth={320}
          resizeMode="cover"
          source={{
            uri: 'https://images.unsplash.com/photo-1611996575749-79a3a250f948?auto=format&fit=crop&w=720&q=80',
            width: 430,
            height: 230,
          }}
          width={430}
        />
      </XStack>

      <Panel padding={16} gap={12}>
        <XStack flexWrap="wrap" gap={10} alignItems="center">
          <Input flex={1} minWidth={240} borderRadius={8} value={query} onChangeText={setQuery} placeholder="搜尋商品、裝備、素材" />
          {(['all', 'active', 'settled', 'draft'] as const).map((item) => (
            <Button
              key={item}
              borderRadius={8}
              backgroundColor={status === item ? '#d6ece4' : '#ffffff'}
              borderColor={status === item ? '#24745f' : '#d7e3df'}
              borderWidth={1}
              onPress={() => setStatus(item)}
            >
              {item}
            </Button>
          ))}
          <Button borderRadius={8} onPress={loadListings}>
            重新整理
          </Button>
        </XStack>
      </Panel>

      <XStack flexWrap="wrap" gap={16} alignItems="stretch">
        <Panel width={260} minWidth={240} padding={16} gap={12}>
          <SectionTitle>分類</SectionTitle>
          <Category label="武器" count={filtered.length} />
          <Category label="材料" count={0} />
          <Category label="代練 / 服務" count={0} />
          <Category label="公會倉庫釋出" count={0} />
          <Link href="/zh-TW/seller/listings" style={{ textDecoration: 'none' }}>
            <Button backgroundColor="#24745f" color="#ffffff" borderRadius={8}>
              我要刊登
            </Button>
          </Link>
        </Panel>

        <YStack flex={1} minWidth={320} gap={12}>
          <SectionTitle>{loading ? '載入中' : `商品列表 (${filtered.length})`}</SectionTitle>
          <ScrollView maxHeight={900}>
            <YStack gap={12}>
              {filtered.length === 0 ? (
                <Panel padding={18}>
                  <Muted>目前沒有符合條件的商品。到商品管理建立一筆拍賣後回來看。</Muted>
                </Panel>
              ) : (
                filtered.map((listing) => <ListingCard key={listing.id} listing={listing} />)
              )}
            </YStack>
          </ScrollView>
        </YStack>
      </XStack>
    </Shell>
  );
}

function Category({ label, count }: { label: string; count: number }) {
  return (
    <XStack justifyContent="space-between" alignItems="center" borderBottomColor="#edf2f0" borderBottomWidth={1} paddingVertical={8}>
      <Text color="#1f2421" fontWeight="800">
        {label}
      </Text>
      <Text color="#60706a">{count}</Text>
    </XStack>
  );
}

function ListingCard({ listing }: { listing: Listing }) {
  const statusTone = listing.status === 'active' ? 'good' : listing.status === 'draft' ? 'warn' : 'default';

  return (
    <Panel padding={16} gap={12}>
      <XStack justifyContent="space-between" gap={12} flexWrap="wrap">
        <YStack gap={6} flex={1} minWidth={260}>
          <XStack gap={8} flexWrap="wrap" alignItems="center">
            <Pill>#{listing.id}</Pill>
            <Pill tone={statusTone}>{listing.status}</Pill>
            <Pill>{listing.mode}</Pill>
            <Pill>{listing.visibility}</Pill>
          </XStack>
          <Text color="#1f2421" fontSize={22} fontWeight="800">
            {listing.title}
          </Text>
          <Paragraph color="#53615c" fontSize={14} lineHeight={20}>
            {listing.description || 'No description'}
          </Paragraph>
        </YStack>
        <YStack alignItems="flex-end" gap={8} minWidth={150}>
          <Text color="#60706a" fontSize={12} fontWeight="800">
            目前最高
          </Text>
          <Text color="#1f2421" fontSize={24} fontWeight="800">
            {listing.top_bid_amount || listing.start_price || '-'}
          </Text>
          <Text color="#60706a" fontSize={13}>
            bids {listing.bid_count}
          </Text>
          <Link href={`/zh-TW/listings/${listing.id}`} style={{ textDecoration: 'none' }}>
            <Button borderRadius={8} backgroundColor="#24745f" color="#ffffff">
              查看 / 下標
            </Button>
          </Link>
        </YStack>
      </XStack>
    </Panel>
  );
}
