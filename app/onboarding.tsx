import { useState } from 'react';
import { StyleSheet, View, Text, Pressable, ScrollView, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { DesignTokens } from '@/constants/design-tokens';

type UserRole = 'citizen' | 'volunteer' | null;

export default function OnboardingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [selectedRole, setSelectedRole] = useState<UserRole>('citizen');

  const onContinue = () => {
    if (selectedRole) {
      // Navigate to sign-in with selected role
      router.push(`/signin?role=${selectedRole}`);
    }
  };

  const onBack = () => {
    router.back();
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      {/* Top App Bar */}
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={onBack}>
          <Text style={styles.backArrow}>←</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Who are you?</Text>
        <View style={styles.backButton} />
      </View>

      {/* Main Content */}
      <ScrollView style={styles.scrollContent} contentContainerStyle={styles.contentContainer}>
        <View style={styles.optionsContainer}>
          {/* Citizen Option */}
          <Pressable
            style={[
              styles.optionCard,
              selectedRole === 'citizen' && styles.optionCardSelected,
            ]}
            onPress={() => setSelectedRole('citizen')}
          >
            <View style={styles.iconCircle}>
              <Image
                source={require('@/assets/images/citizenlogo.png')}
                style={styles.iconImage}
                resizeMode="contain"
              />
            </View>
            <View style={styles.optionText}>
              <Text style={styles.optionTitle}>Citizen</Text>
              <Text style={styles.optionDescription}>
                Join to learn, act, and make a difference.
              </Text>
            </View>
            {selectedRole === 'citizen' && (
              <View style={styles.checkBadge}>
                <IconSymbol name="checkmark" size={16} color="#FFFFFF" />
              </View>
            )}
          </Pressable>

          {/* Volunteer Option */}
          <Pressable
            style={[
              styles.optionCard,
              selectedRole === 'volunteer' && styles.optionCardSelected,
            ]}
            onPress={() => setSelectedRole('volunteer')}
          >
            <View style={styles.iconCircle}>
              <Image
                source={require('@/assets/images/volunteerlogo.png')}
                style={styles.iconImage}
                resizeMode="contain"
              />
            </View>
            <View style={styles.optionText}>
              <Text style={styles.optionTitle}>Volunteer</Text>
              <Text style={styles.optionDescription}>
                Organize events and lead community efforts.
              </Text>
            </View>
            {selectedRole === 'volunteer' && (
              <View style={styles.checkBadge}>
                <IconSymbol name="checkmark" size={16} color="#FFFFFF" />
              </View>
            )}
          </Pressable>
        </View>
      </ScrollView>

      {/* Bottom Action Button */}
      <View style={styles.footer}>
        <Pressable
          style={[styles.continueButton, !selectedRole && styles.continueButtonDisabled]}
          onPress={onContinue}
          disabled={!selectedRole}
        >
          <Text style={styles.continueButtonText}>Continue</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backArrow: {
    fontSize: 28,
    color: '#333333',
    fontWeight: '400',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333333',
    textAlign: 'center',
  },
  scrollContent: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  optionsContainer: {
    gap: 16,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  optionCardSelected: {
    borderColor: '#4CAF50',
    borderWidth: 2,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconImage: {
    width: 32,
    height: 32,
  },
  optionText: {
    flex: 1,
    gap: 4,
  },
  optionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333333',
  },
  optionDescription: {
    fontSize: 14,
    color: 'rgba(51, 51, 51, 0.7)',
    lineHeight: 18,
  },
  checkBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#4CAF50',
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    padding: 20,
    paddingBottom: 32,
  },
  continueButton: {
    height: 56,
    borderRadius: 999,
    backgroundColor: '#4CAF50',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  continueButtonDisabled: {
    backgroundColor: '#BDBDBD',
    shadowOpacity: 0,
    elevation: 0,
  },
  continueButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
