/**
 * SubCategory Transactions Screen for Gharkharch
 * Displays all transactions for a specific subcategory
 */

import React, { useMemo, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore, useAccountStore, useTransactionStore } from '../stores';
import { RootStackParamList, Transaction, AccountType } from '../types';
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
import { getTransactionsForDateRange } from '../utils/reports';
import { getTransactionsScreenStyles } from '../styles/screens/TransactionsScreen.styles';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'SubCategoryTransactions'>;
type RouteType = RouteProp<RootStackParamList, 'SubCategoryTransactions'>;

const SubCategoryTransactionsScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteType>();
  const transactionsScreenStyles = getTransactionsScreenStyles();
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
    searchContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.base,
      paddingVertical: spacing.md,
    },
    searchIcon: {
      marginRight: spacing.sm,
    },
    searchInput: {
      flex: 1,
      backgroundColor: colors.background.elevated,
      borderRadius: borderRadius.md,
      paddingHorizontal: spacing.base,
      paddingVertical: spacing.sm,
      fontSize: typography.fontSize.sm,
      color: colors.text.primary,
      borderWidth: 1,
      borderColor: colors.border.light,
    },
    clearButton: {
      marginLeft: spacing.sm,
      padding: 2,
    },
    listContent: {
      paddingBottom: spacing.md,
    },
    listContentEmpty: {
      flexGrow: 1,
    },
    dateSection: {
      marginBottom: spacing.md,
    },
    emptyState: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing['2xl'],
      marginTop: spacing['2xl'],
    },
    emptyStateIconContainer: {
      width: 96,
      height: 96,
      borderRadius: 48,
      backgroundColor: colors.neutral[50],
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.lg,
      borderWidth: 2,
      borderColor: colors.neutral[100],
      borderStyle: 'dashed',
    },
    emptyStateText: {
      fontSize: typography.fontSize.lg,
      fontWeight: typography.fontWeight.semiBold,
      color: colors.text.primary,
      marginBottom: spacing.sm,
      textAlign: 'center',
    },
    emptyStateSubtext: {
      fontSize: typography.fontSize.sm,
      color: colors.text.secondary,
      textAlign: 'center',
      lineHeight: 20,
      paddingHorizontal: spacing.base,
    },
  });
  
  const { subCategory, category, accountType, fromDate, toDate } = route.params;
  
  const { user } = useAuthStore();
  const { transactions, isLoading, subscribeToTransactions } = useTransactionStore();
  const { getAccountById } = useAccountStore();

  const [searchQuery, setSearchQuery] = useState('');

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
   * Filter transactions by subcategory and date range
   */
  const filteredTransactions = useMemo(() => {
    // First filter by date range
    const dateFiltered = fromDate && toDate 
      ? getTransactionsForDateRange(transactions, fromDate, toDate)
      : transactions;
    
    // Filter by subcategory
    const subCategoryFiltered = dateFiltered.filter((txn) => {
      const debitAccount = getAccountById(txn.debitAccountId);
      const creditAccount = getAccountById(txn.creditAccountId);
      
      // Check if either debit or credit account matches the subcategory
      const matchesSubCategory = 
        (debitAccount?.subCategory === subCategory && debitAccount?.parentCategory === category) ||
        (creditAccount?.subCategory === subCategory && creditAccount?.parentCategory === category);
      
      return matchesSubCategory;
    });
    
    // Then filter by search query if provided
    if (!searchQuery.trim()) {
      return subCategoryFiltered;
    }

    const query = searchQuery.toLowerCase();
    return subCategoryFiltered.filter((txn) => {
      const debitAccount = getAccountById(txn.debitAccountId);
      const creditAccount = getAccountById(txn.creditAccountId);
      
      return (
        debitAccount?.name.toLowerCase().includes(query) ||
        creditAccount?.name.toLowerCase().includes(query) ||
        txn.note?.toLowerCase().includes(query) ||
        txn.amount.toString().includes(query)
      );
    });
  }, [transactions, subCategory, category, fromDate, toDate, searchQuery, getAccountById]);

  // Sort transactions by date (newest first)
  const sortedTransactions = useMemo(() => {
    return [...filteredTransactions].sort((a, b) => {
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });
  }, [filteredTransactions]);

  const handleTransactionPress = (transactionId: string) => {
    navigation.navigate('TransactionDetail', { transactionId });
  };

  const renderTransaction = ({ item: transaction }: { item: Transaction }) => {
    const displayInfo = getTransactionDisplayInfo(transaction);
    const dateStr = new Date(transaction.date).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
    
    return (
      <TouchableOpacity
        style={transactionsScreenStyles.transactionItem}
        onPress={() => handleTransactionPress(transaction.id)}
        activeOpacity={0.7}
      >
        <View style={[
          transactionsScreenStyles.transactionIcon,
          { backgroundColor: getAccountTypeBgColor(displayInfo.type) }
        ]}>
          <Text style={[
            transactionsScreenStyles.transactionIconText,
            { color: getAccountTypeColor(displayInfo.type) }
          ]}>
            {displayInfo.isExpense ? '↑' : '↓'}
          </Text>
        </View>
        <View style={transactionsScreenStyles.transactionInfo}>
          <Text style={transactionsScreenStyles.transactionTitle} numberOfLines={1}>
            {displayInfo.title}
          </Text>
          <Text style={transactionsScreenStyles.transactionSubtitle} numberOfLines={1}>
            {transaction.note || displayInfo.subtitle}
          </Text>
          <Text style={transactionsScreenStyles.transactionDate} numberOfLines={1}>
            {dateStr}
          </Text>
        </View>
        <Text style={[
          transactionsScreenStyles.transactionAmount,
          displayInfo.isExpense ? transactionsScreenStyles.expenseText : transactionsScreenStyles.incomeText
        ]}>
          {displayInfo.isExpense ? '-' : '+'}{formatCurrency(transaction.amount, currency)}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => {
    if (isLoading) {
      return (
        <View style={styles.emptyState}>
          <ActivityIndicator size="large" color={colors.primary[500]} />
          <Text style={styles.emptyStateText}>Loading transactions...</Text>
        </View>
      );
    }

    return (
      <View style={styles.emptyState}>
        <View style={styles.emptyStateIconContainer}>
          <Ionicons 
            name={searchQuery ? "search-outline" : "document-text-outline"} 
            size={56} 
            color={colors.neutral[300]} 
          />
        </View>
        <Text style={styles.emptyStateText}>
          {searchQuery ? 'No matching transactions' : 'No transactions found'}
        </Text>
        <Text style={styles.emptyStateSubtext}>
          {searchQuery 
            ? 'Try adjusting your search query'
            : `No transactions found for "${subCategory}" in the selected period`
          }
        </Text>
      </View>
    );
  };

  // Format date range for display
  const dateRangeDisplay = useMemo(() => {
    if (fromDate && toDate) {
      const fromStr = new Date(fromDate).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
      const toStr = new Date(toDate).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
      return `${fromStr} - ${toStr}`;
    }
    return 'All time';
  }, [fromDate, toDate]);

  // Group transactions by date
  const groupedTransactions = useMemo(() => {
    const groups: { [key: string]: Transaction[] } = {};
    
    sortedTransactions.forEach(transaction => {
      const date = new Date(transaction.date);
      const dateKey = date.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
      
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(transaction);
    });
    
    return Object.entries(groups).map(([date, transactions]) => ({
      date,
      transactions,
    }));
  }, [sortedTransactions]);

  const renderDateSection = ({ item }: { item: { date: string; transactions: Transaction[] } }) => {
    return (
      <View style={styles.dateSection}>
        <View style={transactionsScreenStyles.dateHeaderContainer}>
          <Text style={transactionsScreenStyles.dateHeader}>{item.date}</Text>
        </View>
        <View style={transactionsScreenStyles.transactionsList}>
          {item.transactions.map((transaction, index) => (
            <View key={transaction.id}>
              {renderTransaction({ item: transaction })}
              {index < item.transactions.length - 1 && null}
            </View>
          ))}
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={18} color={colors.neutral[400]} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search transactions..."
          placeholderTextColor={colors.neutral[400]}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity
            onPress={() => setSearchQuery('')}
            style={styles.clearButton}
          >
            <Ionicons name="close-circle" size={18} color={colors.neutral[400]} />
          </TouchableOpacity>
        )}
      </View>

      {/* Transactions List */}
      <FlatList
        data={groupedTransactions}
        renderItem={renderDateSection}
        keyExtractor={(item) => item.date}
        contentContainerStyle={[
          styles.listContent,
          sortedTransactions.length === 0 && styles.listContentEmpty,
          { paddingBottom: insets.bottom + spacing.lg }
        ]}
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
      />
    </KeyboardAvoidingView>
  );
};

 

export default SubCategoryTransactionsScreen;
