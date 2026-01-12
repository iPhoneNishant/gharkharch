/**
 * Sync Queue Service
 * Manages a queue of pending operations to sync when online
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  CreateAccountRequest, 
  UpdateAccountRequest,
  CreateTransactionRequest,
  UpdateTransactionRequest,
} from '../types';

const QUEUE_KEY = '@gharkharch:syncQueue';

export type SyncOperationType = 
  | 'CREATE_ACCOUNT'
  | 'UPDATE_ACCOUNT'
  | 'DELETE_ACCOUNT'
  | 'CREATE_TRANSACTION'
  | 'UPDATE_TRANSACTION'
  | 'DELETE_TRANSACTION';

export interface SyncOperation {
  id: string; // Unique ID for this operation
  type: SyncOperationType;
  timestamp: Date;
  data: CreateAccountRequest | UpdateAccountRequest | { accountId: string } | CreateTransactionRequest | UpdateTransactionRequest | { transactionId: string };
  retryCount: number;
}

/**
 * Generate unique ID for sync operation
 */
const generateOperationId = (): string => {
  return `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Load sync queue from local storage
 */
export const loadSyncQueue = async (): Promise<SyncOperation[]> => {
  try {
    const jsonValue = await AsyncStorage.getItem(QUEUE_KEY);
    if (jsonValue == null) {
      return [];
    }
    const operations = JSON.parse(jsonValue) as SyncOperation[];
    // Convert date strings back to Date objects
    return operations.map(op => ({
      ...op,
      timestamp: new Date(op.timestamp),
    }));
  } catch (error) {
    console.error('❌ Error loading sync queue:', error);
    return [];
  }
};

/**
 * Save sync queue to local storage
 */
export const saveSyncQueue = async (operations: SyncOperation[]): Promise<void> => {
  try {
    const jsonValue = JSON.stringify(operations);
    await AsyncStorage.setItem(QUEUE_KEY, jsonValue);
  } catch (error) {
    console.error('❌ Error saving sync queue:', error);
    throw error;
  }
};

/**
 * Add operation to sync queue
 */
export const addToSyncQueue = async (
  type: SyncOperationType,
  data: CreateAccountRequest | UpdateAccountRequest | { accountId: string } | CreateTransactionRequest | UpdateTransactionRequest | { transactionId: string }
): Promise<string> => {
  try {
    const queue = await loadSyncQueue();
    const operation: SyncOperation = {
      id: generateOperationId(),
      type,
      timestamp: new Date(),
      data,
      retryCount: 0,
    };
    queue.push(operation);
    await saveSyncQueue(queue);
    return operation.id;
  } catch (error) {
    console.error('❌ Error adding to sync queue:', error);
    throw error;
  }
};

/**
 * Remove operation from sync queue
 */
export const removeFromSyncQueue = async (operationId: string): Promise<void> => {
  try {
    const queue = await loadSyncQueue();
    const filtered = queue.filter(op => op.id !== operationId);
    await saveSyncQueue(filtered);
  } catch (error) {
    console.error('❌ Error removing from sync queue:', error);
    throw error;
  }
};

/**
 * Get all pending operations
 */
export const getPendingOperations = async (): Promise<SyncOperation[]> => {
  return loadSyncQueue();
};

/**
 * Increment retry count for an operation
 */
export const incrementRetryCount = async (operationId: string): Promise<void> => {
  try {
    const queue = await loadSyncQueue();
    const operation = queue.find(op => op.id === operationId);
    if (operation) {
      operation.retryCount += 1;
      await saveSyncQueue(queue);
    }
  } catch (error) {
    console.error('❌ Error incrementing retry count:', error);
  }
};

/**
 * Clear sync queue
 */
export const clearSyncQueue = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(QUEUE_KEY);
  } catch (error) {
    console.error('❌ Error clearing sync queue:', error);
    throw error;
  }
};

/**
 * Get queue size
 */
export const getQueueSize = async (): Promise<number> => {
  const queue = await loadSyncQueue();
  return queue.length;
};