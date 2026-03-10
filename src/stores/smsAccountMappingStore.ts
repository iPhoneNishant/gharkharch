/**
 * SMS Account Mapping Store
 * 
 * SIMPLIFIED MAPPING SYSTEM:
 * - Maps merchant name OR bank name → accountId
 * - All mappings are accounts (no category-based mapping)
 * 
 * Example:
 * - "Zepto" → "Groceries Account" (accountId)
 * - "ICICI Bank" → "ICICI Bank Account" (accountId)
 */

import { create } from 'zustand';
import { collection, doc, getDoc, setDoc, onSnapshot, Unsubscribe, serverTimestamp, query, where, Timestamp } from 'firebase/firestore';
import { firestore, firebaseAuth } from '../config/firebase';
import { COLLECTIONS } from '../config/constants';

export interface SmsAccountMapping {
  id: string;
  userId: string;
  name: string; // Merchant name or bank name
  accountId: string; // Account ID to use
  createdAt: Date;
  updatedAt: Date;
}

interface SmsAccountMappingState {
  mappings: SmsAccountMapping[];
  isLoading: boolean;
  error: string | null;
  
  // Actions
  subscribeToMappings: (userId: string) => Unsubscribe;
  getMapping: (name: string) => SmsAccountMapping | null;
  createMapping: (mapping: Omit<SmsAccountMapping, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  updateMapping: (mappingId: string, updates: Partial<SmsAccountMapping>) => Promise<void>;
  deleteMapping: (mappingId: string) => Promise<void>;
  clearError: () => void;
}

/**
 * Convert Firestore document to SmsAccountMapping
 */
const docToMapping = (docData: Record<string, unknown>, id: string): SmsAccountMapping | null => {
  // Support new format (name + accountId)
  if (docData.name && docData.accountId) {
    return {
      id,
      userId: docData.userId as string,
      name: docData.name as string,
      accountId: docData.accountId as string,
      createdAt: (docData.createdAt as Timestamp)?.toDate() ?? new Date(),
      updatedAt: (docData.updatedAt as Timestamp)?.toDate() ?? new Date(),
    };
  }
  
  // Support legacy merchant format (migrate to new format)
  if (docData.merchant && docData.accountId) {
    return {
      id,
      userId: docData.userId as string,
      name: docData.merchant as string,
      accountId: docData.accountId as string,
      createdAt: (docData.createdAt as Timestamp)?.toDate() ?? new Date(),
      updatedAt: (docData.updatedAt as Timestamp)?.toDate() ?? new Date(),
    };
  }
  
  // Support legacy bank format (migrate to new format)
  if (docData.bankName && docData.accountId) {
    return {
      id,
      userId: docData.userId as string,
      name: docData.bankName as string,
      accountId: docData.accountId as string,
      createdAt: (docData.createdAt as Timestamp)?.toDate() ?? new Date(),
      updatedAt: (docData.updatedAt as Timestamp)?.toDate() ?? new Date(),
    };
  }
  
  console.warn('Skipping mapping with missing fields:', id, docData);
  return null;
};

export const useSmsAccountMappingStore = create<SmsAccountMappingState>((set, get) => ({
  mappings: [],
  isLoading: true,
  error: null,

  /**
   * Subscribe to real-time mapping updates from Firestore
   */
  subscribeToMappings: (userId: string) => {
    if (!userId) {
      console.warn('subscribeToMappings called with undefined userId');
      set({ isLoading: false, error: 'User ID is required' });
      return () => {};
    }

    set({ isLoading: true, error: null });

    const mappingsRef = collection(firestore, COLLECTIONS.SMS_ACCOUNT_MAPPINGS);
    const mappingsQuery = query(
      mappingsRef,
      where('userId', '==', userId)
    );

    const unsubscribe = onSnapshot(
      mappingsQuery,
      (snapshot) => {
        const mappings: SmsAccountMapping[] = [];
        
        snapshot.forEach((doc) => {
          const data = doc.data();
          if (!data.deleted) {
            const mapping = docToMapping(data, doc.id);
            if (mapping) {
              mappings.push(mapping);
            } else {
              console.warn('Skipped invalid mapping:', doc.id, data);
            }
          }
        });
        
        // SMS Account Mappings updated
        set({ mappings, isLoading: false, error: null });
      },
      (error) => {
        console.error('Error subscribing to SMS account mappings:', error);
        set({ isLoading: false, error: 'Failed to load account mappings' });
      }
    );

    return unsubscribe;
  },

  /**
   * Get mapping for a specific name (merchant or bank)
   */
  getMapping: (name: string) => {
    if (!name || !name.trim()) {
      return null;
    }
    const normalizedName = name.trim().toUpperCase();
    const mappings = get().mappings || [];
    return mappings.find(
      (m) => m.name.trim().toUpperCase() === normalizedName
    ) || null;
  },

  /**
   * Create a new mapping
   */
  createMapping: async (mapping) => {
    const currentUser = firebaseAuth.currentUser;
    if (!currentUser) {
      throw new Error('User must be authenticated');
    }

    if (!mapping.name || !mapping.name.trim()) {
      throw new Error('Name is required for mapping');
    }

    if (!mapping.accountId) {
      throw new Error('Account ID is required for mapping');
    }

    try {
      const normalizedName = mapping.name.trim().toUpperCase();
      const safeNameId = normalizedName.replace(/[^A-Z0-9]/g, '_').substring(0, 50);
      const mappingId = `${currentUser.uid}_${safeNameId}`;
      
      const mappingRef = doc(
        firestore,
        COLLECTIONS.SMS_ACCOUNT_MAPPINGS,
        mappingId
      );

      const existing = await getDoc(mappingRef);

      if (existing.exists()) {
        // Update existing document - use setDoc with merge (triggers UPDATE rule)
        const updateData = {
          userId: currentUser.uid,
          name: mapping.name.trim(),
          accountId: mapping.accountId,
          updatedAt: serverTimestamp(),
        };
        // Updating existing mapping
        await setDoc(mappingRef, updateData, { merge: true });
      } else {
        // Create new document - use setDoc without merge (triggers CREATE rule)
        const newMapping = {
          userId: currentUser.uid,
          name: mapping.name.trim(),
          accountId: mapping.accountId,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };
        // Creating new mapping
        
        // Verify the data before sending
        if (!newMapping.userId || !newMapping.name || !newMapping.accountId) {
          throw new Error('Missing required fields: userId, name, or accountId');
        }
        
        if (newMapping.userId !== currentUser.uid) {
          throw new Error(`UserId mismatch: ${newMapping.userId} !== ${currentUser.uid}`);
        }
        
        await setDoc(mappingRef, newMapping, { merge: false }); // Explicitly no merge - this is a CREATE operation
      }

      return mappingId;
    } catch (error) {
      console.error('Error creating mapping:', error);
      if (error instanceof Error) {
        console.error('Error details:', {
          message: error.message,
          stack: error.stack,
          userId: currentUser?.uid,
          mappingId: `${currentUser?.uid}_${mapping.name.trim().toUpperCase().replace(/[^A-Z0-9]/g, '_').substring(0, 50)}`,
        });
      }
      throw error;
    }
  },

  /**
   * Update an existing mapping
   */
  updateMapping: async (mappingId: string, updates: Partial<SmsAccountMapping>) => {
    const currentUser = firebaseAuth.currentUser;
    if (!currentUser) {
      throw new Error('User must be authenticated');
    }

    try {
      const mappingRef = doc(
        firestore,
        COLLECTIONS.SMS_ACCOUNT_MAPPINGS,
        mappingId
      );

      const updateData: any = {
        ...updates,
        userId: currentUser.uid, // Ensure userId is always present for security rules
        updatedAt: serverTimestamp(),
      };

      delete updateData.id;
      delete updateData.createdAt;

      await setDoc(mappingRef, updateData, { merge: true });
    } catch (error) {
      console.error('Error updating mapping:', error);
      throw error;
    }
  },

  /**
   * Delete a mapping
   */
  deleteMapping: async (mappingId: string) => {
    const currentUser = firebaseAuth.currentUser;
    if (!currentUser) {
      throw new Error('User must be authenticated');
    }

    try {
      const mappingRef = doc(
        firestore,
        COLLECTIONS.SMS_ACCOUNT_MAPPINGS,
        mappingId
      );

      // Ensure userId is included for security rules
      await setDoc(mappingRef, { 
        userId: currentUser.uid,
        deleted: true, 
        updatedAt: serverTimestamp() 
      }, { merge: true });
    } catch (error) {
      console.error('Error deleting mapping:', error);
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
