'use client';

import { ComponentProps, CSSProperties, ReactNode, useEffect, useState } from 'react';
import { Button, Image, Input, Paragraph, ScrollView, Text, TextArea, XStack, YStack } from '@repo/ui';

type StackProps = ComponentProps<typeof YStack>;

type TrialRequest = {
  id: number;
  applicant_email: string;
  applicant_name: string;
  tenant_name: string;
  guild_name: string;
  status: string;
};

type Listing = {
  id: number;
  tenant_id: number;
  guild_id: number;
  seller_user_id: number;
  title: string;
  mode: string;
  visibility: string;
  status: string;
  frozen_at?: string | null;
};

type AdminUser = {
  id: number;
  email: string;
  username?: string | null;
  display_name: string;
  tenant_id?: number | null;
  is_active: boolean;
  must_reset_password: boolean;
  roles: string[];
  permissions: string[];
};

type AdminRole = {
  id: number;
  code: string;
  name: string;
  description?: string | null;
  permissions: string[];
};

type DiagnosticLogRule = {
  id: number;
  service: string;
  method: string;
  route: string;
  enabled: boolean;
  expires_at: string;
  reason: string;
  created_by_admin_user_id?: number | null;
  created_at: string;
  updated_at: string;
  state: string;
};

const DIAGNOSTIC_ROUTE_OPTIONS = [
  { label: 'POST /auth/login', method: 'POST', route: '/auth/login' },
  { label: 'GET /health', method: 'GET', route: '/health' },
  { label: 'GET /metrics', method: 'GET', route: '/metrics' },
  { label: 'POST /trial-requests', method: 'POST', route: '/trial-requests' },
  { label: 'GET /listings/:listing_id', method: 'GET', route: '/listings/:listing_id' },
  { label: 'POST /guilds/:guild_id/listings', method: 'POST', route: '/guilds/:guild_id/listings' },
];

const miniButtonStyle: CSSProperties = {
  background: '#ffffff',
  border: '1px solid #c8d2cc',
  borderRadius: 8,
  color: '#20231f',
  cursor: 'pointer',
  fontSize: 13,
  fontWeight: 700,
  padding: '7px 10px',
};

const dangerMiniButtonStyle: CSSProperties = {
  ...miniButtonStyle,
  border: '1px solid #d8b4aa',
  color: '#8a3324',
};

