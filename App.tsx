/**
 * Gharkharch - Double-Entry Personal Finance App
 * 
 * A fintech-grade personal finance app using proper double-entry accounting.
 * 
 * ACCOUNTING RULES:
 * - Every transaction has exactly ONE debit account and ONE credit account
 * - Income and Expense accounts NEVER store balances
 * - Asset and Liability accounts ALWAYS store balances
 */

import React, { useEffect, useRef, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { RootNavigator } from './src/navigation';
import './src/i18n'; // Initialize i18n
import { setupNotificationChannels, rescheduleAllRecurringTransactionNotifications, cancelAllScheduledNotifications } from './src/services/recurringTransactionService';
import { useAuthStore } from './src/stores';
import { useRecurringTransactionStore } from './src/stores/recurringTransactionStore';
import { initializeFontScale } from './src/config/theme';
import { colors } from './src/config/theme';

export default function App() {
  console.log('🚀 App: Component rendered');
  const { isAuthenticated } = useAuthStore();
  const { recurringTransactions, isLoading } = useRecurringTransactionStore();
  const hasInitializedNotificationsRef = useRef(false);
  const hasCheckedRecurringTransactionsRef = useRef(false);
  const [isFontScaleInitialized, setIsFontScaleInitialized] = useState(false);


  // Initialize font scale at app startup
  useEffect(() => {
    const initFontScale = async () => {
      try {
        await initializeFontScale();
        setIsFontScaleInitialized(true);
      } catch (error) {
        console.error('Error initializing font scale:', error);
        setIsFontScaleInitialized(true); // Continue even if initialization fails
      }
    };
    initFontScale();
  }, []);

  useEffect(() => {
    // Initialize notifications for recurring transactions (one-time setup)
    if (!hasInitializedNotificationsRef.current) {
      hasInitializedNotificationsRef.current = true;

      // Initialize notifications
      setupNotificationChannels();

      // NUCLEAR OPTION: Immediately cancel ALL existing notifications to start completely fresh
      console.log('🚨 App starting - nuclear cleanup of all notifications');
      cancelAllScheduledNotifications();
    }
  }, []);

  useEffect(() => {
    // Schedule notifications for next occurrence of all active recurring transactions on app launch
    const scheduleAllActiveRecurringTransactionNotifications = async () => {
      if (isAuthenticated && !hasCheckedRecurringTransactionsRef.current && !isLoading) {
        hasCheckedRecurringTransactionsRef.current = true;

        // Add a delay to prevent immediate notifications on new device login
        setTimeout(async () => {
          try {
            // Schedule notifications for all active recurring transactions (regardless of when they're due)
            const activeTransactions = recurringTransactions.filter(rt => rt.isActive);

            if (activeTransactions.length > 0) {
              console.log(`Scheduling notifications for ${activeTransactions.length} active recurring transactions on app launch`);
              await rescheduleAllRecurringTransactionNotifications(activeTransactions, true);
              console.log('Successfully scheduled recurring transaction notifications on app launch');
            }
          } catch (error) {
            console.error('Error scheduling recurring transaction notifications on app launch:', error);
          }
        }, 5000); // 5 second delay to allow app to fully initialize
      }
    };

    scheduleAllActiveRecurringTransactionNotifications();

    // Reset the check flag when user logs out so it runs again on next login
    if (!isAuthenticated) {
      hasCheckedRecurringTransactionsRef.current = false;
    }
  }, [isAuthenticated]);

  // Effect to handle notification scheduling when data becomes available after login
  useEffect(() => {
    const scheduleNotificationsWhenDataReady = async () => {
      if (isAuthenticated && !isLoading && recurringTransactions.length > 0 && !hasCheckedRecurringTransactionsRef.current) {
        hasCheckedRecurringTransactionsRef.current = true;

        // Add a delay to prevent immediate notifications on new device login
        setTimeout(async () => {
          try {
            const activeTransactions = recurringTransactions.filter(rt => rt.isActive);
            if (activeTransactions.length > 0) {
              console.log(`Scheduling notifications for ${activeTransactions.length} active recurring transactions (data ready)`);
              await rescheduleAllRecurringTransactionNotifications(activeTransactions, true);
              console.log('Successfully scheduled recurring transaction notifications');
            }
          } catch (error) {
            console.error('Error scheduling recurring transaction notifications when data became ready:', error);
          }
        }, 3000); // 3 second delay for data-ready notifications
      }
    };

    scheduleNotificationsWhenDataReady();
  }, [isAuthenticated, isLoading, recurringTransactions]);

  // Show loading screen until font scale is initialized
  if (!isFontScaleInitialized) {
    return (
      <SafeAreaProvider>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary[500]} />
        </View>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <RootNavigator />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background.primary,
  },
});
