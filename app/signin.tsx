import { useState } from 'react';
import { StyleSheet, View, Text, Pressable, TextInput, ScrollView, Image, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { authenticateUser } from '@/lib/auth';
import { ToastNotification } from '@/components/toast-notification';

export default function SignInScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { role } = useLocalSearchParams<{ role?: string }>();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'success' | 'error' | 'info' }>({
    visible: false,
    message: '',
    type: 'info',
  });

  const userRole = role || 'citizen'; // Default to citizen if no role specified

  const onSignInWithGoogle = () => {
    // Placeholder: Implement Google OAuth with role
    console.log('Sign in with Google as', userRole);
  };

  const onSignIn = async () => {
    // Validation
    if (!email.trim() || !password.trim()) {
      setError('Please fill in all fields');
      return;
    }

    setError('');
    setLoading(true);

    try {
      console.log('Signing in as', userRole, 'with email:', email);
      const user = await authenticateUser(email.trim(), password, userRole);

      console.log('✅ Signed in successfully:', user);
      setToast({
        visible: true,
        message: `Welcome back, ${user.name}! 👋`,
        type: 'success',
      });
      
      // Navigate after a short delay to show the success message
      setTimeout(() => {
        // Redirect based on user role
        if (user.role === 'volunteer') {
          router.replace('/volunteer-home' as any);
        } else {
          router.replace('/(tabs)');
        }
      }, 2000);
    } catch (err: any) {
      console.error('❌ Sign in error:', err);
      setError(err.message || 'Failed to sign in. Please try again.');
      setToast({
        visible: true,
        message: err.message || 'Failed to sign in',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const onForgotPassword = () => {
    // Placeholder: Navigate to forgot password flow
    console.log('Forgot password');
  };

  const onCreateAccount = () => {
    // Navigate to sign up screen with role
    router.push(`/signup?role=${userRole}`);
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Toast Notification */}
      <ToastNotification
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={() => setToast({ ...toast, visible: false })}
      />
      
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }
        ]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Back Button */}
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backArrow}>←</Text>
        </Pressable>

        <View style={styles.container}>
          {/* Header */}
          <Text style={styles.title}>Sign in</Text>

          {/* Google Sign In */}
          <View style={styles.buttonWrapper}>
            <Pressable style={styles.googleButton} onPress={onSignInWithGoogle}>
              <Image
                source={require('@/assets/images/googlelogo.png')}
                style={styles.googleIcon}
                resizeMode="contain"
              />
              <Text style={styles.googleButtonText}>Sign in with Google</Text>
            </Pressable>
          </View>

          {/* Divider */}
          <Text style={styles.divider}>or</Text>

          {/* Email Input */}
          <View style={styles.formWrapper}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your email"
                placeholderTextColor="#71717A"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
              />
            </View>

            {/* Password Input */}
            <View style={styles.inputGroup}>
              <View style={styles.passwordLabelRow}>
                <Text style={styles.label}>Password</Text>
                <Pressable onPress={onForgotPassword}>
                  <Text style={styles.forgotLink}>Forgot?</Text>
                </Pressable>
              </View>
              <TextInput
                style={styles.input}
                placeholder="Enter your password"
                placeholderTextColor="#71717A"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
                autoComplete="password"
              />
            </View>
          </View>

          {/* Sign In Button */}
          <View style={styles.buttonWrapper}>
            <Pressable
              style={[
                styles.signInButton,
                ((!email || !password) || loading) && styles.signInButtonDisabled
              ]}
              onPress={onSignIn}
              disabled={!email || !password || loading}
            >
              {loading ? (
                <ActivityIndicator color="#000000" />
              ) : (
                <Text style={styles.signInButtonText}>Sign in</Text>
              )}
            </Pressable>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            New here?{' '}
            <Text style={styles.createAccountLink} onPress={onCreateAccount}>
              Create account
            </Text>
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F8F8F5',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    marginLeft: 4,
  },
  backArrow: {
    fontSize: 28,
    color: '#1A1A1A',
    fontWeight: '400',
  },
  container: {
    width: '100%',
    maxWidth: 448,
    alignSelf: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1A1A1A',
    textAlign: 'center',
    paddingBottom: 32,
    paddingTop: 24,
    paddingHorizontal: 16,
  },
  buttonWrapper: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  formWrapper: {
    paddingHorizontal: 16,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 56,
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 12,
  },
  googleIcon: {
    width: 24,
    height: 24,
  },
  googleButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  divider: {
    fontSize: 16,
    color: '#71717A',
    textAlign: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  errorContainer: {
    backgroundColor: '#FEE2E2',
    borderLeftWidth: 4,
    borderLeftColor: '#EF4444',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 8,
  },
  errorText: {
    color: '#DC2626',
    fontSize: 14,
    fontWeight: '500',
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  passwordLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  forgotLink: {
    fontSize: 14,
    color: '#6B7280',
  },
  input: {
    height: 56,
    backgroundColor: '#F8F8F5',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    paddingHorizontal: 15,
    fontSize: 16,
    color: '#1A1A1A',
  },
  signInButton: {
    height: 56,
    backgroundColor: '#C3D105',
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signInButtonDisabled: {
    backgroundColor: '#BDBDBD',
  },
  signInButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000000',
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  footerText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
  createAccountLink: {
    fontWeight: '700',
    color: '#BDCF0C',
  },
});
