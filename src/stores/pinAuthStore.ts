/**
 * PIN Authentication Store using Zustand
 * Manages PIN verification state (session-based)
 */

import { create } from 'zustand';
import { isPinSetup } from '../services/pinAuthService';

interface PinAuthState {
  isPinVerified: boolean; // Whether PIN has been verified in this session
  isPinSetup: boolean | null; // null = checking, true/false = known state
  isLoading: boolean;
  
  // Actions
  checkPinSetup: () => Promise<void>;
  setPinVerified: (verified: boolean) => void;
  reset: () => void; // Reset on logout
}

export const usePinAuthStore = create<PinAuthState>((set, get) => ({
  isPinVerified: false,
  isPinSetup: null,
  isLoading: false,

  checkPinSetup: async () => {
    set({ isLoading: true });
    try {
      const setup = await isPinSetup();
      set({ isPinSetup: setup, isLoading: false });
    } catch (error) {
      console.error('Error checking PIN setup:', error);
      set({ isPinSetup: false, isLoading: false });
    }
  },

  setPinVerified: (verified: boolean) => {
    set({ isPinVerified: verified });
  },

  reset: () => {
    set({ isPinVerified: false, isPinSetup: null });
  },
}));