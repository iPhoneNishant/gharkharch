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
  const { recurringTransactions } = useRecurringTransactionStore();
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
          // Wait for recurring transactions to be loaded (they are subscribed to in RootNavigator)
          if (recurringTransactions.length > 0) {
            console.log(`Setting up notifications for ${recurringTransactions.length} recurring transactions on app launch`);
            await rescheduleAllRecurringTransactionNotifications(recurringTransactions);
            console.log('Recurring transaction notifications set up successfully');
          } else {
            console.log('No recurring transactions found - will check again when data loads');
            // Set up a watcher for when data becomes available
            const checkAgain = setTimeout(async () => {
              if (recurringTransactions.length > 0) {
                console.log(`Setting up notifications for ${recurringTransactions.length} recurring transactions (delayed)`);
                await rescheduleAllRecurringTransactionNotifications(recurringTransactions);
                console.log('Recurring transaction notifications set up successfully (delayed)');
              }
            }, 3000);
            return () => clearTimeout(checkAgain);
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
  }, [isAuthenticated, recurringTransactions]);

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <RootNavigator />
    </SafeAreaProvider>
  );
}
