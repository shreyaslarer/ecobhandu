import { StyleSheet } from 'react-native';

import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';

export default function ProfileScreen() {
  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: '#E6F4EA', dark: '#1F2A24' }}
      headerImage={<IconSymbol size={200} name="person.crop.circle" color="#4CAF50" style={styles.headerImage} />}
    >
      <ThemedView style={styles.titleContainer}>
        <ThemedText type="title">Your Profile</ThemedText>
        <ThemedText>Set up your account details and preferences.</ThemedText>
      </ThemedView>

      <ThemedView style={styles.section}>
        <ThemedText type="subtitle">Basics</ThemedText>
        <ThemedText>Name: Jane Doe</ThemedText>
        <ThemedText>Email: jane@example.com</ThemedText>
      </ThemedView>

      <ThemedView style={styles.section}>
        <ThemedText type="subtitle">Preferences</ThemedText>
        <ThemedText>Notifications: Enabled</ThemedText>
        <ThemedText>Theme: System</ThemedText>
      </ThemedView>
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  headerImage: {
    bottom: -60,
    right: -30,
    position: 'absolute',
  },
  titleContainer: {
    gap: 8,
    marginBottom: 12,
  },
  section: {
    gap: 6,
    marginBottom: 12,
  },
});
