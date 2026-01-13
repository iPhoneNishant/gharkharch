/**
 * Month-to-Month Report Screen for Gharkharch
 * Displays income and expense breakdown by month over a selected date range
 */

import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  FlatList,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuthStore, useAccountStore, useTransactionStore } from '../stores';
import { AccountType } from '../types';
import {
  colors,
  typography,
  spacing,
  borderRadius,
  shadows,
} from '../config/theme';
import { formatCurrency, DEFAULT_CURRENCY } from '../config/constants';
import {
  getAvailableMonths,
  getTransactionsForDateRange,
  generateMonthToMonthBreakdown,
  MonthToMonthBreakdown,
} from '../utils/reports';

const MonthToMonthReportScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const { accounts } = useAccountStore();
  const { transactions } = useTransactionStore();

  const currency = user?.currency ?? DEFAULT_CURRENCY;

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

  // Get months for a specific year (helper function)
  const getMonthsForYear = (year: number) => {
    if (transactions.length === 0) {
      const now = new Date();
      if (year === now.getFullYear()) {
        return [{
          year: now.getFullYear(),
          month: now.getMonth() + 1,
          displayName: new Date(now.getFullYear(), now.getMonth(), 1).toLocaleDateString('en-US', { month: 'long' }),
        }];
      }
      return [];
    }

    // Find the earliest transaction date
    const dates = transactions.map(txn => new Date(txn.date));
    const earliestDate = new Date(Math.min(...dates.map(d => d.getTime())));
    const startYear = earliestDate.getFullYear();
    const startMonth = earliestDate.getMonth() + 1;
    const now = new Date();
    const endYear = now.getFullYear();
    const endMonth = now.getMonth() + 1;

    const months: { year: number; month: number; displayName: string }[] = [];

    if (year === startYear && year === endYear) {
      // Same year - from start month to end month
      for (let month = endMonth; month >= startMonth; month--) {
        months.push({
          year,
          month,
          displayName: new Date(year, month - 1, 1).toLocaleDateString('en-US', { month: 'long' }),
        });
      }
    } else if (year === startYear) {
      // First year - from start month to December
      for (let month = 12; month >= startMonth; month--) {
        months.push({
          year,
          month,
          displayName: new Date(year, month - 1, 1).toLocaleDateString('en-US', { month: 'long' }),
        });
      }
    } else if (year === endYear) {
      // Current year - from January to end month
      for (let month = endMonth; month >= 1; month--) {
        months.push({
          year,
          month,
          displayName: new Date(year, month - 1, 1).toLocaleDateString('en-US', { month: 'long' }),
        });
      }
    } else if (year > startYear && year < endYear) {
      // Middle years - all 12 months
      for (let month = 12; month >= 1; month--) {
        months.push({
          year,
          month,
          displayName: new Date(year, month - 1, 1).toLocaleDateString('en-US', { month: 'long' }),
        });
      }
    }

    return months;
  };

  // Month-to-month report state (from/to months)
  // Default to first available month or current month if no transactions
  const [fromYear, setFromYear] = useState(() => {
    if (availableMonths.length > 0) {
      return availableMonths[0].year;
    }
    const now = new Date();
    return now.getFullYear();
  });
  const [fromMonth, setFromMonth] = useState(() => {
    if (availableMonths.length > 0) {
      return availableMonths[0].month;
    }
    const now = new Date();
    return now.getMonth() + 1;
  });
  const [toYear, setToYear] = useState(() => {
    if (availableMonths.length > 0) {
      // Default to last available month or current month
      const lastMonth = availableMonths[availableMonths.length - 1];
      return lastMonth.year;
    }
    const now = new Date();
    return now.getFullYear();
  });
  const [toMonth, setToMonth] = useState(() => {
    if (availableMonths.length > 0) {
      // Default to last available month or current month
      const lastMonth = availableMonths[availableMonths.length - 1];
      return lastMonth.month;
    }
    const now = new Date();
    return now.getMonth() + 1;
  });

  // Filter state
  const [filterType, setFilterType] = useState<'category' | 'account' | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedSubCategory, setSelectedSubCategory] = useState<string | null>(null);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [showFromMonthPicker, setShowFromMonthPicker] = useState(false);
  const [showToMonthPicker, setShowToMonthPicker] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showSubCategoryPicker, setShowSubCategoryPicker] = useState(false);
  const [showAccountPicker, setShowAccountPicker] = useState(false);

  // Refs for FlatList scrolling
  const fromMonthListRef = useRef<FlatList>(null);
  const toMonthListRef = useRef<FlatList>(null);
  const fromYearListRef = useRef<FlatList>(null);
  const toYearListRef = useRef<FlatList>(null);

  // Calculate fromDate and toDate from selected months
  const monthToMonthFromDate = useMemo(() => {
    // Use the selected from month
    return new Date(fromYear, fromMonth - 1, 1);
  }, [fromYear, fromMonth]);

  const monthToMonthToDate = useMemo(() => {
    // Use the selected to month - get the last day of that month
    const lastDay = new Date(toYear, toMonth, 0);
    return new Date(toYear, toMonth - 1, lastDay.getDate(), 23, 59, 59, 999);
  }, [toYear, toMonth]);

  // Get available accounts for filtering
  const availableAccounts = useMemo(() => {
    return accounts.filter(acc => acc.isActive);
  }, [accounts]);

  // Get available categories (from all transactions in date range)
  const availableCategoriesForMonthToMonth = useMemo(() => {
    const categories = new Set<string>();
    const rangeTransactions = getTransactionsForDateRange(transactions, monthToMonthFromDate, monthToMonthToDate);
    rangeTransactions.forEach(txn => {
      const debitAccount = accounts.find(acc => acc.id === txn.debitAccountId);
      const creditAccount = accounts.find(acc => acc.id === txn.creditAccountId);
      if (debitAccount?.parentCategory) categories.add(debitAccount.parentCategory);
      if (creditAccount?.parentCategory) categories.add(creditAccount.parentCategory);
    });
    return Array.from(categories).sort();
  }, [accounts, transactions, monthToMonthFromDate, monthToMonthToDate]);

  // Get available sub-categories
  const availableSubCategoriesForMonthToMonth = useMemo(() => {
    if (!selectedCategory) return [];
    const subCategories = new Set<string>();
    const rangeTransactions = getTransactionsForDateRange(transactions, monthToMonthFromDate, monthToMonthToDate);
    rangeTransactions.forEach(txn => {
      const debitAccount = accounts.find(acc => acc.id === txn.debitAccountId);
      const creditAccount = accounts.find(acc => acc.id === txn.creditAccountId);
      if (debitAccount?.parentCategory === selectedCategory && debitAccount?.subCategory) {
        subCategories.add(debitAccount.subCategory);
      }
      if (creditAccount?.parentCategory === selectedCategory && creditAccount?.subCategory) {
        subCategories.add(creditAccount.subCategory);
      }
    });
    return Array.from(subCategories).sort();
  }, [accounts, transactions, monthToMonthFromDate, monthToMonthToDate, selectedCategory]);

  // Generate month-to-month breakdown
  const monthToMonthData = useMemo(() => {
    return generateMonthToMonthBreakdown(
      accounts,
      transactions,
      monthToMonthFromDate,
      monthToMonthToDate,
      selectedCategory,
      selectedSubCategory,
      selectedAccountId
    );
  }, [accounts, transactions, monthToMonthFromDate, monthToMonthToDate, selectedCategory, selectedSubCategory, selectedAccountId]);

  // Scroll to selected values when picker opens
  useEffect(() => {
    if (showFromMonthPicker) {
      // Scroll year list
      setTimeout(() => {
        const yearIndex = availableYears.findIndex(y => y === fromYear);
        if (yearIndex >= 0 && fromYearListRef.current) {
          fromYearListRef.current.scrollToIndex({ index: yearIndex, animated: false });
        }
      }, 100);

      // Scroll month list
      setTimeout(() => {
        const months = getMonthsForYear(fromYear);
        const monthIndex = months.findIndex(m => m.month === fromMonth);
        if (monthIndex >= 0 && fromMonthListRef.current) {
          fromMonthListRef.current.scrollToIndex({ index: monthIndex, animated: false });
        }
      }, 150);
    }
  }, [showFromMonthPicker, fromYear, fromMonth, availableYears]);

  useEffect(() => {
    if (showToMonthPicker) {
      // Scroll year list
      setTimeout(() => {
        const yearIndex = availableYears.findIndex(y => y === toYear);
        if (yearIndex >= 0 && toYearListRef.current) {
          toYearListRef.current.scrollToIndex({ index: yearIndex, animated: false });
        }
      }, 100);

      // Scroll month list
      setTimeout(() => {
        const months = getMonthsForYear(toYear);
        const monthIndex = months.findIndex(m => m.month === toMonth);
        if (monthIndex >= 0 && toMonthListRef.current) {
          toMonthListRef.current.scrollToIndex({ index: monthIndex, animated: false });
        }
      }, 150);
    }
  }, [showToMonthPicker, toYear, toMonth, availableYears]);

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xl }}
      >
        {/* Summary Row - From and To Month in one row */}
        <View style={styles.summaryRow}>
          <TouchableOpacity 
            style={styles.dateSelectionContainer}
            onPress={() => setShowFromMonthPicker(true)}
            activeOpacity={0.7}
          >
            <View style={styles.labelRow}>
              <Text style={styles.summaryLabel}>From</Text>
            </View>
            <Text style={styles.selectedDateText}>
              {new Date(fromYear, fromMonth - 1, 1).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
            </Text>
            <View style={styles.chevronContainer}>
              <Text style={styles.dateSelectionChevron}>›</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.dateSelectionContainer}
            onPress={() => setShowToMonthPicker(true)}
            activeOpacity={0.7}
          >
            <View style={styles.labelRow}>
              <Text style={styles.summaryLabel}>To</Text>
            </View>
            <Text style={styles.selectedDateText}>
              {new Date(toYear, toMonth - 1, 1).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
            </Text>
            <View style={styles.chevronContainer}>
              <Text style={styles.dateSelectionChevron}>›</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Filters */}
        <View style={styles.filtersContainer}>

          {/* Radio Buttons for Filter Type */}
          <View style={styles.radioButtonContainer}>
            <Text style={styles.radioButtonLabel}>Filter by:</Text>
            <View style={styles.radioButtonRow}>
              <TouchableOpacity
                style={styles.radioButton}
                onPress={() => {
                  setFilterType('category');
                  // Clear account selection when selecting category
                  setSelectedAccountId(null);
                }}
              >
                <View style={styles.radioButtonCircle}>
                  {filterType === 'category' && <View style={styles.radioButtonInner} />}
                </View>
                <Text style={styles.radioButtonText}>Category </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.radioButton}
                onPress={() => {
                  setFilterType('account');
                  // Clear category selection when selecting account
                  setSelectedCategory(null);
                  setSelectedSubCategory(null);
                }}
              >
                <View style={styles.radioButtonCircle}>
                  {filterType === 'account' && <View style={styles.radioButtonInner} />}
                </View>
                <Text style={styles.radioButtonText}>Account </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Category Filter - Only show if category is selected */}
          {filterType === 'category' && (
            <>
              <TouchableOpacity
                style={styles.filterButton}
                onPress={() => setShowCategoryPicker(true)}
              >
                <Text style={styles.filterLabel}>Category</Text>
                <Text style={styles.filterValue} numberOfLines={1} ellipsizeMode="tail">
                  {selectedCategory || 'All Categories'}
                </Text>
                <Text style={styles.chevron}>›</Text>
              </TouchableOpacity>

              {selectedCategory && (
                <TouchableOpacity
                  style={styles.filterButton}
                  onPress={() => setShowSubCategoryPicker(true)}
                >
                  <Text style={styles.filterLabel}>Sub-Category</Text>
                  <Text style={styles.filterValue} numberOfLines={1} ellipsizeMode="tail">
                    {selectedSubCategory || 'All Sub-Categories'}
                  </Text>
                  <Text style={styles.chevron}>›</Text>
                </TouchableOpacity>
              )}
            </>
          )}

          {/* Account Filter - Only show if account is selected */}
          {filterType === 'account' && (
            <TouchableOpacity
              style={styles.filterButton}
              onPress={() => setShowAccountPicker(true)}
            >
              <Text style={styles.filterLabel}>Account</Text>
              <Text style={styles.filterValue} numberOfLines={1} ellipsizeMode="tail">
                {selectedAccountId
                  ? accounts.find(acc => acc.id === selectedAccountId)?.name || 'Select Account'
                  : 'All Accounts'}
              </Text>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
          )}

        </View>

        {/* Month-to-Month Breakdown - Table Format */}
        <View style={styles.monthToMonthContainer}>
          <Text style={styles.sectionTitle}>Month to Month Breakdown</Text>
          {monthToMonthData.length === 0 ? (
            <View style={styles.emptyTransactions}>
              <Text style={styles.emptyTransactionsText}>No data available for selected date range</Text>
            </View>
          ) : (
            <View style={styles.tableContainer}>
              {/* Table Header */}
              <View style={styles.tableHeader}>
                <Text style={styles.tableHeaderText}>Month</Text>
                <Text style={styles.tableHeaderText}>In</Text>
                <Text style={styles.tableHeaderText}>Out</Text>
              </View>
              {/* Table Rows */}
              {monthToMonthData.map((monthData) => (
                <View key={`${monthData.year}-${monthData.month}`} style={styles.tableRow}>
                  <Text style={styles.tableMonthText}>{monthData.displayName}</Text>
                  <Text style={[styles.tableAmountText, { color: colors.income }]}>
                    {formatCurrency(monthData.income, currency)}
                  </Text>
                  <Text style={[styles.tableAmountText, { color: colors.expense }]}>
                    {formatCurrency(monthData.expense, currency)}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* From Month/Year Picker Modal */}
      <Modal
        visible={showFromMonthPicker}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowFromMonthPicker(false)}
      >
        <View style={[styles.modalContainer, { paddingTop: insets.top }]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle} numberOfLines={1} ellipsizeMode="tail">Select From Month</Text>
            <TouchableOpacity onPress={() => setShowFromMonthPicker(false)}>
              <Text style={styles.modalDone} numberOfLines={1} ellipsizeMode="tail">Done</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.monthYearPickerContainer}>
            {/* Year Picker */}
            <View style={styles.pickerColumn}>
              <Text style={styles.pickerColumnLabel}>Year</Text>
              <FlatList
                ref={fromYearListRef}
                key={`from-year-${showFromMonthPicker}`}
                data={availableYears}
                keyExtractor={(item) => item.toString()}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.pickerOption,
                      fromYear === item && styles.pickerOptionSelected
                    ]}
                    onPress={() => setFromYear(item)}
                  >
                    <Text
                      style={[
                        styles.pickerOptionText,
                        fromYear === item && styles.pickerOptionTextSelected
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
                removeClippedSubviews={false}
                getItemLayout={(data, index) => ({
                  length: 50,
                  offset: 50 * index,
                  index,
                })}
                onScrollToIndexFailed={(info) => {
                  setTimeout(() => {
                    if (fromYearListRef.current) {
                      fromYearListRef.current.scrollToIndex({ index: info.index, animated: false });
                    }
                  }, 100);
                }}
              />
            </View>
            {/* Month Picker */}
            <View style={styles.pickerColumn}>
              <Text style={styles.pickerColumnLabel}>Month</Text>
              <FlatList
                ref={fromMonthListRef}
                key={`from-month-${showFromMonthPicker}-${fromYear}`}
                data={getMonthsForYear(fromYear)}
                keyExtractor={(item) => `${item.year}-${item.month}`}
                renderItem={({ item }) => {
                  const isSelected = fromYear === item.year && fromMonth === item.month;
                  return (
                    <TouchableOpacity
                      style={[
                        styles.pickerOption,
                        isSelected && styles.pickerOptionSelected
                      ]}
                      onPress={() => {
                        setFromYear(item.year);
                        setFromMonth(item.month);
                      }}
                    >
                      <Text
                        style={[
                          styles.pickerOptionText,
                          isSelected && styles.pickerOptionTextSelected
                        ]}
                        numberOfLines={1}
                        ellipsizeMode="tail"
                      >
                        {item.displayName}
                      </Text>
                    </TouchableOpacity>
                  );
                }}
                contentContainerStyle={{ paddingVertical: spacing.base }}
                showsVerticalScrollIndicator={false}
                removeClippedSubviews={false}
                getItemLayout={(data, index) => ({
                  length: 50,
                  offset: 50 * index,
                  index,
                })}
                onScrollToIndexFailed={(info) => {
                  setTimeout(() => {
                    if (fromMonthListRef.current) {
                      fromMonthListRef.current.scrollToIndex({ index: info.index, animated: false });
                    }
                  }, 100);
                }}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* To Month/Year Picker Modal */}
      <Modal
        visible={showToMonthPicker}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowToMonthPicker(false)}
      >
        <View style={[styles.modalContainer, { paddingTop: insets.top }]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle} numberOfLines={1} ellipsizeMode="tail">Select To Month</Text>
            <TouchableOpacity onPress={() => setShowToMonthPicker(false)}>
              <Text style={styles.modalDone} numberOfLines={1} ellipsizeMode="tail">Done</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.monthYearPickerContainer}>
            {/* Year Picker */}
            <View style={styles.pickerColumn}>
              <Text style={styles.pickerColumnLabel}>Year</Text>
              <FlatList
                ref={toYearListRef}
                key={`to-year-${showToMonthPicker}`}
                data={availableYears}
                keyExtractor={(item) => item.toString()}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.pickerOption,
                      toYear === item && styles.pickerOptionSelected
                    ]}
                    onPress={() => setToYear(item)}
                  >
                    <Text
                      style={[
                        styles.pickerOptionText,
                        toYear === item && styles.pickerOptionTextSelected
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
                removeClippedSubviews={false}
                getItemLayout={(data, index) => ({
                  length: 50,
                  offset: 50 * index,
                  index,
                })}
                onScrollToIndexFailed={(info) => {
                  setTimeout(() => {
                    if (toYearListRef.current) {
                      toYearListRef.current.scrollToIndex({ index: info.index, animated: false });
                    }
                  }, 100);
                }}
              />
            </View>
            {/* Month Picker */}
            <View style={styles.pickerColumn}>
              <Text style={styles.pickerColumnLabel}>Month</Text>
              <FlatList
                ref={toMonthListRef}
                key={`to-month-${showToMonthPicker}-${toYear}`}
                data={getMonthsForYear(toYear)}
                keyExtractor={(item) => `${item.year}-${item.month}`}
                renderItem={({ item }) => {
                  const isSelected = toYear === item.year && toMonth === item.month;
                  return (
                    <TouchableOpacity
                      style={[
                        styles.pickerOption,
                        isSelected && styles.pickerOptionSelected
                      ]}
                      onPress={() => {
                        setToYear(item.year);
                        setToMonth(item.month);
                      }}
                    >
                      <Text
                        style={[
                          styles.pickerOptionText,
                          isSelected && styles.pickerOptionTextSelected
                        ]}
                        numberOfLines={1}
                        ellipsizeMode="tail"
                      >
                        {item.displayName}
                      </Text>
                    </TouchableOpacity>
                  );
                }}
                contentContainerStyle={{ paddingVertical: spacing.base }}
                showsVerticalScrollIndicator={false}
                removeClippedSubviews={false}
                getItemLayout={(data, index) => ({
                  length: 50,
                  offset: 50 * index,
                  index,
                })}
                onScrollToIndexFailed={(info) => {
                  setTimeout(() => {
                    if (toMonthListRef.current) {
                      toMonthListRef.current.scrollToIndex({ index: info.index, animated: false });
                    }
                  }, 100);
                }}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Category Picker Modal */}
      <Modal
        visible={showCategoryPicker}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowCategoryPicker(false)}
      >
        <View style={[styles.modalContainer, { paddingTop: insets.top }]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle} numberOfLines={1} ellipsizeMode="tail">Select Category</Text>
            <TouchableOpacity onPress={() => setShowCategoryPicker(false)}>
              <Text style={styles.modalDone} numberOfLines={1} ellipsizeMode="tail">Done</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={[
              { category: null, displayName: 'All Categories' },
              ...availableCategoriesForMonthToMonth.map(c => ({ category: c, displayName: c }))
            ]}
            keyExtractor={(item) => item.category || 'all'}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.categoryOption}
                onPress={() => {
                  setSelectedCategory(item.category);
                  if (item.category !== selectedCategory) {
                    setSelectedSubCategory(null);
                  }
                  setShowCategoryPicker(false);
                }}
              >
                <Text style={styles.categoryOptionText} numberOfLines={1} ellipsizeMode="tail">
                  {item.displayName}
                </Text>
                {selectedCategory === item.category && (
                  <Text style={styles.checkmark}>✓</Text>
                )}
              </TouchableOpacity>
            )}
            contentContainerStyle={{ paddingVertical: spacing.base }}
          />
        </View>
      </Modal>

      {/* Sub-Category Picker Modal */}
      <Modal
        visible={showSubCategoryPicker}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowSubCategoryPicker(false)}
      >
        <View style={[styles.modalContainer, { paddingTop: insets.top }]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle} numberOfLines={1} ellipsizeMode="tail">Select Sub-Category</Text>
            <TouchableOpacity onPress={() => setShowSubCategoryPicker(false)}>
              <Text style={styles.modalDone} numberOfLines={1} ellipsizeMode="tail">Done</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={[
              { subCategory: null, displayName: 'All Sub-Categories' },
              ...availableSubCategoriesForMonthToMonth.map(sc => ({ subCategory: sc, displayName: sc }))
            ]}
            keyExtractor={(item) => item.subCategory || 'all'}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.categoryOption}
                onPress={() => {
                  setSelectedSubCategory(item.subCategory);
                  setShowSubCategoryPicker(false);
                }}
              >
                <Text style={styles.categoryOptionText} numberOfLines={1} ellipsizeMode="tail">
                  {item.displayName}
                </Text>
                {selectedSubCategory === item.subCategory && (
                  <Text style={styles.checkmark}>✓</Text>
                )}
              </TouchableOpacity>
            )}
            contentContainerStyle={{ paddingVertical: spacing.base }}
          />
        </View>
      </Modal>

      {/* Account Picker Modal */}
      <Modal
        visible={showAccountPicker}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowAccountPicker(false)}
      >
        <View style={[styles.modalContainer, { paddingTop: insets.top }]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle} numberOfLines={1} ellipsizeMode="tail">Select Account</Text>
            <TouchableOpacity onPress={() => setShowAccountPicker(false)}>
              <Text style={styles.modalDone} numberOfLines={1} ellipsizeMode="tail">Done</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={[
              { accountId: null, displayName: 'All Accounts' },
              ...availableAccounts.map(acc => ({ accountId: acc.id, displayName: acc.name }))
            ]}
            keyExtractor={(item) => item.accountId || 'all'}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.categoryOption}
                onPress={() => {
                  setSelectedAccountId(item.accountId);
                  setShowAccountPicker(false);
                }}
              >
                <Text style={styles.categoryOptionText} numberOfLines={1} ellipsizeMode="tail">
                  {item.displayName}
                </Text>
                {selectedAccountId === item.accountId && (
                  <Text style={styles.checkmark}>✓</Text>
                )}
              </TouchableOpacity>
            )}
            contentContainerStyle={{ paddingVertical: spacing.base }}
          />
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
  summaryRow: {
    flexDirection: 'row',
    padding: spacing.base,
    backgroundColor: colors.background.elevated,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
    gap: spacing.md,
  },
  dateSelectionContainer: {
    flex: 1,
    padding: spacing.sm,
    backgroundColor: colors.background.primary,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: colors.primary[200],
    ...shadows.md,
    position: 'relative',
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs / 2,
  },
  summaryLabel: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  selectedDateText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.primary,
    textAlign: 'left',
  },
  chevronContainer: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
  },
  dateSelectionChevron: {
    fontSize: typography.fontSize.lg,
    color: colors.primary[500],
    fontWeight: typography.fontWeight.bold,
  },
  filtersContainer: {
    padding: spacing.base,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.background.elevated,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  radioButtonContainer: {
    marginBottom: spacing.md,
  },
  radioButtonLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  radioButtonRow: {
    flexDirection: 'row',
    gap: spacing.lg,
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  radioButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginRight: spacing.md,
  },
  radioButtonCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.primary[500],
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  radioButtonInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary[500],
  },
  radioButtonText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.primary,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.base,
    backgroundColor: colors.background.primary,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  filterLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    marginRight: spacing.sm,
    minWidth: 100,
  },
  filterValue: {
    flex: 1,
    fontSize: typography.fontSize.sm,
    color: colors.text.primary,
    fontWeight: typography.fontWeight.medium,
  },
  chevron: {
    fontSize: typography.fontSize.base,
    color: colors.text.tertiary,
    marginLeft: spacing.sm,
  },
  clearFiltersButton: {
    padding: spacing.base,
    backgroundColor: colors.primary[100],
    borderRadius: borderRadius.md,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  clearFiltersText: {
    fontSize: typography.fontSize.sm,
    color: colors.primary[600],
    fontWeight: typography.fontWeight.semiBold,
  },
  monthToMonthContainer: {
    padding: spacing.base,
  },
  sectionTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  tableContainer: {
    backgroundColor: colors.background.elevated,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    ...shadows.sm,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: colors.primary[50],
    padding: spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  tableHeaderText: {
    flex: 1,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    textAlign: 'center',
  },
  tableRow: {
    flexDirection: 'row',
    padding: spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  tableMonthText: {
    flex: 1,
    fontSize: typography.fontSize.sm,
    color: colors.text.primary,
    fontWeight: typography.fontWeight.medium,
  },
  tableAmountText: {
    flex: 1,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semiBold,
    textAlign: 'center',
  },
  emptyTransactions: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  emptyTransactionsText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
    backgroundColor: colors.background.elevated,
  },
  modalTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    flex: 1,
  },
  modalDone: {
    fontSize: typography.fontSize.sm,
    color: colors.primary[600],
    fontWeight: typography.fontWeight.semiBold,
  },
  monthYearPickerContainer: {
    flexDirection: 'row',
    flex: 1,
  },
  pickerColumn: {
    flex: 1,
    borderRightWidth: 1,
    borderRightColor: colors.border.light,
  },
  pickerColumnLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.text.secondary,
    padding: spacing.base,
    backgroundColor: colors.background.elevated,
    textAlign: 'center',
  },
  pickerOption: {
    padding: spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  pickerOptionSelected: {
    backgroundColor: colors.primary[50],
  },
  pickerOptionText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.primary,
    textAlign: 'center',
  },
  pickerOptionTextSelected: {
    color: colors.primary[600],
    fontWeight: typography.fontWeight.semiBold,
  },
  categoryOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  categoryOptionText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.primary,
    flex: 1,
  },
  checkmark: {
    fontSize: typography.fontSize.base,
    color: colors.primary[600],
    fontWeight: typography.fontWeight.bold,
  },
});

export default MonthToMonthReportScreen;
