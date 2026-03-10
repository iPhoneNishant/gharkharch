/**
 * SMS Settings Service
 * Manages user-configurable SMS reading settings
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@gharkharch:sms_settings';

export interface SmsSettings {
  readCount: number; // Number of SMS messages to read (default: 100)
  dateGapDays: number; // Number of days to look back for SMS (default: 30)
}

const DEFAULT_SETTINGS: SmsSettings = {
  readCount: 100,
  dateGapDays: 30,
};

/**
 * Load SMS settings from local storage
 */
export async function loadSmsSettings(): Promise<SmsSettings> {
  try {
    const jsonValue = await AsyncStorage.getItem(STORAGE_KEY);
    if (jsonValue == null) {
      return DEFAULT_SETTINGS;
    }
    const settings = JSON.parse(jsonValue) as SmsSettings;
    // Validate and merge with defaults
    return {
      readCount: settings.readCount && settings.readCount > 0 ? settings.readCount : DEFAULT_SETTINGS.readCount,
      dateGapDays: settings.dateGapDays && settings.dateGapDays > 0 ? settings.dateGapDays : DEFAULT_SETTINGS.dateGapDays,
    };
  } catch (error) {
    console.error('Error loading SMS settings:', error);
    return DEFAULT_SETTINGS;
  }
}

/**
 * Save SMS settings to local storage
 */
export async function saveSmsSettings(settings: Partial<SmsSettings>): Promise<void> {
  try {
    const currentSettings = await loadSmsSettings();
    const newSettings: SmsSettings = {
      ...currentSettings,
      ...settings,
    };
    
    // Validate values
    if (newSettings.readCount < 1 || newSettings.readCount > 1000) {
      throw new Error('Read count must be between 1 and 1000');
    }
    if (newSettings.dateGapDays < 1 || newSettings.dateGapDays > 365) {
      throw new Error('Date gap must be between 1 and 365 days');
    }
    
    const jsonValue = JSON.stringify(newSettings);
    await AsyncStorage.setItem(STORAGE_KEY, jsonValue);
  } catch (error) {
    console.error('Error saving SMS settings:', error);
    throw error;
  }
}

/**
 * Get SMS read count setting
 */
export async function getSmsReadCount(): Promise<number> {
  const settings = await loadSmsSettings();
  return settings.readCount;
}

/**
 * Get SMS date gap in days
 */
export async function getSmsDateGapDays(): Promise<number> {
  const settings = await loadSmsSettings();
  return settings.dateGapDays;
}

/**
 * Calculate timestamp for date gap (milliseconds ago)
 */
export async function getSmsSinceTimestamp(): Promise<number> {
  const dateGapDays = await getSmsDateGapDays();
  const now = Date.now();
  const daysInMs = dateGapDays * 24 * 60 * 60 * 1000;
  return now - daysInMs;
}
