import * as Crypto from 'expo-crypto';

/**
 * Hash a password using SHA-256
 * Note: For production, consider using a backend API with bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  // Add a simple salt to the password
  const saltedPassword = `ecobhandu_salt_${password}_2025`;
  const hash = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    saltedPassword
  );
  return hash;
}

/**
 * Verify a password against a hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const passwordHash = await hashPassword(password);
  return passwordHash === hash;
}
