import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/**
 * Where the sign-in token lives: the Keychain / Keystore on phones, and
 * localStorage on web (SecureStore has no web support). A copy is kept in
 * memory so every request doesn't have to wait on storage.
 */

const KEY = 'smartfocus.authToken';

let cached: string | null = null;

export async function loadToken(): Promise<string | null> {
  cached = Platform.OS === 'web' ? localStorage.getItem(KEY) : await SecureStore.getItemAsync(KEY);
  return cached;
}

export function getToken(): string | null {
  return cached;
}

export async function saveToken(token: string): Promise<void> {
  cached = token;
  if (Platform.OS === 'web') {
    localStorage.setItem(KEY, token);
  } else {
    await SecureStore.setItemAsync(KEY, token);
  }
}

export async function clearToken(): Promise<void> {
  cached = null;
  if (Platform.OS === 'web') {
    localStorage.removeItem(KEY);
  } else {
    await SecureStore.deleteItemAsync(KEY);
  }
}
