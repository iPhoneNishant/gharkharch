/**
 * Firebase Cloud Functions for Gharkharch
 * 
 * DOUBLE-ENTRY ACCOUNTING RULES:
 * - Every transaction has exactly ONE debit account and ONE credit account
 * - Income and Expense accounts NEVER store balances
 * - Asset and Liability accounts ALWAYS store balances
 * 
 * Balance updates:
 * - Asset accounts: Debit increases balance, Credit decreases balance
 * - Liability accounts: Credit increases balance, Debit decreases balance
 * - Income/Expense accounts: No balance updates (they're just categories)
 */

import * as admin from 'firebase-admin';
import { onCall, HttpsError, CallableRequest } from 'firebase-functions/v2/https';

// Initialize Firebase Admin
admin.initializeApp();

const db = admin.firestore();

// Types
type AccountType = 'asset' | 'liability' | 'income' | 'expense';

interface Account {
  id: string;
  name: string;
  accountType: AccountType;
  parentCategory: string;
  subCategory: string;
  openingBalance?: number;
  currentBalance?: number;
  userId: string;
  createdAt: admin.firestore.Timestamp;
  updatedAt: admin.firestore.Timestamp;
  isActive: boolean;
  icon?: string;
  color?: string;
}

interface Transaction {
  id: string;
  date: admin.firestore.Timestamp;
  amount: number;
  debitAccountId: string;
  creditAccountId: string;
  note?: string;
  userId: string;
  createdAt: admin.firestore.Timestamp;
  updatedAt: admin.firestore.Timestamp;
  tags?: string[];
}

interface CreateAccountRequest {
  name: string;
  accountType: AccountType;
  parentCategory: string;
  subCategory: string;
  openingBalance?: number;
  icon?: string;
  color?: string;
}

interface UpdateAccountRequest {
  accountId: string;
  name?: string;
  icon?: string;
  color?: string;
  isActive?: boolean;
}

interface CreateTransactionRequest {
  date: string;
  amount: number;
  debitAccountId: string;
  creditAccountId: string;
  note?: string;
  tags?: string[];
}

interface UpdateTransactionRequest {
  transactionId: string;
  date?: string;
  amount?: number;
  debitAccountId?: string;
  creditAccountId?: string;
  note?: string;
  tags?: string[];
}

// Helper functions

/**
 * Check if an account type stores a balance
 */
function hasBalance(accountType: AccountType): boolean {
  return accountType === 'asset' || accountType === 'liability';
}

/**
 * Calculate balance change for an account based on debit/credit
 * 
 * ACCOUNTING RULES:
 * - Asset accounts: Debit (+), Credit (-)
 * - Liability accounts: Debit (-), Credit (+)
 */
function calculateBalanceChange(
  accountType: AccountType,
  amount: number,
  isDebit: boolean
): number {
  if (!hasBalance(accountType)) {
    return 0;
  }

  if (accountType === 'asset') {
    return isDebit ? amount : -amount;
  } else {
    // Liability
    return isDebit ? -amount : amount;
  }
}

/**
 * Verify the user is authenticated
 * Note: This is now handled inline in each function for React Native compatibility
 * @deprecated Use manual token verification instead
 */
// function requireAuth(request: CallableRequest): string {
//   if (!request.auth) {
//     throw new HttpsError('unauthenticated', 'User must be authenticated');
//   }
//   return request.auth.uid;
// }

/**
 * Validate account type
 */
function validateAccountType(type: string): AccountType {
  const validTypes: AccountType[] = ['asset', 'liability', 'income', 'expense'];
  if (!validTypes.includes(type as AccountType)) {
    throw new HttpsError('invalid-argument', `Invalid account type: ${type}`);
  }
  return type as AccountType;
}

// Cloud Functions

/**
 * Create a new account
 * 
 * Note: Cloud Functions v2 callable functions automatically handle authentication
 * The auth token is passed from the client and available in request.auth
 */
