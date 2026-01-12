/**
 * Network Store using Zustand
 * Manages network connectivity state
 */

import { create } from 'zustand';
import { subscribeToNetworkState, NetworkState } from '../services/networkService';

interface NetworkStoreState {
  isConnected: boolean | null;
  type: string | null;
  isInternetReachable: boolean | null;
  isOnline: boolean;
  
  // Actions
  initialize: () => () => void; // Returns unsubscribe function
}

export const useNetworkStore = create<NetworkStoreState>((set) => ({
  isConnected: null,
  type: null,
  isInternetReachable: null,
  isOnline: false,

  initialize: () => {
    const unsubscribe = subscribeToNetworkState((state: NetworkState) => {
      const isOnline = state.isConnected === true && state.isInternetReachable === true;
      set({
        isConnected: state.isConnected,
        type: state.type,
        isInternetReachable: state.isInternetReachable,
        isOnline,
      });
    });

    return unsubscribe;
  },
}));

/**
 * React hook to use network state from store
 */
export const useNetwork = () => {
  return useNetworkStore(state => ({
    isConnected: state.isConnected,
    type: state.type,
    isInternetReachable: state.isInternetReachable,
    isOnline: state.isOnline,
  }));
};