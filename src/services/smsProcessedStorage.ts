/**
 * Local Storage Service for Processed SMS
 * 
 * Stores processed SMS data locally using AsyncStorage
 * Automatically cleans up data older than 7 days
 * 
 * PRIVACY:
 * - Only stores hash and timestamp (no SMS content)
 * - Data is stored locally on device only
 * - No cloud sync required
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@gharkharch:processed_sms';
const CLEANUP_AGE_DAYS = 7;

export interface ProcessedSmsEntry {
  smsHash: string;
  processedAt: number; // Timestamp in milliseconds
  transactionId?: string;
}

interface ProcessedSmsData {
  entries: ProcessedSmsEntry[];
  lastCleanup: number; // Timestamp of last cleanup
}

/**
 * Load processed SMS data from local storage
 */
async function loadProcessedSmsData(): Promise<ProcessedSmsData> {
  try {
    const jsonValue = await AsyncStorage.getItem(STORAGE_KEY);
    if (jsonValue == null) {
      return { entries: [], lastCleanup: Date.now() };
    }
    return JSON.parse(jsonValue) as ProcessedSmsData;
  } catch (error) {
    console.error('Error loading processed SMS data:', error);
    return { entries: [], lastCleanup: Date.now() };
  }
}

/**
 * Save processed SMS data to local storage
 */
async function saveProcessedSmsData(data: ProcessedSmsData): Promise<void> {
  try {
    const jsonValue = JSON.stringify(data);
    await AsyncStorage.setItem(STORAGE_KEY, jsonValue);
  } catch (error) {
    console.error('Error saving processed SMS data:', error);
    throw error;
  }
}

/**
 * Clean up old processed SMS entries (older than 7 days)
 */
async function cleanupOldEntries(data: ProcessedSmsData): Promise<ProcessedSmsData> {
  const now = Date.now();
  const cutoffTime = now - (CLEANUP_AGE_DAYS * 24 * 60 * 60 * 1000); // 7 days ago
  
  const filteredEntries = data.entries.filter(
    entry => entry.processedAt >= cutoffTime
  );
  
  const removedCount = data.entries.length - filteredEntries.length;
  if (removedCount > 0) {
  }
  
  return {
    entries: filteredEntries,
    lastCleanup: now,
  };
}

/**
 * Check if SMS has already been processed (local storage)
 * 
 * @param smsHash - Hash of SMS transaction
 * @returns true if SMS was already processed
 */
export async function isSmsProcessedLocal(smsHash: string): Promise<boolean> {
  try {
    const data = await loadProcessedSmsData();
    
    // Clean up old entries periodically (once per day)
    const now = Date.now();
    const oneDayAgo = now - (24 * 60 * 60 * 1000);
    if (data.lastCleanup < oneDayAgo) {
      const cleanedData = await cleanupOldEntries(data);
      await saveProcessedSmsData(cleanedData);
      return cleanedData.entries.some(entry => entry.smsHash === smsHash);
    }
    
    return data.entries.some(entry => entry.smsHash === smsHash);
  } catch (error) {
    console.error('Error checking processed SMS:', error);
    // On error, assume not processed (fail open to avoid blocking)
    return false;
  }
}

/**
 * Mark SMS as processed (local storage)
 * 
 * @param smsHash - Hash of SMS transaction
 * @param transactionId - ID of created transaction (optional)
 */
export async function markSmsAsProcessedLocal(
  smsHash: string,
  transactionId?: string
): Promise<void> {
  try {
    const data = await loadProcessedSmsData();
    
    // Check if already exists
    const existingIndex = data.entries.findIndex(entry => entry.smsHash === smsHash);
    
    if (existingIndex >= 0) {
      // Update existing entry
      data.entries[existingIndex] = {
        smsHash,
        processedAt: Date.now(),
        transactionId: transactionId || data.entries[existingIndex].transactionId,
      };
    } else {
      // Add new entry
      data.entries.push({
        smsHash,
        processedAt: Date.now(),
        transactionId,
      });
    }
    
    // Clean up old entries before saving
    const cleanedData = await cleanupOldEntries(data);
    await saveProcessedSmsData(cleanedData);
  } catch (error) {
    console.error('Error marking SMS as processed:', error);
    // Non-critical error, don't throw
  }
}

/**
 * Clean up old processed SMS entries manually
 * Useful for periodic cleanup or on app start
 */
export async function cleanupProcessedSms(): Promise<number> {
  try {
    const data = await loadProcessedSmsData();
    const beforeCount = data.entries.length;
    const cleanedData = await cleanupOldEntries(data);
    await saveProcessedSmsData(cleanedData);
    const removedCount = beforeCount - cleanedData.entries.length;
    return removedCount;
  } catch (error) {
    console.error('Error cleaning up processed SMS:', error);
    return 0;
  }
}

/**
 * Get count of processed SMS entries
 */
export async function getProcessedSmsCount(): Promise<number> {
  try {
    const data = await loadProcessedSmsData();
    return data.entries.length;
  } catch (error) {
    console.error('Error getting processed SMS count:', error);
    return 0;
  }
}

/**
 * Clear all processed SMS data (for testing or reset)
 */
export async function clearProcessedSms(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Error clearing processed SMS data:', error);
    throw error;
  }
}
