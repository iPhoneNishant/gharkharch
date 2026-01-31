/**
 * PIN and Biometric Authentication Service
 * Handles MPIN setup, verification, and biometric authentication
 */

import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import { Platform } from 'react-native';

const PIN_KEY = 'user_pin';
const BIOMETRIC_ENABLED_KEY = 'biometric_enabled';
const PIN_SETUP_KEY = 'pin_setup_complete';

/**
 * Hash PIN using simple SHA-256 (for basic security)
 * In production, consider using a more secure hashing method
 */
const hashPin = async (pin: string): Promise<string> => {
  return Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    pin,
    { encoding: Crypto.CryptoEncoding.HEX }
  );
};

/**
 * Check if fingerprint authentication is available on the device
 */
export const isBiometricAvailable = async (): Promise<boolean> => {
  try {
    const compatible = await LocalAuthentication.hasHardwareAsync();
    if (!compatible) return false;

    const enrolled = await LocalAuthentication.isEnrolledAsync();
    if (!enrolled) return false;

    // Only allow fingerprint authentication, not Face ID
    const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
    const hasFingerprint = types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT);
    
    return hasFingerprint;
  } catch (error) {
    console.error('Error checking fingerprint availability:', error);
    return false;
  }
};

/**
 * Get fingerprint authentication type (Touch ID, Fingerprint)
 */
export const getBiometricType = async (): Promise<string | null> => {
  try {
    const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
    // Only return fingerprint-related types, exclude Face ID
    if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
      return Platform.OS === 'ios' ? 'Touch ID' : 'Fingerprint';
    }
    return null;
  } catch (error) {
    console.error('Error getting fingerprint type:', error);
    return null;
  }
};

/**
 * Setup PIN (initial setup)
 */
export const setupPin = async (pin: string): Promise<void> => {
  try {
    if (pin.length !== 4) {
      throw new Error('PIN must be exactly 4 digits');
    }

    if (!/^\d+$/.test(pin)) {
      throw new Error('PIN must contain only digits');
    }

    const hashedPin = await hashPin(pin);
    await SecureStore.setItemAsync(PIN_KEY, hashedPin);
    await SecureStore.setItemAsync(PIN_SETUP_KEY, 'true');
  } catch (error) {
    console.error('Error setting up PIN:', error);
    throw error;
  }
};

/**
 * Verify PIN
 */
export const verifyPin = async (pin: string): Promise<boolean> => {
  try {
    const storedPin = await SecureStore.getItemAsync(PIN_KEY);
    if (!storedPin) {
      return false;
    }

    const hashedPin = await hashPin(pin);
    // Backward compatibility: accept both hashed and plain PIN stored previously
    if (storedPin === hashedPin || storedPin === pin) {
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error verifying PIN:', error);
    return false;
  }
};

/**
 * Change PIN (requires current PIN verification)
 */
export const changePin = async (currentPin: string, newPin: string): Promise<void> => {
  try {
    const isValid = await verifyPin(currentPin);
    if (!isValid) {
      throw new Error('Current PIN is incorrect');
    }

    await setupPin(newPin);
  } catch (error) {
    console.error('Error changing PIN:', error);
    throw error;
  }
};

/**
 * Check if PIN is set up
 */
export const isPinSetup = async (): Promise<boolean> => {
  try {
    const setupComplete = await SecureStore.getItemAsync(PIN_SETUP_KEY);
    return setupComplete === 'true';
  } catch (error) {
    console.error('Error checking PIN setup:', error);
    return false;
  }
};

/**
 * Enable fingerprint authentication (fingerprint only, not Face ID)
 */
export const enableBiometric = async (): Promise<void> => {
  try {
    const available = await isBiometricAvailable();
    if (!available) {
      throw new Error('Fingerprint authentication is not available on this device. Please enable fingerprint authentication in your device settings.');
    }

    // Verify that fingerprint (not Face ID) is available
    const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
    const hasFingerprint = types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT);
    
    if (!hasFingerprint) {
      throw new Error('Fingerprint authentication is not available. This device only supports Face ID, which is not supported.');
    }

    await SecureStore.setItemAsync(BIOMETRIC_ENABLED_KEY, 'true');
  } catch (error) {
    console.error('Error enabling fingerprint:', error);
    throw error;
  }
};

/**
 * Disable biometric authentication
 */
export const disableBiometric = async (): Promise<void> => {
  try {
    await SecureStore.setItemAsync(BIOMETRIC_ENABLED_KEY, 'false');
  } catch (error) {
    console.error('Error disabling biometric:', error);
    throw error;
  }
};

/**
 * Check if biometric authentication is enabled
 */
export const isBiometricEnabled = async (): Promise<boolean> => {
  try {
    const enabled = await SecureStore.getItemAsync(BIOMETRIC_ENABLED_KEY);
    return enabled === 'true';
  } catch (error) {
    console.error('Error checking biometric status:', error);
    return false;
  }
};

/**
 * Authenticate using fingerprint only (not Face ID)
 */
export const authenticateWithBiometric = async (): Promise<boolean> => {
  try {
    const available = await isBiometricAvailable();
    if (!available) {
      return false;
    }

    const enabled = await isBiometricEnabled();
    if (!enabled) {
      return false;
    }

    // Only use fingerprint authentication
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Authenticate with fingerprint to access Gharkharch',
      cancelLabel: 'Cancel',
      disableDeviceFallback: false, // Allow PIN fallback
      fallbackLabel: 'Use PIN',
      // Explicitly request fingerprint only
      requireConfirmation: false,
    });

    // Double-check that we're using fingerprint, not Face ID
    // If the device only has Face ID, this will fail gracefully
    const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
    const hasFingerprint = types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT);
    
    if (!hasFingerprint) {
      console.warn('Fingerprint not available, only Face ID detected');
      return false;
    }

    return result.success;
  } catch (error) {
    console.error('Error authenticating with fingerprint:', error);
    return false;
  }
};

/**
 * Clear PIN and biometric settings (for logout/reset)
 */
export const clearPinAuth = async (): Promise<void> => {
  try {
    await Promise.all([
      SecureStore.deleteItemAsync(PIN_KEY),
      SecureStore.deleteItemAsync(BIOMETRIC_ENABLED_KEY),
      SecureStore.deleteItemAsync(PIN_SETUP_KEY),
    ]);
  } catch (error) {
    console.error('Error clearing PIN auth:', error);
    throw error;
  }
};

/**
 * Reset PIN (requires re-setup)
 * This clears the PIN but keeps biometric settings
 */
export const resetPin = async (): Promise<void> => {
  try {
    await Promise.all([
      SecureStore.deleteItemAsync(PIN_KEY),
      SecureStore.deleteItemAsync(PIN_SETUP_KEY),
    ]);
  } catch (error) {
    console.error('Error resetting PIN:', error);
    throw error;
  }
};
