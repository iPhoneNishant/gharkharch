/**
 * SMS Service for Reading Android Inbox Messages
 * 
 * SECURITY & PRIVACY:
 * - Only reads SMS from inbox (not sent messages)
 * - Processes SMS locally on device
 * - Raw SMS content is NEVER uploaded to servers
 * - Only parsed transaction data is sent to Firestore
 * - Complies with Google Play SMS policy
 * 
 * PERMISSIONS:
 * - Requires READ_SMS permission (Android 6+ runtime permission)
 * - Must be granted by user at runtime
 * 
 * GOOGLE PLAY COMPLIANCE:
 * - Only processes bank transaction SMS
 * - User must explicitly grant permission
 * - No background SMS reading without user consent
 * - Clear privacy policy required
 */

import { Platform, PermissionsAndroid, NativeModules, Linking } from 'react-native';

// Native module interface
interface SmsReaderModule {
  readInboxSms(limit: number): Promise<Array<{
    id: string;
    address: string;
    body: string;
    date: number;
    dateSent: number;
  }>>;
  requestSmsPermission(): Promise<boolean>;
  checkSmsPermission(): Promise<boolean>;
  openPermissionSettings(): void;
}

// Get native module (will be created in Android native code)
// Try multiple ways to access the module in case of production build issues
const SmsReader = NativeModules.SmsReader || (NativeModules as any).SmsReader;

// Check if module is available
const isModuleAvailable = Platform.OS === 'android' && SmsReader != null;

// Check module availability
if (Platform.OS === 'android') {
  if (!SmsReader) {
    console.error('SmsReader module NOT available!');
  }
  if (!NativeModules.SmsUserConsent) {
    console.error('SmsUserConsent module NOT available!');
  }
}

const smsReader: SmsReaderModule = isModuleAvailable && SmsReader ? SmsReader : {
  readInboxSms: async () => {
    throw new Error('SmsReader native module not available. Make sure the module is properly registered in MainApplication.kt');
  },
  requestSmsPermission: async () => {
    console.warn('SmsReader module not available, using fallback permission request');
    return false;
  },
  checkSmsPermission: async () => {
    console.warn('SmsReader module not available, using fallback permission check');
    return false;
  },
  openPermissionSettings: () => {
    console.warn('SmsReader module not available, using fallback settings');
  },
};

export interface SmsMessage {
  id: string;
  senderId: string;
  body: string;
  timestamp: number;
  dateSent: number;
}

/**
 * Check if SMS permission is granted
 */
export async function checkSmsPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') {
    return false;
  }
  
  try {
    // Use PermissionsAndroid directly (more reliable)
    const granted = await PermissionsAndroid.check(
      PermissionsAndroid.PERMISSIONS.READ_SMS
    );
    return granted;
  } catch (error) {
    console.error('Error checking SMS permission:', error);
    return false;
  }
}

/**
 * Request READ_SMS permission at runtime
 * 
 * @returns true if permission granted, false otherwise
 */
export async function requestSmsPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') {
    console.warn('SMS permission is Android-only');
    return false;
  }
  
  try {
    // Use PermissionsAndroid directly (more reliable than native module)
    const result = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.READ_SMS,
      {
        title: 'SMS Permission',
        message:
          'This app needs access to your SMS to automatically detect bank transactions. ' +
          'Only bank SMS messages will be processed.',
        buttonNeutral: 'Ask Me Later',
        buttonNegative: 'Cancel',
        buttonPositive: 'OK',
      }
    );
    
    
    // Check the result
    const granted = result === PermissionsAndroid.RESULTS.GRANTED;
    
    // Double-check by querying permission status
    if (granted) {
      // Small delay to ensure permission is fully granted
      await new Promise(resolve => setTimeout(resolve, 100));
      const verified = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.READ_SMS
      );
      return verified;
    }
    
    return granted;
  } catch (error) {
    console.error('Error requesting SMS permission:', error);
    return false;
  }
}

/**
 * Read SMS messages from Android inbox
 * 
 * @param limit - Maximum number of messages to read (default: 50)
 * @returns Array of SMS messages
 */
export async function readInboxSms(limit: number = 50): Promise<SmsMessage[]> {
  if (Platform.OS !== 'android') {
    throw new Error('SMS reading is only available on Android');
  }
  
  // Verify module is available
  if (!isModuleAvailable || !SmsReader) {
    const errorMsg = 'SmsReader native module not available. The module may not be properly registered or was removed during build optimization.';
    console.error(errorMsg);
    console.error('Available NativeModules:', Object.keys(NativeModules));
    throw new Error(errorMsg);
  }
  
  // Check permission first
  const hasPermission = await checkSmsPermission();
  if (!hasPermission) {
    throw new Error('READ_SMS permission not granted');
  }
  
  try {
    // Read SMS using native module
    const messages = await smsReader.readInboxSms(limit);
    
    // Transform to our format
    return messages.map((msg) => ({
      id: msg.id,
      senderId: msg.address || '',
      body: msg.body || '',
      timestamp: msg.date || Date.now(),
      dateSent: msg.dateSent || msg.date || Date.now(),
    }));
  } catch (error) {
    console.error('Error reading SMS:', error);
    throw error;
  }
}

/**
 * Read recent SMS messages (last N messages)
 * 
 * @param count - Number of recent messages to read
 * @returns Array of SMS messages, sorted by date (newest first)
 */
export async function readRecentSms(count: number = 50): Promise<SmsMessage[]> {
  const messages = await readInboxSms(count);
  
  // Sort by timestamp (newest first)
  return messages.sort((a, b) => b.timestamp - a.timestamp);
}

/**
 * Read SMS messages from specific sender
 * 
 * @param senderId - Sender ID to filter by
 * @param limit - Maximum number of messages to read
 * @returns Array of SMS messages from the specified sender
 */
export async function readSmsFromSender(
  senderId: string,
  limit: number = 50
): Promise<SmsMessage[]> {
  const messages = await readInboxSms(limit);
  
  // Filter by sender ID (case-insensitive)
  const normalizedSender = senderId.toUpperCase().trim();
  return messages.filter(
    (msg) => msg.senderId.toUpperCase().trim() === normalizedSender
  );
}

/**
 * Read SMS messages since a specific timestamp
 * 
 * @param sinceTimestamp - Unix timestamp (milliseconds)
 * @param limit - Maximum number of messages to read
 * @returns Array of SMS messages after the specified timestamp
 */
export async function readSmsSince(
  sinceTimestamp: number,
  limit: number = 100
): Promise<SmsMessage[]> {
  const messages = await readInboxSms(limit);
  
  // Filter by timestamp
  return messages.filter((msg) => msg.timestamp >= sinceTimestamp);
}

/**
 * Open app's permission settings page
 * Opens Android settings where user can grant SMS permission
 */
export function openPermissionSettings(): void {
  if (Platform.OS !== 'android') {
    return;
  }
  
  try {
    // Try native module first
    if (smsReader && smsReader.openPermissionSettings && NativeModules.SmsReader) {
      smsReader.openPermissionSettings();
      return;
    }
    
    // Fallback to Linking
    Linking.openSettings();
  } catch (error) {
    console.error('Error opening permission settings:', error);
    // Final fallback
    try {
      Linking.openSettings();
    } catch (fallbackError) {
      console.error('Error with fallback:', fallbackError);
    }
  }
}
