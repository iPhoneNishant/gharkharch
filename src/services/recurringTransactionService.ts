/**
 * Recurring Transaction Service
 * Handles scheduling, notifications, and automatic transaction creation
 */

import * as Notifications from 'expo-notifications';
import { Platform, Alert } from 'react-native';
import { RecurringTransaction, RecurrenceFrequency } from '../types';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
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
    console.log(`Attempting to schedule notification for transaction ${recurringTransaction.id}`);

    // Only schedule if transaction is active
    if (!recurringTransaction.isActive) {
      console.log(`Skipping notification for inactive transaction ${recurringTransaction.id}`);
      await cancelRecurringTransactionNotification(recurringTransaction.id);
      return null;
    }

    console.log(`Transaction ${recurringTransaction.id} is active, checking notification settings`);

    // Request notification permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      console.warn(`Notification permissions not granted for transaction ${recurringTransaction.id}`);
      return null;
    }

    // Cancel any existing notifications for this recurring transaction
    await cancelRecurringTransactionNotification(recurringTransaction.id);

    const nextOccurrence = new Date(recurringTransaction.nextOccurrence);
    const now = new Date();

    console.log(`Transaction ${recurringTransaction.id}: isActive=${recurringTransaction.isActive}, notifyBeforeDays=${recurringTransaction.notifyBeforeDays}`);
    console.log(`Transaction ${recurringTransaction.id}: raw nextOccurrence from DB:`, recurringTransaction.nextOccurrence);
    console.log(`Transaction ${recurringTransaction.id}: parsed nextOccurrence: ${nextOccurrence.toISOString()}`);
    console.log(`Transaction ${recurringTransaction.id}: parsed nextOccurrence local: ${nextOccurrence.toLocaleString()}`);
    console.log(`Transaction ${recurringTransaction.id}: current time (now): ${now.toISOString()}`);
    console.log(`Transaction ${recurringTransaction.id}: current time local: ${now.toLocaleString()}`);

    let scheduledNotificationId: string | null = null;

    console.log(`Transaction ${recurringTransaction.id}: checking if notification should be sent before occurrence`);

    // If notification should be sent before the occurrence
    if (recurringTransaction.notifyBeforeDays && recurringTransaction.notifyBeforeDays > 0) {
      const notificationDate = new Date(nextOccurrence);
      notificationDate.setDate(notificationDate.getDate() - recurringTransaction.notifyBeforeDays);
      notificationDate.setHours(9, 0, 0, 0); // Set to 9 AM for better UX

      console.log(`Transaction ${recurringTransaction.id}: nextOccurrence=${nextOccurrence.toISOString()}, notifyBeforeDays=${recurringTransaction.notifyBeforeDays}`);
      console.log(`Transaction ${recurringTransaction.id}: calculated notificationDate=${notificationDate.toISOString()}, now=${now.toISOString()}`);
      console.log(`Transaction ${recurringTransaction.id}: notificationDate > now = ${notificationDate > now}`);

      // Only schedule if notification date is in the future
      if (notificationDate > now) {
        try {
          // Additional check: if notification is for today, only schedule if it's after current time
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const notificationDay = new Date(notificationDate);
          notificationDay.setHours(0, 0, 0, 0);

          if (notificationDay.getTime() === today.getTime() && notificationDate <= now) {
            console.log(`Transaction ${recurringTransaction.id}: Skipping notification for today as it's already past the scheduled time`);
            return null;
          }

          // Additional safety check: ensure notification is at least 5 minutes in the future
          const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);
          if (notificationDate <= fiveMinutesFromNow) {
            console.log(`Transaction ${recurringTransaction.id}: Notification too soon (${notificationDate.toISOString()}), skipping`);
            return null;
          }

          // Check if notification is too far in the future (Expo limit is typically 1 year)
          const oneYearFromNow = new Date();
          oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);

          if (notificationDate > oneYearFromNow) {
            console.log(`Transaction ${recurringTransaction.id}: Notification too far in future (${notificationDate.toISOString()}), skipping`);
            return null;
          }

          console.log(`Transaction ${recurringTransaction.id}: Scheduling notification for ${notificationDate.toISOString()}`);

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
                  channelId: 'recurring-transactions',
                }
              : {
                  date: notificationDate,
                },
          });
          
          console.log(`✓ Scheduled reminder notification for ${recurringTransaction.id} at ${notificationDate.toISOString()}, ID: ${notificationId}`);
          scheduledNotificationId = notificationId;
        } catch (error) {
          console.error(`Failed to schedule reminder notification:`, error);
        }
      } else {
        console.log(`Reminder date ${notificationDate.toISOString()} is in the past, skipping`);
      }
    }

    // Important: We intentionally DO NOT schedule a "due today" notification.
    // As per requirement, notifications should trigger only on "days before" the transaction date.
    return scheduledNotificationId;
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
 * Reschedule notifications for all active recurring transactions
 */
export const rescheduleAllRecurringTransactionNotifications = async (
  recurringTransactions: RecurringTransaction[]
): Promise<void> => {
  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') {
      console.warn('Notification permissions not granted, skipping reschedule');
      return;
    }

    const activeTransactions = recurringTransactions.filter(rt => rt.isActive);
    console.log(`Rescheduling notifications for ${activeTransactions.length} active recurring transactions`);
    
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
 * Useful for testing if notifications work in your environment
 */
export const testNotification = async (): Promise<boolean> => {
  try {
    console.log('Testing notification...');
    
    // Request permissions
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') {
      console.warn('Notification permissions not granted. Cannot test notification.');
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
            channelId: 'recurring-transactions',
          }
        : {
            date: testDate,
          },
    });

    console.log(`✓ Test notification scheduled for ${testDate.toISOString()}, ID: ${notificationId}`);
    return true;
  } catch (error) {
    console.error('Error testing notification:', error);
    return false;
  }
};

/**
 * Initialize notification handling
 */
export const initializeNotifications = async (): Promise<void> => {
  try {
    // Request permissions
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') {
      console.warn('Notification permissions not granted. Please enable notifications in settings.');
      return;
    }

    console.log('Notification permissions granted');

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
      console.log('Android notification channel configured');
    }

    // Log scheduled notifications for debugging
    const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
    console.log(`Currently scheduled ${scheduledNotifications.length} notifications`);
    
    // Log details of scheduled notifications
    if (scheduledNotifications.length > 0) {
      scheduledNotifications.forEach((notif, index) => {
        console.log(`Notification ${index + 1}:`, {
          id: notif.identifier,
          title: notif.content.title,
          body: notif.content.body,
          trigger: notif.trigger,
        });
      });
    }
  } catch (error) {
    console.error('Error initializing notifications:', error);
  }
};
