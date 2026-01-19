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

import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { RootNavigator } from './src/navigation';
import { initializeNotifications } from './src/services/recurringTransactionService';

export default function App() {
  useEffect(() => {
    // Initialize notifications for recurring transactions
    initializeNotifications();
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <RootNavigator />
    </SafeAreaProvider>
  );
}
