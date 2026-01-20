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
    // Check for recurring transactions that need notifications on app launch
    const checkRecurringTransactionsForNotifications = async () => {
      if (isAuthenticated && !hasCheckedRecurringTransactionsRef.current) {
        hasCheckedRecurringTransactionsRef.current = true;

        try {
          // If data is still loading, wait for it to complete
          if (isLoading) {
            console.log('Recurring transactions still loading - will check notifications when ready');
            return;
          }

          // Check if any transactions actually need notifications scheduled
          const activeTransactionsWithNotifications = recurringTransactions.filter(
            rt => rt.isActive && rt.notifyBeforeDays && rt.notifyBeforeDays > 0
          );

          if (activeTransactionsWithNotifications.length > 0) {
            console.log(`Found ${activeTransactionsWithNotifications.length} recurring transactions with notifications enabled`);

            // Only reschedule if there are transactions that might need immediate notifications
            // (e.g., due very soon and haven't been notified yet)
            const now = new Date();
            const transactionsNeedingImmediateCheck = activeTransactionsWithNotifications.filter(rt => {
              const nextOccurrence = new Date(rt.nextOccurrence);
              const notificationDate = new Date(nextOccurrence);
              notificationDate.setDate(notificationDate.getDate() - (rt.notifyBeforeDays || 0));
              notificationDate.setHours(9, 0, 0, 0);

              // Only reschedule if the notification should be within the next 24 hours
              const twentyFourHoursFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
              return notificationDate <= twentyFourHoursFromNow && notificationDate > now;
            });

            if (transactionsNeedingImmediateCheck.length > 0) {
              console.log(`Rescheduling notifications for ${transactionsNeedingImmediateCheck.length} transactions due soon`);
              await rescheduleAllRecurringTransactionNotifications(recurringTransactions);
              console.log('Urgent recurring transaction notifications rescheduled successfully');
            } else {
              console.log('No recurring transactions need immediate notification rescheduling');
            }
          } else {
            console.log('No recurring transactions with notifications enabled');
          }
        } catch (error) {
          console.error('Error checking recurring transaction notifications on app launch:', error);
        }
      }
    };

    checkRecurringTransactionsForNotifications();

    // Reset the check flag when user logs out so it runs again on next login
    if (!isAuthenticated) {
      hasCheckedRecurringTransactionsRef.current = false;
    }
  }, [isAuthenticated, isLoading]);

  // Additional effect to handle when loading completes and we have data
  useEffect(() => {
    const checkNotificationsWhenDataReady = async () => {
      if (isAuthenticated && hasCheckedRecurringTransactionsRef.current && !isLoading) {
        try {
          const activeTransactionsWithNotifications = recurringTransactions.filter(
            rt => rt.isActive && rt.notifyBeforeDays && rt.notifyBeforeDays > 0
          );

          if (activeTransactionsWithNotifications.length > 0) {
            // Check for transactions that need immediate notifications
            const now = new Date();
            const transactionsNeedingImmediateCheck = activeTransactionsWithNotifications.filter(rt => {
              const nextOccurrence = new Date(rt.nextOccurrence);
              const notificationDate = new Date(nextOccurrence);
              notificationDate.setDate(notificationDate.getDate() - (rt.notifyBeforeDays || 0));
              notificationDate.setHours(9, 0, 0, 0);

              // Only reschedule if the notification should be within the next 24 hours
              const twentyFourHoursFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
              return notificationDate <= twentyFourHoursFromNow && notificationDate > now;
            });

            if (transactionsNeedingImmediateCheck.length > 0) {
              console.log(`Rescheduling notifications for ${transactionsNeedingImmediateCheck.length} transactions (data now ready)`);
              await rescheduleAllRecurringTransactionNotifications(recurringTransactions);
              console.log('Recurring transaction notifications rescheduled successfully (data ready)');
            }
          }
        } catch (error) {
          console.error('Error checking recurring transaction notifications when data became ready:', error);
        }
      }
    };

    checkNotificationsWhenDataReady();
  }, [isAuthenticated, recurringTransactions, isLoading]);

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <RootNavigator />
    </SafeAreaProvider>
  );
}
