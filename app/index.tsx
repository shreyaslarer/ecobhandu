import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { getSavedUser } from '@/lib/auth';
import { View, ActivityIndicator } from 'react-native';

// Check for saved user and redirect accordingly
export default function Index() {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    checkSavedUser();
  }, []);

  async function checkSavedUser() {
    try {
      const savedUser = await getSavedUser();
      
      // Use replace to prevent going back to this screen
      if (savedUser) {
        // Redirect based on user role
        if (savedUser.role === 'volunteer') {
          router.replace('/volunteer-home');
        } else {
          router.replace('/(tabs)');
        }
      } else {
        router.replace('/login');
      }
    } catch (error) {
      console.error('Error checking saved user:', error);
      router.replace('/login');
    } finally {
      setIsChecking(false);
    }
  }

  // Show loading while checking
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#E9ECE7' }}>
      <ActivityIndicator size="large" color="#9ACD32" />
    </View>
  );
}
