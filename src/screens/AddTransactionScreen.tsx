/**
 * Add Transaction Screen for Gharkharch
 * 
 * DOUBLE-ENTRY ACCOUNTING:
 * Every transaction has exactly ONE debit account and ONE credit account.
 * - Expense: Debit expense account, Credit asset/liability account
 * - Income: Debit asset account, Credit income account  
 * - Transfer: Debit destination asset/liability, Credit source asset/liability
 */

import React, { useState, useMemo } from 'react';
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
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { useAuthStore, useAccountStore, useTransactionStore } from '../stores';
import { RootStackParamList, Account, AccountType } from '../types';
import { 
  colors, 
  typography, 
  spacing, 
  borderRadius, 
  shadows,
  getAccountTypeColor,
  getAccountTypeBgColor,
} from '../config/theme';
import { formatCurrency, DEFAULT_CURRENCY } from '../config/constants';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'AddTransaction'>;
type RouteType = RouteProp<RootStackParamList, 'AddTransaction'>;

type TransactionType = 'expense' | 'income' | 'transfer';

const AddTransactionScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteType>();
  
  const { user } = useAuthStore();
  const { accounts, getAccountsByType } = useAccountStore();
  const { createTransaction, updateTransaction, getTransactionById, isLoading } = useTransactionStore();

  const editTransactionId = route.params?.editTransactionId;
  const isEditing = !!editTransactionId;
  const existingTransaction = editTransactionId ? getTransactionById(editTransactionId) : null;

  // Form state
  const [transactionType, setTransactionType] = useState<TransactionType>('expense');
  const [amount, setAmount] = useState('');
  const [debitAccountId, setDebitAccountId] = useState<string | null>(null);
  const [creditAccountId, setCreditAccountId] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [date, setDate] = useState(new Date());

  // Load existing transaction data when editing
  React.useEffect(() => {
    if (existingTransaction) {
      setAmount(existingTransaction.amount.toString());
      setDebitAccountId(existingTransaction.debitAccountId);
      setCreditAccountId(existingTransaction.creditAccountId);
      setNote(existingTransaction.note || '');
      setDate(existingTransaction.date);
      
      // Determine transaction type from accounts
      const debitAcc = accounts.find(a => a.id === existingTransaction.debitAccountId);
      const creditAcc = accounts.find(a => a.id === existingTransaction.creditAccountId);
      if (debitAcc?.accountType === 'expense') {
        setTransactionType('expense');
      } else if (creditAcc?.accountType === 'income') {
        setTransactionType('income');
      } else {
        setTransactionType('transfer');
      }
    }
  }, [existingTransaction, accounts]);

  // Modal state
  const [showAccountPicker, setShowAccountPicker] = useState(false);
  const [accountPickerType, setAccountPickerType] = useState<'debit' | 'credit'>('debit');
  const [showDatePicker, setShowDatePicker] = useState(false);

  const currency = user?.currency ?? DEFAULT_CURRENCY;

  // Get selected accounts
  const debitAccount = accounts.find(a => a.id === debitAccountId);
  const creditAccount = accounts.find(a => a.id === creditAccountId);

  /**
   * Get available accounts for selection based on transaction type and picker type
   * 
   * ACCOUNTING RULES:
   * - Expense: Debit = expense account, Credit = asset/liability account
   * - Income: Debit = asset account, Credit = income account
   * - Transfer: Both = asset/liability accounts
   */
  const availableAccounts = useMemo(() => {
    const activeAccounts = accounts.filter(a => a.isActive);
    
    if (transactionType === 'expense') {
      if (accountPickerType === 'debit') {
        // Expense account (where money goes)
        return activeAccounts.filter(a => a.accountType === 'expense');
      } else {
        // Asset or liability account (where money comes from)
        return activeAccounts.filter(a => a.accountType === 'asset' || a.accountType === 'liability');
      }
    } else if (transactionType === 'income') {
      if (accountPickerType === 'debit') {
        // Asset account (where money goes)
        return activeAccounts.filter(a => a.accountType === 'asset');
      } else {
        // Income account (source of income)
        return activeAccounts.filter(a => a.accountType === 'income');
      }
    } else {
      // Transfer - both are asset/liability accounts
      return activeAccounts.filter(a => a.accountType === 'asset' || a.accountType === 'liability');
    }
  }, [accounts, transactionType, accountPickerType]);

  /**
   * Handle transaction type change
   * Reset selected accounts when type changes
   */
  const handleTypeChange = (type: TransactionType) => {
    setTransactionType(type);
    setDebitAccountId(null);
    setCreditAccountId(null);
  };

  /**
   * Open account picker modal
   */
  const openAccountPicker = (type: 'debit' | 'credit') => {
    setAccountPickerType(type);
    setShowAccountPicker(true);
  };

  /**
   * Handle account selection
   */
  const handleAccountSelect = (account: Account) => {
    if (accountPickerType === 'debit') {
      setDebitAccountId(account.id);
    } else {
      setCreditAccountId(account.id);
    }
    setShowAccountPicker(false);
  };

  /**
   * Validate and submit transaction
   */
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

    try {
      if (isEditing && editTransactionId) {
        await updateTransaction({
          transactionId: editTransactionId,
          date: date.toISOString(),
          amount: amountNum,
          debitAccountId,
          creditAccountId,
          note: note.trim() || undefined,
        });
      } else {
        await createTransaction({
          date: date.toISOString(),
          amount: amountNum,
          debitAccountId,
          creditAccountId,
          note: note.trim() || undefined,
        });
      }

      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', `Failed to ${isEditing ? 'update' : 'create'} transaction. Please try again.`);
    }
  };

  /**
   * Get label for account selector based on transaction type
   */
  const getAccountLabel = (type: 'debit' | 'credit'): string => {
    if (transactionType === 'expense') {
      return type === 'debit' ? 'Expense Category' : 'Paid From';
    } else if (transactionType === 'income') {
      return type === 'debit' ? 'Received In' : 'Income Source';
    } else {
      return type === 'debit' ? 'To Account' : 'From Account';
    }
  };

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
        {/* Transaction Type Selector */}
        <View style={styles.typeSelector}>
          <TouchableOpacity
            style={[
              styles.typeButton,
              transactionType === 'expense' && styles.typeButtonActive,
              transactionType === 'expense' && { backgroundColor: getAccountTypeBgColor('expense') },
            ]}
            onPress={() => handleTypeChange('expense')}
          >
            <Text style={[
              styles.typeButtonText,
              transactionType === 'expense' && { color: colors.expense },
            ]}>
              Expense
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.typeButton,
              transactionType === 'income' && styles.typeButtonActive,
              transactionType === 'income' && { backgroundColor: getAccountTypeBgColor('income') },
            ]}
            onPress={() => handleTypeChange('income')}
          >
            <Text style={[
              styles.typeButtonText,
              transactionType === 'income' && { color: colors.income },
            ]}>
              Income
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.typeButton,
              transactionType === 'transfer' && styles.typeButtonActive,
              transactionType === 'transfer' && { backgroundColor: getAccountTypeBgColor('asset') },
            ]}
            onPress={() => handleTypeChange('transfer')}
          >
            <Text style={[
              styles.typeButtonText,
              transactionType === 'transfer' && { color: colors.asset },
            ]}>
              Transfer
            </Text>
          </TouchableOpacity>
        </View>

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

        {/* Account Selectors */}
        <View style={styles.formSection}>
          {/* Credit Account (Source) - Show first for better UX */}
          <TouchableOpacity
            style={styles.accountSelector}
            onPress={() => openAccountPicker('credit')}
          >
            <Text style={styles.accountLabel}>{getAccountLabel('credit')}</Text>
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
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>

          {/* Arrow indicator */}
          <View style={styles.arrowContainer}>
            <Text style={styles.arrow}>↓</Text>
          </View>

          {/* Debit Account (Destination) */}
          <TouchableOpacity
            style={styles.accountSelector}
            onPress={() => openAccountPicker('debit')}
          >
            <Text style={styles.accountLabel}>{getAccountLabel('debit')}</Text>
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
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Date Input */}
        <View style={styles.formSection}>
          <TouchableOpacity
            style={styles.dateSelector}
            onPress={() => setShowDatePicker(true)}
          >
            <Text style={styles.inputLabel}>Transaction Date</Text>
            <View style={styles.dateValueContainer}>
              <Text style={styles.dateValue}>
                {date.toLocaleDateString('en-IN', {
                  weekday: 'short',
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </Text>
              <Text style={styles.chevron}>›</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Note Input */}
        <View style={styles.formSection}>
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Note (optional)</Text>
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
          style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={isLoading}
        >
          <Text style={styles.submitButtonText}>
            {isLoading ? 'Saving...' : isEditing ? 'Update Transaction' : 'Save Transaction'}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Account Picker Modal */}
      <Modal
        visible={showAccountPicker}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowAccountPicker(false)}
      >
        <View style={[styles.modalContainer, { paddingTop: insets.top }]}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowAccountPicker(false)}>
              <Text style={styles.modalCancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{getAccountLabel(accountPickerType)}</Text>
            <View style={{ width: 60 }} />
          </View>

          {availableAccounts.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No accounts available</Text>
              <Text style={styles.emptyStateSubtext}>
                Add accounts in the Accounts tab first
              </Text>
            </View>
          ) : (
            <FlatList
              data={availableAccounts}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.accountOption}
                  onPress={() => handleAccountSelect(item)}
                >
                  <View style={[
                    styles.accountOptionIcon,
                    { backgroundColor: getAccountTypeBgColor(item.accountType) }
                  ]}>
                    <Text style={[
                      styles.accountOptionIconText,
                      { color: getAccountTypeColor(item.accountType) }
                    ]}>
                      {item.name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.accountOptionInfo}>
                    <Text style={styles.accountOptionName}>{item.name}</Text>
                    <Text style={styles.accountOptionCategory}>{item.subCategory}</Text>
                  </View>
                  {(item.accountType === 'asset' || item.accountType === 'liability') && (
                    <Text style={[
                      styles.accountOptionBalance,
                      item.accountType === 'liability' && styles.liabilityBalance
                    ]}>
                      {formatCurrency(item.currentBalance ?? 0, currency)}
                    </Text>
                  )}
                </TouchableOpacity>
              )}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
              contentContainerStyle={{ paddingBottom: insets.bottom }}
            />
          )}
        </View>
      </Modal>

      {/* Date Picker Modal */}
      {showDatePicker && (
        Platform.OS === 'ios' ? (
          <Modal
            visible={showDatePicker}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={() => setShowDatePicker(false)}
          >
            <View style={[styles.modalContainer, { paddingTop: insets.top }]}>
              <View style={styles.modalHeader}>
                <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                  <Text style={styles.modalCancel}>Cancel</Text>
                </TouchableOpacity>
                <Text style={styles.modalTitle}>Select Date</Text>
                <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                  <Text style={styles.modalDone}>Done</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={date}
                mode="date"
                display="spinner"
                onChange={(event, selectedDate) => {
                  if (selectedDate) {
                    setDate(selectedDate);
                  }
                }}
                maximumDate={new Date()}
                style={{ flex: 1 }}
              />
            </View>
          </Modal>
        ) : (
          <DateTimePicker
            value={date}
            mode="date"
            display="default"
            onChange={(event, selectedDate) => {
              setShowDatePicker(false);
              if (selectedDate) {
                setDate(selectedDate);
              }
            }}
            maximumDate={new Date()}
          />
        )
      )}
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  scrollContent: {
    padding: spacing.base,
  },
  typeSelector: {
    flexDirection: 'row',
    backgroundColor: colors.background.elevated,
    borderRadius: borderRadius.lg,
    padding: spacing.xs,
    marginBottom: spacing.xl,
  },
  typeButton: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderRadius: borderRadius.md,
  },
  typeButtonActive: {
    // Background color set dynamically
  },
  typeButtonText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.text.secondary,
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
  formSection: {
    backgroundColor: colors.background.elevated,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.lg,
    ...shadows.sm,
  },
  accountSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.base,
  },
  accountLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    width: 100,
  },
  selectedAccount: {
    flex: 1,
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
    flex: 1,
    fontSize: typography.fontSize.base,
    color: colors.text.tertiary,
  },
  chevron: {
    fontSize: typography.fontSize.xl,
    color: colors.neutral[400],
  },
  arrowContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  arrow: {
    fontSize: typography.fontSize.lg,
    color: colors.neutral[400],
  },
  dateSelector: {
    padding: spacing.base,
  },
  dateValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  dateValue: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.primary,
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
    minHeight: 60,
    textAlignVertical: 'top',
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
  submitButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.neutral[0],
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  modalCancel: {
    fontSize: typography.fontSize.base,
    color: colors.primary[500],
  },
  modalDone: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.primary[500],
  },
  modalTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.text.primary,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyStateText: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  emptyStateSubtext: {
    fontSize: typography.fontSize.sm,
    color: colors.text.tertiary,
    textAlign: 'center',
  },
  accountOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.base,
    backgroundColor: colors.background.elevated,
  },
  accountOptionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  accountOptionIconText: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
  },
  accountOptionInfo: {
    flex: 1,
  },
  accountOptionName: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.primary,
  },
  accountOptionCategory: {
    fontSize: typography.fontSize.sm,
    color: colors.text.tertiary,
    marginTop: 2,
  },
  accountOptionBalance: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
    color: colors.asset,
  },
  liabilityBalance: {
    color: colors.liability,
  },
  separator: {
    height: 1,
    backgroundColor: colors.border.light,
  },
});

export default AddTransactionScreen;
