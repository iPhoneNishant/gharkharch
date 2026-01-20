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
      if (isAuthenticated && !hasCheckedRecurringTransactionsRef.current) {
        hasCheckedRecurringTransactionsRef.current = true;

        try {
          // If data is still loading, wait for it to complete
          if (isLoading) {
            console.log('Recurring transactions still loading - will schedule notifications when ready');
            return;
          }

          // Schedule notifications for all active recurring transactions (regardless of when they're due)
          const activeTransactions = recurringTransactions.filter(rt => rt.isActive);

          console.log(`Total recurring transactions: ${recurringTransactions.length}`);
          console.log(`Active recurring transactions: ${activeTransactions.length}`);
          console.log('Active transaction IDs:', activeTransactions.map(rt => `${rt.id}(active:${rt.isActive})`));

          if (activeTransactions.length > 0) {
            console.log(`Scheduling notifications for next occurrence of ${activeTransactions.length} active recurring transactions`);
            await rescheduleAllRecurringTransactionNotifications(activeTransactions);
            console.log('All recurring transaction notifications scheduled successfully for next occurrences');
          } else {
            console.log('No active recurring transactions found to schedule notifications for');
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
  }, [isAuthenticated, isLoading]);

  // Additional effect to handle when loading completes and we have data
  useEffect(() => {
    const scheduleNotificationsWhenDataReady = async () => {
      if (isAuthenticated && hasCheckedRecurringTransactionsRef.current && !isLoading) {
        try {
          const activeTransactions = recurringTransactions.filter(rt => rt.isActive);

          if (activeTransactions.length > 0) {
            console.log(`Scheduling notifications for next occurrence of ${activeTransactions.length} active transactions (data now ready)`);
            await rescheduleAllRecurringTransactionNotifications(activeTransactions);
            console.log('All recurring transaction notifications scheduled successfully (data ready)');
          }
        } catch (error) {
          console.error('Error scheduling recurring transaction notifications when data became ready:', error);
        }
      }
    };

    scheduleNotificationsWhenDataReady();
  }, [isAuthenticated, recurringTransactions, isLoading]);

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <RootNavigator />
    </SafeAreaProvider>
  );
}
