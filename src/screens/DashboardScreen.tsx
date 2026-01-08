/**
 * Dashboard Screen for Gharkharch
 * Shows financial overview with net worth, recent transactions, and quick actions
 */

import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { useAuthStore, useAccountStore, useTransactionStore } from '../stores';
import { RootStackParamList, AccountType } from '../types';
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

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const DashboardScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  
  const { user } = useAuthStore();
  const { 
    accounts,
    isLoading: accountsLoading, 
    subscribeToAccounts,
    getTotalAssets,
    getTotalLiabilities,
    getNetWorth,
  } = useAccountStore();
  const { 
    transactions,
    isLoading: transactionsLoading, 
    subscribeToTransactions,
    getRecentTransactions,
  } = useTransactionStore();
  const { getAccountById } = useAccountStore();

  const [refreshing, setRefreshing] = React.useState(false);

  useEffect(() => {
    if (user?.id) {
      const unsubAccounts = subscribeToAccounts(user.id);
      const unsubTransactions = subscribeToTransactions(user.id);
      
      return () => {
        unsubAccounts();
        unsubTransactions();
      };
    }
  }, [user?.id, subscribeToAccounts, subscribeToTransactions]);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    // Subscriptions auto-refresh, so just simulate a delay
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const currency = user?.currency ?? DEFAULT_CURRENCY;
  const totalAssets = getTotalAssets();
  const totalLiabilities = getTotalLiabilities();
  const netWorth = getNetWorth();
  const recentTransactions = getRecentTransactions(5);

  const handleAddTransaction = () => {
    navigation.navigate('AddTransaction');
  };

  const handleTransactionPress = (transactionId: string) => {
    navigation.navigate('TransactionDetail', { transactionId });
  };

  /**
   * Get display info for a transaction
   * Determines the "primary" account and whether it's income/expense/transfer/return
   */
  const getTransactionDisplayInfo = (transaction: typeof transactions[0]) => {
    const debitAccount = getAccountById(transaction.debitAccountId);
    const creditAccount = getAccountById(transaction.creditAccountId);

    // Determine transaction type based on account types
    // Expense: Debit expense account, Credit asset/liability account
    // Income: Debit asset account, Credit income account
    // Return: Credit expense account, Debit asset/liability account (money coming back from expense)
    // Transfer: Both accounts are asset/liability
    
    if (debitAccount?.accountType === 'expense') {
      return {
        title: debitAccount.name,
        subtitle: `from ${creditAccount?.name ?? 'Unknown'}`,
        type: 'expense' as AccountType,
        isExpense: true,
      };
    } else if (creditAccount?.accountType === 'income') {
      return {
        title: creditAccount.name,
        subtitle: `to ${debitAccount?.name ?? 'Unknown'}`,
        type: 'income' as AccountType,
        isExpense: false,
      };
    } else if (creditAccount?.accountType === 'expense') {
      // Return/Refund: Credit expense account means money is coming back from expense
      return {
        title: `${creditAccount.name} Return`,
        subtitle: `Return to ${debitAccount?.name ?? 'Unknown'}`,
        type: 'expense' as AccountType,
        isExpense: false,
        isReturn: true,
      };
    } else {
      // Transfer between asset/liability accounts
      return {
        title: `${creditAccount?.name ?? 'Unknown'} → ${debitAccount?.name ?? 'Unknown'}`,
        subtitle: 'Transfer',
        type: 'asset' as AccountType,
        isExpense: false,
      };
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xl }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Net Worth Card */}
      <View style={styles.netWorthCard}>
        <Text style={styles.netWorthLabel}>Net Worth</Text>
        <Text style={[
          styles.netWorthValue,
          netWorth < 0 && styles.negativeValue
        ]}>
          {formatCurrency(netWorth, currency)}
        </Text>
        
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <View style={[styles.summaryDot, { backgroundColor: colors.asset }]} />
            <View>
              <Text style={styles.summaryLabel}>Assets</Text>
              <Text style={styles.summaryValue}>{formatCurrency(totalAssets, currency)}</Text>
            </View>
          </View>
          <View style={styles.summaryItem}>
            <View style={[styles.summaryDot, { backgroundColor: colors.liability }]} />
            <View>
              <Text style={styles.summaryLabel}>Liabilities</Text>
              <Text style={styles.summaryValue}>{formatCurrency(totalLiabilities, currency)}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <TouchableOpacity 
          style={styles.addButton}
          onPress={handleAddTransaction}
        >
          <Text style={styles.addButtonIcon}>+</Text>
          <Text style={styles.addButtonText}>Add Transaction</Text>
        </TouchableOpacity>
      </View>

      {/* Recent Transactions */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Transactions</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Main', { screen: 'Transactions' } as never)}>
            <Text style={styles.seeAllText}>See All</Text>
          </TouchableOpacity>
        </View>

        {transactionsLoading ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>Loading...</Text>
          </View>
        ) : recentTransactions.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No transactions yet</Text>
            <Text style={styles.emptyStateSubtext}>
              Add your first transaction to get started
            </Text>
          </View>
        ) : (
          <View style={styles.transactionsList}>
            {recentTransactions.map((transaction) => {
              const displayInfo = getTransactionDisplayInfo(transaction);
              return (
                <TouchableOpacity
                  key={transaction.id}
                  style={styles.transactionItem}
                  onPress={() => handleTransactionPress(transaction.id)}
                >
                  <View style={[
                    styles.transactionIcon,
                    { backgroundColor: getAccountTypeBgColor(displayInfo.type) }
                  ]}>
                    <Text style={[
                      styles.transactionIconText,
                      { color: getAccountTypeColor(displayInfo.type) }
                    ]}>
                      {displayInfo.isExpense ? '↑' : '↓'}
                    </Text>
                  </View>
                  <View style={styles.transactionInfo}>
                    <Text style={styles.transactionTitle} numberOfLines={1}>
                      {displayInfo.title}
                    </Text>
                    <Text style={styles.transactionSubtitle} numberOfLines={1}>
                      {displayInfo.subtitle}
                    </Text>
                  </View>
                  <View style={styles.transactionAmount}>
                    <Text style={[
                      styles.transactionAmountText,
                      displayInfo.isExpense ? styles.expenseText : styles.incomeText
                    ]}>
                      {displayInfo.isExpense ? '-' : '+'}{formatCurrency(transaction.amount, currency)}
                    </Text>
                    <Text style={styles.transactionDate}>
                      {transaction.date.toLocaleDateString()}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </View>

      {/* Account Summary */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Accounts</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Main', { screen: 'Accounts' } as never)}>
            <Text style={styles.seeAllText}>See All</Text>
          </TouchableOpacity>
        </View>

        {accountsLoading ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>Loading...</Text>
          </View>
        ) : accounts.filter(a => a.isActive && (a.accountType === 'asset' || a.accountType === 'liability')).length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No accounts yet</Text>
            <Text style={styles.emptyStateSubtext}>
              Add your bank accounts and credit cards
            </Text>
          </View>
        ) : (
          <View style={styles.accountsList}>
            {accounts
              .filter(a => a.isActive && (a.accountType === 'asset' || a.accountType === 'liability'))
              .slice(0, 5)
              .map((account) => (
                <TouchableOpacity
                  key={account.id}
                  style={styles.accountItem}
                  onPress={() => navigation.navigate('AccountDetail', { accountId: account.id })}
                >
                  <View style={[
                    styles.accountIcon,
                    { backgroundColor: getAccountTypeBgColor(account.accountType) }
                  ]}>
                    <Text style={[
                      styles.accountIconText,
                      { color: getAccountTypeColor(account.accountType) }
                    ]}>
                      {account.accountType === 'asset' ? '↗' : '↙'}
                    </Text>
                  </View>
                  <View style={styles.accountInfo}>
                    <Text style={styles.accountName} numberOfLines={1}>
                      {account.name}
                    </Text>
                    <Text style={styles.accountCategory} numberOfLines={1}>
                      {account.subCategory}
                    </Text>
                  </View>
                  <Text style={[
                    styles.accountBalance,
                    account.accountType === 'liability' && styles.liabilityBalance
                  ]}>
                    {formatCurrency(account.currentBalance ?? 0, currency)}
                  </Text>
                </TouchableOpacity>
              ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  netWorthCard: {
    backgroundColor: colors.primary[500],
    margin: spacing.base,
    padding: spacing.xl,
    borderRadius: borderRadius.xl,
    ...shadows.lg,
  },
  netWorthLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.primary[100],
    marginBottom: spacing.xs,
  },
  netWorthValue: {
    fontSize: typography.fontSize['4xl'],
    fontWeight: typography.fontWeight.bold,
    color: colors.neutral[0],
    marginBottom: spacing.lg,
  },
  negativeValue: {
    color: '#FFCDD2',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: spacing.sm,
  },
  summaryLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.primary[200],
  },
  summaryValue: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.neutral[0],
  },
  quickActions: {
    paddingHorizontal: spacing.base,
    marginBottom: spacing.lg,
  },
  addButton: {
    backgroundColor: colors.secondary[500],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    ...shadows.md,
  },
  addButtonIcon: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.neutral[900],
    marginRight: spacing.sm,
  },
  addButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.neutral[900],
  },
  section: {
    paddingHorizontal: spacing.base,
    marginBottom: spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.text.primary,
  },
  seeAllText: {
    fontSize: typography.fontSize.sm,
    color: colors.primary[500],
    fontWeight: typography.fontWeight.medium,
  },
  emptyState: {
    backgroundColor: colors.background.elevated,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    ...shadows.sm,
  },
  emptyStateText: {
    fontSize: typography.fontSize.base,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  emptyStateSubtext: {
    fontSize: typography.fontSize.sm,
    color: colors.text.tertiary,
    textAlign: 'center',
  },
  transactionsList: {
    backgroundColor: colors.background.elevated,
    borderRadius: borderRadius.lg,
    ...shadows.sm,
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  transactionIconText: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
  },
  transactionInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  transactionTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.primary,
  },
  transactionSubtitle: {
    fontSize: typography.fontSize.sm,
    color: colors.text.tertiary,
    marginTop: 2,
  },
  transactionAmount: {
    alignItems: 'flex-end',
  },
  transactionAmountText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semiBold,
  },
  expenseText: {
    color: colors.expense,
  },
  incomeText: {
    color: colors.income,
  },
  transactionDate: {
    fontSize: typography.fontSize.xs,
    color: colors.text.tertiary,
    marginTop: 2,
  },
  accountsList: {
    backgroundColor: colors.background.elevated,
    borderRadius: borderRadius.lg,
    ...shadows.sm,
  },
  accountItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  accountIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  accountIconText: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
  },
  accountInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  accountName: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.primary,
  },
  accountCategory: {
    fontSize: typography.fontSize.sm,
    color: colors.text.tertiary,
    marginTop: 2,
  },
  accountBalance: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.asset,
  },
  liabilityBalance: {
    color: colors.liability,
  },
});

export default DashboardScreen;
