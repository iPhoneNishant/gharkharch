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

import React, { useEffect, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { RootNavigator } from './src/navigation';
import { initializeNotifications, rescheduleAllRecurringTransactionNotifications, cancelAllScheduledNotifications } from './src/services/recurringTransactionService';
import { initializeAdMob, setupAdMobListeners } from './src/services/adMobService';
import { useAuthStore } from './src/stores';
import { useRecurringTransactionStore } from './src/stores/recurringTransactionStore';

export default function App() {
  const { isAuthenticated } = useAuthStore();
  const { recurringTransactions, isLoading } = useRecurringTransactionStore();
  const hasInitializedNotificationsRef = useRef(false);
  const hasCheckedRecurringTransactionsRef = useRef(false);


  useEffect(() => {
    // Initialize notifications and AdMob for recurring transactions (one-time setup)
    if (!hasInitializedNotificationsRef.current) {
      hasInitializedNotificationsRef.current = true;
      initializeNotifications();
      initializeAdMob();
      setupAdMobListeners();

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
              await rescheduleAllRecurringTransactionNotifications(activeTransactions);
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
              await rescheduleAllRecurringTransactionNotifications(activeTransactions);
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

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <RootNavigator />
    </SafeAreaProvider>
  );
}
