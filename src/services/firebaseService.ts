/**
 * Firebase Service for Storing SMS-Detected Transactions
 * 
 * SECURITY & PRIVACY:
 * - Only stores parsed transaction data (NOT raw SMS)
 * - Raw SMS content is NEVER uploaded to Firebase
 * - Only structured data is stored: amount, date, merchant, accountLast4
 * - SMS body is ONLY used locally for hashing (duplicate detection)
 * - Processed SMS hashes are stored LOCALLY ONLY (not in Firestore)
 * - Uses Cloud Functions for transaction creation (validates and updates balances)
 * - All transactions are associated with authenticated user
 * 
 * DUPLICATE DETECTION:
 * - Uses SMS hash (computed locally) to prevent duplicate insertions
 * - Stores only the hash in LOCAL STORAGE (NOT in Firestore, NOT the SMS content)
 * - Automatically cleans up entries older than 7 days
 * - Checks hash before creating transaction
 */

import { firebaseAuth } from '../config/firebase';
import { httpsCallable } from 'firebase/functions';
import { cloudFunctions } from '../config/firebase';
import { CreateTransactionRequest, CloudFunctionResponse } from '../types';

/**
 * Hash SMS body for duplicate detection
 * Uses simple hash function (fast, good enough for duplicate detection)
 */
