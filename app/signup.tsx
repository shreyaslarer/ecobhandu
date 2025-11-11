import { useState } from 'react';
import { StyleSheet, View, Text, Pressable, TextInput, ScrollView, Image, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { createUser } from '@/lib/auth';
import { ToastNotification } from '@/components/toast-notification';

export default function SignUpScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { role } = useLocalSearchParams<{ role?: string }>();
  const [name, setName] = useState('');
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

  const onSignUpWithGoogle = () => {
    // Placeholder: Implement Google OAuth with role
    console.log('Sign up with Google as', userRole);
  };

  const onCreateAccount = async () => {
    // Validation
    if (!name.trim() || !email.trim() || !password.trim()) {
      setError('Please fill in all fields');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setError('');
    setLoading(true);

    try {
      console.log('Creating account as', userRole, 'with:', { name, email });
      const user = await createUser({
        name: name.trim(),
        email: email.trim(),
        password,
        role: userRole as 'citizen' | 'volunteer',
      });

      console.log('✅ Account created successfully:', user);
      setToast({
        visible: true,
        message: `Account created! Welcome ${user.name} 🎉`,
        type: 'success',
      });
      
      // Navigate after a short delay to show the success message
      setTimeout(() => {
        // Redirect based on user role
        if (userRole === 'volunteer') {
          router.replace('/volunteer-home' as any);
        } else {
          router.replace('/(tabs)');
        }
      }, 2000);
    } catch (err: any) {
      console.error('❌ Sign up error:', err);
      setError(err.message || 'Failed to create account. Please try again.');
      setToast({
        visible: true,
        message: err.message || 'Failed to create account',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const onSignIn = () => {
    // Navigate back to sign in with role
    router.back();
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
          <Text style={styles.title}>Create account</Text>

          {/* Google Sign Up */}
          <View style={styles.buttonWrapper}>
            <Pressable style={styles.googleButton} onPress={onSignUpWithGoogle}>
              <Image
                source={require('@/assets/images/googlelogo.png')}
                style={styles.googleIcon}
                resizeMode="contain"
              />
              <Text style={styles.googleButtonText}>Sign up with Google</Text>
            </Pressable>
          </View>

          {/* Divider */}
          <Text style={styles.divider}>or</Text>

          {/* Name Input */}
          <View style={styles.formWrapper}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Name</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your name"
                placeholderTextColor="#71717A"
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
                autoComplete="name"
              />
            </View>

            {/* Email Input */}
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
              <Text style={styles.label}>Password</Text>
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

          {/* Create Account Button */}
          <View style={styles.buttonWrapper}>
            <Pressable
              style={[
                styles.createButton,
                ((!name || !email || !password) || loading) && styles.createButtonDisabled
              ]}
              onPress={onCreateAccount}
              disabled={!name || !email || !password || loading}
            >
              {loading ? (
                <ActivityIndicator color="#000000" />
              ) : (
                <Text style={styles.createButtonText}>Create account</Text>
              )}
            </Pressable>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Already have an account?{' '}
            <Text style={styles.signInLink} onPress={onSignIn}>
              Sign in
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
  createButton: {
    height: 56,
    backgroundColor: '#C3D105',
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createButtonDisabled: {
    backgroundColor: '#BDBDBD',
  },
  createButtonText: {
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
  signInLink: {
    fontWeight: '700',
    color: '#C3D105',
  },
});
