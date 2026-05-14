'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import type { CSSProperties, FormEvent } from 'react';
import type { UserSession } from '../types';

type LoginKind = 'owner' | 'buyer';

const palette = {
  background: '#051424',
  backgroundStrong: '#0a0f18',
  surface: 'rgba(18, 33, 49, 0.8)',
  surfaceAlt: '#1e1e1e',
  surfaceSoft: 'rgba(39, 54, 71, 0.35)',
  border: '#3b494b',
  borderStrong: '#273647',
  text: '#d4e4fa',
  textMuted: '#b9cacb',
  primary: '#00f0ff',
  primarySoft: '#7df4ff',
  secondary: '#ecb2ff',
  success: '#78f0b8',
  error: '#ffb4ab',
};

const demoUsers: Record<LoginKind, { title: string; username: string; password: string; hint: string }> = {
  owner: {
    title: '公會主 / 賣家',
    username: 'flow-owner',
    password: 'temporary-password-hash',
    hint: '進入商品管理、審核與結算流程。',
  },
  buyer: {
    title: '買家',
    username: 'demo-buyer',
    password: 'buyer-password-hash',
    hint: '進入市場、競標與出價流程。',
  },
};

export default function LoginPage() {
  const [kind, setKind] = useState<LoginKind>('owner');
  const [owner, setOwner] = useState<UserSession | null>(null);
  const [buyer, setBuyer] = useState<UserSession | null>(null);
  const [ownerName, setOwnerName] = useState(demoUsers.owner.username);
  const [ownerPassword, setOwnerPassword] = useState(demoUsers.owner.password);
  const [buyerName, setBuyerName] = useState(demoUsers.buyer.username);
  const [buyerPassword, setBuyerPassword] = useState(demoUsers.buyer.password);
  const [response, setResponse] = useState('選擇身份後登入，這裡會顯示 API 回應。');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentValues = kind === 'owner'
    ? {
        username: ownerName,
        password: ownerPassword,
        setUsername: setOwnerName,
        setPassword: setOwnerPassword,
        session: owner,
      }
    : {
        username: buyerName,
        password: buyerPassword,
        setUsername: setBuyerName,
        setPassword: setBuyerPassword,
        session: buyer,
      };

  const sessionSummary = useMemo(() => {
    const session = currentValues.session;
    if (!session) return '尚未登入';
    return `${session.username} · user #${session.user_id} · tenant ${session.tenant_id} · guild ${session.guild_id}`;
  }, [currentValues.session]);

  async function login(nextKind: LoginKind) {
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/user/auth/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          username_or_email: nextKind === 'owner' ? ownerName : buyerName,
          password_hash: nextKind === 'owner' ? ownerPassword : buyerPassword,
        }),
      });
      const text = await response.text();
      setResponse(`${response.status} ${response.statusText}\n${formatBody(text)}`);
      if (response.ok) {
        const session = JSON.parse(text) as UserSession;
        if (nextKind === 'owner') setOwner(session);
        if (nextKind === 'buyer') setBuyer(session);
      }
    } catch (error) {
      setResponse(error instanceof Error ? error.message : 'Login failed');
    } finally {
      setIsSubmitting(false);
    }
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void login(kind);
  }

  return (
    <main style={styles.page}>
      <style>{`
        html, body {
          margin: 0;
          background: ${palette.background};
          color: ${palette.text};
          font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        }
        * { box-sizing: border-box; }
        a { color: inherit; }
        input::placeholder { color: ${palette.textMuted}; opacity: 0.7; }
      `}</style>

      <div style={styles.bgGlowTop} />
      <div style={styles.bgGlowBottom} />
      <div style={styles.gridOverlay} />

      <section style={styles.centerWrap}>
        <div style={styles.card}>
          <div style={styles.headerBlock}>
            <div style={styles.brand}>GAM</div>
            <h1 style={styles.title}>Secure Access</h1>
            <p style={styles.subtitle}>Initialize connection to guild headquarters.</p>
          </div>

          <div style={styles.roleRow}>
            {(['owner', 'buyer'] as LoginKind[]).map((option) => (
              <button
                key={option}
                onClick={() => setKind(option)}
                data-testid={`role-${option}`}
                style={{
                  ...styles.roleButton,
                  ...(kind === option ? styles.roleButtonActive : null),
                }}
                type="button"
              >
                <span style={styles.roleButtonLabel}>{demoUsers[option].title}</span>
                <span style={styles.roleButtonHint}>{demoUsers[option].hint}</span>
              </button>
            ))}
          </div>

          <form onSubmit={onSubmit} style={styles.form}>
            <label style={styles.label}>
              Email Address
              <input
                onChange={(event) => currentValues.setUsername(event.target.value)}
                placeholder="commander@guild.com"
                style={styles.input}
                data-testid="login-email"
                type="text"
                value={currentValues.username}
              />
            </label>

            <label style={styles.label}>
              Password
              <input
                onChange={(event) => currentValues.setPassword(event.target.value)}
                placeholder="••••••••"
                style={styles.input}
                data-testid="login-password"
                type="password"
                value={currentValues.password}
              />
            </label>

            <div style={styles.metaRow}>
              <label style={styles.checkboxRow}>
                <input defaultChecked style={styles.checkbox} type="checkbox" />
                <span>Remember credentials</span>
              </label>
              <a href="#" style={styles.inlineLink}>
                Forgot Password?
              </a>
            </div>

            <button data-testid="login-submit" disabled={isSubmitting} style={styles.submitButton} type="submit">
              {isSubmitting ? 'AUTHORIZING...' : 'INITIALIZE LOGIN'}
            </button>
          </form>

          <div style={styles.dividerRow}>
            <div style={styles.divider} />
            <span style={styles.dividerText}>Quick Connect</span>
            <div style={styles.divider} />
          </div>

          <div style={styles.quickRow}>
            <button style={styles.secondaryButton} type="button">
              DISCORD
            </button>
            <button style={styles.secondaryButton} type="button">
              STEAM
            </button>
          </div>

          <div style={styles.statusPanel}>
            <div style={styles.statusHeader}>
              <span style={styles.statusEyebrow}>Session</span>
              <span style={currentValues.session ? styles.dotOnline : styles.dotIdle} />
            </div>
            <div data-testid="session-summary" style={styles.statusTitle}>
              {sessionSummary}
            </div>
            <pre data-testid="login-response" style={styles.responseBox}>
              {response}
            </pre>
          </div>

          <div style={styles.registerText}>
            No active dossier?{' '}
            <Link href="/zh-TW/market" style={styles.registerLink}>
              Register for an Account
            </Link>
          </div>
        </div>
      </section>

      <footer style={styles.footer}>
        <div style={styles.footerBrand}>GAM</div>
        <div style={styles.footerText}>© 2026 GAM SaaS. High Performance Guild Management.</div>
        <div style={styles.footerLinks}>
          <a href="#" style={styles.footerLink}>
            Privacy Policy
          </a>
          <a href="#" style={styles.footerLink}>
            Terms of Service
          </a>
          <a href="#" style={styles.footerLink}>
            API Docs
          </a>
        </div>
      </footer>
    </main>
  );
}

