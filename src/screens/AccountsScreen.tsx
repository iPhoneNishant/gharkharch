/**
 * Accounts Screen for Gharkharch
 * Lists all accounts organized by type (Assets, Liabilities, Income, Expenses)
 */

import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SectionList,
  Modal,
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
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
import { getOpeningBalance, getClosingBalance, getTransactionsForDateRange } from '../utils/reports';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

type TabType = 'balance' | 'income' | 'expense';

const AccountsScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  
  const { user } = useAuthStore();
  const { 
    accounts, 
    isLoading,
    subscribeToAccounts,
    getTotalAssets,
    getTotalLiabilities,
  } = useAccountStore();
  const { transactions, subscribeToTransactions } = useTransactionStore();

  // Subscribe to accounts and transactions when user is available
  // This ensures data is loaded even if this screen loads before Dashboard
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

  const [activeTab, setActiveTab] = useState<TabType>('balance');
  
  // Date range state
  const [fromDate, setFromDate] = useState(() => {
    const date = new Date();
    date.setDate(1); // First day of current month
    return date;
  });
  const [toDate, setToDate] = useState(new Date());
  const [showFromDatePicker, setShowFromDatePicker] = useState(false);
  const [showToDatePicker, setShowToDatePicker] = useState(false);

  const currency = user?.currency ?? DEFAULT_CURRENCY;
  
  // Calculate opening and closing balances for accounts
  const accountBalances = useMemo(() => {
    const balances = new Map<string, { opening: number; closing: number }>();
    
    accounts.forEach(account => {
      if (account.accountType === 'asset' || account.accountType === 'liability') {
        const opening = getOpeningBalance(account, transactions, fromDate);
        const closing = getClosingBalance(account, transactions, toDate);
        // Always set balance, even if 0 or NaN
        balances.set(account.id, { 
          opening: isNaN(opening) ? 0 : opening, 
          closing: isNaN(closing) ? 0 : closing 
        });
      }
    });
    
    return balances;
  }, [accounts, transactions, fromDate, toDate]);

  /**
   * Get accounts filtered and grouped by the active tab
   */
  const sections = useMemo(() => {
    const activeAccounts = accounts.filter(a => a.isActive);
    
    if (activeTab === 'balance') {
      // Show asset and liability accounts
      const assetAccounts = activeAccounts.filter(a => a.accountType === 'asset');
      const liabilityAccounts = activeAccounts.filter(a => a.accountType === 'liability');
      
      const result: { title: string; data: Account[]; type: AccountType; total: number }[] = [];
      
      if (assetAccounts.length > 0) {
        const totalOpening = assetAccounts.reduce((sum, acc) => {
          const balance = accountBalances.get(acc.id);
          return sum + (balance?.opening ?? 0);
        }, 0);
        const totalClosing = assetAccounts.reduce((sum, acc) => {
          const balance = accountBalances.get(acc.id);
          return sum + (balance?.closing ?? 0);
        }, 0);
        
        result.push({
          title: 'Assets',
          data: assetAccounts,
          type: 'asset',
          total: totalClosing,
        });
      }
      
      if (liabilityAccounts.length > 0) {
        const totalOpening = liabilityAccounts.reduce((sum, acc) => {
          const balance = accountBalances.get(acc.id);
          return sum + (balance?.opening ?? 0);
        }, 0);
        const totalClosing = liabilityAccounts.reduce((sum, acc) => {
          const balance = accountBalances.get(acc.id);
          return sum + (balance?.closing ?? 0);
        }, 0);
        
        result.push({
          title: 'Liabilities',
          data: liabilityAccounts,
          type: 'liability',
          total: totalClosing,
        });
      }
      
      return result;
    } else if (activeTab === 'income') {
      const incomeAccounts = activeAccounts.filter(a => a.accountType === 'income');
      
      // Filter transactions for date range
      const periodTransactions = getTransactionsForDateRange(transactions, fromDate, toDate);
      
      // Group by parent category and calculate account-wise totals
      const categoryGroups = new Map<string, {
        accounts: Array<Account & { accountTotal: number }>;
        total: number;
      }>();
      
      incomeAccounts.forEach(account => {
        const category = account.parentCategory;
        
        if (!categoryGroups.has(category)) {
          categoryGroups.set(category, {
            accounts: [],
            total: 0,
          });
        }
        
        const catGroup = categoryGroups.get(category)!;
        
        // Calculate total for this account in the period (credit to income account)
        const accountTransactions = periodTransactions.filter(txn => 
          txn.creditAccountId === account.id
        );
        const accountTotal = accountTransactions.reduce((sum, txn) => sum + txn.amount, 0);
        
        catGroup.accounts.push({ ...account, accountTotal });
        catGroup.total += accountTotal;
      });
      
      // Flatten into sections with account-wise totals
      const result: { title: string; data: Array<Account & { accountTotal?: number }>; type: AccountType; total: number }[] = [];
      
      categoryGroups.forEach((catGroup, category) => {
        result.push({
          title: category,
          data: catGroup.accounts,
          type: 'income' as AccountType,
          total: catGroup.total,
        });
      });
      
      return result;
    } else {
      const expenseAccounts = activeAccounts.filter(a => a.accountType === 'expense');
      
      // Filter transactions for date range
      const periodTransactions = getTransactionsForDateRange(transactions, fromDate, toDate);
      
      // Group by parent category and calculate account-wise totals
      const categoryGroups = new Map<string, {
        accounts: Array<Account & { accountTotal: number }>;
        total: number;
      }>();
      
      expenseAccounts.forEach(account => {
        const category = account.parentCategory;
        
        if (!categoryGroups.has(category)) {
          categoryGroups.set(category, {
            accounts: [],
            total: 0,
          });
        }
        
        const catGroup = categoryGroups.get(category)!;
        
        // Calculate total for this account in the period
        // Debit to expense = expense, Credit to expense = return (subtract)
        const accountTransactions = periodTransactions.filter(txn => 
          txn.debitAccountId === account.id || txn.creditAccountId === account.id
        );
        const accountTotal = accountTransactions.reduce((sum, txn) => {
          if (txn.debitAccountId === account.id) {
            return sum + txn.amount; // Expense
          } else {
            return sum - txn.amount; // Return (subtract)
          }
        }, 0);
        
        catGroup.accounts.push({ ...account, accountTotal });
        catGroup.total += accountTotal;
      });
      
      // Flatten into sections with account-wise totals
      const result: { title: string; data: Array<Account & { accountTotal?: number }>; type: AccountType; total: number }[] = [];
      
      categoryGroups.forEach((catGroup, category) => {
        result.push({
          title: category,
          data: catGroup.accounts,
          type: 'expense' as AccountType,
          total: Math.abs(catGroup.total),
        });
      });
      
      return result;
    }
  }, [accounts, activeTab, accountBalances, transactions, fromDate, toDate]);

  const handleAddAccount = () => {
    navigation.navigate('AddAccount');
  };

  const handleAccountPress = (accountId: string) => {
    navigation.navigate('AccountDetail', { 
      accountId,
      fromDate,
      toDate,
    });
  };

  const renderAccount = ({ item: account }: { item: Account & { accountTotal?: number } }) => {
    const showBalance = account.accountType === 'asset' || account.accountType === 'liability';
    const showAccountTotal = (account.accountType === 'income' || account.accountType === 'expense') && account.accountTotal !== undefined;
    const balance = accountBalances.get(account.id);
    
    return (
      <TouchableOpacity
        style={styles.accountItem}
        onPress={() => handleAccountPress(account.id)}
      >
        <View style={[
          styles.accountIcon,
          { backgroundColor: getAccountTypeBgColor(account.accountType) }
        ]}>
          <Text style={[
            styles.accountIconText,
            { color: getAccountTypeColor(account.accountType) }
          ]}>
            {account.name.charAt(0).toUpperCase()}
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
        {showBalance && (
          <View style={styles.balanceContainer}>
            <Text 
              style={[
                styles.accountBalance,
                account.accountType === 'liability' && styles.liabilityBalance
              ]}
              allowFontScaling={true}
            >
              {balance ? formatCurrency(balance.closing, currency) : formatCurrency(account.currentBalance ?? 0, currency)}
            </Text>
            {showBalance && (
              <Text 
                style={styles.balanceLabel}
                allowFontScaling={true}
              >
                Opening: {balance ? formatCurrency(balance.opening ?? 0, currency) : formatCurrency(account.openingBalance ?? 0, currency)}
              </Text>
            )}
          </View>
        )}
        {showAccountTotal && (
          <View style={styles.balanceContainer}>
            <Text 
              style={[
                styles.accountBalance,
                account.accountType === 'income' && { color: colors.income },
                account.accountType === 'expense' && { color: colors.expense },
              ]}
              allowFontScaling={true}
            >
              {formatCurrency(Math.abs(account.accountTotal ?? 0), currency)}
            </Text>
          </View>
        )}
        <Text style={styles.chevron}>›</Text>
      </TouchableOpacity>
    );
  };

  const renderSectionHeader = ({ section }: { section: { title: string; type: AccountType; total: number } }) => (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionTitleRow}>
        <View style={[
          styles.sectionDot,
          { backgroundColor: getAccountTypeColor(section.type) }
        ]} />
        <Text style={styles.sectionTitle}>{section.title}</Text>
      </View>
      {section.total !== 0 && (
        <Text style={[
          styles.sectionTotal,
          section.type === 'liability' && styles.liabilityBalance,
          section.type === 'income' && { color: colors.income },
          section.type === 'expense' && { color: colors.expense },
        ]}>
          {formatCurrency(section.total, currency)}
        </Text>
      )}
    </View>
  );

  const onFromDateChange = (event: any, selectedDate?: Date) => {
    const currentDate = selectedDate || fromDate;
    setShowFromDatePicker(Platform.OS === 'ios');
    if (currentDate > toDate) {
      return;
    }
    setFromDate(currentDate);
  };

  const onToDateChange = (event: any, selectedDate?: Date) => {
    const currentDate = selectedDate || toDate;
    setShowToDatePicker(Platform.OS === 'ios');
    if (currentDate < fromDate) {
      return;
    }
    setToDate(currentDate);
  };

  return (
    <View style={styles.container}>
      {/* Period Selector */}
      <View style={styles.periodSection}>
          <View style={styles.dateRangeRow}>
            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => setShowFromDatePicker(true)}
            >
              <View style={styles.dateButtonContent}>
                <Text style={styles.dateLabel}>From Date</Text>
                <Text style={styles.dateValue} numberOfLines={1} ellipsizeMode="tail">
                  {fromDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => setShowToDatePicker(true)}
            >
              <View style={styles.dateButtonContent}>
                <Text style={styles.dateLabel}>To Date</Text>
                <Text style={styles.dateValue} numberOfLines={1} ellipsizeMode="tail">
                  {toDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
          </View>
      </View>

      {/* Tab Bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'balance' && styles.activeTab]}
          onPress={() => setActiveTab('balance')}
        >
          <Text style={[styles.tabText, activeTab === 'balance' && styles.activeTabText]}>
            Balance Sheet
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'income' && styles.activeTab]}
          onPress={() => setActiveTab('income')}
        >
          <Text style={[styles.tabText, activeTab === 'income' && styles.activeTabText]}>
            Income
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'expense' && styles.activeTab]}
          onPress={() => setActiveTab('expense')}
        >
          <Text style={[styles.tabText, activeTab === 'expense' && styles.activeTabText]}>
            Expenses
          </Text>
        </TouchableOpacity>
      </View>

      {/* Accounts List */}
      {isLoading ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>Loading...</Text>
        </View>
      ) : sections.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateIcon}>
            {activeTab === 'balance' ? '🏦' : activeTab === 'income' ? '💰' : '💸'}
          </Text>
          <Text style={styles.emptyStateText}>
            No {activeTab === 'balance' ? 'balance sheet' : activeTab} accounts yet
          </Text>
          <Text style={styles.emptyStateSubtext}>
            Add your first account to get started
          </Text>
        </View>
      ) : (
        <SectionList
          sections={sections}
          renderItem={renderAccount}
          renderSectionHeader={renderSectionHeader}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: insets.bottom + 80 }}
          stickySectionHeadersEnabled={false}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          SectionSeparatorComponent={() => <View style={styles.sectionSeparator} />}
        />
      )}

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, { bottom: insets.bottom + spacing.lg }]}
        onPress={handleAddAccount}
      >
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>

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
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.background.elevated,
    marginHorizontal: spacing.base,
    marginVertical: spacing.md,
    borderRadius: borderRadius.lg,
    padding: spacing.xs,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: borderRadius.md,
  },
  activeTab: {
    backgroundColor: colors.primary[500],
  },
  tabText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.secondary,
  },
  activeTabText: {
    color: colors.neutral[0],
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  emptyStateIcon: {
    fontSize: 48,
    marginBottom: spacing.md,
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
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    backgroundColor: colors.background.primary,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: spacing.sm,
  },
  sectionTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.text.primary,
  },
  sectionTotal: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.asset,
  },
  subCategoryHeader: {
    paddingLeft: spacing.xl,
    backgroundColor: colors.background.primary,
  },
  subCategoryTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
  },
  subCategoryTotal: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
  },
  accountItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.elevated,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
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
    minWidth: 0,
    flexShrink: 1,
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
  balanceContainer: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    marginRight: spacing.sm,
    flexShrink: 0,
    width: 150,
  },
  accountBalance: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.asset,
    textAlign: 'right',
    width: '100%',
  },
  balanceLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.text.tertiary,
    marginTop: spacing.xs,
    textAlign: 'right',
    width: '100%',
  },
  liabilityBalance: {
    color: colors.liability,
  },
  chevron: {
    fontSize: typography.fontSize.xl,
    color: colors.neutral[400],
  },
  periodSection: {
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.base,
    backgroundColor: colors.background.primary,
    borderRadius: borderRadius.md,
  },
  dateButtonContent: {
    flex: 1,
    flexShrink: 1,
    marginRight: spacing.sm,
  },
  dateLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  dateValue: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.primary,
    flexShrink: 1,
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
  separator: {
    height: 1,
    backgroundColor: colors.border.light,
    marginLeft: spacing.base + 40 + spacing.md,
  },
  sectionSeparator: {
    height: spacing.md,
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
    ...shadows.lg,
  },
  fabIcon: {
    fontSize: 28,
    color: colors.neutral[0],
    fontWeight: typography.fontWeight.medium,
  },
});

export default AccountsScreen;
