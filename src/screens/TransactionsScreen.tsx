/**
 * Transactions Screen for Gharkharch
 * Lists all transactions with filtering and search
 */

import React, { useMemo, useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Keyboard,
  Platform,
  Alert,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { useAuthStore, useAccountStore, useTransactionStore } from '../stores';
import { RootStackParamList, Transaction, AccountType } from '../types';
import { 
  colors,
  spacing,
  getAccountTypeColor,
  getAccountTypeBgColor,
  addFontScaleListener,
} from '../config/theme';
import { getTransactionsScreenStyles } from '../styles/screens/TransactionsScreen.styles';
import { formatCurrency, DEFAULT_CURRENCY } from '../config/constants';
import { getTransactionsForMonth, getAvailableMonths } from '../utils/reports';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const TransactionsScreen: React.FC = () => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const styles = getTransactionsScreenStyles();
  const [fontScaleVersion, setFontScaleVersion] = useState(0);
  
  const { user } = useAuthStore();
  const { transactions, isLoading, subscribeToTransactions, error } = useTransactionStore();
  const { getAccountById } = useAccountStore();

  const [searchQuery, setSearchQuery] = useState('');
  
  // Get available months
  const availableMonths = useMemo(() => getAvailableMonths(transactions), [transactions]);
  
  // Get available years from first transaction to current date
  const availableYears = useMemo(() => {
    if (transactions.length === 0) {
      return [new Date().getFullYear()];
    }

    // Find the earliest transaction date
    const dates = transactions.map(txn => new Date(txn.date));
    const earliestDate = new Date(Math.min(...dates.map(d => d.getTime())));
    const startYear = earliestDate.getFullYear();
    const endYear = new Date().getFullYear();

    // Generate all years from earliest to current
    const years: number[] = [];
    for (let year = endYear; year >= startYear; year--) {
      years.push(year);
    }
    return years;
  }, [transactions]);

  // Month/Year selection state - default to current month
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [showMonthYearPicker, setShowMonthYearPicker] = useState(false);
  
  const yearListRef = useRef<FlatList>(null);
  const monthListRef = useRef<FlatList>(null);

  // Get months for selected year - show all months up to current month
  const monthsForSelectedYear = useMemo(() => {
    const now = new Date();
    const months: { year: number; month: number; displayName: string }[] = [];
    
    // Always show all 12 months for the selected year
    // If it's the current year, only show up to current month
    const maxMonth = (selectedYear === now.getFullYear()) ? now.getMonth() + 1 : 12;
    
    for (let month = maxMonth; month >= 1; month--) {
      months.push({
        year: selectedYear,
        month,
        displayName: new Date(selectedYear, month - 1, 1).toLocaleDateString('en-IN', { month: 'short' }),
      });
    }
    
    return months;
  }, [selectedYear]);

  // When year changes, adjust selected month if needed and scroll month list
  useEffect(() => {
    const now = new Date();
    const maxMonth = (selectedYear === now.getFullYear()) ? now.getMonth() + 1 : 12;
    
    // If selected month is not available for the selected year, reset to first available month
    if (selectedMonth > maxMonth || selectedMonth < 1) {
      setSelectedMonth(maxMonth);
    } else {
      // Scroll to selected month when year changes
      setTimeout(() => {
        const monthIndex = monthsForSelectedYear.findIndex(m => m.month === selectedMonth);
        if (monthIndex >= 0 && monthListRef.current) {
          monthListRef.current.scrollToIndex({ index: monthIndex, animated: true });
        }
      }, 100);
    }
  }, [selectedYear, selectedMonth, monthsForSelectedYear]);
  useEffect(() => {
    const unsub = addFontScaleListener(() => {
      setFontScaleVersion(v => v + 1);
    });
    return () => {
      unsub();
    };
  }, []);

  // Scroll to selected values when picker opens
  useEffect(() => {
    if (showMonthYearPicker) {
      // Scroll year list
      setTimeout(() => {
        const yearIndex = availableYears.findIndex(y => y === selectedYear);
        if (yearIndex >= 0 && yearListRef.current) {
          yearListRef.current.scrollToIndex({ index: yearIndex, animated: false });
        }
      }, 100);
      
      // Scroll month list
      setTimeout(() => {
        const monthIndex = monthsForSelectedYear.findIndex(m => m.month === selectedMonth);
        if (monthIndex >= 0 && monthListRef.current) {
          monthListRef.current.scrollToIndex({ index: monthIndex, animated: false });
        }
      }, 150);
    }
  }, [showMonthYearPicker, selectedYear, selectedMonth, availableYears, monthsForSelectedYear]);

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
        subtitle: `${t('common.from')} ${creditAccount?.name ?? t('common.unknown')}`,
        type: 'expense' as AccountType,
        isExpense: true,
      };
    } else if (creditAccount?.accountType === 'income') {
      return {
        title: creditAccount.name,
        subtitle: `${t('common.to')} ${debitAccount?.name ?? t('common.unknown')}`,
        type: 'income' as AccountType,
        isExpense: false,
      };
    } else {
      return {
        title: `${creditAccount?.name ?? t('common.unknown')} → ${debitAccount?.name ?? t('common.unknown')}`,
        subtitle: t('transactions.transfer'),
        type: 'asset' as AccountType,
        isExpense: false,
      };
    }
  };

  /**
   * Filter transactions based on selected month/year and search query
   */
  const filteredTransactions = useMemo(() => {
    // First filter by month/year
    let monthFiltered = getTransactionsForMonth(transactions, selectedYear, selectedMonth);
    
    // Then filter by search query if provided
    if (!searchQuery.trim()) {
      return monthFiltered;
    }

    const query = searchQuery.toLowerCase();
    return monthFiltered.filter((txn) => {
      const debitAccount = getAccountById(txn.debitAccountId);
      const creditAccount = getAccountById(txn.creditAccountId);
      
      return (
        debitAccount?.name.toLowerCase().includes(query) ||
        creditAccount?.name.toLowerCase().includes(query) ||
        txn.note?.toLowerCase().includes(query) ||
        txn.amount.toString().includes(query)
      );
    });
  }, [transactions, selectedYear, selectedMonth, searchQuery, getAccountById]);

  // Create flat list with transactions
  const flatTransactions = useMemo(() => {
    return filteredTransactions;
  }, [filteredTransactions]);

  const handleAddTransaction = () => {
    navigation.navigate('AddTransaction');
  };


  const handleTransactionPress = (transactionId: string) => {
    navigation.navigate('TransactionDetail', { transactionId });
  };

  const renderTransaction = ({ item: transaction }: { item: Transaction }) => {
    const displayInfo = getTransactionDisplayInfo(transaction);
    const dateStr = transaction.date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
    
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
          <Text style={styles.transactionDate} numberOfLines={1}>
            {dateStr}
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

  const renderItem = ({ item }: { item: Transaction }) => {
    return renderTransaction({ item });
  };


  const getMonthDisplayName = () => {
    return new Date(selectedYear, selectedMonth - 1, 1).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      {/* Month/Year Selector */}
      <View style={styles.monthSelectorContainer}>
        <TouchableOpacity
          style={styles.monthSelectorButton}
          onPress={() => {
            Keyboard.dismiss();
            setShowMonthYearPicker(true);
          }}
        >
          <Text style={styles.monthSelectorValue}>{getMonthDisplayName()}</Text>
          <Image
            source={require('../../assets/icons/calendar.png')}
            style={styles.calendarIcon}
            resizeMode="contain"
          />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder={t('transactions.searchPlaceholder')}
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
          <Text style={styles.emptyStateText}>{t('common.loading')}</Text>
        </View>
      ) : flatTransactions.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateIcon}>📝</Text>
          <Text style={styles.emptyStateText}>
            {searchQuery ? t('transactions.noResults') : t('transactions.emptyTitle')}
          </Text>
          <Text style={styles.emptyStateSubtext}>
            {searchQuery ? t('transactions.noResultsSubtext') : t('transactions.emptySubtext')}
          </Text>
        </View>
      ) : (
        <FlatList
          data={flatTransactions}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: insets.bottom + 80 }}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, { bottom: insets.bottom + spacing.lg, zIndex: 1000 }]}
        onPress={handleAddTransaction}
      >
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>


      {/* Month/Year Picker */}
      <Modal
        visible={showMonthYearPicker}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowMonthYearPicker(false)}
      >
        <View style={[styles.modalContainer, { paddingTop: insets.top }]}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowMonthYearPicker(false)}>
              <Text style={styles.modalCancel} numberOfLines={1} ellipsizeMode="tail">{t('common.cancel')}</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle} numberOfLines={1} ellipsizeMode="tail">{t('transactions.selectMonthYear')}</Text>
            <TouchableOpacity onPress={() => setShowMonthYearPicker(false)}>
              <Text style={styles.modalDone} numberOfLines={1} ellipsizeMode="tail">{t('common.done')}</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.monthYearPickerContainer}>
            {/* Year Picker */}
            <View style={styles.pickerColumn}>
              <Text style={styles.pickerColumnLabel}>{t('transactions.year')}</Text>
              <FlatList
                ref={yearListRef}
                data={availableYears}
                keyExtractor={(item) => item.toString()}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.pickerOption,
                      selectedYear === item && styles.pickerOptionSelected
                    ]}
                    onPress={() => setSelectedYear(item)}
                  >
                    <Text 
                      style={[
                        styles.pickerOptionText,
                        selectedYear === item && styles.pickerOptionTextSelected
                      ]}
                      numberOfLines={1}
                      ellipsizeMode="tail"
                    >
                      {item}
                    </Text>
                  </TouchableOpacity>
                )}
                contentContainerStyle={{ paddingVertical: spacing.base }}
                showsVerticalScrollIndicator={false}
                getItemLayout={(data, index) => ({
                  length: 50,
                  offset: 50 * index,
                  index,
                })}
                onScrollToIndexFailed={(info) => {
                  // Fallback if scroll fails
                  setTimeout(() => {
                    if (yearListRef.current) {
                      yearListRef.current.scrollToIndex({ index: info.index, animated: false });
                    }
                  }, 100);
                }}
              />
            </View>
            
            {/* Month Picker */}
            <View style={styles.pickerColumn}>
              <Text style={styles.pickerColumnLabel}>{t('transactions.month')}</Text>
              <FlatList
                ref={monthListRef}
                data={monthsForSelectedYear.map(m => m.month)}
                keyExtractor={(item) => item.toString()}
                renderItem={({ item }) => {
                  const monthName = new Date(selectedYear, item - 1, 1).toLocaleDateString('en-IN', { month: 'short' });
                  const isSelected = selectedMonth === item;
                  const now = new Date();
                  const isFutureMonth = selectedYear > now.getFullYear() || 
                                       (selectedYear === now.getFullYear() && item > now.getMonth() + 1);
                  
                  return (
                    <TouchableOpacity
                      style={[
                        styles.pickerOption,
                        isSelected && styles.pickerOptionSelected,
                        isFutureMonth && styles.pickerOptionDisabled
                      ]}
                      onPress={() => {
                        if (!isFutureMonth) {
                          setSelectedMonth(item);
                        }
                      }}
                      disabled={isFutureMonth}
                    >
                      <Text 
                        style={[
                          styles.pickerOptionText,
                          isSelected && styles.pickerOptionTextSelected,
                          isFutureMonth && styles.pickerOptionTextDisabled
                        ]}
                        numberOfLines={1}
                        ellipsizeMode="tail"
                      >
                        {monthName}
                      </Text>
                    </TouchableOpacity>
                  );
                }}
                contentContainerStyle={{ paddingVertical: spacing.base }}
                showsVerticalScrollIndicator={false}
                getItemLayout={(data, index) => ({
                  length: 50,
                  offset: 50 * index,
                  index,
                })}
                onScrollToIndexFailed={(info) => {
                  // Fallback if scroll fails
                  setTimeout(() => {
                    if (monthListRef.current) {
                      monthListRef.current.scrollToIndex({ index: info.index, animated: false });
                    }
                  }, 100);
                }}
              />
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
};


export default TransactionsScreen;