export default function AdminReviewFlow() {
  const [token, setToken] = useState<string | null>(null);
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [loginEmail, setLoginEmail] = useState('admin@example.com');
  const [loginPasswordHash, setLoginPasswordHash] = useState('admin-password-hash');
  const [loginError, setLoginError] = useState('');
  const [trialRequests, setTrialRequests] = useState<TrialRequest[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [adminRoles, setAdminRoles] = useState<AdminRole[]>([]);
  const [selectedTrialId, setSelectedTrialId] = useState<number | null>(null);
  const [selectedListingId, setSelectedListingId] = useState<number | null>(null);
  const [lastResponse, setLastResponse] = useState('Load a queue to see the cms-api response.');
  const [busy, setBusy] = useState<string | null>(null);
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminName, setNewAdminName] = useState('');
  const [newAdminPasswordHash, setNewAdminPasswordHash] = useState('temporary-admin-password-hash');
  const [newAdminRole, setNewAdminRole] = useState('platform_support');
  const [diagnosticRules, setDiagnosticRules] = useState<DiagnosticLogRule[]>([]);
  const [diagnosticRouteIndex, setDiagnosticRouteIndex] = useState(0);
  const [diagnosticTtlSeconds, setDiagnosticTtlSeconds] = useState('900');
  const [diagnosticReason, setDiagnosticReason] = useState('Investigate API latency');

  useEffect(() => {
    const storedToken = window.localStorage.getItem('gam.admin.token');
    if (!storedToken) return;
    setToken(storedToken);
    fetch('/api/cms/auth/me', {
      headers: { authorization: `Bearer ${storedToken}` },
    })
      .then(async (response) => {
        if (!response.ok) throw new Error(await response.text());
        return response.json() as Promise<AdminUser>;
      })
      .then(setAdminUser)
      .catch(() => {
        window.localStorage.removeItem('gam.admin.token');
        setToken(null);
        setAdminUser(null);
      });
  }, []);

  async function callCms<T>(label: string, path: string, init?: RequestInit): Promise<T> {
    setBusy(label);
    try {
      const response = await fetch(path, {
        ...init,
        headers: {
          ...(init?.body ? { 'content-type': 'application/json' } : {}),
          ...(token ? { authorization: `Bearer ${token}` } : {}),
          ...init?.headers,
        },
      });
      const text = await response.text();
      const formatted = formatBody(text);
      setLastResponse(`${response.status} ${response.statusText}\n${formatted}`);
      if (!response.ok) {
        throw new Error(readError(formatted));
      }
      return JSON.parse(text || '{}') as T;
    } finally {
      setBusy(null);
    }
  }

  async function login() {
    setLoginError('');
    const response = await fetch('/api/cms/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        email: loginEmail,
        password_hash: loginPasswordHash,
      }),
    });
    const text = await response.text();
    if (!response.ok) {
      setLoginError(readError(formatBody(text)));
      return;
    }
    const data = JSON.parse(text) as { token: string; admin_user: AdminUser };
    window.localStorage.setItem('gam.admin.token', data.token);
    setToken(data.token);
    setAdminUser(data.admin_user);
    setLastResponse(`${response.status} ${response.statusText}\n${formatBody(text)}`);
  }

  async function logout() {
    if (token) {
      await fetch('/api/cms/auth/logout', {
        method: 'POST',
        headers: { authorization: `Bearer ${token}` },
      }).catch(() => undefined);
    }
    window.localStorage.removeItem('gam.admin.token');
    setToken(null);
    setAdminUser(null);
    setTrialRequests([]);
    setListings([]);
    setAdminUsers([]);
    setAdminRoles([]);
  }

  async function loadTrials() {
    const rows = await callCms<TrialRequest[]>('load-trials', '/api/cms/trial-requests');
    setTrialRequests(rows);
    setSelectedTrialId(rows.find((row) => row.status === 'pending')?.id || rows[0]?.id || null);
  }

  async function approveTrial() {
    if (!selectedTrialId) return;
    await callCms('approve-trial', `/api/cms/trial-requests/${selectedTrialId}/approve`, {
      method: 'POST',
      body: JSON.stringify({
        owner_username: `trial-owner-${selectedTrialId}`,
        owner_password_hash: 'temporary-password-hash',
      }),
    });
    await loadTrials();
  }

  async function loadListings() {
    const rows = await callCms<Listing[]>('load-listings', '/api/cms/tenants/1/listings');
    setListings(rows);
    setSelectedListingId(rows.find((row) => row.status === 'draft')?.id || rows[0]?.id || null);
  }

  async function loadAdminUsers() {
    const rows = await callCms<AdminUser[]>('load-admin-users', '/api/cms/admin-users');
    setAdminUsers(rows);
  }

  async function loadAdminRoles() {
    const rows = await callCms<AdminRole[]>('load-admin-roles', '/api/cms/admin-roles');
    setAdminRoles(rows);
  }

  async function loadDiagnosticRules() {
    const rows = await callCms<DiagnosticLogRule[]>(
      'load-diagnostic-rules',
      '/api/cms/observability/diagnostic-log-rules',
    );
    setDiagnosticRules(rows);
  }

  async function createDiagnosticRule() {
    const selectedRoute = DIAGNOSTIC_ROUTE_OPTIONS[diagnosticRouteIndex];
    const rule = await callCms<DiagnosticLogRule>(
      'create-diagnostic-rule',
      '/api/cms/observability/diagnostic-log-rules',
      {
        method: 'POST',
        body: JSON.stringify({
          service: 'user-api',
          method: selectedRoute.method,
          route: selectedRoute.route,
          ttl_seconds: parsePositiveInt(diagnosticTtlSeconds, 900),
          reason: diagnosticReason,
        }),
      },
    );
    setDiagnosticRules((rules) => [rule, ...rules.filter((item) => item.id !== rule.id)]);
  }

  async function toggleDiagnosticRule(rule: DiagnosticLogRule) {
    const updated = await callCms<DiagnosticLogRule>(
      'toggle-diagnostic-rule',
      `/api/cms/observability/diagnostic-log-rules/${rule.id}`,
      {
        method: 'PATCH',
        body: JSON.stringify({
          enabled: !rule.enabled,
          ttl_seconds: !rule.enabled ? parsePositiveInt(diagnosticTtlSeconds, 900) : undefined,
          reason: diagnosticReason || rule.reason,
        }),
      },
    );
    setDiagnosticRules((rules) => rules.map((item) => (item.id === updated.id ? updated : item)));
  }

  async function extendDiagnosticRule(rule: DiagnosticLogRule) {
    const updated = await callCms<DiagnosticLogRule>(
      'extend-diagnostic-rule',
      `/api/cms/observability/diagnostic-log-rules/${rule.id}`,
      {
        method: 'PATCH',
        body: JSON.stringify({
          ttl_seconds: parsePositiveInt(diagnosticTtlSeconds, 900),
          reason: diagnosticReason || rule.reason,
        }),
      },
    );
    setDiagnosticRules((rules) => rules.map((item) => (item.id === updated.id ? updated : item)));
  }

  async function deleteDiagnosticRule(rule: DiagnosticLogRule) {
    const deleted = await callCms<DiagnosticLogRule>(
      'delete-diagnostic-rule',
      `/api/cms/observability/diagnostic-log-rules/${rule.id}`,
      { method: 'DELETE' },
    );
    setDiagnosticRules((rules) => rules.filter((item) => item.id !== deleted.id));
  }

  async function createAdminUser() {
    await callCms<AdminUser>('create-admin-user', '/api/cms/admin-users', {
      method: 'POST',
      body: JSON.stringify({
        email: newAdminEmail,
        display_name: newAdminName,
        password_hash: newAdminPasswordHash,
        tenant_id: 1,
        role_codes: [newAdminRole],
      }),
    });
    setNewAdminEmail('');
    setNewAdminName('');
    await loadAdminUsers();
  }

  async function freezeListing(listingId = selectedListingId) {
    if (!listingId) {
      setLastResponse('Select a listing before freezing.');
      return;
    }
    const confirmation = await callCms<{ confirmation_token: string }>(
      'confirm-freeze',
      '/api/cms/admin-action-confirmations',
      {
      method: 'POST',
      body: JSON.stringify({
        tenant_id: 1,
        action: 'listing.freeze',
        resource_type: 'listing',
        resource_id: String(listingId),
        reason: 'Operations console freeze',
        expires_minutes: 10,
      }),
      },
    );
    await callCms('freeze-listing', `/api/cms/listings/${listingId}/freeze`, {
      method: 'POST',
      body: JSON.stringify({
        tenant_id: 1,
        reason: 'Operations console freeze',
        confirmation_token: confirmation.confirmation_token,
      }),
    });
    await loadListings();
  }

  async function safeRun(action: () => Promise<void>) {
    try {
      await action();
    } catch (error) {
      setLastResponse(error instanceof Error ? error.message : 'Request failed');
    }
  }

  if (!adminUser) {
    return (
      <Shell>
        <XStack flexWrap="wrap" gap={18} alignItems="stretch">
          <Panel flex={1} minWidth={320} padding={24} gap={16}>
            <YStack gap={8}>
              <Eyebrow>CMS sign in</Eyebrow>
              <Title>Platform operations login</Title>
              <Paragraph color="#5f6862" fontSize={15} lineHeight={22}>
                Sign in with an administrative account before approving trials or moderating listings.
              </Paragraph>
            </YStack>
            <YStack gap={10}>
              <Field label="Email">
                <Input
                  value={loginEmail}
                  onChangeText={setLoginEmail}
                  autoCapitalize="none"
                  borderRadius={8}
                />
              </Field>
              <Field label="Password hash">
                <Input
                  value={loginPasswordHash}
                  onChangeText={setLoginPasswordHash}
                  secureTextEntry
                  borderRadius={8}
                />
              </Field>
              {loginError ? (
                <Text color="#a33f3f" fontSize={14} fontWeight="700">
                  {loginError}
                </Text>
              ) : null}
              <button
                onClick={() => safeRun(login)}
                style={{
                  background: '#607d3c',
                  border: 0,
                  borderRadius: 8,
                  color: '#ffffff',
                  cursor: 'pointer',
                  fontSize: 15,
                  fontWeight: 800,
                  padding: '10px 14px',
                }}
              >
                Sign in
              </button>
            </YStack>
          </Panel>
          <Image
            alt="Secure operations workstation"
            borderRadius={8}
            height={360}
            minWidth={320}
            resizeMode="cover"
            source={{
              uri: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=720&q=80',
              width: 430,
              height: 360,
            }}
            width={430}
          />
        </XStack>
      </Shell>
    );
  }

  return (
    <Shell>
      <XStack flexWrap="wrap" gap={16} alignItems="stretch">
        <Panel flex={1} minWidth={300} padding={24} gap={16} justifyContent="space-between">
          <YStack gap={8}>
            <Eyebrow>Operations review</Eyebrow>
            <Title>Approve guilds, inspect auctions, intervene.</Title>
            <Paragraph color="#5f6862" fontSize={15} lineHeight={22}>
              Signed in as {adminUser.display_name} with {adminUser.roles.join(', ')}.
            </Paragraph>
          </YStack>
          <XStack flexWrap="wrap" gap={10}>
            <Stat label="Admin" value={`#${adminUser.id}`} />
            <Stat label="Tenant" value="#1" />
            <Stat label="Trials" value={String(trialRequests.length)} />
            <Stat label="Listings" value={String(listings.length)} />
          </XStack>
        </Panel>
        <Image
          alt="Operations desk with laptop, notes, and monitoring tools"
          borderRadius={8}
          height={230}
          minWidth={300}
          resizeMode="cover"
          source={{
            uri: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=720&q=80',
            width: 430,
            height: 230,
          }}
          width={430}
        />
      </XStack>

      <XStack justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={12}>
        <Text color="#5f6862" fontSize={14}>
          Permissions: {adminUser.permissions.slice(0, 8).join(', ')}
          {adminUser.permissions.length > 8 ? ' ...' : ''}
        </Text>
        <Button borderRadius={8} onPress={logout}>
          Sign out
        </Button>
      </XStack>

      <XStack flexWrap="wrap" gap={18} alignItems="stretch">
        <Panel flex={1} minWidth={330} padding={18} gap={14}>
          <XStack justifyContent="space-between" alignItems="center" gap={12}>
            <SectionTitle>Trial approvals</SectionTitle>
            <Button borderRadius={8} onPress={() => safeRun(loadTrials)}>
              Load queue
            </Button>
          </XStack>
          <YStack gap={10}>
            {trialRequests.length === 0 ? (
              <EmptyText>No trial requests loaded.</EmptyText>
            ) : (
              trialRequests.map((request) => (
                <SelectableRow
                  key={request.id}
                  active={selectedTrialId === request.id}
                  title={`${request.guild_name} / ${request.tenant_name}`}
                  detail={`${request.applicant_email} · ${request.status}`}
                  onPress={() => setSelectedTrialId(request.id)}
                />
              ))
            )}
          </YStack>
          <Button
            backgroundColor="#607d3c"
            color="#ffffff"
            borderRadius={8}
            disabled={!selectedTrialId || busy === 'approve-trial'}
            onPress={() => safeRun(approveTrial)}
          >
            Approve selected trial
          </Button>
        </Panel>

        <Panel flex={1} minWidth={330} padding={18} gap={14}>
          <XStack justifyContent="space-between" alignItems="center" gap={12}>
            <SectionTitle>Auction review</SectionTitle>
            <Button borderRadius={8} onPress={() => safeRun(loadListings)}>
              Load listings
            </Button>
          </XStack>
          <YStack gap={10}>
            {listings.length === 0 ? (
              <EmptyText>No listings loaded.</EmptyText>
            ) : (
              listings.map((listing) => (
                <YStack key={listing.id} gap={8}>
                  <SelectableRow
                    active={selectedListingId === listing.id}
                    title={`#${listing.id} ${listing.title}`}
                    detail={`${listing.mode} · ${listing.visibility} · ${listing.status}`}
                    onPress={() => setSelectedListingId(listing.id)}
                  />
                  <button
                    aria-label={`Freeze #${listing.id}`}
                    disabled={listing.status === 'frozen' || busy === 'freeze-listing'}
                    onClick={() => safeRun(() => freezeListing(listing.id))}
                    style={{
                      alignSelf: 'flex-start',
                      background: '#ffffff',
                      border: '1px solid #c8d2cc',
                      borderRadius: 8,
                      color: '#20231f',
                      cursor: listing.status === 'frozen' ? 'not-allowed' : 'pointer',
                      fontSize: 14,
                      fontWeight: 700,
                      minWidth: 110,
                      padding: '8px 12px',
                    }}
                  >
                    Freeze #{listing.id}
                  </button>
                </YStack>
              ))
            )}
          </YStack>
          <Button borderRadius={8} disabled={!selectedListingId} onPress={() => safeRun(freezeListing)}>
            Freeze selected listing
          </Button>
          <Paragraph color="#5f6862" fontSize={13} lineHeight={18}>
            Guild-level listing approval is handled in the front office flow. This console handles platform intervention.
          </Paragraph>
        </Panel>

        <Panel flex={1} minWidth={330} padding={18} gap={14}>
          <XStack justifyContent="space-between" alignItems="center" gap={12}>
            <SectionTitle>Admin access</SectionTitle>
            <XStack gap={8} flexWrap="wrap">
              <Button borderRadius={8} onPress={() => safeRun(loadAdminUsers)}>
                Load admins
              </Button>
              <Button borderRadius={8} onPress={() => safeRun(loadAdminRoles)}>
                Load roles
              </Button>
            </XStack>
          </XStack>

          <YStack gap={10}>
            <Field label="New admin email">
              <Input
                value={newAdminEmail}
                onChangeText={setNewAdminEmail}
                autoCapitalize="none"
                borderRadius={8}
                placeholder="support@example.com"
              />
            </Field>
            <Field label="Display name">
              <Input
                value={newAdminName}
                onChangeText={setNewAdminName}
                borderRadius={8}
                placeholder="Support Admin"
              />
            </Field>
            <Field label="Temporary password hash">
              <Input value={newAdminPasswordHash} onChangeText={setNewAdminPasswordHash} borderRadius={8} />
            </Field>
            <Field label="Role code">
              <Input value={newAdminRole} onChangeText={setNewAdminRole} borderRadius={8} />
            </Field>
            <Button
              backgroundColor="#607d3c"
              color="#ffffff"
              borderRadius={8}
              disabled={!newAdminEmail || !newAdminName || busy === 'create-admin-user'}
              onPress={() => safeRun(createAdminUser)}
            >
              Create admin
            </Button>
          </YStack>

          <YStack gap={10}>
            {adminUsers.map((user) => (
              <Panel key={user.id} padding={12} gap={4}>
                <Text color="#20231f" fontSize={15} fontWeight="800">
                  #{user.id} {user.display_name}
                </Text>
                <Paragraph color="#5f6862" fontSize={13} lineHeight={18}>
                  {user.email} · {user.is_active ? 'active' : 'disabled'} · {user.roles.join(', ')}
                </Paragraph>
              </Panel>
            ))}
          </YStack>

          <YStack gap={10}>
            {adminRoles.map((role) => (
              <Panel key={role.id} padding={12} gap={4}>
                <Text color="#20231f" fontSize={15} fontWeight="800">
                  {role.code}
                </Text>
                <Paragraph color="#5f6862" fontSize={13} lineHeight={18}>
                  {role.permissions.slice(0, 6).join(', ')}
                  {role.permissions.length > 6 ? ' ...' : ''}
                </Paragraph>
              </Panel>
            ))}
          </YStack>
        </Panel>

        <Panel flex={1} minWidth={330} padding={18} gap={14}>
          <XStack justifyContent="space-between" alignItems="center" gap={12}>
            <SectionTitle>Diagnostic logs</SectionTitle>
            <Button borderRadius={8} onPress={() => safeRun(loadDiagnosticRules)}>
              Load rules
            </Button>
          </XStack>

          <YStack gap={10}>
            <Field label="user-api route">
              <select
                value={diagnosticRouteIndex}
                onChange={(event) => setDiagnosticRouteIndex(Number(event.target.value))}
                style={{
                  background: '#ffffff',
                  border: '1px solid #c8d2cc',
                  borderRadius: 8,
                  color: '#20231f',
                  fontSize: 14,
                  padding: '10px 12px',
                }}
              >
                {DIAGNOSTIC_ROUTE_OPTIONS.map((option, index) => (
                  <option key={`${option.method}:${option.route}`} value={index}>
                    {option.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="TTL seconds">
              <Input
                value={diagnosticTtlSeconds}
                onChangeText={setDiagnosticTtlSeconds}
                borderRadius={8}
                keyboardType="numeric"
              />
            </Field>
            <Field label="Reason">
              <Input
                value={diagnosticReason}
                onChangeText={setDiagnosticReason}
                borderRadius={8}
                placeholder="Investigate p99 login latency"
              />
            </Field>
            <Button
              backgroundColor="#607d3c"
              color="#ffffff"
              borderRadius={8}
              disabled={!diagnosticReason || busy === 'create-diagnostic-rule'}
              onPress={() => safeRun(createDiagnosticRule)}
            >
              Enable selected API
            </Button>
            <Paragraph color="#5f6862" fontSize={13} lineHeight={18}>
              Rules sync to user-api within about five seconds and auto-expire. Logs stay in Loki as JSON fields.
            </Paragraph>
          </YStack>

          <YStack gap={10}>
            {diagnosticRules.length === 0 ? (
              <EmptyText>No diagnostic rules loaded.</EmptyText>
            ) : (
              diagnosticRules.map((rule) => (
                <Panel key={rule.id} padding={12} gap={8}>
                  <XStack justifyContent="space-between" alignItems="center" gap={8}>
                    <YStack gap={3} flex={1}>
                      <Text color="#20231f" fontSize={15} fontWeight="800">
                        {rule.method} {rule.route}
                      </Text>
                      <Paragraph color="#5f6862" fontSize={13} lineHeight={18}>
                        {rule.state} · expires {rule.expires_at} · {rule.reason}
                      </Paragraph>
                    </YStack>
                    <StatusPill state={rule.state} />
                  </XStack>
                  <XStack gap={8} flexWrap="wrap">
                    <button
                      onClick={() => safeRun(() => toggleDiagnosticRule(rule))}
                      style={miniButtonStyle}
                    >
                      {rule.enabled ? 'Disable' : 'Enable'}
                    </button>
                    <button
                      onClick={() => safeRun(() => extendDiagnosticRule(rule))}
                      style={miniButtonStyle}
                    >
                      Extend TTL
                    </button>
                    <button
                      onClick={() => safeRun(() => deleteDiagnosticRule(rule))}
                      style={dangerMiniButtonStyle}
                    >
                      Delete
                    </button>
                  </XStack>
                </Panel>
              ))
            )}
          </YStack>
        </Panel>

        <Panel flex={1} minWidth={330} padding={18} gap={14}>
          <Eyebrow>Live cms-api response</Eyebrow>
          <SectionTitle>{busy ? `Running ${busy}` : 'Ready'}</SectionTitle>
          <ScrollView maxHeight={500}>
            <TextArea
              editable={false}
              value={lastResponse}
              borderRadius={8}
              minHeight={420}
              fontFamily="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
            />
          </ScrollView>
        </Panel>
      </XStack>
    </Shell>
  );
}

function Shell({ children }: { children: ReactNode }) {
  return (
    <YStack minHeight="100vh" backgroundColor="#f3f7f5" padding={20} gap={18}>
      {children}
    </YStack>
  );
}

function Panel({ children, ...props }: StackProps) {
  return (
    <YStack backgroundColor="#ffffff" borderColor="#d9e1dd" borderWidth={1} borderRadius={8} {...props}>
      {children}
    </YStack>
  );
}

function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <Text color="#656d68" fontSize={12} fontWeight="700" letterSpacing={0} textTransform="uppercase">
      {children}
    </Text>
  );
}

function Title({ children }: { children: ReactNode }) {
  return (
    <Text color="#20231f" fontSize={30} fontWeight="800" lineHeight={36} letterSpacing={0}>
      {children}
    </Text>
  );
}

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <Text color="#20231f" fontSize={20} fontWeight="800" lineHeight={26} letterSpacing={0}>
      {children}
    </Text>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Panel padding={12} minWidth={92} gap={4}>
      <Text color="#656d68" fontSize={12} fontWeight="700">
        {label}
      </Text>
      <Text color="#20231f" fontSize={22} fontWeight="800">
        {value}
      </Text>
    </Panel>
  );
}

