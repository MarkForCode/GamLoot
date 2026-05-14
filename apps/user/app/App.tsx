import { StatusBar } from 'expo-status-bar';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

declare const process: {
  env?: Record<string, string | undefined>;
};

type LoginKind = 'owner' | 'buyer';

type UserSession = {
  user_id: number;
  username: string;
  email: string;
  role: string;
  tenant_id: number | null;
  guild_id: number | null;
};

type DemoUser = {
  title: string;
  username: string;
  password: string;
  hint: string;
};

const USER_API_URL = process.env?.EXPO_PUBLIC_USER_API_URL || 'http://10.0.2.2:8080';

const demoUsers: Record<LoginKind, DemoUser> = {
  owner: {
    title: '公會主 / 賣家',
    username: 'flow-owner',
    password: 'temporary-password-hash',
    hint: '商品管理、審核與結算流程。',
  },
  buyer: {
    title: '買家',
    username: 'demo-buyer',
    password: 'buyer-password-hash',
    hint: '市場瀏覽、競標與出價流程。',
  },
};

function formatBody(text: string) {
  try {
    return JSON.stringify(JSON.parse(text), null, 2);
  } catch {
    return text || 'No response body';
  }
}

export default function App() {
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
    return `${session.username} · user #${session.user_id} · tenant ${session.tenant_id ?? '-'} · guild ${
      session.guild_id ?? '-'
    }`;
  }, [currentValues.session]);

  async function login(nextKind: LoginKind) {
    setIsSubmitting(true);
    try {
      const apiResponse = await fetch(`${USER_API_URL.replace(/\/$/, '')}/auth/login`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          username_or_email: nextKind === 'owner' ? ownerName : buyerName,
          password_hash: nextKind === 'owner' ? ownerPassword : buyerPassword,
        }),
      });

      const text = await apiResponse.text();
      setResponse(`${apiResponse.status} ${apiResponse.statusText}\n${formatBody(text)}`);

      if (apiResponse.ok) {
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

  return (
    <View accessibilityLabel="user-app-root" style={styles.page} testID="user-app-root">
      <StatusBar style="light" />
      <View style={styles.glowTop} />
      <View style={styles.glowBottom} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardAvoidingView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.card}>
            <View style={styles.headerBlock}>
              <View style={styles.brandBadge}>
                <Text style={styles.brandText}>GAM</Text>
              </View>
              <Text accessibilityLabel="user-app-title" style={styles.title} testID="user-app-title">
                Secure Access
              </Text>
              <Text style={styles.subtitle}>Initialize connection to guild headquarters.</Text>
            </View>

            <View style={styles.roleRow}>
              {(['owner', 'buyer'] as LoginKind[]).map((option) => {
                const isActive = kind === option;
                return (
                  <Pressable
                    accessibilityLabel={`role-${option}`}
                    accessibilityRole="button"
                    key={option}
                    onPress={() => setKind(option)}
                    style={[styles.roleButton, isActive && styles.roleButtonActive]}
                    testID={`role-${option}`}
                  >
                    <Text style={[styles.roleTitle, isActive && styles.roleTitleActive]}>
                      {demoUsers[option].title}
                    </Text>
                    <Text style={styles.roleHint}>{demoUsers[option].hint}</Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.form}>
              <Text style={styles.label}>Email Address</Text>
              <TextInput
                accessibilityLabel="login-email"
                autoCapitalize="none"
                autoCorrect={false}
                onChangeText={currentValues.setUsername}
                placeholder="commander@guild.com"
                placeholderTextColor={palette.textMuted}
                style={styles.input}
                testID="login-email"
                value={currentValues.username}
              />

              <Text style={styles.label}>Password</Text>
              <TextInput
                accessibilityLabel="login-password"
                autoCapitalize="none"
                autoCorrect={false}
                onChangeText={currentValues.setPassword}
                placeholder="temporary-password-hash"
                placeholderTextColor={palette.textMuted}
                secureTextEntry
                style={styles.input}
                testID="login-password"
                value={currentValues.password}
              />

              <View style={styles.metaRow}>
                <View style={styles.checkboxFake}>
                  <View style={styles.checkboxDot} />
                </View>
                <Text style={styles.metaText}>Remember credentials</Text>
                <Text style={styles.inlineLink}>Forgot Password?</Text>
              </View>

              <Pressable
                accessibilityLabel="login-submit"
                accessibilityRole="button"
                disabled={isSubmitting}
                onPress={() => void login(kind)}
                style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
                testID="login-submit"
              >
                {isSubmitting ? (
                  <ActivityIndicator color={palette.onPrimary} />
                ) : (
                  <Text style={styles.submitText}>INITIALIZE LOGIN</Text>
                )}
              </Pressable>
            </View>

            <View style={styles.dividerRow}>
              <View style={styles.divider} />
              <Text style={styles.dividerText}>Quick Connect</Text>
              <View style={styles.divider} />
            </View>

            <View style={styles.quickRow}>
              <Pressable style={styles.secondaryButton}>
                <Text style={styles.secondaryButtonText}>DISCORD</Text>
              </Pressable>
              <Pressable style={styles.secondaryButton}>
                <Text style={styles.secondaryButtonText}>STEAM</Text>
              </Pressable>
            </View>

            <View style={styles.statusPanel}>
              <View style={styles.statusHeader}>
                <Text style={styles.statusEyebrow}>Session</Text>
                <View style={[styles.statusDot, currentValues.session ? styles.dotOnline : styles.dotIdle]} />
              </View>
              <Text accessibilityLabel="session-summary" style={styles.statusTitle} testID="session-summary">
                {sessionSummary}
              </Text>
              <Text accessibilityLabel="login-response" style={styles.responseBox} testID="login-response">
                {response}
              </Text>
            </View>

            <Text style={styles.registerText}>
              No active dossier? <Text style={styles.registerLink}>Register for an Account</Text>
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const palette = {
  background: '#051424',
  backgroundStrong: '#0a0f18',
  surface: 'rgba(18, 33, 49, 0.9)',
  surfaceAlt: '#1e1e1e',
  surfaceSoft: 'rgba(39, 54, 71, 0.38)',
  border: '#3b494b',
  text: '#d4e4fa',
  textMuted: '#b9cacb',
  primary: '#00f0ff',
  primarySoft: '#7df4ff',
  secondary: '#ecb2ff',
  success: '#78f0b8',
  onPrimary: '#00363a',
};

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: palette.background,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
    paddingVertical: 36,
  },
  glowTop: {
    position: 'absolute',
    top: -100,
    left: -70,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: 'rgba(0, 240, 255, 0.14)',
  },
  glowBottom: {
    position: 'absolute',
    right: -120,
    bottom: -120,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(236, 178, 255, 0.12)',
  },
  card: {
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 16,
    backgroundColor: palette.surface,
    padding: 20,
    overflow: 'hidden',
  },
  headerBlock: {
    alignItems: 'center',
    marginBottom: 22,
  },
  brandBadge: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 56,
    height: 56,
    borderWidth: 1,
    borderColor: palette.primary,
    borderRadius: 10,
    backgroundColor: 'rgba(0, 240, 255, 0.1)',
    marginBottom: 16,
  },
  brandText: {
    color: palette.primarySoft,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 2,
  },
  title: {
    color: palette.text,
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  subtitle: {
    color: palette.textMuted,
    fontSize: 14,
    lineHeight: 22,
    marginTop: 8,
    textAlign: 'center',
  },
  roleRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  roleButton: {
    flex: 1,
    minHeight: 96,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 10,
    backgroundColor: palette.surfaceSoft,
    padding: 12,
  },
  roleButtonActive: {
    borderColor: palette.primary,
    backgroundColor: 'rgba(0, 240, 255, 0.12)',
  },
  roleTitle: {
    color: palette.text,
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 8,
  },
  roleTitleActive: {
    color: palette.primarySoft,
  },
  roleHint: {
    color: palette.textMuted,
    fontSize: 12,
    lineHeight: 18,
  },
  form: {
    gap: 10,
  },
  label: {
    color: palette.text,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
    marginTop: 4,
    textTransform: 'uppercase',
  },
  input: {
    minHeight: 52,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 8,
    backgroundColor: palette.surfaceAlt,
    color: palette.text,
    fontSize: 16,
    paddingHorizontal: 14,
  },
  metaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    marginBottom: 4,
    marginTop: 4,
  },
  checkboxFake: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 16,
    height: 16,
    borderWidth: 1,
    borderColor: palette.primary,
    borderRadius: 4,
  },
  checkboxDot: {
    width: 8,
    height: 8,
    borderRadius: 2,
    backgroundColor: palette.primary,
  },
  metaText: {
    flex: 1,
    color: palette.textMuted,
    fontSize: 12,
  },
  inlineLink: {
    color: palette.primarySoft,
    fontSize: 12,
    fontWeight: '700',
  },
  submitButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 54,
    borderRadius: 8,
    backgroundColor: palette.primary,
    marginTop: 4,
  },
  submitButtonDisabled: {
    opacity: 0.72,
  },
  submitText: {
    color: palette.onPrimary,
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  dividerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    marginVertical: 20,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: palette.border,
  },
  dividerText: {
    color: palette.textMuted,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  quickRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 18,
  },
  secondaryButton: {
    alignItems: 'center',
    flex: 1,
    borderWidth: 1,
    borderColor: palette.primary,
    borderRadius: 8,
    paddingVertical: 13,
  },
  secondaryButtonText: {
    color: palette.primarySoft,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
  },
  statusPanel: {
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 10,
    backgroundColor: 'rgba(1, 15, 31, 0.68)',
    padding: 14,
  },
  statusHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  statusEyebrow: {
    color: palette.textMuted,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  dotIdle: {
    backgroundColor: palette.textMuted,
  },
  dotOnline: {
    backgroundColor: palette.success,
  },
  statusTitle: {
    color: palette.text,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 10,
  },
  responseBox: {
    minHeight: 86,
    borderWidth: 1,
    borderColor: 'rgba(0, 240, 255, 0.22)',
    borderRadius: 8,
    backgroundColor: palette.backgroundStrong,
    color: palette.textMuted,
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
    fontSize: 11,
    lineHeight: 16,
    padding: 10,
  },
  registerText: {
    color: palette.textMuted,
    fontSize: 13,
    marginTop: 18,
    textAlign: 'center',
  },
  registerLink: {
    color: palette.secondary,
    fontWeight: '800',
  },
});
