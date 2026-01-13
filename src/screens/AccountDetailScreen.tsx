/**
 * Account Detail Screen for Gharkharch
 * Shows account details and transaction history for a specific account
 */

import React, { useMemo, useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  Modal,
  ScrollView,
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { useAuthStore, useAccountStore, useTransactionStore } from '../stores';
import { RootStackParamList, Transaction, AccountType } from '../types';
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
import { 
  getOpeningBalance, 
  getClosingBalance, 
  getTransactionsForDateRange 
} from '../utils/reports';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'AccountDetail'>;
type RouteType = RouteProp<RootStackParamList, 'AccountDetail'>;

const AccountDetailScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteType>();
  
  const { accountId, fromDate: initialFromDate, toDate: initialToDate } = route.params;
  
  const { user } = useAuthStore();
  const { getAccountById, deleteAccount, accounts } = useAccountStore();
  const { transactions, getTransactionsByAccount, subscribeToTransactions } = useTransactionStore();

  const account = getAccountById(accountId);
  const allAccountTransactions = getTransactionsByAccount(accountId);
  
  const [transactionLimit, setTransactionLimit] = useState(50);
  const flatListRef = useRef<FlatList>(null);
  
  // Date range state - use passed dates or calculate defaults
  const [fromDate, setFromDate] = useState(() => {
    if (initialFromDate) {
      return new Date(initialFromDate);
    }
    if (allAccountTransactions.length === 0) {
      const date = new Date();
      date.setDate(1); // First day of current month
      return date;
    }
    const dates = allAccountTransactions.map(txn => new Date(txn.date));
    return new Date(Math.min(...dates.map(d => d.getTime())));
  });
  const [toDate, setToDate] = useState(() => {
    if (initialToDate) {
      return new Date(initialToDate);
    }
    return new Date();
  });
  const [showFromDatePicker, setShowFromDatePicker] = useState(false);
  const [showToDatePicker, setShowToDatePicker] = useState(false);

  // Subscribe to transactions with limit
  useEffect(() => {
    if (user?.id) {
      const unsubscribe = subscribeToTransactions(user.id, transactionLimit);
      return () => {
        unsubscribe();
      };
    }
  }, [user?.id, subscribeToTransactions, transactionLimit]);

  const handleLoadMore = () => {
    setTransactionLimit(prev => prev + 50);
  };

  // Filter transactions for date range
  const accountTransactions = useMemo(() => {
    return getTransactionsForDateRange(allAccountTransactions, fromDate, toDate);
  }, [allAccountTransactions, fromDate, toDate]);

  // Calculate opening and closing balances
  const openingBalance = useMemo(() => {
    if (!account || (account.accountType !== 'asset' && account.accountType !== 'liability')) {
      return 0;
    }
    return getOpeningBalance(account, transactions, fromDate);
  }, [account, transactions, fromDate]);

  const closingBalance = useMemo(() => {
    if (!account || (account.accountType !== 'asset' && account.accountType !== 'liability')) {
      return 0;
    }
    return getClosingBalance(account, transactions, toDate);
  }, [account, transactions, toDate]);

  // Calculate total debit and credit for this account
  const debitCreditData = useMemo(() => {
    let totalDebit = 0;
    let totalCredit = 0;

    accountTransactions.forEach(txn => {
      if (txn.debitAccountId === accountId) {
        totalDebit += txn.amount;
      }
      if (txn.creditAccountId === accountId) {
        totalCredit += txn.amount;
      }
    });

    return { totalDebit, totalCredit };
  }, [accountTransactions, accountId]);

  // Calculate income and expenses for date range
  const incomeExpenseData = useMemo(() => {
    const periodTransactions = getTransactionsForDateRange(transactions, fromDate, toDate);
    
    const expenses = new Map<string, { category: string; subCategory: string; total: number }>();
    const income = new Map<string, { category: string; subCategory: string; total: number }>();
    
    periodTransactions.forEach(txn => {
      const debitAccount = accounts.find(acc => acc.id === txn.debitAccountId);
      const creditAccount = accounts.find(acc => acc.id === txn.creditAccountId);
      
      // Expense: debit account is expense type
      if (debitAccount?.accountType === 'expense') {
        const key = `${debitAccount.parentCategory}|${debitAccount.subCategory}`;
        const existing = expenses.get(key) || {
          category: debitAccount.parentCategory,
          subCategory: debitAccount.subCategory,
          total: 0,
        };
        existing.total += txn.amount;
        expenses.set(key, existing);
      }
      
      // Return: credit account is expense type (money coming back from expense)
      if (creditAccount?.accountType === 'expense') {
        const key = `${creditAccount.parentCategory}|${creditAccount.subCategory}`;
        const existing = expenses.get(key) || {
          category: creditAccount.parentCategory,
          subCategory: creditAccount.subCategory,
          total: 0,
        };
        existing.total -= txn.amount; // Subtract returns from expenses
        expenses.set(key, existing);
      }
      
      // Income: credit account is income type
      if (creditAccount?.accountType === 'income') {
        const key = `${creditAccount.parentCategory}|${creditAccount.subCategory}`;
        const existing = income.get(key) || {
          category: creditAccount.parentCategory,
          subCategory: creditAccount.subCategory,
          total: 0,
        };
        existing.total += txn.amount;
        income.set(key, existing);
      }
    });
    
    // Group by category
    const expenseByCategory = new Map<string, { category: string; subCategories: Map<string, number>; total: number }>();
    const incomeByCategory = new Map<string, { category: string; subCategories: Map<string, number>; total: number }>();
    
    expenses.forEach((value) => {
      if (!expenseByCategory.has(value.category)) {
        expenseByCategory.set(value.category, {
          category: value.category,
          subCategories: new Map(),
          total: 0,
        });
      }
      const cat = expenseByCategory.get(value.category)!;
      cat.subCategories.set(value.subCategory, value.total);
      cat.total += value.total;
    });
    
    income.forEach((value) => {
      if (!incomeByCategory.has(value.category)) {
        incomeByCategory.set(value.category, {
          category: value.category,
          subCategories: new Map(),
          total: 0,
        });
      }
      const cat = incomeByCategory.get(value.category)!;
      cat.subCategories.set(value.subCategory, value.total);
      cat.total += value.total;
    });
    
    const totalExpenses = Array.from(expenses.values()).reduce((sum, item) => sum + item.total, 0);
    const totalIncome = Array.from(income.values()).reduce((sum, item) => sum + item.total, 0);
    
    return {
      expenses: expenseByCategory,
      income: incomeByCategory,
      totalExpenses,
      totalIncome,
    };
  }, [transactions, accounts, fromDate, toDate]);
  
  const currency = user?.currency ?? DEFAULT_CURRENCY;
  const hasBalance = account?.accountType === 'asset' || account?.accountType === 'liability';

  /**
   * Get display info for a transaction relative to this account
   */
  const getTransactionDisplayInfo = (transaction: Transaction) => {
    const isDebit = transaction.debitAccountId === accountId;
    const otherAccountId = isDebit ? transaction.creditAccountId : transaction.debitAccountId;
    const otherAccount = getAccountById(otherAccountId);

    // For this account, determine if money came in or went out
    // Asset accounts: Debit = money in, Credit = money out
    // Liability accounts: Debit = debt reduced, Credit = debt increased
    // Income/Expense accounts: Just show the other account
    
    let isInflow = false;
    if (account?.accountType === 'asset') {
      isInflow = isDebit; // Debit to asset = money coming in
    } else if (account?.accountType === 'liability') {
      isInflow = !isDebit; // Credit to liability = debt increasing
    } else if (account?.accountType === 'income') {
      isInflow = !isDebit; // Credit to income = income recorded
    } else {
      isInflow = isDebit; // Debit to expense = expense recorded
    }

    return {
      otherAccountName: otherAccount?.name ?? 'Unknown',
      isInflow,
    };
  };

  /**
   * Handle account deletion
   */
  const handleDelete = () => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete this account? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteAccount(accountId);
              navigation.goBack();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete account. Please try again.');
            }
          },
        },
      ]
    );
  };

  if (!account) {
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyStateText}>Account not found</Text>
      </View>
    );
  }

  const renderTransaction = ({ item: transaction }: { item: Transaction }) => {
    const displayInfo = getTransactionDisplayInfo(transaction);
    
    return (
      <TouchableOpacity
        style={styles.transactionItem}
        onPress={() => navigation.navigate('TransactionDetail', { transactionId: transaction.id })}
      >
        <View style={styles.transactionInfo}>
          <Text style={styles.transactionTitle} numberOfLines={1}>
            {displayInfo.otherAccountName}
          </Text>
          <Text style={styles.transactionDate}>
            {transaction.date.toLocaleDateString()}
          </Text>
        </View>
        <Text style={[
          styles.transactionAmount,
          displayInfo.isInflow ? styles.inflowText : styles.outflowText
        ]}>
          {displayInfo.isInflow ? '+' : '-'}{formatCurrency(transaction.amount, currency)}
        </Text>
      </TouchableOpacity>
    );
  };

  const ListHeader = () => (
    <>
      {/* Account Header Card */}
      <View style={[
        styles.headerCard,
        { backgroundColor: getAccountTypeColor(account.accountType) }
      ]}>
        <View style={styles.headerIcon}>
          <Text style={styles.headerIconText}>
            {account.name.charAt(0).toUpperCase()}
          </Text>
        </View>
        <Text style={styles.accountName}>{account.name}</Text>
        <View style={styles.accountCategoryContainer}>
          <Text style={styles.accountCategory} numberOfLines={2}>
            {account.parentCategory} • {account.subCategory}
          </Text>
        </View>
      </View>

      {/* Date Range Selector */}
      <View style={styles.dateRangeSection}>
        <View style={styles.dateRangeRow}>
          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => setShowFromDatePicker(true)}
          >
            <View style={styles.dateButtonContent}>
              <View style={styles.labelRow}>
                <Text style={styles.chevron}>‹</Text>
                <Text style={styles.dateLabel}>From</Text>
              </View>
              <Text style={styles.dateValue} numberOfLines={1}>
                {fromDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              </Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => setShowToDatePicker(true)}
          >
            <View style={styles.dateButtonContent}>
              <View style={styles.labelRow}>
                <Text style={styles.chevron}>‹</Text>
                <Text style={styles.dateLabel}>To</Text>
              </View>
              <Text style={styles.dateValue} numberOfLines={1}>
                {toDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* Balance Summary */}
      {hasBalance && (
        <View style={styles.balanceSection}>
          <View style={styles.balanceGrid}>
            <View style={styles.balanceItem}>
              <Text style={styles.balanceItemLabel}>Opening Balance</Text>
              <Text style={styles.balanceItemValue}>
                {formatCurrency(openingBalance, currency)}
              </Text>
            </View>
            <View style={styles.balanceItem}>
              <Text style={styles.balanceItemLabel}>Closing Balance</Text>
              <Text style={styles.balanceItemValue}>
                {formatCurrency(closingBalance, currency)}
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Debit & Credit Summary */}
      <View style={styles.summarySection}>
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel} numberOfLines={2}>
              Total Debit
            </Text>
            <Text style={[styles.summaryValue, { color: colors.expense }]} numberOfLines={1}>
              {formatCurrency(debitCreditData.totalDebit, currency, false)}
            </Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel} numberOfLines={2}>
              Total Credit
            </Text>
            <Text style={[styles.summaryValue, { color: colors.income }]} numberOfLines={1}>
              {formatCurrency(debitCreditData.totalCredit, currency, true)}
            </Text>
          </View>
        </View>
      </View>



      {/* Transactions Header */}
      <View style={styles.transactionsHeader}>
        <Text style={styles.transactionsTitle}>Transactions</Text>
        <Text style={styles.transactionsCount}>
          {accountTransactions.length} total
        </Text>
      </View>
    </>
  );

  const ListEmpty = () => (
    <View style={styles.emptyTransactions}>
      <Text style={styles.emptyTransactionsText}>No transactions yet</Text>
    </View>
  );

  const ListFooter = () => (
    <TouchableOpacity
      style={styles.deleteButton}
      onPress={handleDelete}
    >
      <Text style={styles.deleteButtonText}>Delete Account</Text>
    </TouchableOpacity>
  );

  const onFromDateChange = (event: any, selectedDate?: Date) => {
    const currentDate = selectedDate || fromDate;
    setShowFromDatePicker(Platform.OS === 'ios');
    if (currentDate > toDate) {
      Alert.alert('Invalid Date', 'From Date cannot be after To Date.');
      return;
    }
    setFromDate(currentDate);
  };

  const onToDateChange = (event: any, selectedDate?: Date) => {
    const currentDate = selectedDate || toDate;
    setShowToDatePicker(Platform.OS === 'ios');
    if (currentDate < fromDate) {
      Alert.alert('Invalid Date', 'To Date cannot be before From Date.');
      return;
    }
    setToDate(currentDate);
  };

  return (
    <>
      <FlatList
        ref={flatListRef}
        style={styles.container}
        data={accountTransactions}
        renderItem={renderTransaction}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={ListEmpty}
        ListFooterComponent={() => (
          <>
            {transactions.length >= transactionLimit && (
              <TouchableOpacity
                style={styles.loadMoreButton}
                onPress={handleLoadMore}
              >
                <Text style={styles.loadMoreButtonText}>Load More</Text>
              </TouchableOpacity>
            )}
            <ListFooter />
          </>
        )}
        contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xl }}
        showsVerticalScrollIndicator={false}
        maintainVisibleContentPosition={{
          minIndexForVisible: 0,
        }}
      />

      {/* From Date Picker Modal */}
      {showFromDatePicker && (
        Platform.OS === 'ios' ? (
          <Modal
            visible={showFromDatePicker}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={() => setShowFromDatePicker(false)}
          >
            <View style={[styles.modalContainer, { paddingTop: insets.top }]}>
              <View style={styles.modalHeader}>
                <TouchableOpacity onPress={() => setShowFromDatePicker(false)}>
                  <Text style={styles.modalCancel} numberOfLines={1} ellipsizeMode="tail">Cancel</Text>
                </TouchableOpacity>
                <Text style={styles.modalTitle} numberOfLines={1} ellipsizeMode="tail">From Date</Text>
                <TouchableOpacity onPress={() => setShowFromDatePicker(false)}>
                  <Text style={styles.modalDone} numberOfLines={1} ellipsizeMode="tail">Done</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={fromDate}
                mode="date"
                display="spinner"
                onChange={onFromDateChange}
                maximumDate={toDate}
                style={{ flex: 1 }}
              />
            </View>
          </Modal>
        ) : (
          <DateTimePicker
            value={fromDate}
            mode="date"
            display="default"
            onChange={onFromDateChange}
            maximumDate={toDate}
          />
        )
      )}

      {/* To Date Picker Modal */}
      {showToDatePicker && (
        Platform.OS === 'ios' ? (
          <Modal
            visible={showToDatePicker}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={() => setShowToDatePicker(false)}
          >
            <View style={[styles.modalContainer, { paddingTop: insets.top }]}>
              <View style={styles.modalHeader}>
                <TouchableOpacity onPress={() => setShowToDatePicker(false)}>
                  <Text style={styles.modalCancel} numberOfLines={1} ellipsizeMode="tail">Cancel</Text>
                </TouchableOpacity>
                <Text style={styles.modalTitle} numberOfLines={1} ellipsizeMode="tail">To Date</Text>
                <TouchableOpacity onPress={() => setShowToDatePicker(false)}>
                  <Text style={styles.modalDone} numberOfLines={1} ellipsizeMode="tail">Done</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={toDate}
                mode="date"
                display="spinner"
                onChange={onToDateChange}
                minimumDate={fromDate}
                maximumDate={new Date()}
                style={{ flex: 1 }}
              />
            </View>
          </Modal>
        ) : (
          <DateTimePicker
            value={toDate}
            mode="date"
            display="default"
            onChange={onToDateChange}
            minimumDate={fromDate}
            maximumDate={new Date()}
          />
        )
      )}
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: typography.fontSize.lg,
    color: colors.text.secondary,
  },
  headerCard: {
    margin: spacing.base,
    padding: spacing.base,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    ...shadows.md,
  },
  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  headerIconText: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.neutral[0],
  },
  accountName: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.neutral[0],
    marginBottom: spacing.xs / 2,
  },
  accountCategoryContainer: {
    width: '100%',
    paddingHorizontal: spacing.base,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountCategory: {
    fontSize: typography.fontSize.xs,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    width: '100%',
  },
  balanceContainer: {
    marginTop: spacing.xl,
    alignItems: 'center',
  },
  balanceLabel: {
    fontSize: typography.fontSize.sm,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: spacing.xs,
  },
  balanceValue: {
    fontSize: typography.fontSize['3xl'],
    fontWeight: typography.fontWeight.bold,
    color: colors.neutral[0],
  },
  infoSection: {
    backgroundColor: colors.background.elevated,
    marginHorizontal: spacing.base,
    borderRadius: borderRadius.lg,
    ...shadows.sm,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  infoLabel: {
    fontSize: typography.fontSize.base,
    color: colors.text.secondary,
  },
  infoValue: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoValueText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.primary,
  },
  typeBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  typeBadgeText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semiBold,
  },
  transactionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  transactionsTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.text.primary,
  },
  transactionsCount: {
    fontSize: typography.fontSize.xs,
    color: colors.text.tertiary,
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.elevated,
    marginHorizontal: spacing.base,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.primary,
  },
  transactionDate: {
    fontSize: typography.fontSize.xs,
    color: colors.text.tertiary,
    marginTop: 1,
  },
  transactionAmount: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semiBold,
  },
  inflowText: {
    color: colors.income,
  },
  outflowText: {
    color: colors.expense,
  },
  emptyTransactions: {
    backgroundColor: colors.background.elevated,
    marginHorizontal: spacing.base,
    padding: spacing.base,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  emptyTransactionsText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.tertiary,
  },
  deleteButton: {
    marginHorizontal: spacing.base,
    marginTop: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    backgroundColor: colors.background.elevated,
    ...shadows.sm,
  },
  deleteButtonText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.error,
  },
  dateRangeSection: {
    padding: spacing.base,
    backgroundColor: colors.background.elevated,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  dateRangeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  dateButton: {
    flex: 1,
    padding: spacing.sm,
    backgroundColor: colors.background.primary,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: colors.primary[200],
    ...shadows.md,
  },
  dateButtonContent: {
    flex: 1,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs / 2,
  },
  dateLabel: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginLeft: spacing.xs,
  },
  dateValue: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.primary,
  },
  chevron: {
    fontSize: typography.fontSize.sm,
    color: colors.primary[500],
    fontWeight: typography.fontWeight.bold,
  },
  balanceSection: {
    padding: spacing.base,
    backgroundColor: colors.background.elevated,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  balanceGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  balanceItem: {
    flex: 1,
    padding: spacing.sm,
    backgroundColor: colors.background.primary,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  balanceItemLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.text.secondary,
    marginBottom: spacing.xs / 2,
  },
  balanceItemValue: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
  },
  summarySection: {
    padding: spacing.base,
    backgroundColor: colors.background.elevated,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  summaryItem: {
    flex: 1,
    minWidth: 0,
    padding: spacing.sm,
    backgroundColor: colors.background.primary,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.text.secondary,
    marginBottom: spacing.xs / 2,
    textAlign: 'center',
    width: '100%',
    flexShrink: 1,
  },
  summaryValue: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold,
    textAlign: 'center',
    width: '100%',
    flexShrink: 0,
  },
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
    textAlign: 'left',
  },
  modalTitle: {
    flex: 1,
    textAlign: 'center',
    flexShrink: 1,
    marginHorizontal: spacing.sm,
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.text.primary,
  },
  modalDone: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.primary[500],
    flexShrink: 0,
    minWidth: 60,
    textAlign: 'right',
  },
  loadMoreButton: {
    marginHorizontal: spacing.base,
    marginTop: spacing.md,
    backgroundColor: colors.primary[500],
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    ...shadows.md,
  },
  loadMoreButtonText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.neutral[0],
  },
});

export default AccountDetailScreen;