function SelectableRow({
  active,
  title,
  detail,
  onPress,
}: {
  active: boolean;
  title: string;
  detail: string;
  onPress: () => void;
}) {
  return (
    <Button
      alignItems="flex-start"
      backgroundColor={active ? '#e0ead9' : '#f8faf8'}
      borderColor={active ? '#60803d' : '#d9e1dd'}
      borderRadius={8}
      borderWidth={1}
      flexDirection="column"
      height="auto"
      justifyContent="flex-start"
      onPress={onPress}
      padding={12}
    >
      <Text color="#20231f" fontSize={15} fontWeight="800">
        {title}
      </Text>
      <Paragraph color="#5f6862" fontSize={13} lineHeight={18}>
        {detail}
      </Paragraph>
    </Button>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <YStack gap={6}>
      <Text color="#5f6862" fontSize={13} fontWeight="700">
        {label}
      </Text>
      {children}
    </YStack>
  );
}

function EmptyText({ children }: { children: ReactNode }) {
  return (
    <Text color="#5f6862" fontSize={14}>
      {children}
    </Text>
  );
}

function StatusPill({ state }: { state: string }) {
  const active = state === 'active';
  const disabled = state === 'disabled';
  return (
    <Text
      backgroundColor={active ? '#dfead9' : disabled ? '#eef0f0' : '#f3e3d7'}
      borderRadius={999}
      color={active ? '#365b23' : disabled ? '#5f6862' : '#8a4a20'}
      fontSize={12}
      fontWeight="800"
      paddingHorizontal={10}
      paddingVertical={5}
      textTransform="uppercase"
    >
      {state}
    </Text>
  );
}

function parsePositiveInt(value: string, fallback: number) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function formatBody(text: string) {
  try {
    return JSON.stringify(JSON.parse(text), null, 2);
  } catch {
    return text || 'No response body';
  }
}

function readError(text: string) {
  try {
    const parsed = JSON.parse(text);
    return parsed.error || parsed.message || text;
  } catch {
    return text;
  }
}
