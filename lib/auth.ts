import AsyncStorage from '@react-native-async-storage/async-storage';

// API endpoint - use your computer's IP address when testing on a physical device
// Change to 'http://localhost:3000/api/auth' when using emulator
const API_URL = 'http://10.192.228.16:3000/api/auth';

const USER_STORAGE_KEY = '@ecobandhu_user';

export interface User {
  id?: string;
  _id?: string; // MongoDB ID
  name: string;
  email: string;
  role: 'citizen' | 'volunteer';
  totalReports?: number;
}

// Save user to AsyncStorage
export async function saveUser(user: User) {
  try {
    await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
    console.log('✅ User saved to storage:', user.email);
  } catch (error) {
    console.error('❌ Error saving user to storage:', error);
  }
}

// Get user from AsyncStorage
export async function getSavedUser(): Promise<User | null> {
  try {
    const userJson = await AsyncStorage.getItem(USER_STORAGE_KEY);
    if (userJson) {
      const user = JSON.parse(userJson);
      console.log('✅ Retrieved saved user:', user.email);
      return user;
    }
    return null;
  } catch (error) {
    console.error('❌ Error getting saved user:', error);
    return null;
  }
}

// Clear user from AsyncStorage (logout)
export async function clearUser() {
  try {
    await AsyncStorage.removeItem(USER_STORAGE_KEY);
    console.log('✅ User cleared from storage');
  } catch (error) {
    console.error('❌ Error clearing user:', error);
  }
}

export async function createUser(userData: Omit<User, 'id'> & { password: string }) {
  try {
    const response = await fetch(`${API_URL}/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to create account');
    }

    console.log(`✅ User created: ${userData.email} as ${userData.role}`);
    
    // Save user to AsyncStorage for persistent login
    await saveUser(data);
    
    return data;
  } catch (error: any) {
    console.error('❌ Error creating user:', error);
    throw error;
  }
}

export async function authenticateUser(email: string, password: string, role?: string) {
  try {
    const response = await fetch(`${API_URL}/signin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password, role }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Authentication failed');
    }

    console.log(`✅ User authenticated: ${data.email} as ${data.role}`);
    
    // Save user to AsyncStorage for persistent login
    await saveUser(data);
    
    return data;
  } catch (error: any) {
    console.error('❌ Authentication error:', error);
    throw error;
  }
}
