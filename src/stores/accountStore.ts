/**
 * Account Store using Zustand
 * Manages account data with Firestore read-only access
 * 
 * ACCOUNTING RULES:
 * - Asset and Liability accounts store currentBalance
 * - Income and Expense accounts NEVER store balances
 * - All writes go through Cloud Functions
 */

import { create } from 'zustand';
import { 
  collection, 
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
  Account, 
  AccountType, 
  CreateAccountRequest, 
  UpdateAccountRequest,
  CloudFunctionResponse,
} from '../types';
import { COLLECTIONS } from '../config/constants';

interface AccountState {
  accounts: Account[];
  isLoading: boolean;
  error: string | null;
  
  // Computed getters
  getAccountById: (id: string) => Account | undefined;
  getAccountsByType: (type: AccountType) => Account[];
  getAssetAccounts: () => Account[];
  getLiabilityAccounts: () => Account[];
  getIncomeAccounts: () => Account[];
  getExpenseAccounts: () => Account[];
  getTotalAssets: () => number;
  getTotalLiabilities: () => number;
  getNetWorth: () => number;
  
  // Actions
  subscribeToAccounts: (userId: string) => Unsubscribe;
  createAccount: (data: CreateAccountRequest) => Promise<string>;
  updateAccount: (data: UpdateAccountRequest) => Promise<void>;
  deleteAccount: (accountId: string) => Promise<void>;
  clearError: () => void;
}

/**
 * Convert Firestore document to Account
 */
const docToAccount = (docData: Record<string, unknown>, id: string): Account => ({
  id,
  name: docData.name as string,
  accountType: docData.accountType as AccountType,
  parentCategory: docData.parentCategory as string,
  subCategory: docData.subCategory as string,
  openingBalance: docData.openingBalance as number | undefined,
  currentBalance: docData.currentBalance as number | undefined,
  userId: docData.userId as string,
  createdAt: (docData.createdAt as Timestamp)?.toDate() ?? new Date(),
  updatedAt: (docData.updatedAt as Timestamp)?.toDate() ?? new Date(),
  isActive: (docData.isActive as boolean) ?? true,
  icon: docData.icon as string | undefined,
  color: docData.color as string | undefined,
});

