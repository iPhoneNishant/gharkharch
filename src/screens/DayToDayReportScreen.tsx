/**
 * Day-to-Day Report Screen for Gharkharch
 * Displays income and expense breakdown by day over a selected date range (max 90 days)
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
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Platform } from 'react-native';

import { useAuthStore, useAccountStore, useTransactionStore } from '../stores';
import {
  colors,
  typography,
  spacing,
  borderRadius,
  shadows,
} from '../config/theme';
import { formatCurrency, DEFAULT_CURRENCY } from '../config/constants';
import {
  getTransactionsForDateRange,
  generateDayToDayBreakdown,
  DayToDayBreakdown,
} from '../utils/reports';

const MAX_DAYS_DIFFERENCE = 90;

const DayToDayReportScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const { accounts } = useAccountStore();
  const { transactions } = useTransactionStore();

  const currency = user?.currency ?? DEFAULT_CURRENCY;

  // Date selection state - default to last 30 days
  const getDefaultFromDate = () => {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return date;
  };

  const [fromDate, setFromDate] = useState(getDefaultFromDate());
  const [toDate, setToDate] = useState(new Date());
  const [showFromDatePicker, setShowFromDatePicker] = useState(false);
  const [showToDatePicker, setShowToDatePicker] = useState(false);

  // Filter state
  const [filterType, setFilterType] = useState<'category' | 'account' | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedSubCategory, setSelectedSubCategory] = useState<string | null>(null);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showSubCategoryPicker, setShowSubCategoryPicker] = useState(false);
  const [showAccountPicker, setShowAccountPicker] = useState(false);

  // Validate date range (max 90 days)
  const validateDateRange = (from: Date, to: Date): boolean => {
    const diffTime = Math.abs(to.getTime() - from.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= MAX_DAYS_DIFFERENCE;
  };

  // Calculate date range with validation
  const dayToDayFromDate = useMemo(() => {
    const date = new Date(fromDate);
    date.setHours(0, 0, 0, 0);
    return date;
  }, [fromDate]);

  const dayToDayToDate = useMemo(() => {
    const date = new Date(toDate);
    date.setHours(23, 59, 59, 999);
    return date;
  }, [toDate]);

  const isDateRangeValid = useMemo(() => {
    return validateDateRange(dayToDayFromDate, dayToDayToDate);
  }, [dayToDayFromDate, dayToDayToDate]);

  // Get available accounts for filtering
  const availableAccounts = useMemo(() => {
    return accounts.filter(acc => acc.isActive);
  }, [accounts]);

  // Get available categories (from all transactions in date range)
  const availableCategories = useMemo(() => {
    const categories = new Set<string>();
    const rangeTransactions = getTransactionsForDateRange(transactions, dayToDayFromDate, dayToDayToDate);
    rangeTransactions.forEach(txn => {
      const debitAccount = accounts.find(acc => acc.id === txn.debitAccountId);
      const creditAccount = accounts.find(acc => acc.id === txn.creditAccountId);
      if (debitAccount?.parentCategory) categories.add(debitAccount.parentCategory);
      if (creditAccount?.parentCategory) categories.add(creditAccount.parentCategory);
    });
    return Array.from(categories).sort();
  }, [accounts, transactions, dayToDayFromDate, dayToDayToDate]);

  // Get available sub-categories
  const availableSubCategories = useMemo(() => {
    if (!selectedCategory) return [];
    const subCategories = new Set<string>();
    const rangeTransactions = getTransactionsForDateRange(transactions, dayToDayFromDate, dayToDayToDate);
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
  }, [accounts, transactions, dayToDayFromDate, dayToDayToDate, selectedCategory]);

  // Generate day-to-day breakdown
  const dayToDayData = useMemo(() => {
    if (!isDateRangeValid) return [];
    return generateDayToDayBreakdown(
      accounts,
      transactions,
      dayToDayFromDate,
      dayToDayToDate,
      selectedCategory,
      selectedSubCategory,
      selectedAccountId
    );
  }, [accounts, transactions, dayToDayFromDate, dayToDayToDate, selectedCategory, selectedSubCategory, selectedAccountId, isDateRangeValid]);

  // Handle date changes with validation
  const handleFromDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowFromDatePicker(false);
    }
    if (selectedDate) {
      // Calculate the difference between selected date and current to date
      const diffTime = Math.abs(toDate.getTime() - selectedDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays > MAX_DAYS_DIFFERENCE) {
        // If difference exceeds 90 days, automatically adjust to date to be 89 days from selected date
        const newToDate = new Date(selectedDate);
        newToDate.setDate(newToDate.getDate() + 89);
        // Ensure to date doesn't exceed today
        const today = new Date();
        if (newToDate > today) {
          setToDate(today);
        } else {
          setToDate(newToDate);
        }
      }
      setFromDate(selectedDate);
    }
  };

  const handleToDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowToDatePicker(false);
    }
    if (selectedDate) {
      if (validateDateRange(fromDate, selectedDate)) {
        setToDate(selectedDate);
      } else {
        Alert.alert(
          'Invalid Date Range',
          `Maximum ${MAX_DAYS_DIFFERENCE} days difference allowed between from and to dates.`
        );
      }
    }
  };

  // Calculate days difference for display
  const daysDifference = useMemo(() => {
    if (!isDateRangeValid) return 0;
    const diffTime = Math.abs(dayToDayToDate.getTime() - dayToDayFromDate.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 to include both start and end days
  }, [dayToDayFromDate, dayToDayToDate, isDateRangeValid]);

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xl }}
      >
        {/* Summary Row - From and To Date in one row */}
        <View style={styles.summaryRow}>
          <TouchableOpacity 
            style={styles.dateSelectionContainer}
            onPress={() => setShowFromDatePicker(true)}
            activeOpacity={0.7}
          >
            <View style={styles.labelRow}>
              <Text style={styles.summaryLabel}>From</Text>
            </View>
            <Text style={styles.selectedDateText}>
              {fromDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </Text>
            <View style={styles.chevronContainer}>
              <Text style={styles.chevron}>›</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.dateSelectionContainer}
            onPress={() => setShowToDatePicker(true)}
            activeOpacity={0.7}
          >
            <View style={styles.labelRow}>
              <Text style={styles.summaryLabel}>To</Text>
            </View>
            <Text style={styles.selectedDateText}>
              {toDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </Text>
            <View style={styles.chevronContainer}>
              <Text style={styles.chevron}>›</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Date Range Validation Message */}
        {!isDateRangeValid && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>
              Date range exceeds {MAX_DAYS_DIFFERENCE} days. Please select a smaller range.
            </Text>
          </View>
        )}

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

        {/* Day-to-Day Breakdown - Table Format */}
        <View style={styles.dayToDayContainer}>
          <Text style={styles.sectionTitle}>Day to Day Breakdown</Text>
          {!isDateRangeValid ? (
            <View style={styles.emptyTransactions}>
              <Text style={styles.emptyTransactionsText}>
                Please select a date range within {MAX_DAYS_DIFFERENCE} days
              </Text>
            </View>
          ) : dayToDayData.length === 0 ? (
            <View style={styles.emptyTransactions}>
              <Text style={styles.emptyTransactionsText}>No data available for selected date range</Text>
            </View>
          ) : (
            <View style={styles.tableContainer}>
              {/* Table Header */}
              <View style={styles.tableHeader}>
                <Text style={styles.tableHeaderText}>Date</Text>
                <Text style={styles.tableHeaderText}>In</Text>
                <Text style={styles.tableHeaderText}>Out</Text>
              </View>
              {/* Table Rows */}
              {dayToDayData.map((dayData) => (
                <View key={`${dayData.year}-${dayData.month}-${dayData.day}`} style={styles.tableRow}>
                  <Text style={styles.tableDateText}>{dayData.displayName}</Text>
                  <Text style={[styles.tableAmountText, { color: colors.income }]}>
                    {formatCurrency(dayData.income, currency)}
                  </Text>
                  <Text style={[styles.tableAmountText, { color: colors.expense }]}>
                    {formatCurrency(dayData.expense, currency)}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

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
                <Text style={styles.modalTitle}>Select From Date</Text>
                <TouchableOpacity onPress={() => setShowFromDatePicker(false)}>
                  <Text style={styles.modalDone}>Done</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={fromDate}
                mode="date"
                display="spinner"
                onChange={handleFromDateChange}
                maximumDate={toDate}
              />
            </View>
          </Modal>
        ) : (
          <DateTimePicker
            value={fromDate}
            mode="date"
            display="default"
            onChange={handleFromDateChange}
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
                <Text style={styles.modalTitle}>Select To Date</Text>
                <TouchableOpacity onPress={() => setShowToDatePicker(false)}>
                  <Text style={styles.modalDone}>Done</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={toDate}
                mode="date"
                display="spinner"
                onChange={handleToDateChange}
                minimumDate={fromDate}
                maximumDate={new Date()}
              />
            </View>
          </Modal>
        ) : (
          <DateTimePicker
            value={toDate}
            mode="date"
            display="default"
            onChange={handleToDateChange}
            minimumDate={fromDate}
            maximumDate={new Date()}
          />
        )
      )}

      {/* Category Picker Modal */}
      <Modal
        visible={showCategoryPicker}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowCategoryPicker(false)}
      >
        <View style={[styles.modalContainer, { paddingTop: insets.top }]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Category</Text>
            <TouchableOpacity onPress={() => setShowCategoryPicker(false)}>
              <Text style={styles.modalDone}>Done</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={[
              { category: null, displayName: 'All Categories' },
              ...availableCategories.map(c => ({ category: c, displayName: c }))
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
            <Text style={styles.modalTitle}>Select Sub-Category</Text>
            <TouchableOpacity onPress={() => setShowSubCategoryPicker(false)}>
              <Text style={styles.modalDone}>Done</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={[
              { subCategory: null, displayName: 'All Sub-Categories' },
              ...availableSubCategories.map(sc => ({ subCategory: sc, displayName: sc }))
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
            <Text style={styles.modalTitle}>Select Account</Text>
            <TouchableOpacity onPress={() => setShowAccountPicker(false)}>
              <Text style={styles.modalDone}>Done</Text>
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
  summaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.base,
    backgroundColor: colors.background.primary,
    borderRadius: borderRadius.md,
    ...shadows.sm,
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
  chevron: {
    fontSize: typography.fontSize.lg,
    color: colors.primary[500],
    fontWeight: typography.fontWeight.bold,
  },
  errorContainer: {
    padding: spacing.base,
    backgroundColor: colors.expense + '20',
    margin: spacing.base,
    borderRadius: borderRadius.md,
  },
  errorText: {
    fontSize: typography.fontSize.sm,
    color: colors.expense,
    textAlign: 'center',
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
    gap: spacing.md,
    alignItems: 'center',
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
  dayToDayContainer: {
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
  tableDateText: {
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
    fontWeight: typography.fontWeight.semiBold,
    color: colors.primary[600],
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

export default DayToDayReportScreen;
