/**
 * Account Detail Screen for Gharkharch
 * Shows account details and transaction history for a specific account
 */

import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
} from 'react-native';
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

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'AccountDetail'>;
type RouteType = RouteProp<RootStackParamList, 'AccountDetail'>;

const AccountDetailScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteType>();
  
  const { accountId } = route.params;
  
  const { user } = useAuthStore();
  const { getAccountById, deleteAccount } = useAccountStore();
  const { getTransactionsByAccount } = useTransactionStore();

  const account = getAccountById(accountId);
  const accountTransactions = getTransactionsByAccount(accountId);
  
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
        <Text style={styles.accountCategory}>
          {account.parentCategory} • {account.subCategory}
        </Text>
        
        {hasBalance && (
          <View style={styles.balanceContainer}>
            <Text style={styles.balanceLabel}>
              {account.accountType === 'asset' ? 'Current Balance' : 'Amount Owed'}
            </Text>
            <Text style={styles.balanceValue}>
              {formatCurrency(account.currentBalance ?? 0, currency)}
            </Text>
          </View>
        )}
      </View>

      {/* Account Info */}
      <View style={styles.infoSection}>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Account Type</Text>
          <View style={styles.infoValue}>
            <View style={[
              styles.typeBadge,
              { backgroundColor: getAccountTypeBgColor(account.accountType) }
            ]}>
              <Text style={[
                styles.typeBadgeText,
                { color: getAccountTypeColor(account.accountType) }
              ]}>
                {account.accountType.charAt(0).toUpperCase() + account.accountType.slice(1)}
              </Text>
            </View>
          </View>
        </View>
        
        {hasBalance && account.openingBalance !== undefined && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Opening Balance</Text>
            <Text style={styles.infoValueText}>
              {formatCurrency(account.openingBalance, currency)}
            </Text>
          </View>
        )}
        
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Created</Text>
          <Text style={styles.infoValueText}>
            {account.createdAt.toLocaleDateString()}
          </Text>
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

  return (
    <FlatList
      style={styles.container}
      data={accountTransactions}
      renderItem={renderTransaction}
      keyExtractor={(item) => item.id}
      ListHeaderComponent={ListHeader}
      ListEmptyComponent={ListEmpty}
      ListFooterComponent={ListFooter}
      contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xl }}
      showsVerticalScrollIndicator={false}
    />
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
    padding: spacing.xl,
    borderRadius: borderRadius.xl,
    alignItems: 'center',
    ...shadows.lg,
  },
  headerIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  headerIconText: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: typography.fontWeight.bold,
    color: colors.neutral[0],
  },
  accountName: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: typography.fontWeight.bold,
    color: colors.neutral[0],
    marginBottom: spacing.xs,
  },
  accountCategory: {
    fontSize: typography.fontSize.sm,
    color: 'rgba(255, 255, 255, 0.8)',
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
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
  },
  transactionsTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.text.primary,
  },
  transactionsCount: {
    fontSize: typography.fontSize.sm,
    color: colors.text.tertiary,
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.elevated,
    marginHorizontal: spacing.base,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.primary,
  },
  transactionDate: {
    fontSize: typography.fontSize.sm,
    color: colors.text.tertiary,
    marginTop: 2,
  },
  transactionAmount: {
    fontSize: typography.fontSize.base,
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
    padding: spacing.xl,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
  },
  emptyTransactionsText: {
    fontSize: typography.fontSize.base,
    color: colors.text.tertiary,
  },
  deleteButton: {
    marginHorizontal: spacing.base,
    marginTop: spacing['2xl'],
    paddingVertical: spacing.base,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    backgroundColor: colors.background.elevated,
    ...shadows.sm,
  },
  deleteButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.error,
  },
});

export default AccountDetailScreen;