export const useAccountStore = create<AccountState>((set, get) => ({
  accounts: [],
  isLoading: true,
  error: null,

  // Computed getters
  getAccountById: (id: string) => {
    return get().accounts.find(account => account.id === id);
  },

  getAccountsByType: (type: AccountType) => {
    return get().accounts.filter(account => account.accountType === type && account.isActive);
  },

  getAssetAccounts: () => {
    return get().getAccountsByType('asset');
  },

  getLiabilityAccounts: () => {
    return get().getAccountsByType('liability');
  },

  getIncomeAccounts: () => {
    return get().getAccountsByType('income');
  },

  getExpenseAccounts: () => {
    return get().getAccountsByType('expense');
  },

  /**
   * Calculate total assets (sum of all asset account balances)
   */
  getTotalAssets: () => {
    return get().getAssetAccounts().reduce((sum, account) => {
      return sum + (account.currentBalance ?? 0);
    }, 0);
  },

  /**
   * Calculate total liabilities (sum of all liability account balances)
   */
  getTotalLiabilities: () => {
    return get().getLiabilityAccounts().reduce((sum, account) => {
      return sum + (account.currentBalance ?? 0);
    }, 0);
  },

  /**
   * Calculate net worth (Assets - Liabilities)
   */
  getNetWorth: () => {
    return get().getTotalAssets() - get().getTotalLiabilities();
  },

  /**
   * Subscribe to real-time account updates from Firestore
   * Returns unsubscribe function for cleanup
   */
  subscribeToAccounts: (userId: string) => {
    set({ isLoading: true, error: null });

    const accountsRef = collection(firestore, COLLECTIONS.ACCOUNTS);
    const accountsQuery = query(
      accountsRef,
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      accountsQuery,
      (snapshot) => {
        const accounts: Account[] = [];
        snapshot.forEach((doc) => {
          accounts.push(docToAccount(doc.data() as Record<string, unknown>, doc.id));
        });
        set({ accounts, isLoading: false, error: null });
      },
      (error) => {
        console.error('Error subscribing to accounts:', error);
        set({ isLoading: false, error: 'Failed to load accounts' });
      }
    );

    return unsubscribe;
  },

  /**
   * Create a new account via Cloud Function
   * All validation happens on the backend
   */
  createAccount: async (data: CreateAccountRequest) => {
    set({ error: null });

    try {
      // Verify user is authenticated before calling function
      const currentUser = firebaseAuth.currentUser;
      if (!currentUser) {
        throw new Error('You must be signed in to create an account');
      }

      // Get the auth token to ensure it's available
      const idToken = await currentUser.getIdToken();
      if (!idToken) {
        throw new Error('Failed to get authentication token');
      }


      // In React Native, httpsCallable should automatically include auth token
      // But there's a known issue where it doesn't always work
      // Get a fresh functions instance to ensure auth context is linked
      const { getFunctions } = await import('firebase/functions');
      const functionsWithAuth = getFunctions(firebaseAuth.app);
      
      
      // Force token refresh to ensure we have a valid token
      const freshToken = await currentUser.getIdToken(true);
      
      // Workaround for React Native: pass token in data since httpsCallable isn't passing it
      const dataWithToken = {
        ...data,
        idToken: freshToken,
      };
      
      const createAccountFn = httpsCallable<CreateAccountRequest & { idToken?: string }, CloudFunctionResponse<{ accountId: string }>>(
        functionsWithAuth, 
        'createAccount'
      );
      
      let result;
      try {
        result = await createAccountFn(dataWithToken);
      } catch (callError: any) {
        console.error('Function call error details:', {
          code: callError?.code,
          message: callError?.message,
          details: callError?.details,
          stack: callError?.stack,
        });
        throw callError;
      }
      
      
      if (!result.data.success || !result.data.data) {
        const errorMsg = result.data.error ?? 'Failed to create account';
        console.error('Function returned error:', errorMsg);
        throw new Error(errorMsg);
      }
      
      return result.data.data.accountId;
    } catch (error: any) {
      console.error('Create account error:', error);
      
      // Provide more specific error messages
      let errorMessage = 'Failed to create account';
      
      if (error?.code === 'functions/not-found') {
        errorMessage = 'Cloud Function not found. Please deploy Cloud Functions.';
      } else if (error?.code === 'functions/unavailable') {
        errorMessage = 'Cloud Functions unavailable. Please check your connection.';
      } else if (error?.code === 'functions/internal' || error?.code === 'internal') {
        errorMessage = 'An internal error occurred. Please try again. If the problem persists, check that all required fields are filled correctly.';
      } else if (error?.code === 'functions/permission-denied' || error?.code === 'permission-denied') {
        errorMessage = 'Permission denied. Please check authentication.';
      } else if (error?.code === 'functions/unauthenticated' || error?.code === 'unauthenticated') {
        errorMessage = 'You must be signed in to create an account. Please sign in and try again.';
      } else if (error?.code === 'functions/unauthorized' || error?.code === 'unauthorized') {
        errorMessage = 'Unauthorized. Please sign in and try again.';
      } else if (error?.code === 'functions/invalid-argument' || error?.code === 'invalid-argument') {
        errorMessage = error?.message || 'Invalid input. Please check all fields and try again.';
      } else if (error?.code === 'functions/already-exists' || error?.code === 'already-exists') {
        errorMessage = error?.message || 'An account with this name already exists. Please use a different name.';
      } else if (error?.message) {
        errorMessage = error.message;
      } else if (error?.code) {
        errorMessage = `Error (${error.code}): ${error.message || 'Unknown error'}`;
      }
      
      set({ error: errorMessage });
      throw new Error(errorMessage);
    }
  },

  /**
   * Update an existing account via Cloud Function
   */
  updateAccount: async (data: UpdateAccountRequest) => {
    set({ error: null });

    try {
      const currentUser = firebaseAuth.currentUser;
      if (!currentUser) {
        throw new Error('You must be signed in to update an account');
      }

      const idToken = await currentUser.getIdToken(true);
      const { getFunctions } = await import('firebase/functions');
      const functionsWithAuth = getFunctions(firebaseAuth.app);
      
      const updateAccountFn = httpsCallable<UpdateAccountRequest & { idToken?: string }, CloudFunctionResponse>(
        functionsWithAuth, 
        'updateAccount'
      );
      
      const result = await updateAccountFn({ ...data, idToken });
      
      if (!result.data.success) {
        throw new Error(result.data.error ?? 'Failed to update account');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update account';
      set({ error: errorMessage });
      throw error;
    }
  },

  /**
   * Delete (deactivate) an account via Cloud Function
   * Accounts are soft-deleted to preserve transaction history
   */
  deleteAccount: async (accountId: string) => {
    set({ error: null });

    try {
      const currentUser = firebaseAuth.currentUser;
      if (!currentUser) {
        throw new Error('You must be signed in to delete an account');
      }

      const idToken = await currentUser.getIdToken(true);
      const { getFunctions } = await import('firebase/functions');
      const functionsWithAuth = getFunctions(firebaseAuth.app);
      
      const deleteAccountFn = httpsCallable<{ accountId: string; idToken?: string }, CloudFunctionResponse>(
        functionsWithAuth, 
        'deleteAccount'
      );
      
      const result = await deleteAccountFn({ accountId, idToken });
      
      if (!result.data.success) {
        throw new Error(result.data.error ?? 'Failed to delete account');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete account';
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
