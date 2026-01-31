/**
 * Repeat Transactions Screen for Gharkharch
 * Lists all repeat transactions with ability to edit, delete, and create new ones
 */

import React, { useState, useEffect, useLayoutEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { useAuthStore, useAccountStore, useRecurringTransactionStore } from '../stores';
import { RootStackParamList, RecurringTransaction, RecurrenceFrequency } from '../types';
import { 
  colors,
  spacing,
  typography,
  borderRadius,
  shadows,
  getAccountTypeColor,
  getAccountTypeBgColor,
  addFontScaleListener,
} from '../config/theme';
import { formatCurrency, DEFAULT_CURRENCY } from '../config/constants';
import { testNotification } from '../services/recurringTransactionService';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const RecurringTransactionsScreen: React.FC = () => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const [fontScaleVersion, setFontScaleVersion] = useState(0);
  useEffect(() => {
    const unsub = addFontScaleListener(() => {
      setFontScaleVersion(v => v + 1);
    });
    return () => {
      unsub();
    };
  }, []);
  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background.primary,
    },
    errorContainer: {
      margin: spacing.lg,
      padding: spacing.md,
      backgroundColor: '#FFEBEE',
      borderRadius: borderRadius.md,
      borderWidth: 1,
      borderColor: '#EF9A9A',
    },
    errorText: {
      fontSize: typography.fontSize.base,
      fontWeight: typography.fontWeight.medium,
      color: '#C62828',
    },
    emptyState: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: spacing.base,
    },
    emptyStateIconContainer: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: colors.primary[50],
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.md,
    },
    emptyStateIcon: {
      fontSize: 40,
    },
    emptyStateText: {
      fontSize: typography.fontSize.lg,
      fontWeight: typography.fontWeight.semiBold,
      color: colors.text.primary,
      marginBottom: spacing.xs,
    },
    emptyStateSubtext: {
      fontSize: typography.fontSize.sm,
      color: colors.text.secondary,
      textAlign: 'center',
      marginBottom: spacing.lg,
      paddingHorizontal: spacing.base,
    },
    addButton: {
      backgroundColor: colors.primary[500],
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.md,
      borderRadius: borderRadius.md,
      ...shadows.md,
    },
    addButtonText: {
      fontSize: typography.fontSize.base,
      fontWeight: typography.fontWeight.semiBold,
      color: colors.neutral[0],
    },
    transactionItem: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      backgroundColor: colors.background.elevated,
      marginHorizontal: spacing.base,
      marginTop: spacing.sm,
      padding: spacing.md,
      borderRadius: borderRadius.lg,
      borderWidth: 1,
      borderColor: colors.border.light,
      ...shadows.md,
    },
    transactionIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: spacing.sm,
      flexShrink: 0,
    },
    transactionIconText: {
      fontSize: typography.fontSize.lg,
      fontWeight: typography.fontWeight.bold,
    },
    transactionContent: {
      flex: 1,
      marginRight: spacing.xs,
    },
    transactionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: spacing.xs,
    },
    transactionTitleContainer: {
      flex: 1,
      marginRight: spacing.sm,
    },
    transactionTitle: {
      fontSize: typography.fontSize.base,
      fontWeight: typography.fontWeight.semiBold,
      color: colors.text.primary,
      marginBottom: 2,
    },
    transactionSubtitle: {
      fontSize: typography.fontSize.xs,
      color: colors.text.secondary,
      marginTop: 1,
    },
    transactionAmount: {
      fontSize: typography.fontSize.lg,
      fontWeight: typography.fontWeight.bold,
      color: colors.primary[500],
      flexShrink: 0,
    },
    transactionDetails: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: spacing.sm,
    },
    detailsLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: spacing.sm,
      flex: 1,
    },
    detailItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    detailIcon: {
      fontSize: typography.fontSize.xs,
    },
    transactionDetail: {
      fontSize: typography.fontSize.xs,
      color: colors.text.secondary,
      fontWeight: typography.fontWeight.medium,
    },
    activeBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.primary[50],
      paddingHorizontal: spacing.xs,
      paddingVertical: 3,
      borderRadius: borderRadius.sm,
      borderWidth: 1,
      borderColor: colors.primary[200],
      gap: 4,
    },
    activeDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: colors.primary[500],
    },
    activeBadgeText: {
      fontSize: typography.fontSize.xs,
      fontWeight: typography.fontWeight.semiBold,
      color: colors.primary[700],
    },
    inactiveBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.neutral[100],
      paddingHorizontal: spacing.xs,
      paddingVertical: 3,
      borderRadius: borderRadius.sm,
      borderWidth: 1,
      borderColor: colors.neutral[300],
      gap: 4,
    },
    inactiveDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: colors.neutral[500],
    },
    inactiveBadgeText: {
      fontSize: typography.fontSize.xs,
      fontWeight: typography.fontWeight.semiBold,
      color: colors.text.secondary,
    },
    transactionNote: {
      fontSize: typography.fontSize.xs,
      color: colors.text.tertiary,
      marginTop: 2,
    },
    fab: {
      position: 'absolute',
      right: spacing.lg,
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: colors.primary[500],
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      ...shadows.lg,
    },
    fabIcon: {
      fontSize: 28,
      color: colors.neutral[0],
      fontWeight: typography.fontWeight.medium,
    },
  });
  
  const { user } = useAuthStore();
  const { getAccountById } = useAccountStore();
  const { 
    recurringTransactions, 
    isLoading, 
    error,
    subscribeToRecurringTransactions,
  } = useRecurringTransactionStore();

  const FREQUENCY_ICONS: Record<RecurrenceFrequency, string> = {
  daily: '📅',
  weekly: '📆',
  monthly: '🗓️',
  yearly: '📅',
};

  const getFrequencyLabel = (f: RecurrenceFrequency) => {
    switch (f) {
      case 'daily':
        return t('recurring.frequency.daily');
      case 'weekly':
        return t('recurring.frequency.weekly');
      case 'monthly':
        return t('recurring.frequency.monthly');
      case 'yearly':
        return t('recurring.frequency.yearly');
      default:
        return '';
    }
  };

  // Subscribe to recurring transactions
  useEffect(() => {
    if (user?.id) {
      const unsubscribe = subscribeToRecurringTransactions(user.id);
      return () => {
        unsubscribe();
      };
    }
  }, [user?.id, subscribeToRecurringTransactions]);

  // Add test notification button to header
  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          onPress={handleTestNotification}
          style={{ marginRight: 16, padding: 4 }}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="notifications-outline" size={24} color={colors.primary[500]} />
        </TouchableOpacity>
      ),
    });
  }, [navigation]);

  const currency = user?.currency ?? DEFAULT_CURRENCY;

  const handleAddRecurringTransaction = () => {
    navigation.navigate('AddRecurringTransaction');
  };

  const handleEditRecurringTransaction = (recurringTransactionId: string) => {
    navigation.navigate('AddRecurringTransaction', { editRecurringTransactionId: recurringTransactionId });
  };

  const handleTestNotification = async () => {
    const success = await testNotification();
    if (success) {
      Alert.alert(
        t('recurring.testNotificationTitle'),
        t('recurring.testNotificationMessage'),
        [{ text: t('common.ok') }]
      );
    }
  };


  const formatNextOccurrence = (date: Date) => {
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const renderRecurringTransaction = ({ item }: { item: RecurringTransaction }) => {
    const debitAccount = getAccountById(item.debitAccountId);
    const creditAccount = getAccountById(item.creditAccountId);
    const nextOccurrence = item.nextOccurrence; // Already a Date object from the store
    
    // Determine transaction type for icon
    const isExpense = debitAccount?.accountType === 'expense';
    const isIncome = creditAccount?.accountType === 'income';
    const accountType = isExpense ? 'expense' : isIncome ? 'income' : debitAccount?.accountType || 'asset';

    return (
      <TouchableOpacity
        style={styles.transactionItem}
        onPress={() => handleEditRecurringTransaction(item.id)}
        activeOpacity={0.7}
      >
        {/* Icon */}
        <View style={[
          styles.transactionIcon,
          { backgroundColor: getAccountTypeBgColor(accountType) }
        ]}>
          <Text style={[
            styles.transactionIconText,
            { color: getAccountTypeColor(accountType) }
          ]}>
            {isExpense ? '↑' : '↓'}
          </Text>
        </View>

        {/* Content */}
        <View style={styles.transactionContent}>
          {/* Header Row: Title and Amount */}
          <View style={styles.transactionHeader}>
            <View style={styles.transactionTitleContainer}>
              <Text style={styles.transactionTitle} numberOfLines={1}>
                {debitAccount?.name ?? 'Unknown'}
              </Text>
              <Text style={styles.transactionSubtitle} numberOfLines={1}>
                {t('common.from')} {creditAccount?.name ?? t('common.unknown')}
              </Text>
            </View>
            <Text style={styles.transactionAmount}>
              {formatCurrency(item.amount, currency)}
            </Text>
          </View>
          
          {/* Details Row: Frequency, Date, and Status */}
          <View style={styles.transactionDetails}>
            <View style={styles.detailsLeft}>
              <View style={styles.detailItem}>
                <Text style={styles.detailIcon}>{FREQUENCY_ICONS[item.frequency]}</Text>
                <Text style={styles.transactionDetail}>
                  {getFrequencyLabel(item.frequency)}
                </Text>
              </View>
              
              <View style={styles.detailItem}>
                <Text style={styles.detailIcon}>⏰</Text>
                <Text style={styles.transactionDetail}>
                  {formatNextOccurrence(nextOccurrence)}
                </Text>
              </View>
            </View>
            
            {item.isActive ? (
              <View style={styles.activeBadge}>
                <View style={styles.activeDot} />
                <Text style={styles.activeBadgeText}>{t('recurring.active')}</Text>
              </View>
            ) : (
              <View style={styles.inactiveBadge}>
                <View style={styles.inactiveDot} />
                <Text style={styles.inactiveBadgeText}>{t('recurring.inactive')}</Text>
              </View>
            )}
          </View>

          {/* Note if present */}
          {item.note && (
            <Text style={styles.transactionNote} numberOfLines={1}>
              {item.note}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>⚠️ {error}</Text>
        </View>
      )}

      {isLoading ? (
        <View style={styles.emptyState}>
          <ActivityIndicator size="large" color={colors.primary[500]} />
          <Text style={styles.emptyStateText}>{t('common.loading')}</Text>
        </View>
      ) : recurringTransactions.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyStateIconContainer}>
            <Text style={styles.emptyStateIcon}>🔄</Text>
          </View>
          <Text style={styles.emptyStateText}>{t('recurring.emptyTitle')}</Text>
          <Text style={styles.emptyStateSubtext}>
            {t('recurring.emptySubtext')}
          </Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={handleAddRecurringTransaction}
            activeOpacity={0.8}
          >
            <Text style={styles.addButtonText}>{t('recurring.addRepeatTransaction')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <FlatList
            data={recurringTransactions}
            renderItem={renderRecurringTransaction}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ 
              paddingBottom: insets.bottom + spacing.xl,
              paddingTop: spacing.sm,
            }}
            showsVerticalScrollIndicator={false}
          />

          {/* FAB */}
          <TouchableOpacity
            style={[styles.fab, { bottom: insets.bottom + spacing.lg }]}
            onPress={handleAddRecurringTransaction}
          >
            <Text style={styles.fabIcon}>+</Text>
          </TouchableOpacity>
        </>
      )}
    </KeyboardAvoidingView>
  );
};

 

export default RecurringTransactionsScreen;
