/**
 * Service Account Mapping Store
 * 
 * Maps service ID → account IDs (debitAccountId, creditAccountId)
 * Used to remember account selections when creating transactions from household services
 */

import { create } from 'zustand';
import { collection, doc, getDoc, setDoc, onSnapshot, Unsubscribe, serverTimestamp, query, where, Timestamp } from 'firebase/firestore';
import { firestore, firebaseAuth } from '../config/firebase';
import { COLLECTIONS } from '../config/constants';

export interface ServiceAccountMapping {
  id: string;
  userId: string;
  serviceId: string; // Household service ID
  debitAccountId: string; // Account to debit
  creditAccountId: string; // Account to credit
  createdAt: Date;
  updatedAt: Date;
}

interface ServiceAccountMappingState {
  mappings: ServiceAccountMapping[];
  isLoading: boolean;
  error: string | null;
  
  // Actions
  subscribeToMappings: (userId: string) => Unsubscribe;
  getMapping: (serviceId: string) => ServiceAccountMapping | null;
  createMapping: (mapping: Omit<ServiceAccountMapping, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  updateMapping: (mappingId: string, updates: Partial<ServiceAccountMapping>) => Promise<void>;
  deleteMapping: (mappingId: string) => Promise<void>;
  clearError: () => void;
}

/**
 * Convert Firestore document to ServiceAccountMapping
 */
const docToMapping = (docData: Record<string, unknown>, id: string): ServiceAccountMapping | null => {
  if (docData.serviceId && docData.debitAccountId && docData.creditAccountId) {
    return {
      id,
      userId: docData.userId as string,
      serviceId: docData.serviceId as string,
      debitAccountId: docData.debitAccountId as string,
      creditAccountId: docData.creditAccountId as string,
      createdAt: (docData.createdAt as Timestamp)?.toDate() ?? new Date(),
      updatedAt: (docData.updatedAt as Timestamp)?.toDate() ?? new Date(),
    };
  }
  
  console.warn('Skipping mapping with missing fields:', id, docData);
  return null;
};

export const useServiceAccountMappingStore = create<ServiceAccountMappingState>((set, get) => ({
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

    const q = query(
      collection(firestore, COLLECTIONS.SERVICE_ACCOUNT_MAPPINGS),
      where('userId', '==', userId)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const mappings: ServiceAccountMapping[] = [];
        
        snapshot.forEach((doc) => {
          const data = doc.data();
          const mapping = docToMapping(data, doc.id);
          if (mapping) {
            mappings.push(mapping);
          }
        });

        set({ mappings, isLoading: false, error: null });
      },
      (error) => {
        console.error('Error subscribing to service account mappings:', error);
        set({ isLoading: false, error: error.message });
      }
    );

    return unsubscribe;
  },

  /**
   * Get mapping for a service ID
   */
  getMapping: (serviceId: string) => {
    const { mappings } = get();
    return mappings.find(m => m.serviceId === serviceId) || null;
  },

  /**
   * Create a new mapping
   */
  createMapping: async (mapping: Omit<ServiceAccountMapping, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => {
    const currentUser = firebaseAuth.currentUser;
    if (!currentUser) {
      throw new Error('User must be authenticated to create mappings');
    }

    try {
      const mappingRef = doc(collection(firestore, COLLECTIONS.SERVICE_ACCOUNT_MAPPINGS));
      const mappingData = {
        userId: currentUser.uid,
        serviceId: mapping.serviceId,
        debitAccountId: mapping.debitAccountId,
        creditAccountId: mapping.creditAccountId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      await setDoc(mappingRef, mappingData);
      return mappingRef.id;
    } catch (error: any) {
      console.error('Error creating mapping:', error);
      throw new Error(error.message || 'Failed to create mapping');
    }
  },

  /**
   * Update an existing mapping
   */
  updateMapping: async (mappingId: string, updates: Partial<ServiceAccountMapping>) => {
    const currentUser = firebaseAuth.currentUser;
    if (!currentUser) {
      throw new Error('User must be authenticated to update mappings');
    }

    try {
      const mappingRef = doc(firestore, COLLECTIONS.SERVICE_ACCOUNT_MAPPINGS, mappingId);
      const updateData: any = {
        ...updates,
        updatedAt: serverTimestamp(),
      };
      
      // Remove fields that shouldn't be updated
      delete updateData.id;
      delete updateData.userId;
      delete updateData.createdAt;

      await setDoc(mappingRef, updateData, { merge: true });
    } catch (error: any) {
      console.error('Error updating mapping:', error);
      throw new Error(error.message || 'Failed to update mapping');
    }
  },

  /**
   * Delete a mapping
   */
  deleteMapping: async (mappingId: string) => {
    const currentUser = firebaseAuth.currentUser;
    if (!currentUser) {
      throw new Error('User must be authenticated to delete mappings');
    }

    try {
      const mappingRef = doc(firestore, COLLECTIONS.SERVICE_ACCOUNT_MAPPINGS, mappingId);
      await setDoc(mappingRef, { deleted: true }, { merge: true });
    } catch (error: any) {
      console.error('Error deleting mapping:', error);
      throw new Error(error.message || 'Failed to delete mapping');
    }
  },

  /**
   * Clear error state
   */
  clearError: () => {
    set({ error: null });
  },
}));
