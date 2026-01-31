/**
 * Authentication Store using Zustand
 * Manages user authentication state and Firebase Auth integration
 */

import { create } from 'zustand';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  User as FirebaseUser,
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { firebaseAuth, firestore } from '../config/firebase';
import { UserProfile } from '../types';
import { COLLECTIONS, DEFAULT_CURRENCY } from '../config/constants';

interface AuthState {
  user: UserProfile | null;
  firebaseUser: FirebaseUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
  isFreshLogin: boolean; // Track if this is a fresh login (not auto re-auth)
  
  // Actions
  initialize: () => () => void;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName?: string) => Promise<void>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  clearError: () => void;
}

/**
 * Convert Firestore document to UserProfile
 */
const docToUserProfile = (docData: Record<string, unknown>, id: string): UserProfile => ({
  id,
  email: docData.email as string,
  displayName: docData.displayName as string | undefined,
  createdAt: (docData.createdAt as { toDate: () => Date })?.toDate() ?? new Date(),
  updatedAt: (docData.updatedAt as { toDate: () => Date })?.toDate() ?? new Date(),
  currency: (docData.currency as string) ?? DEFAULT_CURRENCY,
  onboardingComplete: (docData.onboardingComplete as boolean) ?? false,
});

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  firebaseUser: null,
  isLoading: true,
  isAuthenticated: false,
  error: null,
  isFreshLogin: false,

  /**
   * Initialize auth state listener
   * Returns unsubscribe function for cleanup
   */
  initialize: () => {
    const unsubscribe = onAuthStateChanged(firebaseAuth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const currentState = get();
          const isFreshLogin = currentState.isFreshLogin;
          
          // Clear PIN only on fresh login (explicit signIn/signUp), not on auto re-auth
          if (isFreshLogin) {
            try {
              const { clearPinAuth } = await import('../services/pinAuthService');
              await clearPinAuth();
              
              // Reset PIN auth store state
              const pinAuthStoreModule = await import('./pinAuthStore');
              pinAuthStoreModule.usePinAuthStore.getState().reset();
            } catch (pinError) {
              console.error('Error clearing PIN on login:', pinError);
              // Continue with authentication even if PIN clear fails
            }
            // Reset the flag after processing
            set({ isFreshLogin: false });
          }
          
          // Fetch user profile from Firestore
          const userDocRef = doc(firestore, COLLECTIONS.USERS, firebaseUser.uid);
          const userDoc = await getDoc(userDocRef);
          
          if (userDoc.exists()) {
            const userProfile = docToUserProfile(
              userDoc.data() as Record<string, unknown>,
              userDoc.id
            );
            set({
              user: userProfile,
              firebaseUser,
              isAuthenticated: true,
              isLoading: false,
              error: null,
            });
          } else {
            // User exists in Auth but not in Firestore - create profile
            const newProfile: Omit<UserProfile, 'id' | 'createdAt' | 'updatedAt'> = {
              email: firebaseUser.email ?? '',
              displayName: firebaseUser.displayName ?? undefined,
              currency: DEFAULT_CURRENCY,
              onboardingComplete: false,
            };
            
            try {
              await setDoc(userDocRef, {
                ...newProfile,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
              });
              
              set({
                user: {
                  ...newProfile,
                  id: firebaseUser.uid,
                  createdAt: new Date(),
                  updatedAt: new Date(),
                },
                firebaseUser,
                isAuthenticated: true,
                isLoading: false,
                error: null,
              });
            } catch (createError: any) {
              console.error('Error creating user profile:', createError);
              // If creation fails (e.g., permission denied), still set auth state
              // but show error
              set({
                user: null,
                firebaseUser,
                isAuthenticated: true,
                isLoading: false,
                error: createError?.code === 'permission-denied' 
                  ? 'Failed to create user profile. Please check Firestore security rules.'
                  : 'Failed to create user profile',
              });
            }
          }
        } catch (error: any) {
          console.error('Error fetching user profile:', error);
          set({
            user: null,
            firebaseUser: null,
            isAuthenticated: false,
            isLoading: false,
            error: error?.code === 'permission-denied'
              ? 'Permission denied. Please check Firestore security rules.'
              : 'Failed to load user profile',
          });
        }
      } else {
        set({
          user: null,
          firebaseUser: null,
          isAuthenticated: false,
          isLoading: false,
          error: null,
        });
      }
    });
    
    return unsubscribe;
  },

  /**
   * Sign in with email and password
   */
  signIn: async (email: string, password: string) => {
    set({ isLoading: false, error: null, isFreshLogin: true });
    
    try {
      await signInWithEmailAndPassword(firebaseAuth, email, password);
      // Auth state listener will handle the rest (including PIN clearing)
    } catch (error: any) {
      console.error('Sign in error:', error);
      
      // Provide more specific error messages
      let errorMessage = 'Sign in failed';
      
      if (error?.code === 'auth/user-not-found') {
        errorMessage = 'No account found with this email. Please sign up instead.';
      } else if (error?.code === 'auth/wrong-password') {
        errorMessage = 'Incorrect password. Please try again.';
      } else if (error?.code === 'auth/invalid-credential') {
        errorMessage = 'Invalid email or password. Please check your credentials and try again.';
      } else if (error?.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email address. Please check and try again.';
      } else if (error?.code === 'auth/user-disabled') {
        errorMessage = 'This account has been disabled. Please contact support.';
      } else if (error?.code === 'auth/too-many-requests') {
        errorMessage = 'Too many failed attempts. Please try again later.';
      } else if (error?.code === 'auth/network-request-failed') {
        errorMessage = 'Network error. Please check your connection and try again.';
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      set({ isLoading: false, error: errorMessage, isFreshLogin: false });
      throw new Error(errorMessage);
    }
  },

  /**
   * Sign up with email and password
   */
  signUp: async (email: string, password: string, displayName?: string) => {
    set({ isLoading: false, error: null, isFreshLogin: true });
    
    try {
      const userCredential = await createUserWithEmailAndPassword(firebaseAuth, email, password);
      
      // Create user profile in Firestore
      const userDocRef = doc(firestore, COLLECTIONS.USERS, userCredential.user.uid);
      await setDoc(userDocRef, {
        email,
        displayName: displayName ?? null,
        currency: DEFAULT_CURRENCY,
        onboardingComplete: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      
      // Auth state listener will handle the rest
    } catch (error: any) {
      console.error('Sign up error:', error);
      
      // Provide more specific error messages
      let errorMessage = 'Sign up failed';
      
      if (error?.code === 'auth/email-already-in-use') {
        errorMessage = 'This email is already registered. Please sign in instead.';
      } else if (error?.code === 'auth/weak-password') {
        errorMessage = 'Password is too weak. Please use a stronger password.';
      } else if (error?.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email address. Please check and try again.';
      } else if (error?.code === 'permission-denied') {
        errorMessage = 'Permission denied. Please check Firestore security rules.';
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      set({ isLoading: false, error: errorMessage, isFreshLogin: false });
      throw new Error(errorMessage);
    }
  },

  /**
   * Sign out current user
   */
  signOut: async () => {
    set({ isLoading: true, error: null });
    
    try {
      // Clear PIN and biometric settings from device storage
      const { clearPinAuth } = await import('../services/pinAuthService');
      await clearPinAuth();
      
      // Reset PIN auth store state
      const pinAuthStoreModule = await import('./pinAuthStore');
      pinAuthStoreModule.usePinAuthStore.getState().reset();
      
      // Sign out from Firebase
      await firebaseSignOut(firebaseAuth);
      // Auth state listener will handle the rest
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Sign out failed';
      set({ isLoading: false, error: errorMessage });
      throw error;
    }
  },

  /**
   * Delete user account and all associated data
   */
  deleteAccount: async () => {
    set({ isLoading: true, error: null });

    try {
      const currentUser = firebaseAuth.currentUser;
      if (!currentUser) {
        throw new Error('No user is currently signed in');
      }

      // Call Firebase function to delete all user data
      const { getFunctions, httpsCallable } = await import('firebase/functions');
      const functions = getFunctions();
      const deleteUserData = httpsCallable(functions, 'deleteUserAccount');

      await deleteUserData();

      // Delete the user account from Firebase Auth
      await currentUser.delete();

      // Clear local data and sign out
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
        isFreshLogin: false,
      });

    } catch (error: any) {
      console.error('Account deletion error:', error);

      let errorMessage = 'Failed to delete account';

      if (error?.code === 'auth/requires-recent-login') {
        errorMessage = 'Please sign in again before deleting your account';
      } else if (error?.code === 'permission-denied') {
        errorMessage = 'Permission denied. Please contact support.';
      } else if (error?.message) {
        errorMessage = error.message;
      }

      set({ isLoading: false, error: errorMessage });
      throw new Error(errorMessage);
    }
  },

  /**
   * Send password reset email
   */
  resetPassword: async (email: string) => {
    set({ isLoading: false, error: null });
    
    try {
      await sendPasswordResetEmail(firebaseAuth, email.trim());
      set({ isLoading: false });
    } catch (error: any) {
      console.error('Password reset error:', error);
      
      // Provide more specific error messages
      let errorMessage = 'Failed to send password reset email';
      
      if (error?.code === 'auth/user-not-found') {
        errorMessage = 'No account found with this email address.';
      } else if (error?.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email address. Please check and try again.';
      } else if (error?.code === 'auth/too-many-requests') {
        errorMessage = 'Too many requests. Please try again later.';
      } else if (error?.code === 'auth/network-request-failed') {
        errorMessage = 'Network error. Please check your connection and try again.';
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      set({ isLoading: false, error: errorMessage });
      throw new Error(errorMessage);
    }
  },

  /**
   * Clear error state
   */
  clearError: () => {
    set({ error: null });
  },
}));
