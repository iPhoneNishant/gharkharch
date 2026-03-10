/**
 * SMS Auto Transaction Detection Service
 * 
 * MAIN ORCHESTRATOR for automatic transaction detection from SMS
 * 
 * WORKFLOW:
 * 1. Request/check READ_SMS permission
 * 2. Read recent SMS from inbox
 * 3. Filter by bank sender IDs
 * 4. Parse transaction data (amount, type, date, merchant, account)
 * 5. Check for duplicates (using SMS hash)
 * 6. Store transaction in Firestore via Cloud Function
 * 7. Mark SMS as processed
 * 
 * SECURITY & PRIVACY:
 * - Only processes bank transaction SMS
 * - All parsing happens locally on device
 * - Raw SMS content is NEVER uploaded
 * - Only structured transaction data is sent to Firestore
 * - Duplicate detection prevents re-processing
 * 
 * GOOGLE PLAY COMPLIANCE:
 * - User must explicitly grant READ_SMS permission
 * - Clear purpose: automatic transaction detection
 * - Privacy policy must explain SMS usage
 * - Only processes financial transaction SMS
 */

import { Platform } from 'react-native';
import {
  checkSmsPermission,
  requestSmsPermission,
  readRecentSms,
  SmsMessage,
} from './smsService';
import {
  parseTransaction,
  isBankSender,
  BANK_SENDER_IDS,
} from './transactionParser';
import {
  storeSmsTransaction,
} from './firebaseService';
import { useAccountStore } from '../stores/accountStore';
import { firebaseAuth } from '../config/firebase';
import { getSmsReadCount, getSmsDateGapDays, getSmsSinceTimestamp } from './smsSettingsService';

export interface AutoTransactionResult {
  success: boolean;
  processedCount: number;
  skippedCount: number;
  errorCount: number;
  errors?: string[];
}

export interface AutoTransactionOptions {
  /** Maximum number of SMS to process (default: 50) */
  limit?: number;
  /** Only process SMS from specific sender (optional) */
  senderId?: string;
  /** Only process SMS after this timestamp (optional) */
  sinceTimestamp?: number;
  /** Default debit account ID (required for debit transactions) */
  defaultDebitAccountId?: string;
  /** Default credit account ID (required for credit transactions) */
  defaultCreditAccountId?: string;
  /** Default expense account ID (for debit transactions, if no defaultDebitAccountId) */
  defaultExpenseAccountId?: string;
  /** Default income account ID (for credit transactions, if no defaultCreditAccountId) */
  defaultIncomeAccountId?: string;
}

/**
 * Get account IDs for SMS transaction using merchant and bank mappings
 * 
 * Priority:
 * 1. Use merchant mapping (name → accountId)
 * 2. Use bank mapping (name → accountId)
 * 3. Use options provided
 * 4. Use defaults from account store
 */
function getAccountIds(
  parsed: { merchant?: string; bankName?: string; type: 'debit' | 'credit' },
  accounts: any[],
  options: AutoTransactionOptions
): { debitAccountId: string; creditAccountId: string } | null {
  const accountStore = useAccountStore.getState();
  
  let merchantAccountId: string | null = null;
  let bankAccountId: string | null = null;
  
  // Try to get merchant and bank mappings
  try {
    const { useSmsAccountMappingStore } = require('../stores/smsAccountMappingStore');
    const mappingStore = useSmsAccountMappingStore.getState();
    
    // Get merchant mapping
    if (parsed.merchant && parsed.merchant.trim()) {
      const merchantMapping = mappingStore.getMapping(parsed.merchant);
      if (merchantMapping) {
        merchantAccountId = merchantMapping.accountId;
      }
    }
    
    // Get bank mapping
    if (parsed.bankName && parsed.bankName.trim()) {
      const bankMapping = mappingStore.getMapping(parsed.bankName);
      if (bankMapping) {
        bankAccountId = bankMapping.accountId;
      }
    }
  } catch (error) {
    console.warn('Error getting SMS account mappings:', error);
  }
  
  // Apply mappings based on transaction type
  if (parsed.type === 'debit') {
    // Debit: From Account = Bank, To Account = Merchant
    const creditAccountId = bankAccountId || 
      options.defaultCreditAccountId ||
      accountStore.getAssetAccounts()[0]?.id;
    
    const debitAccountId = merchantAccountId ||
      options.defaultDebitAccountId ||
      options.defaultExpenseAccountId ||
      accountStore.getExpenseAccounts()[0]?.id;
    
    if (!debitAccountId || !creditAccountId) {
      return null;
    }
    
    return { debitAccountId, creditAccountId };
  } else {
    // Credit: From Account = Merchant, To Account = Bank
    const creditAccountId = merchantAccountId ||
      options.defaultCreditAccountId ||
      options.defaultIncomeAccountId ||
      accountStore.getIncomeAccounts()[0]?.id;
    
    const debitAccountId = bankAccountId ||
      options.defaultDebitAccountId ||
      accountStore.getAssetAccounts()[0]?.id;
    
    if (!debitAccountId || !creditAccountId) {
      return null;
    }
    
    return { debitAccountId, creditAccountId };
  }
}