function formatBody(text: string) {
  try {
    return JSON.stringify(JSON.parse(text), null, 2);
  } catch {
    return text || 'No response body';
  }
}

const styles: Record<string, CSSProperties> = {
  page: {
    minHeight: '100vh',
    background:
      'radial-gradient(circle at top, rgba(0, 240, 255, 0.08), transparent 28%), radial-gradient(circle at bottom right, rgba(236, 178, 255, 0.08), transparent 32%), #051424',
    color: palette.text,
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
    overflow: 'hidden',
  },
  centerWrap: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '32px 20px',
    position: 'relative',
    zIndex: 1,
  },
  card: {
    width: '100%',
    maxWidth: 520,
    background: palette.surface,
    border: `1px solid ${palette.border}`,
    borderRadius: 16,
    padding: 32,
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    boxShadow: '0 24px 64px rgba(0, 0, 0, 0.45)',
    display: 'flex',
    flexDirection: 'column',
    gap: 20,
  },
  headerBlock: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    textAlign: 'center',
  },
  brand: {
    color: palette.primary,
    fontSize: 42,
    fontWeight: 900,
    letterSpacing: '-0.08em',
    textTransform: 'uppercase',
  },
  title: {
    margin: 0,
    fontSize: 28,
    lineHeight: 1.15,
    fontWeight: 700,
  },
  subtitle: {
    margin: 0,
    color: palette.textMuted,
    fontSize: 14,
    lineHeight: 1.6,
  },
  roleRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: 12,
  },
  roleButton: {
    background: 'rgba(13, 28, 45, 0.7)',
    border: `1px solid ${palette.borderStrong}`,
    borderRadius: 12,
    color: palette.text,
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    padding: '14px 16px',
    textAlign: 'left',
  },
  roleButtonActive: {
    border: `1px solid ${palette.primary}`,
    boxShadow: 'inset 0 0 12px rgba(0, 240, 255, 0.15)',
    background: 'rgba(0, 240, 255, 0.08)',
  },
  roleButtonLabel: {
    fontSize: 14,
    fontWeight: 700,
  },
  roleButtonHint: {
    fontSize: 12,
    color: palette.textMuted,
    lineHeight: 1.5,
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  label: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    color: palette.textMuted,
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
  },
  input: {
    width: '100%',
    background: palette.surfaceAlt,
    color: palette.text,
    border: 'none',
    borderBottom: `2px solid ${palette.border}`,
    borderRadius: '4px 4px 0 0',
    padding: '12px 14px',
    outline: 'none',
    fontSize: 16,
    lineHeight: 1.5,
  },
  metaRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    flexWrap: 'wrap',
  },
  checkboxRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    color: palette.textMuted,
    fontSize: 14,
  },
  checkbox: {
    accentColor: palette.primary,
  },
  inlineLink: {
    color: palette.primary,
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: '0.08em',
    textDecoration: 'none',
    textTransform: 'uppercase',
  },
  submitButton: {
    width: '100%',
    background: palette.primary,
    color: palette.backgroundStrong,
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: '0.08em',
    padding: '14px 16px',
    textTransform: 'uppercase',
    boxShadow: 'inset 0 0 10px rgba(255, 255, 255, 0.35)',
  },
  dividerRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  divider: {
    height: 1,
    background: palette.border,
    flex: 1,
  },
  dividerText: {
    color: palette.textMuted,
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
  },
  quickRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
    gap: 10,
  },
  secondaryButton: {
    background: 'transparent',
    color: palette.text,
    border: `1px solid ${palette.border}`,
    borderRadius: 6,
    cursor: 'pointer',
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: '0.08em',
    padding: '12px 16px',
    textTransform: 'uppercase',
  },
  statusPanel: {
    background: palette.surfaceSoft,
    border: `1px solid ${palette.borderStrong}`,
    borderRadius: 12,
    padding: 16,
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  statusHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusEyebrow: {
    color: palette.textMuted,
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
  },
  dotOnline: {
    width: 10,
    height: 10,
    borderRadius: '999px',
    background: palette.success,
    boxShadow: `0 0 10px ${palette.success}`,
  },
  dotIdle: {
    width: 10,
    height: 10,
    borderRadius: '999px',
    background: palette.textMuted,
    opacity: 0.45,
  },
  statusTitle: {
    fontSize: 15,
    fontWeight: 700,
    lineHeight: 1.5,
  },
  responseBox: {
    margin: 0,
    padding: 14,
    borderRadius: 10,
    background: 'rgba(1, 15, 31, 0.9)',
    color: palette.text,
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
    fontSize: 12,
    lineHeight: 1.55,
    whiteSpace: 'pre-wrap',
    overflowX: 'auto',
  },
  registerText: {
    textAlign: 'center',
    color: palette.textMuted,
    fontSize: 14,
    lineHeight: 1.6,
  },
  registerLink: {
    color: palette.primary,
    textDecoration: 'underline',
    textUnderlineOffset: 4,
  },
  footer: {
    position: 'relative',
    zIndex: 1,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 16,
    flexWrap: 'wrap',
    padding: '20px 24px 28px',
    borderTop: `1px solid ${palette.borderStrong}`,
    background: 'rgba(10, 15, 24, 0.72)',
  },
  footerBrand: {
    fontSize: 18,
    fontWeight: 800,
    letterSpacing: '-0.04em',
  },
  footerText: {
    color: palette.textMuted,
    fontSize: 13,
  },
  footerLinks: {
    display: 'flex',
    gap: 16,
    flexWrap: 'wrap',
  },
  footerLink: {
    color: palette.textMuted,
    textDecoration: 'none',
    fontSize: 13,
  },
  bgGlowTop: {
    position: 'fixed',
    inset: '0 auto auto 10%',
    width: 420,
    height: 420,
    borderRadius: '50%',
    background: 'rgba(0, 240, 255, 0.14)',
    filter: 'blur(110px)',
    pointerEvents: 'none',
  },
  bgGlowBottom: {
    position: 'fixed',
    inset: 'auto 8% 4% auto',
    width: 520,
    height: 520,
    borderRadius: '50%',
    background: 'rgba(236, 178, 255, 0.12)',
    filter: 'blur(130px)',
    pointerEvents: 'none',
  },
  gridOverlay: {
    position: 'fixed',
    inset: 0,
    pointerEvents: 'none',
    opacity: 0.05,
    backgroundImage:
      'linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)',
    backgroundSize: '40px 40px',
    maskImage: 'radial-gradient(circle at center, black 35%, transparent 80%)',
  },
};
