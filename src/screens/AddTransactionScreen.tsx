/**
 * Add Transaction Screen for Gharkharch
 * 
 * DOUBLE-ENTRY ACCOUNTING:
 * Every transaction has exactly ONE debit account and ONE credit account.
 * Any account can be selected for debit or credit, allowing flexibility for:
 * - Expenses: Money going out
 * - Income: Money coming in
 * - Transfers: Money moving between accounts
 * - Returns: Items returned, money refunded to any account
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
  ActivityIndicator,
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

const AddTransactionScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteType>();
  
  const { user } = useAuthStore();
  const { accounts } = useAccountStore();
  const { createTransaction, updateTransaction, getTransactionById } = useTransactionStore();

  const editTransactionId = route.params?.editTransactionId;
  const isEditing = !!editTransactionId;
  const existingTransaction = editTransactionId ? getTransactionById(editTransactionId) : null;

  // Form state
  const [amount, setAmount] = useState('');
  const [debitAccountId, setDebitAccountId] = useState<string | null>(null);
  const [creditAccountId, setCreditAccountId] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [date, setDate] = useState(new Date());
  const [isSaving, setIsSaving] = useState(false);

  // Load existing transaction data when editing
  React.useEffect(() => {
    if (existingTransaction) {
      setAmount(existingTransaction.amount.toString());
      setDebitAccountId(existingTransaction.debitAccountId);
      setCreditAccountId(existingTransaction.creditAccountId);
      setNote(existingTransaction.note || '');
      setDate(existingTransaction.date);
    }
  }, [existingTransaction]);

  // Modal state
  const [showAccountPicker, setShowAccountPicker] = useState(false);
  const [accountPickerType, setAccountPickerType] = useState<'debit' | 'credit'>('debit');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [accountSearchQuery, setAccountSearchQuery] = useState('');

  const currency = user?.currency ?? DEFAULT_CURRENCY;

  // Get selected accounts
  const debitAccount = accounts.find(a => a.id === debitAccountId);
  const creditAccount = accounts.find(a => a.id === creditAccountId);

  /**
   * Determine transaction type based on selected accounts
   * Priority:
   * 1. Return: Credit to expense (money coming back from expense/refund)
   * 2. Expense: Debit to expense (money going to expense category)
   * 3. Income: Credit to income (money coming from income source)
   * 4. Transfer: Both asset/liability or any other combination
   */
  const transactionType = useMemo(() => {
    if (!debitAccount || !creditAccount) {
      return null;
    }

    // Return: Credit to expense account (money coming back from expense/refund)
    // This takes priority because credit to expense means money is being returned
    if (creditAccount.accountType === 'expense') {
      return 'return';
    }
    
    // Expense: Debit to expense account (money going out to expense)
    if (debitAccount.accountType === 'expense') {
      return 'expense';
    }
    
    // Income: Credit to income account (money coming from income source)
    if (creditAccount.accountType === 'income') {
      return 'income';
    }
    
    // Transfer: Both are asset or liability accounts, or any other combination
    return 'transfer';
  }, [debitAccount, creditAccount]);

  /**
   * Get available accounts for selection
   * Allow any active account to be selected for debit or credit
   * Sorted by name in ascending order
   */
  const availableAccounts = useMemo(() => {
    return accounts
      .filter(a => a.isActive)
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
  }, [accounts]);

  /**
   * Filter accounts based on search query
   */
  const filteredAccounts = useMemo(() => {
    if (!accountSearchQuery.trim()) {
      return availableAccounts;
    }

    const query = accountSearchQuery.toLowerCase();
    return availableAccounts.filter(account =>
      account.name.toLowerCase().includes(query) ||
      account.parentCategory.toLowerCase().includes(query) ||
      account.subCategory.toLowerCase().includes(query)
    );
  }, [availableAccounts, accountSearchQuery]);

  /**
   * Open account picker modal
   */
  const openAccountPicker = (type: 'debit' | 'credit') => {
    setAccountPickerType(type);
    setAccountSearchQuery(''); // Reset search when opening picker
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

    setIsSaving(true);
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
      setIsSaving(false);
      Alert.alert('Error', `Failed to ${isEditing ? 'update' : 'create'} transaction. Please try again.`);
    }
  };

  /**
   * Get label for account selector
   */
  const getAccountLabel = (type: 'debit' | 'credit'): string => {
    return type === 'debit' ? 'To Account' : 'From Account';
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

        {/* Transaction Type Indicator */}
        {transactionType && (
          <View style={styles.transactionTypeIndicator}>
            <View style={[
              styles.transactionTypeBadge,
              { backgroundColor: transactionType === 'expense' ? getAccountTypeBgColor('expense') : 
                                   transactionType === 'income' ? getAccountTypeBgColor('income') :
                                   transactionType === 'return' ? getAccountTypeBgColor('expense') :
                                   getAccountTypeBgColor('asset') }
            ]}>
              <Text style={[
                styles.transactionTypeText,
                { color: transactionType === 'expense' ? colors.expense :
                         transactionType === 'income' ? colors.income :
                         transactionType === 'return' ? colors.expense :
                         colors.asset }
              ]}>
                {transactionType === 'expense' ? 'Expense' :
                 transactionType === 'income' ? 'Income' :
                 transactionType === 'return' ? 'Return' :
                 'Transfer'}
              </Text>
            </View>
          </View>
        )}

        {/* Account Selectors */}
        <View style={styles.formSection}>
          {/* Credit Account (Source) - Show first for better UX */}
          <TouchableOpacity
            style={styles.accountSelector}
            onPress={() => openAccountPicker('credit')}
          >
            <View style={styles.accountSelectorContent}>
              <View style={styles.accountSelectorLeft}>
                <Text style={styles.accountLabel}>{getAccountLabel('credit')} </Text>
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
              <Text style={styles.chevron}>›</Text>
            </View>
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
            <View style={styles.accountSelectorContent}>
              <View style={styles.accountSelectorLeft}>
                <Text style={styles.accountLabel}>{getAccountLabel('debit')} </Text>
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
              <Text style={styles.chevron}>›</Text>
            </View>
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
          style={[styles.submitButton, isSaving && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={isSaving}
        >
          {isSaving ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator color={colors.neutral[0]} size="small" />
              <Text style={styles.submitButtonText}>
                {isEditing ? 'Updating...' : 'Saving...'}
              </Text>
            </View>
          ) : (
            <Text style={styles.submitButtonText}>
              {isEditing ? 'Update Transaction' : 'Save Transaction'}
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
              {isEditing ? 'Updating Transaction...' : 'Saving Transaction...'}
            </Text>
          </View>
        </View>
      )}

      {/* Account Picker Modal */}
      <Modal
        visible={showAccountPicker}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => {
          setShowAccountPicker(false);
          setAccountSearchQuery(''); // Reset search when closing modal
        }}
      >
        <View style={[styles.modalContainer, { paddingTop: insets.top }]}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => {
              setShowAccountPicker(false);
              setAccountSearchQuery(''); // Reset search when closing modal
            }}>
              <Text style={styles.modalCancel} numberOfLines={1} ellipsizeMode="tail">Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle} numberOfLines={1} ellipsizeMode="tail">{getAccountLabel(accountPickerType)}</Text>
            <View style={{ width: 60 }} />
          </View>

          {/* Search Box */}
          <View style={styles.accountSearchContainer}>
            <TextInput
              style={styles.accountSearchInput}
              placeholder="Search accounts..."
              placeholderTextColor={colors.neutral[400]}
              value={accountSearchQuery}
              onChangeText={setAccountSearchQuery}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          {availableAccounts.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No accounts available</Text>
              <Text style={styles.emptyStateSubtext}>
                Add accounts in the Accounts tab first
              </Text>
            </View>
          ) : filteredAccounts.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No accounts found</Text>
              <Text style={styles.emptyStateSubtext}>
                Try a different search term
              </Text>
            </View>
          ) : (
            <FlatList
              data={filteredAccounts}
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
  transactionTypeIndicator: {
    alignItems: 'center',
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.base,
  },
  transactionTypeBadge: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
  },
  transactionTypeText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semiBold,
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
  },
  accountSelectorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  accountSelectorLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  accountLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    flexShrink: 0,
  },
  selectedAccount: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
  },
  accountDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: spacing.sm,
    flexShrink: 0,
  },
  accountName: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.primary,
    flexShrink: 1,
  },
  accountPlaceholder: {
    fontSize: typography.fontSize.base,
    color: colors.text.tertiary,
    flexShrink: 1,
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
    flexShrink: 0,
    minWidth: 60,
  },
  modalDone: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.primary[500],
    flexShrink: 0,
    minWidth: 60,
    textAlign: 'right',
  },
  modalTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.text.primary,
    flex: 1,
    textAlign: 'center',
    paddingHorizontal: spacing.sm,
  },
  accountSearchContainer: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  accountSearchInput: {
    backgroundColor: colors.background.elevated,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    fontSize: typography.fontSize.base,
    color: colors.text.primary,
    borderWidth: 1,
    borderColor: colors.border.light,
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
});

export default AddTransactionScreen;