export const createAccount = onCall(
  {
    // Ensure CORS is enabled
    cors: true,
    // Temporarily allow unauthenticated calls as workaround for React Native
    // We'll verify the token manually from the request data
    enforceAppCheck: false,
  },
  async (request: CallableRequest<CreateAccountRequest & { idToken?: string }>) => {
    // Workaround for React Native: manually verify token if passed in data
    let userId: string;
    if (request.auth) {
      // Normal path: auth token was passed correctly
      userId = request.auth.uid;
    } else if (request.data.idToken) {
      // React Native workaround: verify token manually
      try {
        const decodedToken = await admin.auth().verifyIdToken(request.data.idToken);
        userId = decodedToken.uid;
      } catch (error) {
        throw new HttpsError('unauthenticated', 'Invalid authentication token');
      }
    } else {
      throw new HttpsError('unauthenticated', 'User must be authenticated');
    }
    
    // Remove idToken from data before processing (it was only for auth verification)
    const { idToken, ...data } = request.data;

  // Validate required fields
  if (!data.name?.trim()) {
    throw new HttpsError('invalid-argument', 'Account name is required');
  }
  if (!data.parentCategory?.trim()) {
    throw new HttpsError('invalid-argument', 'Parent category is required');
  }
  if (!data.subCategory?.trim()) {
    throw new HttpsError('invalid-argument', 'Sub-category is required');
  }

  const accountType = validateAccountType(data.accountType);

  // Validate opening balance for asset/liability accounts
  let openingBalance: number | undefined;
  if (hasBalance(accountType)) {
    openingBalance = data.openingBalance ?? 0;
    if (openingBalance < 0) {
      throw new HttpsError('invalid-argument', 'Opening balance cannot be negative');
    }
  }

  // Check for duplicate account name (case-insensitive) for the same user
  const trimmedName = data.name.trim();
  const existingAccountsQuery = await db.collection('accounts')
    .where('userId', '==', userId)
    .where('isActive', '==', true)
    .get();
  
  // Firestore doesn't support case-insensitive queries, so we filter in memory
  const duplicateAccount = existingAccountsQuery.docs.find(doc => {
    const accountData = doc.data() as Account;
    return accountData.name.trim().toLowerCase() === trimmedName.toLowerCase();
  });

  if (duplicateAccount) {
    const duplicateName = (duplicateAccount.data() as Account).name;
    throw new HttpsError('already-exists', `An account with the name "${duplicateName}" already exists. Please use a different name.`);
  }

  // Create the account
  const accountRef = db.collection('accounts').doc();
  const now = admin.firestore.Timestamp.now();

  // Build account object, only including defined values (Firestore doesn't allow undefined)
  const account: any = {
    name: data.name.trim(),
    accountType,
    parentCategory: data.parentCategory.trim(),
    subCategory: data.subCategory.trim(),
    userId,
    createdAt: now,
    updatedAt: now,
    isActive: true,
  };

  // Only include balance fields for asset/liability accounts (Firestore doesn't allow undefined)
  if (hasBalance(accountType)) {
    account.openingBalance = openingBalance ?? 0;
    account.currentBalance = openingBalance ?? 0;
  }

  // Only add optional fields if they're defined
  if (data.icon && data.icon.trim() !== '') {
    account.icon = data.icon.trim();
  }
  if (data.color && data.color.trim() !== '') {
    account.color = data.color.trim();
  }

  await accountRef.set(account);

  return {
    success: true,
    data: { accountId: accountRef.id },
  };
});

/**
 * Update an existing account
 * Note: Cannot change account type or categories after creation
 */
