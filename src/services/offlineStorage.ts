/**
 * Offline Storage Service
 * Manages local caching of accounts and transactions using AsyncStorage
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Account, Transaction } from '../types';

const STORAGE_KEYS = {
  ACCOUNTS: '@gharkharch:accounts',
  TRANSACTIONS: '@gharkharch:transactions',
  LAST_SYNC: '@gharkharch:lastSync',
  USER_ID: '@gharkharch:userId',
} as const;

export interface SyncMetadata {
  lastSyncAt: Date;
  userId: string;
}

/**
 * Save accounts to local storage
 */
export const saveAccountsToLocal = async (accounts: Account[]): Promise<void> => {
  try {
    const jsonValue = JSON.stringify(accounts);
    await AsyncStorage.setItem(STORAGE_KEYS.ACCOUNTS, jsonValue);
  } catch (error) {
    console.error('❌ Error saving accounts to local storage:', error);
    throw error;
  }
};

/**
 * Load accounts from local storage
 */
export const loadAccountsFromLocal = async (): Promise<Account[]> => {
  try {
    const jsonValue = await AsyncStorage.getItem(STORAGE_KEYS.ACCOUNTS);
    if (jsonValue == null) {
      return [];
    }
    const accounts = JSON.parse(jsonValue) as Account[];
    // Convert date strings back to Date objects
    return accounts.map(account => ({
      ...account,
      createdAt: new Date(account.createdAt),
      updatedAt: new Date(account.updatedAt),
    }));
  } catch (error) {
    console.error('❌ Error loading accounts from local storage:', error);
    return [];
  }
};

/**
 * Save transactions to local storage
 */
export const saveTransactionsToLocal = async (transactions: Transaction[]): Promise<void> => {
  try {
    const jsonValue = JSON.stringify(transactions);
    await AsyncStorage.setItem(STORAGE_KEYS.TRANSACTIONS, jsonValue);
  } catch (error) {
    console.error('❌ Error saving transactions to local storage:', error);
    throw error;
  }
};

/**
 * Load transactions from local storage
 */
export const loadTransactionsFromLocal = async (): Promise<Transaction[]> => {
  try {
    const jsonValue = await AsyncStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
    if (jsonValue == null) {
      return [];
    }
    const transactions = JSON.parse(jsonValue) as Transaction[];
    // Convert date strings back to Date objects
    return transactions.map(transaction => ({
      ...transaction,
      date: new Date(transaction.date),
      createdAt: new Date(transaction.createdAt),
      updatedAt: new Date(transaction.updatedAt),
    }));
  } catch (error) {
    console.error('❌ Error loading transactions from local storage:', error);
    return [];
  }
};

/**
 * Save sync metadata
 */
export const saveSyncMetadata = async (userId: string): Promise<void> => {
  try {
    const metadata: SyncMetadata = {
      lastSyncAt: new Date(),
      userId,
    };
    const jsonValue = JSON.stringify(metadata);
    await AsyncStorage.setItem(STORAGE_KEYS.LAST_SYNC, jsonValue);
    await AsyncStorage.setItem(STORAGE_KEYS.USER_ID, userId);
  } catch (error) {
    console.error('❌ Error saving sync metadata:', error);
  }
};

/**
 * Load sync metadata
 */
export const loadSyncMetadata = async (): Promise<SyncMetadata | null> => {
  try {
    const jsonValue = await AsyncStorage.getItem(STORAGE_KEYS.LAST_SYNC);
    if (jsonValue == null) {
      return null;
    }
    const metadata = JSON.parse(jsonValue) as SyncMetadata;
    return {
      ...metadata,
      lastSyncAt: new Date(metadata.lastSyncAt),
    };
  } catch (error) {
    console.error('❌ Error loading sync metadata:', error);
    return null;
  }
};

/**
 * Get stored user ID
 */
export const getStoredUserId = async (): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem(STORAGE_KEYS.USER_ID);
  } catch (error) {
    console.error('❌ Error getting stored user ID:', error);
    return null;
  }
};

/**
 * Clear all offline storage
 */
export const clearOfflineStorage = async (): Promise<void> => {
  try {
    await Promise.all([
      AsyncStorage.removeItem(STORAGE_KEYS.ACCOUNTS),
      AsyncStorage.removeItem(STORAGE_KEYS.TRANSACTIONS),
      AsyncStorage.removeItem(STORAGE_KEYS.LAST_SYNC),
      AsyncStorage.removeItem(STORAGE_KEYS.USER_ID),
    ]);
  } catch (error) {
    console.error('❌ Error clearing offline storage:', error);
    throw error;
  }
};