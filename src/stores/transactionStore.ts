/**
 * Transaction Store using Zustand
 * Manages transaction data with Firestore read-only access
 * 
 * DOUBLE-ENTRY ACCOUNTING RULES:
 * - Every transaction has exactly ONE debit account and ONE credit account
 * - Debit account receives value, Credit account gives value
 * - Amount is always positive
 * - All writes go through Cloud Functions
 */

import { create } from 'zustand';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot,
  limit,
  Unsubscribe,
  Timestamp,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { firestore, cloudFunctions, firebaseAuth } from '../config/firebase';
import { 
  Transaction, 
  CreateTransactionRequest, 
  UpdateTransactionRequest,
  CloudFunctionResponse,
} from '../types';
import { COLLECTIONS } from '../config/constants';

interface TransactionState {
  transactions: Transaction[];
  isLoading: boolean;
  error: string | null;
  
  // Computed getters
  getTransactionById: (id: string) => Transaction | undefined;
  getTransactionsByAccount: (accountId: string) => Transaction[];
  getRecentTransactions: (count: number) => Transaction[];
  
  // Actions
  subscribeToTransactions: (userId: string, maxResults?: number) => Unsubscribe;
  createTransaction: (data: CreateTransactionRequest) => Promise<string>;
  updateTransaction: (data: UpdateTransactionRequest) => Promise<void>;
  deleteTransaction: (transactionId: string) => Promise<void>;
  clearError: () => void;
}

/**
 * Convert Firestore document to Transaction
 */
const docToTransaction = (docData: Record<string, unknown>, id: string): Transaction => ({
  id,
  date: (docData.date as Timestamp)?.toDate() ?? new Date(),
  amount: docData.amount as number,
  debitAccountId: docData.debitAccountId as string,
  creditAccountId: docData.creditAccountId as string,
  note: docData.note as string | undefined,
  userId: docData.userId as string,
  createdAt: (docData.createdAt as Timestamp)?.toDate() ?? new Date(),
  updatedAt: (docData.updatedAt as Timestamp)?.toDate() ?? new Date(),
  tags: docData.tags as string[] | undefined,
});