export const updateAccount = onCall(
  {
    cors: true,
    enforceAppCheck: false,
  },
  async (request: CallableRequest<UpdateAccountRequest & { idToken?: string }>) => {
    // Workaround for React Native: manually verify token if passed in data
    let userId: string;
    if (request.auth) {
      userId = request.auth.uid;
    } else if (request.data.idToken) {
      try {
        const decodedToken = await admin.auth().verifyIdToken(request.data.idToken);
        userId = decodedToken.uid;
      } catch (error) {
        throw new HttpsError('unauthenticated', 'Invalid authentication token');
      }
    } else {
      throw new HttpsError('unauthenticated', 'User must be authenticated');
    }
    
    // Remove idToken from data (idToken was only for auth verification)
    const { idToken: _, ...data } = request.data;

  if (!data.accountId) {
    throw new HttpsError('invalid-argument', 'Account ID is required');
  }

  // Get the account
  const accountRef = db.collection('accounts').doc(data.accountId);
  const accountDoc = await accountRef.get();

  if (!accountDoc.exists) {
    throw new HttpsError('not-found', 'Account not found');
  }

  const account = accountDoc.data() as Account;

  // Verify ownership
  if (account.userId !== userId) {
    throw new HttpsError('permission-denied', 'You do not own this account');
  }

  // Build update object
  const updates: Partial<Account> = {
    updatedAt: admin.firestore.Timestamp.now(),
  };

  if (data.name !== undefined) {
    if (!data.name.trim()) {
      throw new HttpsError('invalid-argument', 'Account name cannot be empty');
    }
    updates.name = data.name.trim();
  }

  // Only include icon/color if they have values (not undefined or empty)
  if (data.icon !== undefined && data.icon !== null && data.icon !== '') {
    updates.icon = data.icon;
  }

  if (data.color !== undefined && data.color !== null && data.color !== '') {
    updates.color = data.color;
  }

  if (data.isActive !== undefined) {
    updates.isActive = data.isActive;
  }

  await accountRef.update(updates);

  return { success: true };
});

/**
 * Delete (deactivate) an account
 * Accounts are soft-deleted to preserve transaction history
 */
export const deleteAccount = onCall(
  {
    cors: true,
    enforceAppCheck: false,
  },
  async (request: CallableRequest<{ accountId: string; idToken?: string }>) => {
    // Workaround for React Native: manually verify token if passed in data
    let userId: string;
    if (request.auth) {
      userId = request.auth.uid;
    } else if (request.data.idToken) {
      try {
        const decodedToken = await admin.auth().verifyIdToken(request.data.idToken);
        userId = decodedToken.uid;
      } catch (error) {
        throw new HttpsError('unauthenticated', 'Invalid authentication token');
      }
    } else {
      throw new HttpsError('unauthenticated', 'User must be authenticated');
    }
    
    const { idToken: _, accountId } = request.data;

  if (!accountId) {
    throw new HttpsError('invalid-argument', 'Account ID is required');
  }

  // Get the account
  const accountRef = db.collection('accounts').doc(accountId);
  const accountDoc = await accountRef.get();

  if (!accountDoc.exists) {
    throw new HttpsError('not-found', 'Account not found');
  }

  const account = accountDoc.data() as Account;

  // Verify ownership
  if (account.userId !== userId) {
    throw new HttpsError('permission-denied', 'You do not own this account');
  }

  // Soft delete
  await accountRef.update({
    isActive: false,
    updatedAt: admin.firestore.Timestamp.now(),
  });

  return { success: true };
});

/**
 * Create a new transaction
 * 
 * DOUBLE-ENTRY RULE:
 * - Validates both accounts exist and belong to user
 * - Updates balances for asset/liability accounts
 */
