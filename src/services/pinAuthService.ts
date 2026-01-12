/**
 * PIN and Biometric Authentication Service
 * Handles MPIN setup, verification, and biometric authentication
 */

import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';

const PIN_KEY = 'user_pin';
const BIOMETRIC_ENABLED_KEY = 'biometric_enabled';
const PIN_SETUP_KEY = 'pin_setup_complete';

/**
 * Hash PIN using simple SHA-256 (for basic security)
 * In production, consider using a more secure hashing method
 */
const hashPin = async (pin: string): Promise<string> => {
  // Simple hash for now - in production, use a proper hashing library
  // For React Native, you could use expo-crypto or react-native-crypto-js
  // This is a basic implementation - consider upgrading for production
  return pin; // For now, store as-is (SecureStore encrypts at rest)
  // TODO: Implement proper hashing with expo-crypto
};

/**
 * Check if biometric authentication is available on the device
 */
export const isBiometricAvailable = async (): Promise<boolean> => {
  try {
    const compatible = await LocalAuthentication.hasHardwareAsync();
    if (!compatible) return false;

    const enrolled = await LocalAuthentication.isEnrolledAsync();
    return enrolled;
  } catch (error) {
    console.error('Error checking biometric availability:', error);
    return false;
  }
};

/**
 * Get biometric authentication type (Face ID, Touch ID, Fingerprint, etc.)
 */
export const getBiometricType = async (): Promise<string | null> => {
  try {
    const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
    if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
      return 'Face ID';
    } else if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
      return 'Touch ID / Fingerprint';
    } else if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) {
      return 'Iris';
    }
    return null;
  } catch (error) {
    console.error('Error getting biometric type:', error);
    return null;
  }
};

/**
 * Setup PIN (initial setup)
 */
export const setupPin = async (pin: string): Promise<void> => {
  try {
    if (pin.length < 4 || pin.length > 6) {
      throw new Error('PIN must be 4-6 digits');
    }

    if (!/^\d+$/.test(pin)) {
      throw new Error('PIN must contain only digits');
    }

    const hashedPin = await hashPin(pin);
    await SecureStore.setItemAsync(PIN_KEY, hashedPin);
    await SecureStore.setItemAsync(PIN_SETUP_KEY, 'true');
    console.log('✅ PIN setup complete');
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
    return hashedPin === storedPin;
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
    console.log('✅ PIN changed successfully');
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
 * Enable biometric authentication
 */
export const enableBiometric = async (): Promise<void> => {
  try {
    const available = await isBiometricAvailable();
    if (!available) {
      throw new Error('Biometric authentication is not available on this device');
    }

    await SecureStore.setItemAsync(BIOMETRIC_ENABLED_KEY, 'true');
    console.log('✅ Biometric authentication enabled');
  } catch (error) {
    console.error('Error enabling biometric:', error);
    throw error;
  }
};

/**
 * Disable biometric authentication
 */
export const disableBiometric = async (): Promise<void> => {
  try {
    await SecureStore.setItemAsync(BIOMETRIC_ENABLED_KEY, 'false');
    console.log('✅ Biometric authentication disabled');
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
 * Authenticate using biometric
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

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Authenticate to access Gharkharch',
      cancelLabel: 'Cancel',
      disableDeviceFallback: false, // Allow PIN fallback
      fallbackLabel: 'Use PIN',
    });

    return result.success;
  } catch (error) {
    console.error('Error authenticating with biometric:', error);
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
    console.log('✅ PIN and biometric settings cleared');
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
    console.log('✅ PIN reset');
  } catch (error) {
    console.error('Error resetting PIN:', error);
    throw error;
  }
};