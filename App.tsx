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
    // Set up notifications for recurring transactions on every app launch when authenticated
    const setupRecurringTransactionNotifications = async () => {
      if (isAuthenticated && !hasCheckedRecurringTransactionsRef.current) {
        hasCheckedRecurringTransactionsRef.current = true;

        try {
          // If data is still loading, wait for it to complete
          if (isLoading) {
            console.log('Recurring transactions still loading - will set up notifications when ready');
            return;
          }

          // Data is loaded, set up notifications
          if (recurringTransactions.length > 0) {
            console.log(`Setting up notifications for ${recurringTransactions.length} recurring transactions on app launch`);
            await rescheduleAllRecurringTransactionNotifications(recurringTransactions);
            console.log('Recurring transaction notifications set up successfully');
          } else {
            console.log('No recurring transactions found for this user');
          }
        } catch (error) {
          console.error('Error setting up recurring transaction notifications on app launch:', error);
        }
      }
    };

    setupRecurringTransactionNotifications();

    // Reset the check flag when user logs out so it runs again on next login
    if (!isAuthenticated) {
      hasCheckedRecurringTransactionsRef.current = false;
    }
  }, [isAuthenticated, isLoading]);

  // Additional effect to handle when loading completes and we have data
  useEffect(() => {
    const setupNotificationsWhenDataReady = async () => {
      if (isAuthenticated && hasCheckedRecurringTransactionsRef.current && !isLoading && recurringTransactions.length > 0) {
        try {
          console.log(`Setting up notifications for ${recurringTransactions.length} recurring transactions (data now ready)`);
          await rescheduleAllRecurringTransactionNotifications(recurringTransactions);
          console.log('Recurring transaction notifications set up successfully (data ready)');
        } catch (error) {
          console.error('Error setting up recurring transaction notifications when data became ready:', error);
        }
      }
    };

    setupNotificationsWhenDataReady();
  }, [isAuthenticated, recurringTransactions, isLoading]);

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <RootNavigator />
    </SafeAreaProvider>
  );
}