export const createTransaction = onCall(
  {
    cors: true,
    enforceAppCheck: false,
  },
  async (request: CallableRequest<CreateTransactionRequest & { idToken?: string }>) => {
    // Workaround for React Native: manually verify token if passed in data
    let userId: string;
    if (request.auth) {
      userId = request.auth.uid;
    } else if (request.data.idToken) {
      try {
        const decodedToken = await admin.auth().verifyIdToken(request.data.idToken);
        userId = decodedToken.uid;
      } catch (error) {
        throw new HttpsError('unauthenticated', 'Invalid authentication token');
      }
    } else {
      throw new HttpsError('unauthenticated', 'User must be authenticated');
    }
    
    // Remove idToken from data (idToken was only for auth verification)
    const { idToken: _, ...data } = request.data;

  // Validate required fields
  if (!data.date) {
    throw new HttpsError('invalid-argument', 'Transaction date is required');
  }
  if (!data.amount || data.amount <= 0) {
    throw new HttpsError('invalid-argument', 'Amount must be a positive number');
  }
  if (!data.debitAccountId) {
    throw new HttpsError('invalid-argument', 'Debit account is required');
  }
  if (!data.creditAccountId) {
    throw new HttpsError('invalid-argument', 'Credit account is required');
  }
  if (data.debitAccountId === data.creditAccountId) {
    throw new HttpsError('invalid-argument', 'Debit and credit accounts must be different');
  }

  // Parse and validate date
  if (!data.date || data.date.trim() === '') {
    throw new HttpsError('invalid-argument', 'Transaction date is required');
  }
  const transactionDate = new Date(data.date);
  if (isNaN(transactionDate.getTime())) {
    throw new HttpsError('invalid-argument', 'Invalid date format');
  }
  // Allow dates up to 1 year in the future for planned transactions
  const maxDate = new Date();
  maxDate.setFullYear(maxDate.getFullYear() + 1);
  if (transactionDate > maxDate) {
    throw new HttpsError('invalid-argument', 'Transaction date cannot be more than 1 year in the future');
  }

  // Get both accounts
  const [debitAccountDoc, creditAccountDoc] = await Promise.all([
    db.collection('accounts').doc(data.debitAccountId).get(),
    db.collection('accounts').doc(data.creditAccountId).get(),
  ]);

  if (!debitAccountDoc.exists) {
    throw new HttpsError('not-found', 'Debit account not found');
  }
  if (!creditAccountDoc.exists) {
    throw new HttpsError('not-found', 'Credit account not found');
  }

  const debitAccount = debitAccountDoc.data() as Account;
  const creditAccount = creditAccountDoc.data() as Account;

  // Verify ownership
  if (debitAccount.userId !== userId) {
    throw new HttpsError('permission-denied', 'You do not own the debit account');
  }
  if (creditAccount.userId !== userId) {
    throw new HttpsError('permission-denied', 'You do not own the credit account');
  }

  // Verify accounts are active
  if (!debitAccount.isActive) {
    throw new HttpsError('failed-precondition', 'Debit account is inactive');
  }
  if (!creditAccount.isActive) {
    throw new HttpsError('failed-precondition', 'Credit account is inactive');
  }

  // Calculate balance changes
  const debitBalanceChange = calculateBalanceChange(debitAccount.accountType, data.amount, true);
  const creditBalanceChange = calculateBalanceChange(creditAccount.accountType, data.amount, false);

  // Create transaction and update balances in a batch
  const batch = db.batch();
  const now = admin.firestore.Timestamp.now();

  // Create transaction (only include defined values)
  const transactionRef = db.collection('transactions').doc();
  const transaction: any = {
    date: admin.firestore.Timestamp.fromDate(transactionDate),
    amount: data.amount,
    debitAccountId: data.debitAccountId,
    creditAccountId: data.creditAccountId,
    userId,
    createdAt: now,
    updatedAt: now,
  };
  
  // Only add optional fields if they're defined
  if (data.note?.trim()) {
    transaction.note = data.note.trim();
  }
  if (data.tags && data.tags.length > 0) {
    transaction.tags = data.tags;
  }
  
  batch.set(transactionRef, transaction);

  // Update debit account balance (if applicable)
  if (debitBalanceChange !== 0) {
    batch.update(db.collection('accounts').doc(data.debitAccountId), {
      currentBalance: admin.firestore.FieldValue.increment(debitBalanceChange),
      updatedAt: now,
    });
  }

  // Update credit account balance (if applicable)
  if (creditBalanceChange !== 0) {
    batch.update(db.collection('accounts').doc(data.creditAccountId), {
      currentBalance: admin.firestore.FieldValue.increment(creditBalanceChange),
      updatedAt: now,
    });
  }

  await batch.commit();

  return {
    success: true,
    data: { transactionId: transactionRef.id },
  };
});

/**
 * Update an existing transaction
 * 
 * This is complex because we need to:
 * 1. Reverse the original transaction's balance effects
 * 2. Apply the new transaction's balance effects
 */
