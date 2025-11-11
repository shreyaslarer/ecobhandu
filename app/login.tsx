import { StyleSheet, View, Pressable, Text, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { DesignTokens } from '@/constants/design-tokens';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Login / Splash screen converted from provided HTML.
// Tailwind classes have been translated to StyleSheet rules.
// For now logic is minimal; navigation can be wired when auth flow decided.

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const onGetStarted = () => {
    // Navigate to onboarding screen
    router.push('/onboarding');
  };

  const onSignIn = () => {
    // Navigate to sign-in screen
    router.push('/signin');
  };

  const onAdminAccess = () => {
    // Navigate directly to admin dashboard
    router.push('/admin-dashboard');
  };

  return (
    <View
      style={[
        styles.root,
        styles.darkBg,
        { paddingTop: Math.max(insets.top, 24), paddingBottom: Math.max(insets.bottom, 24) },
      ]}
    >
      <View style={styles.flexGrow} />
      <View style={styles.centerBlock}>
        <View style={styles.logoCircle}>
          <Image
            source={require('@/assets/images/ecobhandulogo.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
        </View>
        <Text style={styles.brandTitle}>EcoBhandu</Text>
        <Text style={styles.tagline}>Uber for environmental action</Text>
      </View>
      <View style={styles.flexGrow} />
      <View style={styles.actionsWrapper}>
        <View style={styles.buttonsStack}>
          <Pressable
            style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressed]}
            onPress={onGetStarted}
          >
            <Text style={styles.primaryBtnText}>Get Started</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.secondaryBtn, pressed && styles.pressed]}
            onPress={onSignIn}
          >
            <Text style={styles.secondaryBtnText}>Sign in</Text>
          </Pressable>
        </View>
        <Text style={styles.caption}>Works best with location enabled.</Text>
        
        {/* Admin Quick Access */}
        <Pressable
          style={({ pressed }) => [styles.adminLink, pressed && styles.pressed]}
          onPress={onAdminAccess}
        >
          <Text style={styles.adminLinkText}>🔐 Admin Dashboard</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  darkBg: {
    backgroundColor: '#000000',
  },
  lightBg: {
    backgroundColor: '#F7F8F9',
  },
  flexGrow: { flex: 1 },
  centerBlock: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoCircle: {
    height: 112, // h-28
    width: 112, // w-28
    borderRadius: 56,
    backgroundColor: '#1A1A1A',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  logoImage: {
    width: 140,
    height: 140,
  },
  brandTitle: {
    fontSize: 32,
    fontWeight: '700',
    lineHeight: 36,
    color: '#FFFFFF',
  },
  tagline: {
    color: '#9AA0A6',
    fontSize: 16,
    marginTop: 4,
  },
  actionsWrapper: {
    width: '100%',
    maxWidth: 420,
  },
  buttonsStack: {
    flexDirection: 'column',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  primaryBtn: {
    height: 48,
    borderRadius: 999,
    backgroundColor: DesignTokens.colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0B0B0B',
  },
  secondaryBtn: {
    height: 48,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  caption: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    paddingTop: 12,
  },
  adminLink: {
    marginTop: 16,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  adminLinkText: {
    fontSize: 13,
    color: '#9AA0A6',
    textAlign: 'center',
    textDecorationLine: 'underline',
  },
  pressed: {
    opacity: 0.85,
  },
});
