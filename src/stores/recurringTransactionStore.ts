/**
 * Recurring Transaction Store using Zustand
 * Manages recurring transaction templates with Firestore read-only access
 * All writes go through Cloud Functions
 */

import { create } from 'zustand';
import { 
  collection, 
  doc,
  getDoc,
  query, 
  where, 
  orderBy, 
  onSnapshot,
  Unsubscribe,
  Timestamp,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { firestore, cloudFunctions, firebaseAuth } from '../config/firebase';
import { 
  RecurringTransaction, 
  CreateRecurringTransactionRequest, 
  UpdateRecurringTransactionRequest,
  CloudFunctionResponse,
} from '../types';
import { COLLECTIONS } from '../config/constants';

interface RecurringTransactionState {
  recurringTransactions: RecurringTransaction[];
  isLoading: boolean;
  error: string | null;
  
  // Computed getters
  getRecurringTransactionById: (id: string) => RecurringTransaction | undefined;
  getActiveRecurringTransactions: () => RecurringTransaction[];
  fetchRecurringTransactionById: (id: string) => Promise<RecurringTransaction | null>;
  
  // Actions
  subscribeToRecurringTransactions: (userId: string) => Unsubscribe;
  createRecurringTransaction: (data: CreateRecurringTransactionRequest) => Promise<string>;
  updateRecurringTransaction: (data: UpdateRecurringTransactionRequest) => Promise<void>;
  deleteRecurringTransaction: (recurringTransactionId: string) => Promise<void>;
  clearError: () => void;
}

/**
 * Convert Firestore document to RecurringTransaction
 */
const docToRecurringTransaction = (docData: Record<string, unknown>, id: string): RecurringTransaction => ({
  id,
  amount: docData.amount as number,
  debitAccountId: docData.debitAccountId as string,
  creditAccountId: docData.creditAccountId as string,
  note: docData.note as string | undefined,
  frequency: docData.frequency as RecurringTransaction['frequency'],
  dayOfRecurrence: docData.dayOfRecurrence as number,
  startDate: (docData.startDate as Timestamp)?.toDate() ?? new Date(),
  endDate: (docData.endDate as Timestamp)?.toDate() ?? undefined,
  nextOccurrence: (docData.nextOccurrence as Timestamp)?.toDate() ?? new Date(),
  isActive: (docData.isActive as boolean) ?? true,
  userId: docData.userId as string,
  createdAt: (docData.createdAt as Timestamp)?.toDate() ?? new Date(),
  updatedAt: (docData.updatedAt as Timestamp)?.toDate() ?? new Date(),
  notifyBeforeDays: docData.notifyBeforeDays as number | undefined,
  lastCreatedDate: (docData.lastCreatedDate as Timestamp)?.toDate() ?? undefined,
});

export const useRecurringTransactionStore = create<RecurringTransactionState>((set, get) => ({
  recurringTransactions: [],
  isLoading: true,
  error: null,

  // Computed getters
  getRecurringTransactionById: (id: string) => {
    return get().recurringTransactions.find(rt => rt.id === id);
  },

  getActiveRecurringTransactions: () => {
    return get().recurringTransactions.filter(rt => rt.isActive);
  },

  fetchRecurringTransactionById: async (id: string) => {
    try {
      const ref = doc(firestore, COLLECTIONS.RECURRING_TRANSACTIONS, id);
      const snap = await getDoc(ref);
      if (!snap.exists()) return null;
      return docToRecurringTransaction(snap.data(), snap.id);
    } catch (error) {
      console.error('Error fetching recurring transaction:', error);
      return null;
    }
  },

  /**
   * Subscribe to real-time recurring transaction updates from Firestore
   */
  subscribeToRecurringTransactions: (userId: string) => {
    set({ isLoading: true });

    const q = query(
      collection(firestore, COLLECTIONS.RECURRING_TRANSACTIONS),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const recurringTransactions: RecurringTransaction[] = snapshot.docs.map(doc =>
          docToRecurringTransaction(doc.data(), doc.id)
        );

        set({
          recurringTransactions,
          isLoading: false,
          error: null,
        });
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
          
          // For non-transient errors, update the error state
          console.error('Error subscribing to recurring transactions:', error);
          set({
            isLoading: false,
            error: error.message || 'Failed to load recurring transactions',
          });
        }).catch(() => {
          // Fallback if import fails
          console.error('Error subscribing to recurring transactions:', error);
          set({
            isLoading: false,
            error: error.message || 'Failed to load recurring transactions',
          });
        });
      }
    );

    return unsubscribe;
  },

  /**
   * Create a new recurring transaction via Cloud Function
   */
  createRecurringTransaction: async (data: CreateRecurringTransactionRequest) => {
    set({ error: null });

    try {
      const currentUser = firebaseAuth.currentUser;
      if (!currentUser) {
        throw new Error('You must be signed in to create a recurring transaction');
      }

      const idToken = await currentUser.getIdToken(true);
      const { getFunctions } = await import('firebase/functions');
      const functionsWithAuth = getFunctions(firebaseAuth.app);
      
      const createRecurringTransactionFn = httpsCallable<
        CreateRecurringTransactionRequest & { idToken?: string }, 
        CloudFunctionResponse<{ recurringTransactionId: string }>
      >(
        functionsWithAuth, 
        'createRecurringTransaction'
      );
      
      const result = await createRecurringTransactionFn({ ...data, idToken });
      
      if (!result.data.success || !result.data.data) {
        throw new Error(result.data.error ?? 'Failed to create recurring transaction');
      }
      
      return result.data.data.recurringTransactionId;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create recurring transaction';
      set({ error: errorMessage });
      throw error;
    }
  },

  /**
   * Update an existing recurring transaction via Cloud Function
   */
  updateRecurringTransaction: async (data: UpdateRecurringTransactionRequest) => {
    set({ error: null });

    try {
      const currentUser = firebaseAuth.currentUser;
      if (!currentUser) {
        throw new Error('You must be signed in to update a recurring transaction');
      }

      const idToken = await currentUser.getIdToken(true);
      const { getFunctions } = await import('firebase/functions');
      const functionsWithAuth = getFunctions(firebaseAuth.app);
      
      const updateRecurringTransactionFn = httpsCallable<
        UpdateRecurringTransactionRequest & { idToken?: string }, 
        CloudFunctionResponse<void>
      >(
        functionsWithAuth, 
        'updateRecurringTransaction'
      );
      
      const result = await updateRecurringTransactionFn({ ...data, idToken });
      
      if (!result.data.success) {
        throw new Error(result.data.error ?? 'Failed to update recurring transaction');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update recurring transaction';
      set({ error: errorMessage });
      throw error;
    }
  },

  /**
   * Delete a recurring transaction via Cloud Function
   */
  deleteRecurringTransaction: async (recurringTransactionId: string) => {
    set({ error: null });

    try {
      const currentUser = firebaseAuth.currentUser;
      if (!currentUser) {
        throw new Error('You must be signed in to delete a recurring transaction');
      }

      const idToken = await currentUser.getIdToken(true);
      const { getFunctions } = await import('firebase/functions');
      const functionsWithAuth = getFunctions(firebaseAuth.app);
      
      const deleteRecurringTransactionFn = httpsCallable<
        { recurringTransactionId: string; idToken?: string }, 
        CloudFunctionResponse<void>
      >(
        functionsWithAuth, 
        'deleteRecurringTransaction'
      );
      
      const result = await deleteRecurringTransactionFn({ recurringTransactionId, idToken });
      
      if (!result.data.success) {
        throw new Error(result.data.error ?? 'Failed to delete recurring transaction');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete recurring transaction';
      set({ error: errorMessage });
      throw error;
    }
  },

  clearError: () => {
    set({ error: null });
  },
}));
