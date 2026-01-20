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
import { initializeNotifications, rescheduleAllRecurringTransactionNotifications } from './src/services/recurringTransactionService';
import { useAuthStore } from './src/stores';
import { useRecurringTransactionStore } from './src/stores/recurringTransactionStore';

export default function App() {
  const { isAuthenticated } = useAuthStore();
  const { recurringTransactions, isLoading } = useRecurringTransactionStore();
  const hasInitializedNotificationsRef = useRef(false);
  const hasCheckedRecurringTransactionsRef = useRef(false);

  useEffect(() => {
    // Initialize notifications for recurring transactions (one-time setup)
    if (!hasInitializedNotificationsRef.current) {
      hasInitializedNotificationsRef.current = true;
      initializeNotifications();
    }
  }, []);

  useEffect(() => {
    // Schedule notifications for next occurrence of all active recurring transactions on app launch
    const scheduleAllActiveRecurringTransactionNotifications = async () => {
      if (isAuthenticated && !hasCheckedRecurringTransactionsRef.current && !isLoading) {
        hasCheckedRecurringTransactionsRef.current = true;

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
