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
  
  // Actions
  initialize: () => () => void;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName?: string) => Promise<void>;
  signOut: () => Promise<void>;
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

  /**
   * Initialize auth state listener
   * Returns unsubscribe function for cleanup
   */
  initialize: () => {
    const unsubscribe = onAuthStateChanged(firebaseAuth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
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
    set({ isLoading: true, error: null });
    
    try {
      await signInWithEmailAndPassword(firebaseAuth, email, password);
      // Auth state listener will handle the rest
    } catch (error: any) {
      console.error('Sign in error:', error);
      
      // Provide more specific error messages
      let errorMessage = 'Sign in failed';
      
      if (error?.code === 'auth/user-not-found') {
        errorMessage = 'No account found with this email. Please sign up instead.';
      } else if (error?.code === 'auth/wrong-password') {
        errorMessage = 'Incorrect password. Please try again.';
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
      
      set({ isLoading: false, error: errorMessage });
      throw new Error(errorMessage);
    }
  },

  /**
   * Sign up with email and password
   */
  signUp: async (email: string, password: string, displayName?: string) => {
    set({ isLoading: true, error: null });
    
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
      
      set({ isLoading: false, error: errorMessage });
      throw new Error(errorMessage);
    }
  },

  /**
   * Sign out current user
   */
  signOut: async () => {
    set({ isLoading: true, error: null });
    
    try {
      await firebaseSignOut(firebaseAuth);
      // Auth state listener will handle the rest
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Sign out failed';
      set({ isLoading: false, error: errorMessage });
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
