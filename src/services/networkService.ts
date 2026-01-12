/**
 * Network Service
 * Detects network connectivity status
 */

import NetInfo from '@react-native-community/netinfo';
import { useState, useEffect } from 'react';

export interface NetworkState {
  isConnected: boolean | null;
  type: string | null;
  isInternetReachable: boolean | null;
}

let networkState: NetworkState = {
  isConnected: null,
  type: null,
  isInternetReachable: null,
};

let listeners: Set<(state: NetworkState) => void> = new Set();

/**
 * Get current network state
 */
export const getNetworkState = (): Promise<NetworkState> => {
  return NetInfo.fetch().then(state => {
    const networkState = {
      isConnected: state.isConnected ?? false,
      type: state.type,
      isInternetReachable: state.isInternetReachable ?? false,
    };
    return networkState;
  });
};

/**
 * Subscribe to network state changes
 */
export const subscribeToNetworkState = (callback: (state: NetworkState) => void): (() => void) => {
  listeners.add(callback);
  
  // Immediately call callback with current state
  getNetworkState().then(state => {
    networkState = state;
    callback(state);
  });

  const unsubscribe = NetInfo.addEventListener(state => {
    networkState = {
      isConnected: state.isConnected ?? false,
      type: state.type,
      isInternetReachable: state.isInternetReachable ?? false,
    };
    
    // Notify all listeners
    listeners.forEach(listener => listener(networkState));
  });

  return () => {
    listeners.delete(callback);
    unsubscribe();
  };
};

/**
 * Check if device is currently online
 */
export const isOnline = (): boolean => {
  return networkState.isConnected === true && networkState.isInternetReachable === true;
};

/**
 * React hook to monitor network state
 */
export const useNetworkState = () => {
  const [state, setState] = useState<NetworkState>(networkState);

  useEffect(() => {
    const unsubscribe = subscribeToNetworkState(setState);
    return unsubscribe;
  }, []);

  return {
    ...state,
    isOnline: state.isConnected === true && state.isInternetReachable === true,
  };
};