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

import React, { useState, useMemo, useRef } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Modal,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
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
  const [selectedTransactionType, setSelectedTransactionType] = useState<
    'expense' | 'income' | 'transfer' | 'return' | null
  >('expense');
  const hasUserSelectedTypeRef = useRef(false);
  const reopenPickerOnFocusRef = useRef(false);
  const reopenPickerTypeRef = useRef<'debit' | 'credit'>('credit');
  const [showCalculator, setShowCalculator] = useState(false);
  const [calcExpr, setCalcExpr] = useState('');

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

  // Default = Expense. If user didn't manually pick a type, auto-sync to inferred type once both accounts are selected.
  React.useEffect(() => {
    if (hasUserSelectedTypeRef.current) return;
    setSelectedTransactionType(transactionType ?? 'expense');
  }, [transactionType]);

  const effectiveTransactionType = selectedTransactionType ?? transactionType;

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

  const allowedAccountTypesForPicker = useMemo(() => {
    if (!effectiveTransactionType) return null;

    const isFrom = accountPickerType === 'credit'; // From Account
    const isTo = accountPickerType === 'debit'; // To Account

    switch (effectiveTransactionType) {
      case 'expense':
        return isFrom ? (['asset', 'liability'] as AccountType[]) : (['expense'] as AccountType[]);
      case 'income':
        return isFrom ? (['income'] as AccountType[]) : (['asset', 'liability'] as AccountType[]);
      case 'transfer':
        return (['asset', 'liability'] as AccountType[]);
      case 'return':
        return isFrom ? (['expense'] as AccountType[]) : (['asset', 'liability'] as AccountType[]);
      default:
        return null;
    }
  }, [effectiveTransactionType, accountPickerType]);

  const availableAccountsForPicker = useMemo(() => {
    if (!allowedAccountTypesForPicker) return availableAccounts;
    return availableAccounts.filter(a => allowedAccountTypesForPicker.includes(a.accountType));
  }, [availableAccounts, allowedAccountTypesForPicker]);

  /**
   * Filter accounts based on search query
   */
  const filteredAccounts = useMemo(() => {
    if (!accountSearchQuery.trim()) {
      return availableAccountsForPicker;
    }

    const query = accountSearchQuery.toLowerCase();
    return availableAccountsForPicker.filter(account =>
      account.name.toLowerCase().includes(query) ||
      account.parentCategory.toLowerCase().includes(query) ||
      account.subCategory.toLowerCase().includes(query)
    );
  }, [availableAccountsForPicker, accountSearchQuery]);

  /**
   * Open account picker modal
   */
  const openAccountPicker = (type: 'debit' | 'credit') => {
    Keyboard.dismiss();
    setAccountPickerType(type);
    setAccountSearchQuery(''); // Reset search when opening picker
    setShowAccountPicker(true);
  };

  const handleAddNewAccountFromPicker = () => {
    // Close picker and navigate to AddAccount, then re-open picker on return
    reopenPickerOnFocusRef.current = true;
    reopenPickerTypeRef.current = accountPickerType;
    setShowAccountPicker(false);
    setAccountSearchQuery('');
    navigation.navigate('AddAccount');
  };

  const AddAccountFooter = () => (
    <View style={styles.addAccountFooter}>
      <Text style={styles.addAccountFooterTitle}>Can’t find the account?</Text>
      <Text style={styles.addAccountFooterSubtext}>
        Create a new account and come back to select it.
      </Text>
      <TouchableOpacity onPress={handleAddNewAccountFromPicker} activeOpacity={0.7}>
        <Text style={styles.addAccountFooterLink}>Create new account</Text>
      </TouchableOpacity>
    </View>
  );

  useFocusEffect(
    React.useCallback(() => {
      if (!reopenPickerOnFocusRef.current) return;
      reopenPickerOnFocusRef.current = false;

      // Slight delay to allow navigation transition to finish
      const t = setTimeout(() => {
        openAccountPicker(reopenPickerTypeRef.current);
      }, 150);

      return () => clearTimeout(t);
    }, [])
  );

  const isAccountAllowedForSide = (
    type: 'expense' | 'income' | 'transfer' | 'return',
    side: 'debit' | 'credit',
    account: Account | undefined
  ) => {
    if (!account) return false;
    const isFrom = side === 'credit';
    switch (type) {
      case 'expense':
        return isFrom ? (account.accountType === 'asset' || account.accountType === 'liability') : account.accountType === 'expense';
      case 'income':
        return isFrom ? account.accountType === 'income' : (account.accountType === 'asset' || account.accountType === 'liability');
      case 'transfer':
        return account.accountType === 'asset' || account.accountType === 'liability';
      case 'return':
        return isFrom ? account.accountType === 'expense' : (account.accountType === 'asset' || account.accountType === 'liability');
    }
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

  const openCalculator = () => {
    Keyboard.dismiss();
    setCalcExpr(amount?.trim() || '');
    setShowCalculator(true);
  };

  const tokenizeExpression = (expr: string): string[] => {
    const s = expr.replace(/\s+/g, '');
    if (!s) return [];

    const tokens: string[] = [];
    let i = 0;

    const isOp = (c: string) => c === '+' || c === '-' || c === '*' || c === '/';
    const isDigit = (c: string) => c >= '0' && c <= '9';

    while (i < s.length) {
      const c = s[i];

      // Operator
      if (isOp(c)) {
        // unary minus -> attach to next number
        const prev = tokens[tokens.length - 1];
        const isUnaryMinus = c === '-' && (!prev || isOp(prev));
        if (isUnaryMinus) {
          // parse a signed number
          let j = i + 1;
          let num = '-';
          let dotCount = 0;
          while (j < s.length) {
            const ch = s[j];
            if (isDigit(ch)) {
              num += ch;
              j++;
              continue;
            }
            if (ch === '.') {
              if (dotCount > 0) break;
              dotCount++;
              num += ch;
              j++;
              continue;
            }
            break;
          }
          // If user typed just "-" without digits, keep it as operator
          if (num === '-') {
            tokens.push('-');
            i++;
          } else {
            tokens.push(num);
            i = j;
          }
          continue;
        }

        tokens.push(c);
        i++;
        continue;
      }

      // Number
      if (isDigit(c) || c === '.') {
        let j = i;
        let num = '';
        let dotCount = 0;
        while (j < s.length) {
          const ch = s[j];
          if (isDigit(ch)) {
            num += ch;
            j++;
            continue;
          }
          if (ch === '.') {
            if (dotCount > 0) break;
            dotCount++;
            num += ch;
            j++;
            continue;
          }
          break;
        }
        tokens.push(num);
        i = j;
        continue;
      }

      // Unknown char: skip
      i++;
    }

    return tokens;
  };

  const evaluateExpression = (expr: string): number | null => {
    const tokens = tokenizeExpression(expr);
    if (tokens.length === 0) return null;

    const prec: Record<string, number> = { '+': 1, '-': 1, '*': 2, '/': 2 };
    const output: string[] = [];
    const ops: string[] = [];

    const isOp = (t: string) => t in prec;

    for (const t of tokens) {
      if (isOp(t)) {
        while (ops.length > 0) {
          const top = ops[ops.length - 1];
          if (isOp(top) && prec[top] >= prec[t]) {
            output.push(ops.pop()!);
          } else {
            break;
          }
        }
        ops.push(t);
      } else {
        // number
        output.push(t);
      }
    }
    while (ops.length > 0) output.push(ops.pop()!);

    const stack: number[] = [];
    for (const t of output) {
      if (!isOp(t)) {
        const n = Number(t);
        if (Number.isNaN(n)) return null;
        stack.push(n);
        continue;
      }
      const b = stack.pop();
      const a = stack.pop();
      if (a === undefined || b === undefined) return null;
      switch (t) {
        case '+':
          stack.push(a + b);
          break;
        case '-':
          stack.push(a - b);
          break;
        case '*':
          stack.push(a * b);
          break;
        case '/':
          if (b === 0) return null;
          stack.push(a / b);
          break;
      }
    }
    if (stack.length !== 1) return null;
    return stack[0];
  };

  const calcValue = useMemo(() => evaluateExpression(calcExpr), [calcExpr]);

  const appendCalc = (v: string) => setCalcExpr(prev => `${prev}${v}`);
  const backspaceCalc = () => setCalcExpr(prev => prev.slice(0, -1));
  const clearCalc = () => setCalcExpr('');
  const useCalcAmount = () => {
    if (calcValue === null || !Number.isFinite(calcValue)) {
      Alert.alert('Invalid amount', 'Please enter a valid calculation.');
      return;
    }
    const formatted = calcValue.toFixed(2).replace(/\.00$/, '');
    setAmount(formatted);
    setShowCalculator(false);
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
        <View style={styles.typeSection}>
          <View style={styles.typeHeaderRow}>
            <Text style={styles.typeHeaderLabel}>Transaction Type</Text>
            {selectedTransactionType && (
              <Text style={styles.typeHeaderHint}>Manual</Text>
            )}
          </View>
          <View style={styles.typeChipsRow}>
            {(['expense', 'income', 'transfer', 'return'] as const).map((type) => {
              const isActive = selectedTransactionType === type;
              const fg =
                type === 'expense' || type === 'return'
                  ? colors.expense
                  : type === 'income'
                  ? colors.income
                  : colors.asset;

              const label =
                type === 'expense'
                  ? 'Expense'
                  : type === 'income'
                  ? 'Income'
                  : type === 'transfer'
                  ? 'Transfer'
                  : 'Return';

              return (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.typeChip,
                    !isActive && styles.typeChipInactive,
                    { borderColor: isActive ? fg : colors.border.light },
                    isActive && { backgroundColor: fg }
                  ]}
                  activeOpacity={0.8}
                  onPress={() => {
                    hasUserSelectedTypeRef.current = true;
                    const next = selectedTransactionType === type ? null : type;
                    setSelectedTransactionType(next);

                    // If switching to a manual type, clear any incompatible selections
                    if (next) {
                      const currentDebit = debitAccount;
                      const currentCredit = creditAccount;

                      if (currentCredit && !isAccountAllowedForSide(next, 'credit', currentCredit)) {
                        setCreditAccountId(null);
                      }
                      if (currentDebit && !isAccountAllowedForSide(next, 'debit', currentDebit)) {
                        setDebitAccountId(null);
                      }
                    }
                  }}
                >
                  <Text
                    style={[
                      styles.typeChipText,
                      { color: isActive ? colors.neutral[0] : fg }
                    ]}
                  >
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
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
          <TouchableOpacity style={styles.calcButton} onPress={openCalculator} activeOpacity={0.8}>
            <Image
              source={require('../../assets/icons/calculator.png')}
              style={styles.calcButtonIcon}
              resizeMode="contain"
            />
          </TouchableOpacity>
        </View>

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
            onPress={() => {
              Keyboard.dismiss();
              setShowDatePicker(true);
            }}
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
            <TouchableOpacity onPress={handleAddNewAccountFromPicker}>
              <Text style={styles.modalDone} numberOfLines={1} ellipsizeMode="tail">Add</Text>
            </TouchableOpacity>
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

          <View style={styles.pickerContent}>
            {availableAccountsForPicker.length === 0 ? (
              <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No accounts available</Text>
              <Text style={styles.emptyStateSubtext}>
                Create an account to continue
              </Text>
                <AddAccountFooter />
              </View>
            ) : filteredAccounts.length === 0 ? (
              <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No accounts found</Text>
              <Text style={styles.emptyStateSubtext}>
                Try a different search term
              </Text>
                <AddAccountFooter />
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
                ListFooterComponent={AddAccountFooter}
                contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xl }}
              />
            )}
          </View>
        </View>
      </Modal>

      {/* Date Picker Modal */}
      {showDatePicker && (
        Platform.OS === 'ios' ? (
          <Modal
            visible={showDatePicker}
            animationType="fade"
            transparent
            onRequestClose={() => setShowDatePicker(false)}
          >
            <View style={styles.bottomSheetBackdrop}>
              <TouchableOpacity
                style={styles.bottomSheetBackdropTouchable}
                activeOpacity={1}
                onPress={() => setShowDatePicker(false)}
              />
              <View style={[styles.bottomSheet, { paddingBottom: insets.bottom }]}>
                <View style={styles.bottomSheetHandle} />
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
                  style={styles.datePicker}
                />
              </View>
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

      {/* Calculator Modal */}
      <Modal
        visible={showCalculator}
        animationType="slide"
        transparent
        onRequestClose={() => setShowCalculator(false)}
      >
        <View style={styles.bottomSheetBackdrop}>
          <TouchableOpacity
            style={styles.bottomSheetBackdropTouchable}
            activeOpacity={1}
            onPress={() => setShowCalculator(false)}
          />
          <View style={[styles.calcBottomSheet, { paddingBottom: insets.bottom }]}>
            <View style={styles.bottomSheetHandle} />
            <View style={styles.calcHeader}>
              <TouchableOpacity onPress={() => setShowCalculator(false)}>
                <Text style={styles.modalCancel}>Close</Text>
              </TouchableOpacity>
              <Text style={styles.calcTitle}>Calculator</Text>
              <TouchableOpacity onPress={useCalcAmount}>
                <Text style={styles.modalDone}>Use</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.calcDisplay}>
              <Text style={styles.calcExpr} numberOfLines={2} ellipsizeMode="tail">
                {calcExpr || '0'}
              </Text>
              <Text style={styles.calcResult} numberOfLines={1} ellipsizeMode="tail">
                {calcValue === null ? '—' : formatCurrency(Math.abs(calcValue), currency)}
              </Text>
            </View>

            <View style={styles.calcPad}>
              {[
                ['C', '⌫', '/', '*'],
                ['7', '8', '9', '-'],
                ['4', '5', '6', '+'],
                ['1', '2', '3', '='],
                ['0', '.', '', ''],
              ].map((row, rowIdx) => (
                <View key={`r-${rowIdx}`} style={styles.calcRow}>
                  {row.map((key, idx) => {
                    if (!key) return <View key={`e-${rowIdx}-${idx}`} style={[styles.calcKey, styles.calcKeyEmpty]} />;

                    const onPress = () => {
                      if (key === 'C') return clearCalc();
                      if (key === '⌫') return backspaceCalc();
                      if (key === '=') {
                        if (calcValue === null || !Number.isFinite(calcValue)) return;
                        setCalcExpr(String(calcValue));
                        return;
                      }
                      // normalize operators shown
                      const token = key === '×' ? '*' : key === '÷' ? '/' : key;
                      appendCalc(token);
                    };

                    const isPrimary = key === '=';
                    const isAction = key === 'C' || key === '⌫';
                    const isOp = key === '+' || key === '-' || key === '*' || key === '/';

                    return (
                      <TouchableOpacity
                        key={`k-${rowIdx}-${idx}-${key}`}
                        style={[
                          styles.calcKey,
                          isPrimary && styles.calcKeyPrimary,
                          isAction && styles.calcKeyAction,
                          isOp && styles.calcKeyOp,
                        ]}
                        onPress={onPress}
                        activeOpacity={0.8}
                      >
                        <Text
                          style={[
                            styles.calcKeyText,
                            isPrimary && styles.calcKeyTextPrimary,
                          ]}
                        >
                          {key}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ))}
            </View>
          </View>
        </View>
      </Modal>
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
  calcButton: {
    marginLeft: spacing.sm,
    backgroundColor: 'transparent',
  },
  calcButtonIcon: {
    width: 33,
    height: 27,
  },
  typeSection: {
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.base,
  },
  typeHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  typeHeaderLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  typeHeaderHint: {
    fontSize: typography.fontSize.xs,
    color: colors.text.tertiary,
  },
  typeChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    justifyContent: 'center',
  },
  typeChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    backgroundColor: colors.background.elevated,
  },
  typeChipInactive: {
    backgroundColor: colors.background.elevated,
  },
  typeChipText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semiBold,
    letterSpacing: 0.3,
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
  bottomSheetBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },
  bottomSheetBackdropTouchable: {
    flex: 1,
  },
  bottomSheet: {
    backgroundColor: colors.background.primary,
    borderTopLeftRadius: borderRadius.lg,
    borderTopRightRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  bottomSheetHandle: {
    alignSelf: 'center',
    width: 48,
    height: 5,
    borderRadius: 999,
    backgroundColor: colors.neutral[300],
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  datePicker: {
    height: 260,
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
  calcBottomSheet: {
    backgroundColor: colors.background.primary,
    borderTopLeftRadius: borderRadius.lg,
    borderTopRightRadius: borderRadius.lg,
    overflow: 'hidden',
    maxHeight: '85%',
  },
  calcHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  calcTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.text.primary,
    textAlign: 'center',
    flex: 1,
  },
  calcDisplay: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  calcExpr: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.text.primary,
    textAlign: 'right',
  },
  calcResult: {
    fontSize: typography.fontSize.sm,
    color: colors.text.tertiary,
    textAlign: 'right',
    marginTop: spacing.sm,
  },
  calcPad: {
    padding: spacing.base,
    gap: spacing.sm,
  },
  calcRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  calcKey: {
    flex: 1,
    height: 52,
    borderRadius: borderRadius.md,
    backgroundColor: colors.background.elevated,
    borderWidth: 1,
    borderColor: colors.border.light,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  calcKeyEmpty: {
    backgroundColor: 'transparent',
    borderColor: 'transparent',
    ...shadows.sm,
  },
  calcKeyOp: {
    backgroundColor: colors.primary[50],
    borderColor: colors.primary[100],
  },
  calcKeyAction: {
    backgroundColor: colors.neutral[100],
  },
  calcKeyPrimary: {
    backgroundColor: colors.primary[500],
    borderColor: colors.primary[500],
  },
  calcKeyText: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.text.primary,
  },
  calcKeyTextPrimary: {
    color: colors.neutral[0],
  },
  pickerContent: {
    flex: 1,
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
  addAccountFooter: {
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.base,
    alignItems: 'center',
  },
  addAccountFooterTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  addAccountFooterSubtext: {
    fontSize: typography.fontSize.sm,
    color: colors.text.tertiary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  addAccountFooterLink: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.primary[500],
    textDecorationLine: 'underline',
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