export const useTransactionStore = create<TransactionState>((set, get) => ({
  transactions: [],
  isLoading: true,
  error: null,

  // Computed getters
  getTransactionById: (id: string) => {
    return get().transactions.find(txn => txn.id === id);
  },

  /**
   * Get all transactions involving a specific account
   * (either as debit or credit account)
   */
  getTransactionsByAccount: (accountId: string) => {
    return get().transactions.filter(
      txn => txn.debitAccountId === accountId || txn.creditAccountId === accountId
    );
  },

  /**
   * Get most recent transactions
   */
  getRecentTransactions: (count: number) => {
    return get().transactions.slice(0, count);
  },

  /**
   * Subscribe to real-time transaction updates from Firestore
   * Returns unsubscribe function for cleanup
   */
  subscribeToTransactions: (userId: string, maxResults: number = 100) => {
    set({ isLoading: true, error: null });

    const transactionsRef = collection(firestore, COLLECTIONS.TRANSACTIONS);
    const transactionsQuery = query(
      transactionsRef,
      where('userId', '==', userId),
      orderBy('date', 'desc'),
      limit(maxResults)
    );

    const unsubscribe = onSnapshot(
      transactionsQuery,
      (snapshot) => {
        const transactions: Transaction[] = [];
        snapshot.forEach((doc) => {
          transactions.push(docToTransaction(doc.data() as Record<string, unknown>, doc.id));
        });
        set({ transactions, isLoading: false, error: null });
      },
      (error) => {
        // Import error helper
        import('../config/firebase').then(({ isTransientFirestoreError }) => {
          if (isTransientFirestoreError(error)) {
            // Transient errors are auto-retried by Firestore, just log for debugging
            console.warn('Transient Firestore connection error (will retry):', error.message || error);
            // Don't update error state for transient errors
            return;
          }
          
          // For non-transient errors, provide specific error messages
          console.error('Error subscribing to transactions:', error);
          
          let errorMessage = 'Failed to load transactions';
          
          if (error.code === 'failed-precondition') {
            errorMessage = 'Database index missing. Please deploy Firestore indexes.';
          } else if (error.code === 'permission-denied') {
            errorMessage = 'Permission denied. Please check Firestore security rules.';
          } else if (error.code === 'unavailable') {
            errorMessage = 'Firestore is unavailable. Please check your connection.';
          } else if (error.message) {
            errorMessage = error.message;
          }
          
          set({ isLoading: false, error: errorMessage });
        }).catch(() => {
          // Fallback if import fails
          console.error('Error subscribing to transactions:', error);
          set({ isLoading: false, error: 'Failed to load transactions' });
        });
      }
    );

    return unsubscribe;
  },

  /**
   * Create a new transaction via Cloud Function
   * 
   * DOUBLE-ENTRY RULE:
   * The backend will:
   * 1. Validate debit and credit accounts exist
   * 2. Update balances for asset/liability accounts
   * 3. Record the transaction
   */
  createTransaction: async (data: CreateTransactionRequest) => {
    set({ error: null });

    try {
      const currentUser = firebaseAuth.currentUser;
      if (!currentUser) {
        throw new Error('You must be signed in to create a transaction');
      }

      const idToken = await currentUser.getIdToken(true);
      const { getFunctions } = await import('firebase/functions');
      const functionsWithAuth = getFunctions(firebaseAuth.app);
      
      const createTransactionFn = httpsCallable<
        CreateTransactionRequest & { idToken?: string }, 
        CloudFunctionResponse<{ transactionId: string }>
      >(
        functionsWithAuth, 
        'createTransaction'
      );
      
      const result = await createTransactionFn({ ...data, idToken });
      
      if (!result.data.success || !result.data.data) {
        throw new Error(result.data.error ?? 'Failed to create transaction');
      }
      
      return result.data.data.transactionId;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create transaction';
      set({ error: errorMessage });
      throw error;
    }
  },

  /**
   * Update an existing transaction via Cloud Function
   * 
   * The backend will:
   * 1. Reverse the original transaction's balance effects
   * 2. Apply the new transaction's balance effects
   * 3. Update the transaction record
   */
  updateTransaction: async (data: UpdateTransactionRequest) => {
    set({ error: null });

    try {
      const currentUser = firebaseAuth.currentUser;
      if (!currentUser) {
        throw new Error('You must be signed in to update a transaction');
      }

      const idToken = await currentUser.getIdToken(true);
      const { getFunctions } = await import('firebase/functions');
      const functionsWithAuth = getFunctions(firebaseAuth.app);
      
      const updateTransactionFn = httpsCallable<UpdateTransactionRequest & { idToken?: string }, CloudFunctionResponse>(
        functionsWithAuth, 
        'updateTransaction'
      );
      
      const result = await updateTransactionFn({ ...data, idToken });
      
      if (!result.data.success) {
        throw new Error(result.data.error ?? 'Failed to update transaction');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update transaction';
      set({ error: errorMessage });
      throw error;
    }
  },

  /**
   * Delete a transaction via Cloud Function
   * 
   * The backend will:
   * 1. Reverse the transaction's balance effects on accounts
   * 2. Delete the transaction record
   */
  deleteTransaction: async (transactionId: string) => {
    set({ error: null });

    try {
      const currentUser = firebaseAuth.currentUser;
      if (!currentUser) {
        throw new Error('You must be signed in to delete a transaction');
      }

      const idToken = await currentUser.getIdToken(true);
      const { getFunctions } = await import('firebase/functions');
      const functionsWithAuth = getFunctions(firebaseAuth.app);
      
      const deleteTransactionFn = httpsCallable<{ transactionId: string; idToken?: string }, CloudFunctionResponse>(
        functionsWithAuth, 
        'deleteTransaction'
      );
      
      const result = await deleteTransactionFn({ transactionId, idToken });
      
      if (!result.data.success) {
        throw new Error(result.data.error ?? 'Failed to delete transaction');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete transaction';
      set({ error: errorMessage });
      throw error;
    }
  },

  /**
   * Clear error state
   */
  clearError: () => {
    set({ error: null });
  },
}));