export const updateTransaction = onCall(
  {
    cors: true,
    enforceAppCheck: false,
  },
  async (request: CallableRequest<UpdateTransactionRequest & { idToken?: string }>) => {
    // Workaround for React Native: manually verify token if passed in data
    let userId: string;
    if (request.auth) {
      userId = request.auth.uid;
    } else if (request.data.idToken) {
      try {
        const decodedToken = await admin.auth().verifyIdToken(request.data.idToken);
        userId = decodedToken.uid;
      } catch (error) {
        throw new HttpsError('unauthenticated', 'Invalid authentication token');
      }
    } else {
      throw new HttpsError('unauthenticated', 'User must be authenticated');
    }
    
    // Remove idToken from data (idToken was only for auth verification)
    const { idToken: _, ...data } = request.data;

  if (!data.transactionId) {
    throw new HttpsError('invalid-argument', 'Transaction ID is required');
  }

  // Get the existing transaction
  const transactionRef = db.collection('transactions').doc(data.transactionId);
  const transactionDoc = await transactionRef.get();

  if (!transactionDoc.exists) {
    throw new HttpsError('not-found', 'Transaction not found');
  }

  const existingTransaction = transactionDoc.data() as Transaction;

  // Verify ownership
  if (existingTransaction.userId !== userId) {
    throw new HttpsError('permission-denied', 'You do not own this transaction');
  }

  // Determine new values
  const newDebitAccountId = data.debitAccountId ?? existingTransaction.debitAccountId;
  const newCreditAccountId = data.creditAccountId ?? existingTransaction.creditAccountId;
  const newAmount = data.amount ?? existingTransaction.amount;

  if (newDebitAccountId === newCreditAccountId) {
    throw new HttpsError('invalid-argument', 'Debit and credit accounts must be different');
  }

  if (newAmount <= 0) {
    throw new HttpsError('invalid-argument', 'Amount must be a positive number');
  }

  // Get all involved accounts (old and new)
  const accountIds = new Set([
    existingTransaction.debitAccountId,
    existingTransaction.creditAccountId,
    newDebitAccountId,
    newCreditAccountId,
  ]);

  const accountDocs = await Promise.all(
    Array.from(accountIds).map(id => db.collection('accounts').doc(id).get())
  );

  const accounts = new Map<string, Account>();
  for (const doc of accountDocs) {
    if (!doc.exists) {
      throw new HttpsError('not-found', `Account ${doc.id} not found`);
    }
    const account = doc.data() as Account;
    if (account.userId !== userId) {
      throw new HttpsError('permission-denied', `You do not own account ${doc.id}`);
    }
    accounts.set(doc.id, account);
  }

  // Calculate balance adjustments
  const balanceAdjustments = new Map<string, number>();

  // Reverse old transaction effects
  const oldDebitAccount = accounts.get(existingTransaction.debitAccountId)!;
  const oldCreditAccount = accounts.get(existingTransaction.creditAccountId)!;
  
  const oldDebitReversal = -calculateBalanceChange(oldDebitAccount.accountType, existingTransaction.amount, true);
  const oldCreditReversal = -calculateBalanceChange(oldCreditAccount.accountType, existingTransaction.amount, false);

  if (oldDebitReversal !== 0) {
    balanceAdjustments.set(
      existingTransaction.debitAccountId,
      (balanceAdjustments.get(existingTransaction.debitAccountId) ?? 0) + oldDebitReversal
    );
  }
  if (oldCreditReversal !== 0) {
    balanceAdjustments.set(
      existingTransaction.creditAccountId,
      (balanceAdjustments.get(existingTransaction.creditAccountId) ?? 0) + oldCreditReversal
    );
  }

  // Apply new transaction effects
  const newDebitAccount = accounts.get(newDebitAccountId)!;
  const newCreditAccount = accounts.get(newCreditAccountId)!;

  const newDebitChange = calculateBalanceChange(newDebitAccount.accountType, newAmount, true);
  const newCreditChange = calculateBalanceChange(newCreditAccount.accountType, newAmount, false);

  if (newDebitChange !== 0) {
    balanceAdjustments.set(
      newDebitAccountId,
      (balanceAdjustments.get(newDebitAccountId) ?? 0) + newDebitChange
    );
  }
  if (newCreditChange !== 0) {
    balanceAdjustments.set(
      newCreditAccountId,
      (balanceAdjustments.get(newCreditAccountId) ?? 0) + newCreditChange
    );
  }

  // Build batch update
  const batch = db.batch();
  const now = admin.firestore.Timestamp.now();

  // Update transaction
  const transactionUpdates: Partial<Transaction> = {
    debitAccountId: newDebitAccountId,
    creditAccountId: newCreditAccountId,
    amount: newAmount,
    updatedAt: now,
  };

  // Handle date update - allow date changes when editing
  if (data.date !== undefined) {
    if (data.date === null || data.date === '') {
      throw new HttpsError('invalid-argument', 'Transaction date is required');
    }
    const newDate = new Date(data.date);
    if (isNaN(newDate.getTime())) {
      throw new HttpsError('invalid-argument', 'Invalid date format');
    }
    // Allow dates up to 1 year in the future for planned transactions
    const maxDate = new Date();
    maxDate.setFullYear(maxDate.getFullYear() + 1);
    if (newDate > maxDate) {
      throw new HttpsError('invalid-argument', 'Transaction date cannot be more than 1 year in the future');
    }
    transactionUpdates.date = admin.firestore.Timestamp.fromDate(newDate);
  }

  // Handle note update - allow clearing note by passing empty string or null
  if (data.note !== undefined) {
    if (data.note === null || (typeof data.note === 'string' && data.note.trim() === '')) {
      // Set to null to clear the note field (Firestore allows null)
      transactionUpdates.note = null as any;
    } else {
      transactionUpdates.note = data.note.trim();
    }
  }

  if (data.tags !== undefined && data.tags !== null && data.tags.length > 0) {
    transactionUpdates.tags = data.tags;
  }

  batch.update(transactionRef, transactionUpdates);

  // Update account balances
  for (const [accountId, adjustment] of balanceAdjustments) {
    if (adjustment !== 0) {
      batch.update(db.collection('accounts').doc(accountId), {
        currentBalance: admin.firestore.FieldValue.increment(adjustment),
        updatedAt: now,
      });
    }
  }

  await batch.commit();

  return { success: true };
});

