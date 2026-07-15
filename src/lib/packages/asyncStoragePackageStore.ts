import AsyncStorage from '@react-native-async-storage/async-storage';
import type { PackageStore } from '../../types/packages';

/** Expo adapter; the installer itself remains platform-neutral and testable. */
export class AsyncStoragePackageStore implements PackageStore {
  async read<T>(key: string): Promise<T | undefined> {
    const value = await AsyncStorage.getItem(key);
    return value ? JSON.parse(value) as T : undefined;
  }

  async write<T>(key: string, value: T): Promise<void> {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  }

  async remove(key: string): Promise<void> {
    await AsyncStorage.removeItem(key);
  }
}