/**
 * Process a single SMS message
 * 
 * @returns Transaction ID if successful, null if skipped/error
 */
async function processSmsMessage(
  sms: SmsMessage,
  options: AutoTransactionOptions
): Promise<string | null> {
  try {
    // Filter by sender if specified
    if (options.senderId && sms.senderId.toUpperCase() !== options.senderId.toUpperCase()) {
      return null;
    }
    
    // Filter by timestamp if specified
    if (options.sinceTimestamp && sms.timestamp < options.sinceTimestamp) {
      return null;
    }
    
    // Check if sender is a known bank
    if (!isBankSender(sms.senderId)) {
      return null;
    }
    
    // Parse transaction
    const parsed = parseTransaction(sms.body, sms.senderId);
    if (!parsed) {
      return null;
    }
    
    // Get accounts from store for mapping lookups
    const accountStore = useAccountStore.getState();
    const accounts = accountStore.accounts || [];
    
    // Get account IDs using merchant and bank mappings
    const accountIds = getAccountIds(parsed, accounts, options);
    if (!accountIds) {
      console.warn('No accounts found for transaction type:', parsed.type, 'merchant:', parsed.merchant, 'bank:', parsed.bankName);
      return null;
    }
    
    // Store transaction (includes duplicate check)
    // NOTE: Only parsed data is stored, NOT raw SMS content
    // The note field will be constructed from category, merchant, and account info
    const transactionId = await storeSmsTransaction(
      sms.timestamp, // SMS receiving timestamp for duplicate detection
      {
        amount: parsed.amount,
        date: parsed.date,
        note: undefined, // Don't store raw SMS - only use parsed category/merchant/account info
        merchant: parsed.merchant,
        accountLast4: parsed.accountLast4,
        category: parsed.category, // Auto-detected category (UPI, ATM, POS, etc.)
        bankName: parsed.bankName, // Extracted bank name
        type: parsed.type, // Transaction type (debit/credit)
      },
      accountIds.debitAccountId,
      accountIds.creditAccountId
    );
    
    return transactionId;
  } catch (error) {
    console.error('Error processing SMS:', error);
    throw error;
  }
}

/**
 * Main function: Automatically detect and store transactions from SMS
 * 
 * @param options Configuration options
 * @returns Result with processed/skipped/error counts
 */
export async function autoDetectTransactions(
  options: AutoTransactionOptions = {}
): Promise<AutoTransactionResult> {
  // Check platform
  if (Platform.OS !== 'android') {
    return {
      success: false,
      processedCount: 0,
      skippedCount: 0,
      errorCount: 0,
      errors: ['SMS auto-detection is only available on Android'],
    };
  }
  
  // Check authentication
  const currentUser = firebaseAuth.currentUser;
  if (!currentUser) {
    return {
      success: false,
      processedCount: 0,
      skippedCount: 0,
      errorCount: 0,
      errors: ['User must be authenticated'],
    };
  }
  
  // Check permission
  let hasPermission = await checkSmsPermission();
  if (!hasPermission) {
    // Request permission
    hasPermission = await requestSmsPermission();
    if (!hasPermission) {
      return {
        success: false,
        processedCount: 0,
        skippedCount: 0,
        errorCount: 0,
        errors: ['READ_SMS permission not granted'],
      };
    }
  }
  
  try {
    // Read SMS from inbox - use user-configured count if not specified
    const limit = options.limit || await getSmsReadCount();
    const smsMessages = await readRecentSms(limit);
    
    if (smsMessages.length === 0) {
      return {
        success: true,
        processedCount: 0,
        skippedCount: 0,
        errorCount: 0,
      };
    }
    
    // Process each SMS
    let processedCount = 0;
    let skippedCount = 0;
    const errors: string[] = [];
    
    for (const sms of smsMessages) {
      try {
        const transactionId = await processSmsMessage(sms, options);
        if (transactionId) {
          processedCount++;
        } else {
          skippedCount++;
        }
      } catch (error) {
        errors.push(`Failed to process SMS ${sms.id}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    
    return {
      success: true,
      processedCount,
      skippedCount,
      errorCount: errors.length,
      errors: errors.length > 0 ? errors : undefined,
    };
  } catch (error) {
    return {
      success: false,
      processedCount: 0,
      skippedCount: 0,
      errorCount: 1,
      errors: [error instanceof Error ? error.message : String(error)],
    };
  }
}

/**
 * Process SMS messages since a specific timestamp
 * Useful for periodic background processing
 */
export async function processSmsSince(
  sinceTimestamp: number,
  options: AutoTransactionOptions = {}
): Promise<AutoTransactionResult> {
  return autoDetectTransactions({
    ...options,
    sinceTimestamp,
  });
}

/**
 * Process SMS from a specific bank sender
 */
export async function processSmsFromBank(
  senderId: string,
  options: AutoTransactionOptions = {}
): Promise<AutoTransactionResult> {
  return autoDetectTransactions({
    ...options,
    senderId,
  });
}
