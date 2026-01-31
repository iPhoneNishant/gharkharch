/**
 * Recurring Transaction Service
 * Handles scheduling, notifications, and automatic transaction creation
 */

import * as Notifications from 'expo-notifications';
import { Platform, Alert } from 'react-native';
import { RecurringTransaction, RecurrenceFrequency } from '../types';
import { useTransactionStore } from '../stores';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Calculate the next occurrence date based on frequency and day of recurrence
 */
export const calculateNextOccurrence = (
  frequency: RecurrenceFrequency,
  dayOfRecurrence: number,
  startDate: Date,
  lastCreatedDate?: Date
): Date => {
  const baseDate = lastCreatedDate || startDate;
  const nextDate = new Date(baseDate);

  switch (frequency) {
    case 'daily':
      nextDate.setDate(nextDate.getDate() + 1);
      break;
    
    case 'weekly':
      // dayOfRecurrence is day of week (0-6, Sunday=0)
      const currentDay = nextDate.getDay();
      let daysUntilNext = (dayOfRecurrence - currentDay + 7) % 7;
      if (daysUntilNext === 0) daysUntilNext = 7; // Next week if same day
      nextDate.setDate(nextDate.getDate() + daysUntilNext);
      break;
    
    case 'monthly':
      // dayOfRecurrence is day of month (1-31)
      nextDate.setMonth(nextDate.getMonth() + 1);
      // Handle edge cases for months with fewer days
      const maxDay = new Date(nextDate.getFullYear(), nextDate.getMonth() + 1, 0).getDate();
      nextDate.setDate(Math.min(dayOfRecurrence, maxDay));
      break;
    
    case 'yearly':
      // dayOfRecurrence is day of month (1-31)
      nextDate.setFullYear(nextDate.getFullYear() + 1);
      // Handle leap year edge case
      const maxDayYear = new Date(nextDate.getFullYear(), nextDate.getMonth() + 1, 0).getDate();
      nextDate.setDate(Math.min(dayOfRecurrence, maxDayYear));
      break;
  }

  return nextDate;
};

/**
 * Check if a recurring transaction should create a transaction today
 */
export const shouldCreateTransactionToday = (recurringTransaction: RecurringTransaction): boolean => {
  if (!recurringTransaction.isActive) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const nextOccurrence = new Date(recurringTransaction.nextOccurrence);
  nextOccurrence.setHours(0, 0, 0, 0);

  // Check if today matches the next occurrence
  if (today.getTime() !== nextOccurrence.getTime()) return false;

  // Check if we're within the date range
  const startDate = new Date(recurringTransaction.startDate);
  startDate.setHours(0, 0, 0, 0);
  
  if (today.getTime() < startDate.getTime()) return false;

  if (recurringTransaction.endDate) {
    const endDate = new Date(recurringTransaction.endDate);
    endDate.setHours(0, 0, 0, 0);
    if (today.getTime() > endDate.getTime()) return false;
  }

  // Check if we already created a transaction for this occurrence
  if (recurringTransaction.lastCreatedDate) {
    const lastCreated = new Date(recurringTransaction.lastCreatedDate);
    lastCreated.setHours(0, 0, 0, 0);
    if (lastCreated.getTime() === today.getTime()) return false;
  }

  return true;
};

/**
 * Schedule a notification for a recurring transaction
 */
export const scheduleRecurringTransactionNotification = async (
  recurringTransaction: RecurringTransaction
): Promise<string | null> => {
  try {
    // Only schedule if transaction is active
    if (!recurringTransaction.isActive) {
      await cancelRecurringTransactionNotification(recurringTransaction.id);
      return null;
    }

    // Request notification permissions
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') {
      const { status: newStatus } = await Notifications.requestPermissionsAsync();
      if (newStatus !== 'granted') {
        return null;
      }
    }

    // Cancel any existing notifications for this transaction
    await cancelRecurringTransactionNotification(recurringTransaction.id);

    const nextOccurrence = new Date(recurringTransaction.nextOccurrence);
    const now = new Date();

    // Skip if next occurrence is too soon (prevents immediate notifications)
    const minFutureTime = new Date(now.getTime() + 2 * 60 * 60 * 1000); // 2 hours minimum
    if (nextOccurrence <= minFutureTime) {
      return null;
    }

    // Calculate notification date (days before occurrence)
    const notifyBeforeDays = recurringTransaction.notifyBeforeDays || 0;
    if (notifyBeforeDays <= 0) {
      return null; // No notification needed
    }

    const notificationDate = new Date(nextOccurrence);
    notificationDate.setDate(notificationDate.getDate() - notifyBeforeDays);
    notificationDate.setHours(9, 0, 0, 0); // 9 AM

    // Ensure notification is at least 2 hours in the future
    const minNotificationTime = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    if (notificationDate <= minNotificationTime) {
      return null;
    }

    // Don't schedule if more than 1 year in future
    const maxFutureTime = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());
    if (notificationDate > maxFutureTime) {
      return null;
    }

    // Schedule the notification
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Repeat Transaction Reminder',
        body: `Reminder: ${recurringTransaction.note || 'Repeat transaction'} of ₹${recurringTransaction.amount} is due on ${nextOccurrence.toLocaleDateString()}`,
        data: {
          recurringTransactionId: recurringTransaction.id,
          type: 'recurring_transaction_reminder',
        },
        sound: true,
      },
      trigger: Platform.OS === 'android'
        ? {
            date: notificationDate,
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            channelId: 'recurring-transactions',
          }
        : {
            date: notificationDate,
          } as any,
    });

    return notificationId;
  } catch (error) {
    console.error(`Error scheduling notification for transaction ${recurringTransaction.id}:`, error);
    return null;
  }
};

