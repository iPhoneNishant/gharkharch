/**
 * Add Repeat Transaction Screen for Gharkharch
 * Allows users to create recurring expense/income entries with automatic scheduling
 */

import React, { useState, useMemo, useEffect, useLayoutEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Modal,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { useAuthStore, useAccountStore, useRecurringTransactionStore } from '../stores';
import { RootStackParamList, Account, AccountType, RecurrenceFrequency } from '../types';
import { 
  colors, 
  typography, 
  spacing, 
  borderRadius, 
  shadows,
  getAccountTypeColor,
  getAccountTypeBgColor,
  addFontScaleListener,
} from '../config/theme';
import { formatCurrency, DEFAULT_CURRENCY } from '../config/constants';
import { calculateNextOccurrence, scheduleRecurringTransactionNotification } from '../services/recurringTransactionService';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'AddRecurringTransaction'>;
type RouteType = RouteProp<RootStackParamList, 'AddRecurringTransaction'>;

const FREQUENCY_OPTIONS: { label: string; value: RecurrenceFrequency }[] = [
  { label: 'Daily', value: 'daily' },
  { label: 'Weekly', value: 'weekly' },
  { label: 'Monthly', value: 'monthly' },
  { label: 'Yearly', value: 'yearly' },
];

const WEEK_DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const AddRecurringTransactionScreen: React.FC = () => {
  console.log('AddRecurringTransactionScreen rendered');
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteType>();
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
    scrollContent: {
      padding: spacing.lg,
    },
    amountContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing['2xl'],
    },
    currencySymbol: {
      fontSize: typography.fontSize['3xl'],
      fontWeight: typography.fontWeight.medium,
      color: colors.text.secondary,
      marginRight: spacing.sm,
    },
    amountInput: {
      fontSize: typography.fontSize['4xl'],
      fontWeight: typography.fontWeight.bold,
      color: colors.text.primary,
      minWidth: 150,
      textAlign: 'center',
    },
    recurringIndicator: {
      alignItems: 'center',
      marginBottom: spacing.lg,
      paddingHorizontal: spacing.base,
    },
    recurringBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.primary[50],
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
      borderRadius: borderRadius.full,
      gap: spacing.xs,
    },
    recurringText: {
      fontSize: typography.fontSize.sm,
      fontWeight: typography.fontWeight.semiBold,
      color: colors.primary[500],
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    formSection: {
      backgroundColor: colors.background.elevated,
      borderRadius: borderRadius.lg,
      marginBottom: spacing.lg,
      ...shadows.sm,
    },
    accountSelector: {
      padding: spacing.base,
      marginBottom: spacing.sm,
    },
    accountSelectorContent: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    accountSelectorLeft: {
      flex: 1,
    },
    accountLabel: {
      fontSize: typography.fontSize.sm,
      color: colors.text.secondary,
      marginBottom: spacing.xs,
    },
    selectedAccount: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    accountDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      marginRight: spacing.sm,
    },
    accountName: {
      fontSize: typography.fontSize.base,
      fontWeight: typography.fontWeight.medium,
      color: colors.text.primary,
    },
    accountPlaceholder: {
      fontSize: typography.fontSize.base,
      color: colors.text.tertiary,
    },
    arrowContainer: {
      alignItems: 'center',
      paddingVertical: spacing.xs,
    },
    selector: {
      padding: spacing.base,
    },
    selectorContent: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
    },
    selectorLeft: {
      flex: 1,
    },
    selectorLabelRow: {
      flexDirection: 'row',
      alignItems: 'baseline',
      gap: spacing.xs,
      marginBottom: spacing.sm,
    },
    selectorValueContainer: {
      minHeight: 20,
    },
    selectorValue: {
      fontSize: typography.fontSize.base,
      fontWeight: typography.fontWeight.medium,
      color: colors.text.primary,
    },
    selectorRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
    },
    clearButton: {
      padding: spacing.xs,
    },
    inputContainer: {
      padding: spacing.base,
    },
    inputLabel: {
      fontSize: typography.fontSize.sm,
      color: colors.text.secondary,
      marginBottom: spacing.sm,
    },
    textInput: {
      fontSize: typography.fontSize.base,
      color: colors.text.primary,
      paddingVertical: spacing.xs,
      minHeight: 40,
    },
    hint: {
      fontSize: typography.fontSize.xs,
      color: colors.text.tertiary,
      marginTop: spacing.xs,
    },
    submitButton: {
      backgroundColor: colors.primary[500],
      borderRadius: borderRadius.lg,
      paddingVertical: spacing.base,
      alignItems: 'center',
      marginTop: spacing.lg,
      ...shadows.md,
    },
    submitButtonDisabled: {
      opacity: 0.7,
    },
    loadingContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
    },
    submitButtonText: {
      fontSize: typography.fontSize.base,
      fontWeight: typography.fontWeight.semiBold,
      color: colors.neutral[0],
    },
    loadingOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000,
    },
    loadingContent: {
      backgroundColor: colors.background.elevated,
      borderRadius: borderRadius.lg,
      padding: spacing.xl,
      alignItems: 'center',
      minWidth: 200,
      ...shadows.lg,
    },
    loadingText: {
      marginTop: spacing.base,
      fontSize: typography.fontSize.base,
      fontWeight: typography.fontWeight.medium,
      color: colors.text.primary,
    },
    modalContainer: {
      flex: 1,
      backgroundColor: colors.background.primary,
    },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: spacing.base,
      borderBottomWidth: 1,
      borderBottomColor: colors.border.light,
    },
    modalCancelButton: {
      minWidth: 90,
      paddingHorizontal: spacing.sm,
    },
    modalCancel: {
      fontSize: typography.fontSize.base,
      color: colors.primary[500],
    },
    modalTitle: {
      fontSize: typography.fontSize.lg,
      fontWeight: typography.fontWeight.semiBold,
      color: colors.text.primary,
      flex: 1,
      textAlign: 'center',
    },
    searchInput: {
      backgroundColor: colors.background.elevated,
      borderRadius: borderRadius.md,
      padding: spacing.base,
      margin: spacing.base,
      fontSize: typography.fontSize.base,
      color: colors.text.primary,
    },
    accountItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: spacing.base,
      borderBottomWidth: 1,
      borderBottomColor: colors.border.light,
    },
    accountItemInfo: {
      flex: 1,
      marginLeft: spacing.sm,
    },
    accountItemName: {
      fontSize: typography.fontSize.base,
      fontWeight: typography.fontWeight.medium,
      color: colors.text.primary,
    },
    accountItemType: {
      fontSize: typography.fontSize.sm,
      color: colors.text.secondary,
      marginTop: 2,
    },
    checkmark: {
      fontSize: typography.fontSize.lg,
      color: colors.primary[500],
      fontWeight: typography.fontWeight.bold,
    },
    optionItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: spacing.base,
      borderBottomWidth: 1,
      borderBottomColor: colors.border.light,
    },
    optionText: {
      fontSize: typography.fontSize.base,
      color: colors.text.primary,
    },
  });
  
  const { user } = useAuthStore();
  const { accounts } = useAccountStore();
  const { 
    createRecurringTransaction, 
    updateRecurringTransaction,
    deleteRecurringTransaction,
    getRecurringTransactionById,
    fetchRecurringTransactionById,
    subscribeToRecurringTransactions
  } = useRecurringTransactionStore();

  // Subscribe to recurring transactions when user is available (needed for editing)
  useEffect(() => {
    if (user?.id) {
      const unsubscribe = subscribeToRecurringTransactions(user.id);
      return () => {
        unsubscribe();
      };
    }
  }, [user?.id, subscribeToRecurringTransactions]);

  const editRecurringTransactionId = route.params?.editRecurringTransactionId;
  const isEditing = !!editRecurringTransactionId;
  const existingRecurringTransaction = editRecurringTransactionId 
    ? getRecurringTransactionById(editRecurringTransactionId) 
    : null;

  // Form state
  const [amount, setAmount] = useState('');
  const [debitAccountId, setDebitAccountId] = useState<string | null>(null);
  const [creditAccountId, setCreditAccountId] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [frequency, setFrequency] = useState<RecurrenceFrequency>('monthly');
  const [dayOfRecurrence, setDayOfRecurrence] = useState(1);
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [notifyBeforeDays, setNotifyBeforeDays] = useState<string>('0');
  const [isSaving, setIsSaving] = useState(false);

  const currency = user?.currency ?? DEFAULT_CURRENCY;

  // Handle delete
  const handleDelete = useCallback(() => {
    if (!existingRecurringTransaction || !editRecurringTransactionId) return;
    
    const debitAccount = accounts.find(a => a.id === existingRecurringTransaction.debitAccountId);
    const creditAccount = accounts.find(a => a.id === existingRecurringTransaction.creditAccountId);
    const frequencyLabel = FREQUENCY_OPTIONS.find(f => f.value === existingRecurringTransaction.frequency)?.label ?? '';
    
    Alert.alert(
      'Delete Repeat Transaction',
      `Are you sure you want to delete this recurring transaction?\n\n${debitAccount?.name ?? 'Unknown'} → ${creditAccount?.name ?? 'Unknown'}\n${formatCurrency(existingRecurringTransaction.amount, currency)} ${frequencyLabel}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteRecurringTransaction(editRecurringTransactionId);
              navigation.goBack();
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to delete repeat transaction');
            }
          },
        },
      ]
    );
  }, [existingRecurringTransaction, editRecurringTransactionId, accounts, currency, deleteRecurringTransaction, navigation]);

  // Set header delete button when editing
  useLayoutEffect(() => {
    if (isEditing && editRecurringTransactionId) {
      navigation.setOptions({
        headerRight: () => (
          <TouchableOpacity
            onPress={handleDelete}
            style={{ marginRight: spacing.base }}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="trash-outline" size={24} color={colors.error} />
          </TouchableOpacity>
        ),
      });
    } else {
      navigation.setOptions({
        headerRight: undefined,
      });
    }
  }, [isEditing, editRecurringTransactionId, navigation, handleDelete]);

  // Load existing recurring transaction data when editing
  useEffect(() => {
    if (existingRecurringTransaction) {
      setAmount(existingRecurringTransaction.amount.toString());
      setDebitAccountId(existingRecurringTransaction.debitAccountId);
      setCreditAccountId(existingRecurringTransaction.creditAccountId);
      setNote(existingRecurringTransaction.note || '');
      setFrequency(existingRecurringTransaction.frequency);
      setDayOfRecurrence(existingRecurringTransaction.dayOfRecurrence);
      setStartDate(existingRecurringTransaction.startDate);
      setEndDate(existingRecurringTransaction.endDate || null);
      setNotifyBeforeDays(existingRecurringTransaction.notifyBeforeDays?.toString() || '0');
    }
  }, [existingRecurringTransaction]);

  // Modal state
  const [showAccountPicker, setShowAccountPicker] = useState(false);
  const [accountPickerType, setAccountPickerType] = useState<'debit' | 'credit'>('debit');
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [showFrequencyPicker, setShowFrequencyPicker] = useState(false);
  const [showDayPicker, setShowDayPicker] = useState(false);
  const [accountSearchQuery, setAccountSearchQuery] = useState('');

  // Get selected accounts
  const debitAccount = accounts.find(a => a.id === debitAccountId);
  const creditAccount = accounts.find(a => a.id === creditAccountId);

  // Calculate day options based on frequency
  const dayOptions = useMemo(() => {
    if (frequency === 'daily') {
      return [];
    } else if (frequency === 'weekly') {
      return WEEK_DAYS.map((day, index) => ({ label: day, value: index }));
    } else {
      // Monthly/Yearly: days 1-31
      return Array.from({ length: 31 }, (_, i) => ({
        label: `${i + 1}${i === 0 ? 'st' : i === 1 ? 'nd' : i === 2 ? 'rd' : 'th'}`,
        value: i + 1,
      }));
    }
  }, [frequency]);

  // Determine transaction type based on selected accounts
  const transactionType = useMemo(() => {
    if (!debitAccount || !creditAccount) return null;

    const debitType = debitAccount.accountType;
    const creditType = creditAccount.accountType;

    if (creditType === 'expense') return 'return';
    if (debitType === 'expense') return 'expense';
    if (creditType === 'income') return 'income';
    return 'transfer';
  }, [debitAccount, creditAccount]);

  const openAccountPicker = (type: 'debit' | 'credit') => {
    setAccountPickerType(type);
    setAccountSearchQuery('');
    setShowAccountPicker(true);
  };

  const handleAccountSelect = (account: Account) => {
    if (accountPickerType === 'debit') {
      setDebitAccountId(account.id);
    } else {
      setCreditAccountId(account.id);
    }
    setShowAccountPicker(false);
  };

  const handleFrequencySelect = (selectedFrequency: RecurrenceFrequency) => {
    setFrequency(selectedFrequency);
    // Reset day of recurrence based on frequency
    if (selectedFrequency === 'weekly') {
      setDayOfRecurrence(0); // Sunday
    } else {
      setDayOfRecurrence(1); // 1st of month
    }
    setShowFrequencyPicker(false);
  };

  const handleDaySelect = (day: number) => {
    setDayOfRecurrence(day);
    setShowDayPicker(false);
  };

  const handleSubmit = async () => {
    // Validate amount
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    // Validate accounts
    if (!debitAccountId || !creditAccountId) {
      Alert.alert('Error', 'Please select both accounts');
      return;
    }

    if (debitAccountId === creditAccountId) {
      Alert.alert('Error', 'Debit and credit accounts must be different');
      return;
    }

    // Validate notify before days
    const notifyDays = parseInt(notifyBeforeDays, 10);
    if (isNaN(notifyDays) || notifyDays < 0) {
      Alert.alert('Error', 'Notification days must be a valid number');
      return;
    }

    setIsSaving(true);
    try {
      const nextOccurrence = calculateNextOccurrence(frequency, dayOfRecurrence, startDate);

      let transactionId: string;
      
      if (isEditing && editRecurringTransactionId) {
        transactionId = editRecurringTransactionId;
        await updateRecurringTransaction({
          recurringTransactionId: editRecurringTransactionId,
          amount: amountNum,
          debitAccountId,
          creditAccountId,
          note: note.trim() || undefined,
          frequency,
          dayOfRecurrence,
          startDate: startDate.toISOString(),
          endDate: endDate?.toISOString(),
          notifyBeforeDays: notifyDays > 0 ? notifyDays : undefined,
        });
      } else {
        transactionId = await createRecurringTransaction({
          amount: amountNum,
          debitAccountId,
          creditAccountId,
          note: note.trim() || undefined,
          frequency,
          dayOfRecurrence,
          startDate: startDate.toISOString(),
          endDate: endDate?.toISOString(),
          notifyBeforeDays: notifyDays > 0 ? notifyDays : undefined,
        });
      }

      // Schedule notification after create/update
      // Wait for store to update, then schedule notification
      const scheduleNotification = async () => {
        let attempts = 0;
        const maxAttempts = 30;
        
        while (attempts < maxAttempts) {
          const transaction = getRecurringTransactionById(transactionId);
          if (transaction) {
            try {
              await scheduleRecurringTransactionNotification(transaction);
              console.log(`Successfully scheduled notification for transaction ${transactionId}`);
              break;
            } catch (error) {
              console.error('Error scheduling notification:', error);
            }
          }
          attempts++;
          await new Promise(resolve => setTimeout(resolve, 250));
        }

        // If snapshot hasn't arrived yet, fetch once directly from Firestore and schedule.
        if (attempts >= maxAttempts) {
          try {
            const fetched = await fetchRecurringTransactionById(transactionId);
            if (fetched) {
              await scheduleRecurringTransactionNotification(fetched);
              console.log(`Successfully scheduled notification (fetched) for transaction ${transactionId}`);
            } else {
              console.warn(`Could not fetch transaction ${transactionId} to schedule notification`);
            }
          } catch (error) {
            console.error('Error scheduling notification (fetched):', error);
          }
        }
      };
      
      // Schedule notification asynchronously (don't block navigation)
      scheduleNotification();

      navigation.goBack();
    } catch (error: any) {
      setIsSaving(false);
      Alert.alert('Error', error.message || `Failed to ${isEditing ? 'update' : 'create'} repeat transaction. Please try again.`);
    }
  };

  // Filter accounts for picker
  const filteredAccounts = useMemo(() => {
    if (!accountSearchQuery.trim()) return accounts.filter(a => a.isActive);
    const query = accountSearchQuery.toLowerCase();
    return accounts.filter(
      a => a.isActive && a.name.toLowerCase().includes(query)
    );
  }, [accounts, accountSearchQuery]);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + spacing.xl }
        ]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Amount Input */}
        <View style={styles.amountContainer}>
          <Text style={styles.currencySymbol}>{currency === 'INR' ? '₹' : '$'}</Text>
          <TextInput
            style={styles.amountInput}
            placeholder="0.00"
            placeholderTextColor={colors.neutral[300]}
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
            autoFocus
          />
        </View>

        {/* Repeat Transaction Indicator */}
          <View style={styles.recurringIndicator}>
            <View style={styles.recurringBadge}>
              <Ionicons name="repeat-outline" size={16} color={colors.primary[500]} />
              <Text style={styles.recurringText}>Repeat Transaction</Text>
            </View>
          </View>

        {/* Account Selectors */}
        <View style={styles.formSection}>
          <TouchableOpacity
            style={styles.accountSelector}
            onPress={() => openAccountPicker('credit')}
            activeOpacity={0.7}
          >
            <View style={styles.accountSelectorContent}>
              <View style={styles.accountSelectorLeft}>
                <Text style={styles.accountLabel}>From Account</Text>
                {creditAccount ? (
                  <View style={styles.selectedAccount}>
                    <View style={[
                      styles.accountDot,
                      { backgroundColor: getAccountTypeColor(creditAccount.accountType) }
                    ]} />
                    <Text style={styles.accountName}>{creditAccount.name}</Text>
                  </View>
                ) : (
                  <Text style={styles.accountPlaceholder}>Select account</Text>
                )}
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.text.tertiary} />
            </View>
          </TouchableOpacity>

          <View style={styles.arrowContainer}>
            <Ionicons name="arrow-down" size={20} color={colors.primary[500]} />
          </View>

          <TouchableOpacity
            style={styles.accountSelector}
            onPress={() => openAccountPicker('debit')}
            activeOpacity={0.7}
          >
            <View style={styles.accountSelectorContent}>
              <View style={styles.accountSelectorLeft}>
                <Text style={styles.accountLabel}>To Account</Text>
                {debitAccount ? (
                  <View style={styles.selectedAccount}>
                    <View style={[
                      styles.accountDot,
                      { backgroundColor: getAccountTypeColor(debitAccount.accountType) }
                    ]} />
                    <Text style={styles.accountName}>{debitAccount.name}</Text>
                  </View>
                ) : (
                  <Text style={styles.accountPlaceholder}>Select account</Text>
                )}
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.text.tertiary} />
            </View>
          </TouchableOpacity>
        </View>

        {/* Frequency Selection */}
        <View style={styles.formSection}>
          <TouchableOpacity
            style={styles.selector}
            onPress={() => setShowFrequencyPicker(true)}
            activeOpacity={0.7}
          >
            <View style={styles.selectorContent}>
              <View style={styles.selectorLeft}>
                <View style={styles.selectorLabelRow}>
                  <Ionicons name="repeat-outline" size={18} color={colors.text.secondary} />
                  <Text style={styles.inputLabel}>Frequency </Text>
                </View>
                <View style={styles.selectorValueContainer}>
                  <Text style={styles.selectorValue} numberOfLines={1}>
                    {FREQUENCY_OPTIONS.find(f => f.value === frequency)?.label || frequency}
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.text.tertiary} />
            </View>
          </TouchableOpacity>
        </View>

        {/* Day of Recurrence */}
        {frequency !== 'daily' && (
          <View style={styles.formSection}>
            <TouchableOpacity
              style={styles.selector}
              onPress={() => setShowDayPicker(true)}
              activeOpacity={0.7}
            >
              <View style={styles.selectorContent}>
                <View style={styles.selectorLeft}>
                  <View style={styles.selectorLabelRow}>
                    <Ionicons name="calendar-outline" size={18} color={colors.text.secondary} />
                    <Text style={styles.inputLabel}>
                      {frequency === 'weekly' ? 'Day of Week' : 'Day of Month'}
                    </Text>
                  </View>
                  <View style={styles.selectorValueContainer}>
                    <Text style={styles.selectorValue} numberOfLines={1}>
                      {frequency === 'weekly' 
                        ? WEEK_DAYS[dayOfRecurrence]
                        : `${dayOfRecurrence}${dayOfRecurrence === 1 ? 'st' : dayOfRecurrence === 2 ? 'nd' : dayOfRecurrence === 3 ? 'rd' : 'th'}`
                      }
                    </Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.text.tertiary} />
              </View>
            </TouchableOpacity>
          </View>
        )}

        {/* Start Date */}
        <View style={styles.formSection}>
          <TouchableOpacity
            style={styles.selector}
            onPress={() => setShowStartDatePicker(true)}
            activeOpacity={0.7}
          >
            <View style={styles.selectorContent}>
              <View style={styles.selectorLeft}>
                  <View style={styles.selectorLabelRow}>
                    <Ionicons name="calendar-outline" size={18} color={colors.text.secondary} />
                    <Text style={styles.inputLabel}>Start Date</Text>
                  </View>
                  <View style={styles.selectorValueContainer}>
                    <Text style={styles.selectorValue} numberOfLines={1}>
                      {startDate.toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </Text>
                  </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.text.tertiary} />
            </View>
          </TouchableOpacity>
        </View>

        {/* End Date (Optional) */}
        <View style={styles.formSection}>
          <TouchableOpacity
            style={styles.selector}
            onPress={() => setShowEndDatePicker(true)}
            activeOpacity={0.7}
          >
            <View style={styles.selectorContent}>
              <View style={styles.selectorLeft}>
                  <View style={styles.selectorLabelRow}>
                    <Ionicons name="calendar-outline" size={18} color={colors.text.secondary} />
                    <Text style={styles.inputLabel}>End Date (Optional)</Text>
                  </View>
                  <View style={styles.selectorValueContainer}>
                    <Text style={styles.selectorValue} numberOfLines={1}>
                      {endDate 
                        ? endDate.toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })
                        : 'No end date'
                      }
                    </Text>
                  </View>
              </View>
              <View style={styles.selectorRight}>
                {endDate && (
                  <TouchableOpacity
                    onPress={(e) => {
                      e.stopPropagation();
                      setEndDate(null);
                    }}
                    style={styles.clearButton}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Ionicons name="close-circle" size={20} color={colors.error} />
                  </TouchableOpacity>
                )}
                <Ionicons name="chevron-forward" size={20} color={colors.text.tertiary} />
              </View>
            </View>
          </TouchableOpacity>
        </View>

        {/* Notification Days */}
        <View style={styles.formSection}>
          <View style={styles.inputContainer}>
            <View style={styles.selectorLabelRow}>
              <Ionicons name="notifications-outline" size={18} color={colors.text.secondary} />
              <Text style={styles.inputLabel}>Notify Before (Days)</Text>
            </View>
            <TextInput
              style={styles.textInput}
              placeholder="0"
              placeholderTextColor={colors.neutral[400]}
              value={notifyBeforeDays}
              onChangeText={setNotifyBeforeDays}
              keyboardType="number-pad"
            />
            <Text style={styles.hint}>Set to 0 to disable notifications</Text>
          </View>
        </View>

        {/* Note Input */}
        <View style={styles.formSection}>
          <View style={styles.inputContainer}>
            <View style={styles.selectorLabelRow}>
              <Ionicons name="document-text-outline" size={18} color={colors.text.secondary} />
              <Text style={styles.inputLabel}>Note (optional)</Text>
            </View>
            <TextInput
              style={styles.textInput}
              placeholder="Add a note..."
              placeholderTextColor={colors.neutral[400]}
              value={note}
              onChangeText={setNote}
              multiline
              numberOfLines={2}
            />
          </View>
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitButton, isSaving && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={isSaving}
        >
          {isSaving ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator color={colors.neutral[0]} size="small" />
              <Text style={styles.submitButtonText}>
                {isEditing ? 'Updating...' : 'Creating...'}
              </Text>
            </View>
          ) : (
            <Text style={styles.submitButtonText}>
              {isEditing ? 'Update Repeat Transaction' : 'Create Repeat Transaction'}
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* Loading Overlay */}
      {isSaving && (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingContent}>
            <ActivityIndicator size="large" color={colors.primary[500]} />
            <Text style={styles.loadingText}>
              {isEditing ? 'Updating Repeat Transaction...' : 'Creating Repeat Transaction...'}
            </Text>
          </View>
        </View>
      )}

      {/* Account Picker Modal */}
      <Modal
        visible={showAccountPicker}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowAccountPicker(false)}
      >
        <View style={[styles.modalContainer, { paddingTop: insets.top }]}>
          <View style={styles.modalHeader}>
            <TouchableOpacity 
              onPress={() => setShowAccountPicker(false)}
              style={styles.modalCancelButton}
            >
              <Text style={styles.modalCancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              Select {accountPickerType === 'debit' ? 'To' : 'From'} Account
            </Text>
            <View style={styles.modalCancelButton} />
          </View>

          <TextInput
            style={styles.searchInput}
            placeholder="Search accounts..."
            placeholderTextColor={colors.neutral[400]}
            value={accountSearchQuery}
            onChangeText={setAccountSearchQuery}
          />

          <FlatList
            data={filteredAccounts}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.accountItem}
                onPress={() => handleAccountSelect(item)}
              >
                <View style={[
                  styles.accountDot,
                  { backgroundColor: getAccountTypeColor(item.accountType) }
                ]} />
                <View style={styles.accountItemInfo}>
                  <Text style={styles.accountItemName}>{item.name}</Text>
                  <Text style={styles.accountItemType}>{item.accountType}</Text>
                </View>
                {(accountPickerType === 'debit' && debitAccountId === item.id) ||
                 (accountPickerType === 'credit' && creditAccountId === item.id) ? (
                  <Text style={styles.checkmark}>✓</Text>
                ) : null}
              </TouchableOpacity>
            )}
          />
        </View>
      </Modal>

      {/* Frequency Picker Modal */}
      <Modal
        visible={showFrequencyPicker}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowFrequencyPicker(false)}
      >
        <View style={[styles.modalContainer, { paddingTop: insets.top }]}>
          <View style={styles.modalHeader}>
            <TouchableOpacity 
              onPress={() => setShowFrequencyPicker(false)}
              style={styles.modalCancelButton}
            >
              <Text style={styles.modalCancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Select Frequency</Text>
            <View style={styles.modalCancelButton} />
          </View>

          <FlatList
            data={FREQUENCY_OPTIONS}
            keyExtractor={(item) => item.value}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.optionItem}
                onPress={() => handleFrequencySelect(item.value)}
              >
                <Text style={styles.optionText}>{item.label}</Text>
                {frequency === item.value && (
                  <Text style={styles.checkmark}>✓</Text>
                )}
              </TouchableOpacity>
            )}
          />
        </View>
      </Modal>

      {/* Day Picker Modal */}
      {frequency !== 'daily' && (
        <Modal
          visible={showDayPicker}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setShowDayPicker(false)}
        >
          <View style={[styles.modalContainer, { paddingTop: insets.top }]}>
            <View style={styles.modalHeader}>
              <TouchableOpacity 
                onPress={() => setShowDayPicker(false)}
                style={styles.modalCancelButton}
              >
                <Text style={styles.modalCancel}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>
                Select {frequency === 'weekly' ? 'Day of Week' : 'Day of Month'}
              </Text>
              <View style={styles.modalCancelButton} />
            </View>

            <FlatList
              data={dayOptions}
              keyExtractor={(item) => item.value.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.optionItem}
                  onPress={() => handleDaySelect(item.value)}
                >
                  <Text style={styles.optionText}>{item.label}</Text>
                  {dayOfRecurrence === item.value && (
                    <Text style={styles.checkmark}>✓</Text>
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </Modal>
      )}

      {/* Date Pickers */}
      {showStartDatePicker && (
        <DateTimePicker
          value={startDate}
          mode="date"
          display="default"
          onChange={(event, selectedDate) => {
            setShowStartDatePicker(false);
            if (selectedDate) {
              setStartDate(selectedDate);
            }
          }}
        />
      )}

      {showEndDatePicker && (
        <DateTimePicker
          value={endDate || new Date()}
          mode="date"
          display="default"
          minimumDate={startDate}
          onChange={(event, selectedDate) => {
            setShowEndDatePicker(false);
            if (selectedDate) {
              setEndDate(selectedDate);
            }
          }}
        />
      )}
    </KeyboardAvoidingView>
  );
};


export default AddRecurringTransactionScreen;