/**
 * Delete a transaction
 * 
 * Reverses the balance effects on accounts
 */
export const deleteTransaction = onCall(
  {
    cors: true,
    enforceAppCheck: false,
  },
  async (request: CallableRequest<{ transactionId: string; idToken?: string }>) => {
    // Workaround for React Native: manually verify token if passed in data
    let userId: string;
    if (request.auth) {
      userId = request.auth.uid;
    } else if (request.data.idToken) {
      try {
        const decodedToken = await admin.auth().verifyIdToken(request.data.idToken);
        userId = decodedToken.uid;
      } catch (error) {
        throw new HttpsError('unauthenticated', 'Invalid authentication token');
      }
    } else {
      throw new HttpsError('unauthenticated', 'User must be authenticated');
    }
    
    const { idToken: _, transactionId } = request.data;

  if (!transactionId) {
    throw new HttpsError('invalid-argument', 'Transaction ID is required');
  }

  // Get the transaction
  const transactionRef = db.collection('transactions').doc(transactionId);
  const transactionDoc = await transactionRef.get();

  if (!transactionDoc.exists) {
    throw new HttpsError('not-found', 'Transaction not found');
  }

  const transaction = transactionDoc.data() as Transaction;

  // Verify ownership
  if (transaction.userId !== userId) {
    throw new HttpsError('permission-denied', 'You do not own this transaction');
  }

  // Get both accounts
  const [debitAccountDoc, creditAccountDoc] = await Promise.all([
    db.collection('accounts').doc(transaction.debitAccountId).get(),
    db.collection('accounts').doc(transaction.creditAccountId).get(),
  ]);

  const debitAccount = debitAccountDoc.exists ? debitAccountDoc.data() as Account : null;
  const creditAccount = creditAccountDoc.exists ? creditAccountDoc.data() as Account : null;

  // Calculate balance reversals
  const batch = db.batch();
  const now = admin.firestore.Timestamp.now();

  // Delete transaction
  batch.delete(transactionRef);

  // Reverse debit account balance
  if (debitAccount && hasBalance(debitAccount.accountType)) {
    const reversal = -calculateBalanceChange(debitAccount.accountType, transaction.amount, true);
    batch.update(db.collection('accounts').doc(transaction.debitAccountId), {
      currentBalance: admin.firestore.FieldValue.increment(reversal),
      updatedAt: now,
    });
  }

  // Reverse credit account balance
  if (creditAccount && hasBalance(creditAccount.accountType)) {
    const reversal = -calculateBalanceChange(creditAccount.accountType, transaction.amount, false);
    batch.update(db.collection('accounts').doc(transaction.creditAccountId), {
      currentBalance: admin.firestore.FieldValue.increment(reversal),
      updatedAt: now,
    });
  }

  await batch.commit();

  return { success: true };
});