/**
 * Cancel notification for a recurring transaction
 */
export const cancelRecurringTransactionNotification = async (recurringTransactionId: string): Promise<void> => {
  try {
    const allNotifications = await Notifications.getAllScheduledNotificationsAsync();
    const notificationsToCancel = allNotifications.filter(
      notification => notification.content.data?.recurringTransactionId === recurringTransactionId
    );
    
    for (const notification of notificationsToCancel) {
      await Notifications.cancelScheduledNotificationAsync(notification.identifier);
    }
  } catch (error) {
    console.error('Error canceling notification:', error);
  }
};

/**
 * Process recurring transactions and create transactions for due dates
 * This should be called daily (e.g., on app startup or via background task)
 */
export const processRecurringTransactions = async (
  recurringTransactions: RecurringTransaction[]
): Promise<void> => {
  const { createTransaction } = useTransactionStore.getState();
  
  for (const recurringTransaction of recurringTransactions) {
    if (shouldCreateTransactionToday(recurringTransaction)) {
      try {
        // Create the transaction
        await createTransaction({
          date: new Date().toISOString(),
          amount: recurringTransaction.amount,
          debitAccountId: recurringTransaction.debitAccountId,
          creditAccountId: recurringTransaction.creditAccountId,
          note: recurringTransaction.note,
        });

        // Update the recurring transaction's lastCreatedDate and nextOccurrence
        // This should be done via Cloud Function, but for now we'll note it
        console.log(`Created transaction for recurring transaction ${recurringTransaction.id}`);
      } catch (error) {
        console.error(`Failed to create transaction for recurring transaction ${recurringTransaction.id}:`, error);
      }
    }
  }
};

/**
 * Cancel all scheduled notifications
 */
export const cancelAllScheduledNotifications = async (): Promise<void> => {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch (error) {
    console.error('Error cancelling all notifications:', error);
  }
};

/**
 * Cancel all scheduled notifications
 */
export const disableAllNotifications = async (): Promise<void> => {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch (error) {
    console.error('Error disabling notifications:', error);
  }
};

/**
 * Reschedule notifications for all active recurring transactions
 */
export const rescheduleAllRecurringTransactionNotifications = async (
  recurringTransactions: RecurringTransaction[],
  shouldRequestPermissions = false
): Promise<void> => {
  try {
    let { status } = await Notifications.getPermissionsAsync();
    
    if (status !== 'granted' && shouldRequestPermissions) {
      const { status: newStatus } = await Notifications.requestPermissionsAsync();
      status = newStatus;
    }

    if (status !== 'granted') {
      return;
    }

    // Cancel all existing notifications to prevent duplicates
    await Notifications.cancelAllScheduledNotificationsAsync();

    // Schedule notifications for active transactions
    const activeTransactions = recurringTransactions.filter(rt => rt.isActive);

    for (const transaction of activeTransactions) {
      try {
        await scheduleRecurringTransactionNotification(transaction);
      } catch (error) {
        console.error(`Failed to reschedule notification for transaction ${transaction.id}:`, error);
      }
    }
  } catch (error) {
    console.error('Error rescheduling notifications:', error);
  }
};

/**
 * Test notification - schedules a notification for 5 seconds from now
 */
export const testNotification = async (): Promise<boolean> => {
  try {
    // Request permissions
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please grant notification permissions to test notifications.');
      return false;
    }

    // Configure notification channel for Android
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('recurring-transactions', {
        name: 'Repeat Transactions',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
        sound: 'default',
        enableVibrate: true,
      });
    }

    // Schedule a test notification for 5 seconds from now
    const testDate = new Date();
    testDate.setSeconds(testDate.getSeconds() + 5);

    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Test Notification',
        body: 'If you see this, local notifications are working! 🎉',
        sound: true,
        data: { type: 'test' },
      },
      trigger: Platform.OS === 'android'
        ? {
            date: testDate,
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            channelId: 'recurring-transactions',
          }
        : {
            date: testDate,
          } as any,
    });

    console.log(`✓ Test notification scheduled for ${testDate.toISOString()}, ID: ${notificationId}`);
    return true;
  } catch (error) {
    console.error('Error testing notification:', error);
    return false;
  }
};

/**
 * Setup notification channels (Android)
 * Note: Does not request permissions, call requestPermissionsAsync() when needed
 */
export const setupNotificationChannels = async (): Promise<void> => {
  try {
    // Configure notification channel for Android
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('recurring-transactions', {
        name: 'Repeat Transactions',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
        sound: 'default',
        enableVibrate: true,
      });
    }
  } catch (error) {
    console.error('Error setting up notification channels:', error);
  }
};