export function hashSmsBody(smsBody: string): string {
  let hash = 0;
  const normalized = smsBody.trim().toLowerCase();
  
  for (let i = 0; i < normalized.length; i++) {
    const char = normalized.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  // Convert to positive hex string
  return Math.abs(hash).toString(16);
}

/**
 * Generate hash for duplicate detection based on SMS timestamp and parsed transaction data
 * This is more reliable than SMS body hash because:
 * - Same transaction might be sent in different SMS formats
 * - Uses actual transaction data (amount, date, merchant, account) + timestamp
 * 
 * @param timestamp - SMS receiving timestamp (milliseconds)
 * @param parsedData - Parsed transaction data
 * @returns Hash string for duplicate detection
 */
export function hashSmsTransaction(
  timestamp: number,
  parsedData: {
    amount: number;
    date: Date;
    merchant?: string;
    accountLast4?: string;
    type?: 'debit' | 'credit';
  }
): string {
  // Normalize date to same day (ignore time) for comparison
  const transactionDate = new Date(parsedData.date);
  const dateKey = `${transactionDate.getFullYear()}-${String(transactionDate.getMonth() + 1).padStart(2, '0')}-${String(transactionDate.getDate()).padStart(2, '0')}`;
  
  // Create a unique key from timestamp and parsed data
  // Round timestamp to nearest minute to handle slight timing differences
  const timestampKey = Math.floor(timestamp / 60000); // Round to nearest minute
  
  const key = `${timestampKey}_${parsedData.amount}_${dateKey}_${parsedData.merchant || ''}_${parsedData.accountLast4 || ''}_${parsedData.type || ''}`;
  
  // Hash the key
  let hash = 0;
  const normalized = key.trim().toLowerCase();
  
  for (let i = 0; i < normalized.length; i++) {
    const char = normalized.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  // Convert to positive hex string
  return Math.abs(hash).toString(16);
}

/**
 * Check if SMS has already been processed
 * Uses local storage for fast, offline-capable duplicate detection
 * 
 * @param smsHash - Hash of SMS (body or transaction-based)
 * @param userId - Current user ID (kept for compatibility, not used)
 * @returns true if SMS was already processed
 */
export async function isSmsProcessed(
  smsHash: string,
  userId: string
): Promise<boolean> {
  // Use local storage instead of Firestore for better performance and offline support
  const { isSmsProcessedLocal } = await import('./smsProcessedStorage');
  return isSmsProcessedLocal(smsHash);
}

/**
 * Mark SMS as processed
 * Uses local storage for fast, offline-capable duplicate detection
 * Automatically cleans up entries older than 7 days
 * 
 * @param smsHash - Hash of SMS transaction
 * @param userId - Current user ID (kept for compatibility, not used)
 * @param transactionId - ID of created transaction (optional)
 */
export async function markSmsAsProcessed(
  smsHash: string,
  userId: string,
  transactionId?: string
): Promise<void> {
  // Use local storage instead of Firestore for better performance and offline support
  const { markSmsAsProcessedLocal } = await import('./smsProcessedStorage');
  await markSmsAsProcessedLocal(smsHash, transactionId);
}

/**
 * Store transaction in Firestore via Cloud Function
 * 
 * NOTE: This uses the existing Cloud Function which:
 * - Validates transaction data
 * - Updates account balances
 * - Ensures double-entry accounting rules
 * 
 * @param transactionData - Parsed transaction data
 * @param debitAccountId - Account to debit (e.g., "Bank Account")
 * @param creditAccountId - Account to credit (e.g., "Expense Category")
 * @returns Transaction ID if successful
 */
export async function storeTransaction(
  transactionData: {
    amount: number;
    date: Date;
    note?: string;
    merchant?: string;
    accountLast4?: string;
    category?: string; // Transaction category: UPI, ATM, POS, NetBanking, etc.
    bankName?: string; // Bank name (e.g., "ICICI Bank", "HDFC Bank")
  },
  debitAccountId: string,
  creditAccountId: string
): Promise<string> {
  const currentUser = firebaseAuth.currentUser;
  if (!currentUser) {
    throw new Error('User must be authenticated to create transactions');
  }
  
  try {
    // Get ID token for authentication
    const idToken = await currentUser.getIdToken(true);
    
    // Prepare transaction request
    const transactionRequest: CreateTransactionRequest = {
      date: transactionData.date.toISOString(),
      amount: transactionData.amount,
      debitAccountId,
      creditAccountId,
      note: transactionData.note || undefined,
      // Add merchant and account info to note if not already present
      tags: transactionData.merchant
        ? ['sms-auto', `merchant:${transactionData.merchant}`]
        : ['sms-auto'],
    };
    
    // Build note ONLY from parsed merchant, category, and account info (NOT raw SMS)
    // This ensures no raw SMS content is stored in Firebase
    const noteParts: string[] = [];
    
    // Add category first (UPI, ATM, POS, etc.)
    if (transactionData.category) {
      noteParts.push(transactionData.category);
    }
    
    // Add merchant
    if (transactionData.merchant) {
      noteParts.push(transactionData.merchant);
    }
    
    // Add account last 4 digits
    if (transactionData.accountLast4) {
      noteParts.push(`A/c *${transactionData.accountLast4}`);
    }
    
    // Join parts with separator
    transactionRequest.note = noteParts.length > 0 ? noteParts.join(' | ') : undefined;
    
    // Call Cloud Function to create transaction
    const createTransactionFn = httpsCallable<
      CreateTransactionRequest & { idToken?: string },
      CloudFunctionResponse<{ transactionId: string }>
    >(cloudFunctions, 'createTransaction');
    
    const result = await createTransactionFn({
      ...transactionRequest,
      idToken,
    });
    
    if (!result.data.success || !result.data.data) {
      throw new Error(result.data.error || 'Failed to create transaction');
    }
    
    return result.data.data.transactionId;
  } catch (error) {
    console.error('Error storing transaction:', error);
    throw error;
  }
}

/**
 * Store SMS-detected transaction with duplicate check
 * 
 * SECURITY: This function does NOT store raw SMS content.
 * - Only parsed transaction data (amount, date, merchant, accountLast4) is stored
 * - Raw SMS content is NEVER uploaded to Firebase
 * 
 * This is the main function to use for storing SMS transactions.
 * It:
 * 1. Checks if SMS was already processed (duplicate detection based on timestamp + parsed data)
 * 2. Creates transaction via Cloud Function (with parsed data only)
 * 3. Marks SMS as processed (stores only hash, not SMS content)
 * 
 * @param smsTimestamp - SMS receiving timestamp (milliseconds)
 * @param transactionData - Parsed transaction data (NO raw SMS content)
 * @param debitAccountId - Account to debit
 * @param creditAccountId - Account to credit
 * @returns Transaction ID if successful, null if duplicate
 */
export async function storeSmsTransaction(
  smsTimestamp: number,
  transactionData: {
    amount: number;
    date: Date;
    note?: string; // Should only contain parsed merchant/account info, NOT raw SMS
    merchant?: string;
    accountLast4?: string;
    category?: string; // Transaction category: UPI, ATM, POS, NetBanking, etc.
    bankName?: string; // Bank name (e.g., "ICICI Bank", "HDFC Bank")
    type?: 'debit' | 'credit'; // Transaction type
  },
  debitAccountId: string,
  creditAccountId: string
): Promise<string | null> {
  const currentUser = firebaseAuth.currentUser;
  if (!currentUser) {
    throw new Error('User must be authenticated');
  }
  
  // Generate hash for duplicate detection based on timestamp and parsed data
  const smsHash = hashSmsTransaction(smsTimestamp, {
    amount: transactionData.amount,
    date: transactionData.date,
    merchant: transactionData.merchant,
    accountLast4: transactionData.accountLast4,
    type: transactionData.type,
  });
  const userId = currentUser.uid;
  
  // Check if already processed
  const alreadyProcessed = await isSmsProcessed(smsHash, userId);
  if (alreadyProcessed) {
    return null;
  }
  
  try {
    // Store transaction
    const transactionId = await storeTransaction(
      transactionData,
      debitAccountId,
      creditAccountId
    );
    
    // Mark SMS as processed
    await markSmsAsProcessed(smsHash, userId, transactionId);
    
    return transactionId;
  } catch (error) {
    console.error('Error storing SMS transaction:', error);
    throw error;
  }
}
