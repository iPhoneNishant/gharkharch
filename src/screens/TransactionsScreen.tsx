/**
 * Transactions Screen for Gharkharch
 * Lists all transactions with filtering and search
 */

import React, { useMemo, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
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
import { getAvailableMonths } from '../utils/reports';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const TransactionsScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  
  const { user } = useAuthStore();
  const { transactions, isLoading, subscribeToTransactions, error } = useTransactionStore();
  const { getAccountById } = useAccountStore();

  const [searchQuery, setSearchQuery] = useState('');
  
  // Month and year filter state
  const availableMonths = useMemo(() => getAvailableMonths(transactions), [transactions]);
  const availableYears = useMemo(() => {
    if (transactions.length === 0) {
      return [new Date().getFullYear()];
    }
    const dates = transactions.map(txn => new Date(txn.date));
    const earliestDate = new Date(Math.min(...dates.map(d => d.getTime())));
    const startYear = earliestDate.getFullYear();
    const endYear = new Date().getFullYear();
    const years: number[] = [];
    for (let year = endYear; year >= startYear; year--) {
      years.push(year);
    }
    return years;
  }, [transactions]);
  
  const [selectedYear, setSelectedYear] = useState(() => {
    return new Date().getFullYear();
  });
  const [selectedMonth, setSelectedMonth] = useState(() => {
    return new Date().getMonth() + 1;
  });
  
  const monthsForSelectedYear = useMemo(() => {
    if (transactions.length === 0) {
      const now = new Date();
      if (selectedYear === now.getFullYear()) {
        return [{
          year: now.getFullYear(),
          month: now.getMonth() + 1,
          displayName: new Date(now.getFullYear(), now.getMonth(), 1).toLocaleDateString('en-US', { month: 'long' }),
        }];
      }
      return [];
    }
    const dates = transactions.map(txn => new Date(txn.date));
    const earliestDate = new Date(Math.min(...dates.map(d => d.getTime())));
    const startYear = earliestDate.getFullYear();
    const startMonth = earliestDate.getMonth() + 1;
    const now = new Date();
    const endYear = now.getFullYear();
    const endMonth = now.getMonth() + 1;
    const months: { year: number; month: number; displayName: string }[] = [];
    
    if (selectedYear === startYear && selectedYear === endYear) {
      for (let month = endMonth; month >= startMonth; month--) {
        months.push({
          year: selectedYear,
          month,
          displayName: new Date(selectedYear, month - 1, 1).toLocaleDateString('en-US', { month: 'long' }),
        });
      }
    } else if (selectedYear === startYear) {
      for (let month = 12; month >= startMonth; month--) {
        months.push({
          year: selectedYear,
          month,
          displayName: new Date(selectedYear, month - 1, 1).toLocaleDateString('en-US', { month: 'long' }),
        });
      }
    } else if (selectedYear === endYear) {
      for (let month = endMonth; month >= 1; month--) {
        months.push({
          year: selectedYear,
          month,
          displayName: new Date(selectedYear, month - 1, 1).toLocaleDateString('en-US', { month: 'long' }),
        });
      }
    } else if (selectedYear > startYear && selectedYear < endYear) {
      for (let month = 12; month >= 1; month--) {
        months.push({
          year: selectedYear,
          month,
          displayName: new Date(selectedYear, month - 1, 1).toLocaleDateString('en-US', { month: 'long' }),
        });
      }
    }
    return months;
  }, [transactions, selectedYear]);
  
  const [showYearPicker, setShowYearPicker] = useState(false);
  const [showMonthPicker, setShowMonthPicker] = useState(false);

  // Subscribe to transactions when user is available
  useEffect(() => {
    if (user?.id) {
      const unsubscribe = subscribeToTransactions(user.id);
      return () => {
        unsubscribe();
      };
    }
  }, [user?.id, subscribeToTransactions]);

  const currency = user?.currency ?? DEFAULT_CURRENCY;

  /**
   * Get display info for a transaction
   */
  const getTransactionDisplayInfo = (transaction: Transaction) => {
    const debitAccount = getAccountById(transaction.debitAccountId);
    const creditAccount = getAccountById(transaction.creditAccountId);

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
      return {
        title: `${creditAccount?.name ?? 'Unknown'} → ${debitAccount?.name ?? 'Unknown'}`,
        subtitle: 'Transfer',
        type: 'asset' as AccountType,
        isExpense: false,
      };
    }
  };

  /**
   * Filter transactions by selected month/year and optionally by search query
   */
  const filteredTransactions = useMemo(() => {
    // Filter to selected month and year
    const monthTransactions = transactions.filter((txn) => {
      const txnDate = new Date(txn.date);
      return txnDate.getFullYear() === selectedYear && txnDate.getMonth() + 1 === selectedMonth;
    });

    // If no search query, return month transactions
    if (!searchQuery.trim()) {
      return monthTransactions;
    }

    // Apply search filter on month transactions
    const query = searchQuery.toLowerCase();
    return monthTransactions.filter((txn) => {
      const debitAccount = getAccountById(txn.debitAccountId);
      const creditAccount = getAccountById(txn.creditAccountId);
      
      return (
        debitAccount?.name.toLowerCase().includes(query) ||
        creditAccount?.name.toLowerCase().includes(query) ||
        txn.note?.toLowerCase().includes(query) ||
        txn.amount.toString().includes(query)
      );
    });
  }, [transactions, searchQuery, getAccountById, selectedYear, selectedMonth]);
  
  const handleMonthSelect = (year: number, month: number) => {
    setSelectedYear(year);
    setSelectedMonth(month);
    setShowMonthPicker(false);
  };

  /**
   * Group transactions by date
   */
  const groupedTransactions = useMemo(() => {
    const groups: { date: string; transactions: Transaction[] }[] = [];
    let currentDate = '';
    let currentGroup: Transaction[] = [];

    filteredTransactions.forEach((txn) => {
      const dateStr = txn.date.toLocaleDateString('en-IN', {
        weekday: 'long',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });

      if (dateStr !== currentDate) {
        if (currentGroup.length > 0) {
          groups.push({ date: currentDate, transactions: currentGroup });
        }
        currentDate = dateStr;
        currentGroup = [txn];
      } else {
        currentGroup.push(txn);
      }
    });

    if (currentGroup.length > 0) {
      groups.push({ date: currentDate, transactions: currentGroup });
    }

    return groups;
  }, [filteredTransactions]);

  const handleAddTransaction = () => {
    navigation.navigate('AddTransaction');
  };

  const handleTransactionPress = (transactionId: string) => {
    navigation.navigate('TransactionDetail', { transactionId });
  };

  const renderTransaction = ({ item: transaction }: { item: Transaction }) => {
    const displayInfo = getTransactionDisplayInfo(transaction);
    
    return (
      <TouchableOpacity
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
            {transaction.note || displayInfo.subtitle}
          </Text>
        </View>
        <Text style={[
          styles.transactionAmount,
          displayInfo.isExpense ? styles.expenseText : styles.incomeText
        ]}>
          {displayInfo.isExpense ? '-' : '+'}{formatCurrency(transaction.amount, currency)}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderDateGroup = ({ item }: { item: { date: string; transactions: Transaction[] } }) => (
    <View style={styles.dateGroup}>
      <Text style={styles.dateHeader}>{item.date}</Text>
      <View style={styles.transactionsList}>
        {item.transactions.map((txn) => (
          <View key={txn.id}>
            {renderTransaction({ item: txn })}
          </View>
        ))}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Month/Year Filter */}
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setShowYearPicker(true)}
        >
          <Text style={styles.filterLabel}>Month</Text>
          <Text style={styles.filterValue} numberOfLines={1} ellipsizeMode="tail">
            {availableMonths.find(m => m.year === selectedYear && m.month === selectedMonth)?.displayName || 
             new Date(selectedYear, selectedMonth - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </Text>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search transactions..."
          placeholderTextColor={colors.neutral[400]}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Error Display */}
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>⚠️ {error}</Text>
          {error.includes('index') && (
            <Text style={styles.errorSubtext}>
              Run: firebase deploy --only firestore
            </Text>
          )}
        </View>
      )}

      {/* Transactions List */}
      {isLoading ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>Loading...</Text>
        </View>
      ) : groupedTransactions.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateIcon}>📝</Text>
          <Text style={styles.emptyStateText}>
            {searchQuery ? 'No transactions found' : `No transactions for ${new Date(selectedYear, selectedMonth - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`}
          </Text>
          <Text style={styles.emptyStateSubtext}>
            {searchQuery ? 'Try a different search' : 'Add a transaction for this month to get started'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={groupedTransactions}
          renderItem={renderDateGroup}
          keyExtractor={(item) => item.date}
          contentContainerStyle={{ paddingBottom: insets.bottom + 80 }}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, { bottom: insets.bottom + spacing.lg }]}
        onPress={handleAddTransaction}
      >
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>

      {/* Year Picker Modal */}
      <Modal
        visible={showYearPicker}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowYearPicker(false)}
      >
        <View style={[styles.modalContainer, { paddingTop: insets.top }]}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowYearPicker(false)}>
              <Text style={styles.modalCancel} numberOfLines={1} ellipsizeMode="tail">
                Cancel
              </Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Select Year</Text>
            <View style={{ width: 60 }} />
          </View>
          <FlatList
            data={availableYears}
            keyExtractor={(item) => item.toString()}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.monthOption}
                onPress={() => {
                  setSelectedYear(item);
                  setShowYearPicker(false);
                  setShowMonthPicker(true);
                }}
              >
                <Text style={styles.monthOptionText} numberOfLines={1} ellipsizeMode="tail">
                  {item}
                </Text>
                {selectedYear === item && (
                  <Text style={styles.checkmark}>✓</Text>
                )}
              </TouchableOpacity>
            )}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            contentContainerStyle={{ paddingBottom: insets.bottom }}
          />
        </View>
      </Modal>

      {/* Month Picker Modal */}
      <Modal
        visible={showMonthPicker}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowMonthPicker(false)}
      >
        <View style={[styles.modalContainer, { paddingTop: insets.top }]}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => {
              setShowMonthPicker(false);
              setShowYearPicker(true);
            }}>
              <Text style={styles.modalCancel} numberOfLines={1} ellipsizeMode="tail">
                Back
              </Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle} numberOfLines={1} ellipsizeMode="tail">
              Select Month ({selectedYear})
            </Text>
            <TouchableOpacity onPress={() => setShowMonthPicker(false)}>
              <Text style={styles.modalCancel} numberOfLines={1} ellipsizeMode="tail">
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
          {monthsForSelectedYear.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No months available for {selectedYear}</Text>
              <TouchableOpacity
                style={styles.backToYearButton}
                onPress={() => {
                  setShowMonthPicker(false);
                  setShowYearPicker(true);
                }}
              >
                <Text style={styles.backToYearButtonText}>Select Different Year</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              data={monthsForSelectedYear}
              keyExtractor={(item) => `${item.year}-${item.month}`}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.monthOption}
                  onPress={() => handleMonthSelect(item.year, item.month)}
                >
                  <Text style={styles.monthOptionText} numberOfLines={1} ellipsizeMode="tail">
                    {item.displayName}
                  </Text>
                  {selectedYear === item.year && selectedMonth === item.month && (
                    <Text style={styles.checkmark}>✓</Text>
                  )}
                </TouchableOpacity>
              )}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
              contentContainerStyle={{ paddingBottom: insets.bottom }}
            />
          )}
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  searchContainer: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
  },
  searchInput: {
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
  dateGroup: {
    marginBottom: spacing.lg,
  },
  dateHeader: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.text.secondary,
    paddingHorizontal: spacing.base,
    marginBottom: spacing.sm,
  },
  transactionsList: {
    backgroundColor: colors.background.elevated,
    marginHorizontal: spacing.base,
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
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semiBold,
  },
  expenseText: {
    color: colors.expense,
  },
  incomeText: {
    color: colors.income,
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
  errorContainer: {
    margin: spacing.lg,
    padding: spacing.md,
    backgroundColor: colors.error[50],
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.error[200],
  },
  errorText: {
    ...typography.bodyMedium,
    color: colors.error[700],
    marginBottom: spacing.xs,
  },
  errorSubtext: {
    ...typography.bodySmall,
    color: colors.error[600],
    fontFamily: 'monospace',
  },
  filterContainer: {
    padding: spacing.base,
    backgroundColor: colors.background.elevated,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.base,
    backgroundColor: colors.background.primary,
    borderRadius: borderRadius.md,
  },
  filterLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    width: 100,
  },
  filterValue: {
    flex: 1,
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.primary,
    flexShrink: 1,
  },
  chevron: {
    fontSize: typography.fontSize.xl,
    color: colors.neutral[400],
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
  },
  modalTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.text.primary,
    flex: 1,
    textAlign: 'center',
    flexShrink: 1,
    marginHorizontal: spacing.sm,
  },
  monthOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.base,
  },
  monthOptionText: {
    fontSize: typography.fontSize.base,
    color: colors.text.primary,
    flex: 1,
    flexShrink: 1,
    marginRight: spacing.sm,
  },
  checkmark: {
    fontSize: typography.fontSize.base,
    color: colors.primary[500],
    fontWeight: typography.fontWeight.bold,
  },
  separator: {
    height: 1,
    backgroundColor: colors.border.light,
  },
  backToYearButton: {
    marginTop: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.primary[500],
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  backToYearButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.neutral[0],
  },
});

export default TransactionsScreen;
