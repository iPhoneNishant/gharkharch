/**
 * Reports Screen for Gharkharch
 * Displays monthly reports with category and sub-category breakdowns
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
  Platform,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';

import { useRoute, RouteProp } from '@react-navigation/native';
import { useAuthStore, useAccountStore, useTransactionStore } from '../stores';
import { MonthlyReport, CategoryReport, SubCategoryReport, AccountType, Transaction, RootStackParamList } from '../types';
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
  generateMonthlyReport,
  generateDateRangeReport,
  getAvailableMonths,
  getTransactionsForDateRange,
  getTransactionsForMonth,
  generateMonthToMonthBreakdown,
  MonthToMonthBreakdown,
} from '../utils/reports';

type ReportsScreenRouteProp = RouteProp<RootStackParamList, 'SummaryMonthReport' | 'SummaryCustomReport' | 'TransactionsMonthReport' | 'TransactionsCustomReport'>;

const ReportsScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const route = useRoute<ReportsScreenRouteProp>();
  const { user } = useAuthStore();
  const { accounts } = useAccountStore();
  const { transactions } = useTransactionStore();

  // Get viewMode from route name
  const getViewModeFromRoute = (routeName: string): 'summary-month' | 'summary-custom' | 'transactions-month' | 'transactions-custom' => {
    if (routeName === 'SummaryMonthReport') return 'summary-month';
    if (routeName === 'SummaryCustomReport') return 'summary-custom';
    if (routeName === 'TransactionsMonthReport') return 'transactions-month';
    if (routeName === 'TransactionsCustomReport') return 'transactions-custom';
    return 'summary-month'; // default
  };

  const currency = user?.currency ?? DEFAULT_CURRENCY;
  
  // Get viewMode from route name and determine date range mode
  const routeName = (route.name || '') as keyof RootStackParamList;
  const viewMode = getViewModeFromRoute(routeName);
  const isMonthMode = viewMode.includes('month');
  const dateRangeMode = isMonthMode ? 'month' : 'custom';
  
  // Debug logging removed

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

  // State
  const [selectedYear, setSelectedYear] = useState(() => {
    if (isMonthMode && availableMonths.length > 0) {
      return availableMonths[0].year;
    }
    return new Date().getFullYear();
  });
  
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

  // Get months for selected year (all months from first transaction month to current month)
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

    // Find the earliest transaction date
    const dates = transactions.map(txn => new Date(txn.date));
    const earliestDate = new Date(Math.min(...dates.map(d => d.getTime())));
    const startYear = earliestDate.getFullYear();
    const startMonth = earliestDate.getMonth() + 1;
    const now = new Date();
    const endYear = now.getFullYear();
    const endMonth = now.getMonth() + 1;

    const months: { year: number; month: number; displayName: string }[] = [];

    if (selectedYear === startYear && selectedYear === endYear) {
      // Same year - from start month to end month
      for (let month = endMonth; month >= startMonth; month--) {
        months.push({
          year: selectedYear,
          month,
          displayName: new Date(selectedYear, month - 1, 1).toLocaleDateString('en-US', { month: 'long' }),
        });
      }
    } else if (selectedYear === startYear) {
      // First year - from start month to December
      for (let month = 12; month >= startMonth; month--) {
        months.push({
          year: selectedYear,
          month,
          displayName: new Date(selectedYear, month - 1, 1).toLocaleDateString('en-US', { month: 'long' }),
        });
      }
    } else if (selectedYear === endYear) {
      // Current year - from January to end month
      for (let month = endMonth; month >= 1; month--) {
        months.push({
          year: selectedYear,
          month,
          displayName: new Date(selectedYear, month - 1, 1).toLocaleDateString('en-US', { month: 'long' }),
        });
      }
    } else if (selectedYear > startYear && selectedYear < endYear) {
      // Middle years - all 12 months
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

  const [selectedMonth, setSelectedMonth] = useState(() => {
    if (isMonthMode && availableMonths.length > 0) {
      return availableMonths[0].month;
    }
    return new Date().getMonth() + 1;
  });

  const [fromDate, setFromDate] = useState(() => {
    const date = new Date();
    date.setDate(1); // First day of current month
    return date;
  });
  const [toDate, setToDate] = useState(new Date());
  const [showFromDatePicker, setShowFromDatePicker] = useState(false);
  const [showToDatePicker, setShowToDatePicker] = useState(false);

  // Month-to-month report state (from/to months)
  // Default to first available month or current month if no transactions

  // Filter state
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedSubCategory, setSelectedSubCategory] = useState<string | null>(null);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [showMonthYearPicker, setShowMonthYearPicker] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showSubCategoryPicker, setShowSubCategoryPicker] = useState(false);
  const [showAccountPicker, setShowAccountPicker] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  
  // Refs for FlatList scrolling
  const yearListRef = useRef<FlatList>(null);
  const monthListRef = useRef<FlatList>(null);
  
  // Scroll to selected items when picker modal opens
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
        const monthIndex = selectedMonth - 1;
        if (monthIndex >= 0 && monthListRef.current) {
          monthListRef.current.scrollToIndex({ index: monthIndex, animated: false });
        }
      }, 150);
    }
  }, [showMonthYearPicker, selectedYear, selectedMonth, availableYears]);

  // Generate report based on date range mode
  const dateRangeReport = useMemo(() => {
    if (dateRangeMode === 'month') {
      if (!selectedYear || !selectedMonth) return null;
      return generateMonthlyReport(accounts, transactions, selectedYear, selectedMonth);
    } else {
      return generateDateRangeReport(accounts, transactions, fromDate, toDate);
    }
  }, [accounts, transactions, selectedYear, selectedMonth, dateRangeMode, fromDate, toDate]);

  // Get filtered transactions
  const filteredTransactions = useMemo(() => {
    if (!viewMode || !dateRangeMode) return [];
    
    let txnList: Transaction[] = [];
    
    if (dateRangeMode === 'month') {
      txnList = getTransactionsForMonth(transactions, selectedYear, selectedMonth);
    } else {
      txnList = getTransactionsForDateRange(transactions, fromDate, toDate);
    }

    // Filter by category/sub-category if selected
    if (selectedCategory || selectedSubCategory) {
      txnList = txnList.filter(txn => {
        const debitAccount = accounts.find(acc => acc.id === txn.debitAccountId);
        const creditAccount = accounts.find(acc => acc.id === txn.creditAccountId);
        
        if (selectedCategory) {
          const matchesCategory = 
            debitAccount?.parentCategory === selectedCategory ||
            creditAccount?.parentCategory === selectedCategory;
          if (!matchesCategory) return false;
        }
        
        if (selectedSubCategory) {
          const matchesSubCategory = 
            debitAccount?.subCategory === selectedSubCategory ||
            creditAccount?.subCategory === selectedSubCategory;
          if (!matchesSubCategory) return false;
        }
        
        return true;
      });
    }

    return txnList.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, accounts, dateRangeMode, selectedYear, selectedMonth, fromDate, toDate, selectedCategory, selectedSubCategory, viewMode]);

  // Calculate expense/income totals from filtered transactions
  const expenseIncomeTotals = useMemo(() => {
    if (filteredTransactions.length === 0) return { expenses: new Map(), income: new Map() };
    
    const expenses = new Map<string, { category: string; subCategory: string; total: number; transactions: Transaction[] }>();
    const income = new Map<string, { category: string; subCategory: string; total: number; transactions: Transaction[] }>();

    filteredTransactions.forEach(txn => {
      const debitAccount = accounts.find(acc => acc.id === txn.debitAccountId);
      const creditAccount = accounts.find(acc => acc.id === txn.creditAccountId);

      // Expense: debit account is expense type
      if (debitAccount?.accountType === 'expense') {
        const key = `${debitAccount.parentCategory}|${debitAccount.subCategory}`;
        const existing = expenses.get(key) || {
          category: debitAccount.parentCategory,
          subCategory: debitAccount.subCategory,
          total: 0,
          transactions: [],
        };
        existing.total += txn.amount;
        existing.transactions.push(txn);
        expenses.set(key, existing);
      }

      // Income: credit account is income type
      if (creditAccount?.accountType === 'income') {
        const key = `${creditAccount.parentCategory}|${creditAccount.subCategory}`;
        const existing = income.get(key) || {
          category: creditAccount.parentCategory,
          subCategory: creditAccount.subCategory,
          total: 0,
          transactions: [],
        };
        existing.total += txn.amount;
        existing.transactions.push(txn);
        income.set(key, existing);
      }
    });

    return { expenses, income };
  }, [filteredTransactions, accounts]);

  // Filter report by category/subcategory
  const filteredReport = useMemo(() => {
    if (!dateRangeReport) return null;

    let categoryReports = dateRangeReport.categoryReports;

    if (selectedCategory) {
      categoryReports = categoryReports.filter(cr => cr.category === selectedCategory);
    }

    if (selectedSubCategory) {
      categoryReports = categoryReports.map(cr => ({
        ...cr,
        subCategoryReports: cr.subCategoryReports.filter(
          scr => scr.subCategory === selectedSubCategory
        ),
      })).filter(cr => cr.subCategoryReports.length > 0);
    }

    return {
      ...dateRangeReport,
      categoryReports,
    };
  }, [dateRangeReport, selectedCategory, selectedSubCategory]);

  // Recalculate category and subcategory transaction counts based on filtered transactions
  const categoryReportsWithFilteredCounts = useMemo(() => {
    if (!filteredReport) return [];
    
    return filteredReport.categoryReports.map(categoryReport => {
      // Count transactions for this category from filtered transactions
      const categoryTransactionCount = filteredTransactions.filter(txn => {
        const debitAccount = accounts.find(acc => acc.id === txn.debitAccountId);
        const creditAccount = accounts.find(acc => acc.id === txn.creditAccountId);
        return (debitAccount?.parentCategory === categoryReport.category || 
                creditAccount?.parentCategory === categoryReport.category) &&
               (debitAccount?.accountType === categoryReport.accountType ||
                creditAccount?.accountType === categoryReport.accountType);
      }).length;
      
      // Recalculate subcategory transaction counts
      const subCategoryReports = categoryReport.subCategoryReports.map(subCategoryReport => {
        const subCategoryTransactionCount = filteredTransactions.filter(txn => {
          const debitAccount = accounts.find(acc => acc.id === txn.debitAccountId);
          const creditAccount = accounts.find(acc => acc.id === txn.creditAccountId);
          return (debitAccount?.subCategory === subCategoryReport.subCategory || 
                  creditAccount?.subCategory === subCategoryReport.subCategory) &&
                 (debitAccount?.parentCategory === categoryReport.category ||
                  creditAccount?.parentCategory === categoryReport.category) &&
                 (debitAccount?.accountType === categoryReport.accountType ||
                  creditAccount?.accountType === categoryReport.accountType);
        }).length;
        
        return {
          ...subCategoryReport,
          transactionCount: subCategoryTransactionCount,
        };
      });
      
      return {
        ...categoryReport,
        totalTransactions: categoryTransactionCount,
        subCategoryReports,
      };
    });
  }, [filteredReport, filteredTransactions, accounts]);

  // Expand all categories by default when filtered report changes
  useEffect(() => {
    if (categoryReportsWithFilteredCounts && categoryReportsWithFilteredCounts.length > 0) {
      const allCategoryKeys = new Set<string>();
      categoryReportsWithFilteredCounts.forEach(cr => {
        const categoryKey = `${cr.accountType}-${cr.category}`;
        allCategoryKeys.add(categoryKey);
      });
      setExpandedCategories(allCategoryKeys);
    }
  }, [categoryReportsWithFilteredCounts]);

  // Group category reports by account type
  const categoryReportsByAccountType = useMemo(() => {
    if (!categoryReportsWithFilteredCounts || categoryReportsWithFilteredCounts.length === 0) {
      return new Map<AccountType, CategoryReport[]>();
    }
    
    const grouped = new Map<AccountType, CategoryReport[]>();
    categoryReportsWithFilteredCounts.forEach(cr => {
      if (!grouped.has(cr.accountType)) {
        grouped.set(cr.accountType, []);
      }
      grouped.get(cr.accountType)!.push(cr);
    });
    
    return grouped;
  }, [categoryReportsWithFilteredCounts]);

  // Get unique categories from report
  const availableCategories = useMemo(() => {
    if (!dateRangeReport) return [];
    return Array.from(new Set(dateRangeReport.categoryReports.map(cr => cr.category)));
  }, [dateRangeReport]);

  // Get unique sub-categories from report
  const availableSubCategories = useMemo(() => {
    if (!dateRangeReport) return [];
    const subCats = new Set<string>();
    dateRangeReport.categoryReports.forEach(cr => {
      cr.subCategoryReports.forEach(scr => {
        subCats.add(scr.subCategory);
      });
    });
    return Array.from(subCats);
  }, [dateRangeReport]);

  // Get sub-categories for selected category
  const subCategoriesForSelectedCategory = useMemo(() => {
    if (!selectedCategory || !dateRangeReport) return [];
    const categoryReport = dateRangeReport.categoryReports.find(cr => cr.category === selectedCategory);
    if (!categoryReport) return [];
    return categoryReport.subCategoryReports.map(scr => scr.subCategory);
  }, [selectedCategory, dateRangeReport]);



  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  const renderSubCategoryReport = (subCategoryReport: SubCategoryReport, categoryName: string, accountType: AccountType) => {
    const isIncomeOrExpense = accountType === 'income' || accountType === 'expense';
    
    return (
      <View key={subCategoryReport.subCategory} style={styles.subCategoryCard}>
        <View style={styles.subCategoryHeader}>
          <Text style={styles.subCategoryName} numberOfLines={1} ellipsizeMode="tail">
            {subCategoryReport.subCategory}
          </Text>
          <View style={styles.subCategoryStats}>
            {isIncomeOrExpense ? (
              <>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>
                    {accountType === 'income' ? 'Total Income' : 'Total Expenses'}
                  </Text>
                  <Text style={[
                    styles.statValue,
                    { color: accountType === 'income' ? colors.income : colors.expense }
                  ]}>
                    {formatCurrency(
                      accountType === 'income' ? subCategoryReport.totalCredits : -subCategoryReport.totalDebits,
                      currency,
                      accountType === 'income'
                    )}
                  </Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Transactions</Text>
                  <Text style={styles.statValue}>{subCategoryReport.transactionCount}</Text>
                </View>
              </>
            ) : (
              <>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Opening</Text>
                  <Text style={styles.statValue}>
                    {formatCurrency(subCategoryReport.openingBalance, currency)}
                  </Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Closing</Text>
                  <Text style={styles.statValue}>
                    {formatCurrency(subCategoryReport.closingBalance, currency)}
                  </Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Transactions</Text>
                  <Text style={styles.statValue}>{subCategoryReport.transactionCount}</Text>
                </View>
              </>
            )}
          </View>
        </View>

        {subCategoryReport.transactionCount > 0 && !isIncomeOrExpense && (
          <View style={styles.transactionSummary}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel} numberOfLines={1} ellipsizeMode="tail">
                Total Debits:
              </Text>
              <Text style={styles.summaryValue} numberOfLines={1} ellipsizeMode="tail">
                {formatCurrency(subCategoryReport.totalDebits, currency)}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel} numberOfLines={1} ellipsizeMode="tail">
                Total Credits:
              </Text>
              <Text style={styles.summaryValue} numberOfLines={1} ellipsizeMode="tail">
                {formatCurrency(subCategoryReport.totalCredits, currency)}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel} numberOfLines={1} ellipsizeMode="tail">
                Net Change:
              </Text>
              <Text style={[
                styles.summaryValue,
                { color: subCategoryReport.netChange >= 0 ? colors.income : colors.expense }
              ]} numberOfLines={1} ellipsizeMode="tail">
                {formatCurrency(subCategoryReport.netChange, currency)}
              </Text>
            </View>
          </View>
        )}
        {subCategoryReport.transactionCount > 0 && isIncomeOrExpense && (
          <View style={styles.transactionSummary}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel} numberOfLines={1} ellipsizeMode="tail">
                Total Debits:
              </Text>
              <Text style={styles.summaryValue} numberOfLines={1} ellipsizeMode="tail">
                {formatCurrency(subCategoryReport.totalDebits, currency)}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel} numberOfLines={1} ellipsizeMode="tail">
                Total Credits:
              </Text>
              <Text style={styles.summaryValue} numberOfLines={1} ellipsizeMode="tail">
                {formatCurrency(subCategoryReport.totalCredits, currency)}
              </Text>
            </View>
          </View>
        )}
      </View>
    );
  };

  const renderCategoryReport = (categoryReport: CategoryReport) => {
    const categoryKey = `${categoryReport.accountType}-${categoryReport.category}`;
    const isExpanded = expandedCategories.has(categoryKey);

    return (
      <View key={categoryKey} style={styles.categoryCard}>
        <TouchableOpacity
          style={styles.categoryHeader}
          onPress={() => toggleCategory(categoryKey)}
        >
          <View style={[
            styles.categoryIcon,
            { backgroundColor: getAccountTypeBgColor(categoryReport.accountType) }
          ]}>
            <Text style={[
              styles.categoryIconText,
              { color: getAccountTypeColor(categoryReport.accountType) }
            ]}>
              {categoryReport.category.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.categoryInfo}>
            <Text style={styles.categoryName} numberOfLines={1} ellipsizeMode="tail">
              {categoryReport.category}
            </Text>
            <Text style={styles.categoryMeta} numberOfLines={1} ellipsizeMode="tail">
         {categoryReport.totalTransactions} transactions
            </Text>
          </View>
          <View style={styles.categoryBalance}>
            {categoryReport.accountType === 'income' || categoryReport.accountType === 'expense' ? (
              <>
                <Text style={styles.categoryBalanceLabel}>
                  {categoryReport.accountType === 'income' ? 'Total Income' : 'Total Expenses'}
                </Text>
                <Text style={[
                  styles.categoryBalanceValue,
                  { color: categoryReport.accountType === 'income' ? colors.income : colors.expense }
                ]}>
                  {formatCurrency(
                    categoryReport.accountType === 'income'
                      ? categoryReport.subCategoryReports.reduce((sum, scr) => sum + scr.totalCredits, 0)
                      : -categoryReport.subCategoryReports.reduce((sum, scr) => sum + scr.totalDebits, 0),
                    currency,
                    categoryReport.accountType === 'income'
                  )}
                </Text>
              </>
            ) : (
              <>
                <Text 
                  style={styles.categoryBalanceLabel}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  Opening
                </Text>
                <Text style={styles.categoryBalanceValue}>
                  {formatCurrency(categoryReport.totalOpeningBalance, currency)}
                </Text>
                <Text 
                  style={styles.categoryBalanceLabel}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  Closing
                </Text>
                <Text style={styles.categoryBalanceValue}>
                  {formatCurrency(categoryReport.totalClosingBalance, currency)}
                </Text>
              </>
            )}
          </View>
          <Text style={styles.expandIcon}>{isExpanded ? '▼' : '▶'}</Text>
        </TouchableOpacity>

        {isExpanded && (
          <View style={styles.subCategoriesContainer}>
            {categoryReport.subCategoryReports.map(scr =>
              renderSubCategoryReport(scr, categoryReport.category, categoryReport.accountType)
            )}
          </View>
        )}
      </View>
    );
  };

  if (!filteredReport) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>No data available</Text>
          <Text style={styles.emptyStateSubtext}>
            Add transactions to generate reports
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xl }}
      >
        {/* Filters */}
        <View style={styles.filtersContainer}>
          {dateRangeMode === 'month' ? (
            <TouchableOpacity
              style={styles.filterButton}
              onPress={() => setShowMonthYearPicker(true)}
            >
              <Text style={styles.filterLabel}>Month</Text>
              <Text style={styles.filterValue} numberOfLines={1} ellipsizeMode="tail">
                {selectedMonth && selectedYear 
                  ? `${new Date(selectedYear, selectedMonth - 1, 1).toLocaleDateString('en-US', { month: 'long' })} ${selectedYear}`
                  : 'Select Month'}
              </Text>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.dateSelectionRow}>
              <TouchableOpacity 
                style={styles.dateSelectionContainer}
                onPress={() => setShowFromDatePicker(true)}
                activeOpacity={0.7}
              >
                <View style={styles.labelRow}>
                  <Text style={styles.dateSelectionLabel}>From</Text>
                </View>
                <Text style={styles.selectedDateText}>
                  {fromDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </Text>
                <View style={styles.chevronContainer}>
                  <Text style={styles.dateSelectionChevron}>›</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.dateSelectionContainer}
                onPress={() => setShowToDatePicker(true)}
                activeOpacity={0.7}
              >
                <View style={styles.labelRow}>
                  <Text style={styles.dateSelectionLabel}>To</Text>
                </View>
                <Text style={styles.selectedDateText}>
                  {toDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </Text>
                <View style={styles.chevronContainer}>
                  <Text style={styles.dateSelectionChevron}>›</Text>
                </View>
              </TouchableOpacity>
            </View>
          )}

          {/* Filters */}
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

              {(selectedCategory || selectedSubCategory) && (
                <TouchableOpacity
                  style={styles.clearFiltersButton}
                  onPress={() => {
                    setSelectedCategory(null);
                    setSelectedSubCategory(null);
                  }}
                >
                  <Text style={styles.clearFiltersText}>Clear Filters</Text>
                </TouchableOpacity>
              )}
            </>
        </View>

        {/* Summary Card */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Period Summary</Text>
          <View style={styles.summaryGrid}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryItemLabel}>Opening Balance</Text>
              <Text style={styles.summaryItemValue}>
                {formatCurrency(filteredReport.totalOpeningBalance, currency)}
              </Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryItemLabel}>Closing Balance</Text>
              <Text style={styles.summaryItemValue}>
                {formatCurrency(filteredReport.totalClosingBalance, currency)}
              </Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryItemLabel}>Total Income</Text>
              <Text style={[styles.summaryItemValue, { color: colors.income }]}>
                {formatCurrency(
                  Array.from(expenseIncomeTotals.income.values()).reduce((sum, item) => sum + item.total, 0),
                  currency,
                  true
                )}
              </Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryItemLabel}>Total Expenses</Text>
              <Text style={[styles.summaryItemValue, { color: colors.expense }]}>
                {formatCurrency(
                  -Array.from(expenseIncomeTotals.expenses.values()).reduce((sum, item) => sum + item.total, 0),
                  currency,
                  false
                )}
              </Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryItemLabel}>Net Change</Text>
              <Text style={[
                styles.summaryItemValue,
                {
                  color: (filteredReport.totalClosingBalance - filteredReport.totalOpeningBalance) >= 0
                    ? colors.income
                    : colors.expense
                }
              ]}>
                {formatCurrency(
                  filteredReport.totalClosingBalance - filteredReport.totalOpeningBalance,
                  currency
                )}
              </Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryItemLabel}>Transactions</Text>
              <Text style={styles.summaryItemValue}>
                {filteredTransactions.length}
              </Text>
            </View>
          </View>
        </View>

  

        {/* Transactions List View */}
        {(viewMode === 'transactions-month' || viewMode === 'transactions-custom') && (
          <View style={styles.transactionsContainer}>
            <Text style={styles.sectionTitle}>
              Transactions ({filteredTransactions.length})
            </Text>
            {filteredTransactions.length === 0 ? (
              <View style={styles.emptyTransactions}>
                <Text style={styles.emptyTransactionsText}>No transactions found</Text>
              </View>
            ) : (
              <View style={styles.transactionsList}>
                {filteredTransactions.map(txn => {
                  const debitAccount = accounts.find(acc => acc.id === txn.debitAccountId);
                  const creditAccount = accounts.find(acc => acc.id === txn.creditAccountId);
                  const isExpense = debitAccount?.accountType === 'expense';
                  const isIncome = creditAccount?.accountType === 'income';
                  
                  return (
                    <View key={txn.id} style={styles.transactionItem}>
                      <View style={styles.transactionLeft}>
                        <View style={[
                          styles.transactionIcon,
                          { backgroundColor: isExpense ? colors.expense : isIncome ? colors.income : colors.asset }
                        ]}>
                          <Text style={styles.transactionIconText}>
                            {isExpense ? '↓' : isIncome ? '↑' : '⇄'}
                          </Text>
                        </View>
                        <View style={styles.transactionInfo}>
                          <Text style={styles.transactionAccount} numberOfLines={1} ellipsizeMode="tail">
                            {isExpense ? debitAccount?.name : isIncome ? creditAccount?.name : `${debitAccount?.name} → ${creditAccount?.name}`}
                          </Text>
                          <Text style={styles.transactionCategory} numberOfLines={1} ellipsizeMode="tail">
                            {isExpense ? debitAccount?.subCategory : isIncome ? creditAccount?.subCategory : `${debitAccount?.subCategory} / ${creditAccount?.subCategory}`}
                          </Text>
                          <Text style={styles.transactionDate}>
                            {txn.date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.transactionRight}>
                        <Text style={[
                          styles.transactionAmount,
                          { color: isExpense ? colors.expense : isIncome ? colors.income : colors.text.primary }
                        ]}>
                          {isExpense 
                            ? formatCurrency(-txn.amount, currency, false)
                            : isIncome 
                            ? formatCurrency(txn.amount, currency, true)
                            : formatCurrency(txn.amount, currency)
                          }
                        </Text>
                        {txn.note && (
                          <Text style={styles.transactionNote} numberOfLines={1}>
                            {txn.note}
                          </Text>
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        )}

        {/* Category Reports - Only show in summary mode */}
        {(viewMode === 'summary-month' || viewMode === 'summary-custom') && (
          <View style={styles.reportsContainer}>
            <Text style={styles.sectionTitle}>Category Breakdown</Text>
            {Array.from(categoryReportsByAccountType.entries()).map(([accountType, categoryReports]) => (
              <View key={accountType} style={styles.accountTypeSection}>
                <View style={styles.accountTypeHeader}>
                  <View style={[
                    styles.accountTypeIcon,
                    { backgroundColor: getAccountTypeBgColor(accountType) }
                  ]}>
                    <Text style={[
                      styles.accountTypeIconText,
                      { color: getAccountTypeColor(accountType) }
                    ]}>
                      {accountType.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <Text style={styles.accountTypeTitle}>
                    {accountType.charAt(0).toUpperCase() + accountType.slice(1)}
                  </Text>
                </View>
                {categoryReports.map(cr => renderCategoryReport(cr))}
              </View>
            ))}
          </View>
        )}
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
                <TouchableOpacity onPress={() => setShowFromDatePicker(false)}>
                  <Text style={styles.modalCancel} numberOfLines={1} ellipsizeMode="tail">
                    Cancel
                  </Text>
                </TouchableOpacity>
                <Text style={styles.modalTitle} numberOfLines={1} ellipsizeMode="tail">
                  Select From Date
                </Text>
                <TouchableOpacity onPress={() => setShowFromDatePicker(false)}>
                  <Text style={styles.modalDone} numberOfLines={1} ellipsizeMode="tail">
                    Done
                  </Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={fromDate}
                mode="date"
                display="spinner"
                onChange={(event, selectedDate) => {
                  if (selectedDate) {
                    setFromDate(selectedDate);
                  }
                }}
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
            onChange={(event, selectedDate) => {
              setShowFromDatePicker(false);
              if (selectedDate) {
                setFromDate(selectedDate);
              }
            }}
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
                  <Text style={styles.modalCancel} numberOfLines={1} ellipsizeMode="tail">
                    Cancel
                  </Text>
                </TouchableOpacity>
                <Text style={styles.modalTitle} numberOfLines={1} ellipsizeMode="tail">
                  Select To Date
                </Text>
                <TouchableOpacity onPress={() => setShowToDatePicker(false)}>
                  <Text style={styles.modalDone} numberOfLines={1} ellipsizeMode="tail">
                    Done
                  </Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={toDate}
                mode="date"
                display="spinner"
                onChange={(event, selectedDate) => {
                  if (selectedDate) {
                    setToDate(selectedDate);
                  }
                }}
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
            onChange={(event, selectedDate) => {
              setShowToDatePicker(false);
              if (selectedDate) {
                setToDate(selectedDate);
              }
            }}
            minimumDate={fromDate}
            maximumDate={new Date()}
          />
        )
      )}

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
              <Text style={styles.modalCancel} numberOfLines={1} ellipsizeMode="tail">Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle} numberOfLines={1} ellipsizeMode="tail">Select Month & Year</Text>
            <TouchableOpacity onPress={() => {
              setShowMonthYearPicker(false);
              setSelectedCategory(null);
              setSelectedSubCategory(null);
            }}>
              <Text style={styles.modalDone} numberOfLines={1} ellipsizeMode="tail">Done</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.monthYearPickerContainer}>
            {/* Year Picker */}
            <View style={styles.pickerColumn}>
              <Text style={styles.pickerColumnLabel}>Year</Text>
              <FlatList
                ref={yearListRef}
                key={`year-${showMonthYearPicker}`}
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
                removeClippedSubviews={false}
                getItemLayout={(data, index) => ({
                  length: 50,
                  offset: 50 * index,
                  index,
                })}
                onScrollToIndexFailed={(info) => {
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
              <Text style={styles.pickerColumnLabel}>Month</Text>
              <FlatList
                ref={monthListRef}
                key={`month-${showMonthYearPicker}-${selectedYear}`}
                data={Array.from({ length: 12 }, (_, i) => i + 1)}
                keyExtractor={(item) => item.toString()}
                renderItem={({ item }) => {
                  const monthName = new Date(selectedYear, item - 1, 1).toLocaleDateString('en-US', { month: 'long' });
                  const isSelected = selectedMonth === item;
                  
                  return (
                    <TouchableOpacity
                      style={[
                        styles.pickerOption,
                        isSelected && styles.pickerOptionSelected,
                      ]}
                      onPress={() => {
                        setSelectedMonth(item);
                      }}
                    >
                      <Text 
                        style={[
                          styles.pickerOptionText,
                          isSelected && styles.pickerOptionTextSelected,
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
                removeClippedSubviews={false}
                getItemLayout={(data, index) => ({
                  length: 50,
                  offset: 50 * index,
                  index,
                })}
                onScrollToIndexFailed={(info) => {
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

      {/* Category Picker Modal */}
      <Modal
        visible={showCategoryPicker}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowCategoryPicker(false)}
      >
        <View style={[styles.modalContainer, { paddingTop: insets.top }]}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowCategoryPicker(false)}>
              <Text style={styles.modalCancel} numberOfLines={1} ellipsizeMode="tail">
                Cancel
              </Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Select Category</Text>
            <View style={{ width: 60 }} />
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
                  setSelectedSubCategory(null);
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
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            contentContainerStyle={{ paddingBottom: insets.bottom }}
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
            <TouchableOpacity onPress={() => setShowSubCategoryPicker(false)}>
              <Text style={styles.modalCancel} numberOfLines={1} ellipsizeMode="tail">
                Cancel
              </Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Select Sub-Category</Text>
            <View style={{ width: 60 }} />
          </View>
          <FlatList
            data={[
              { subCategory: null, displayName: 'All Sub-Categories' },
              ...subCategoriesForSelectedCategory.map((sc: string) => ({ subCategory: sc, displayName: sc }))
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
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            contentContainerStyle={{ paddingBottom: insets.bottom }}
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
            <TouchableOpacity onPress={() => setShowAccountPicker(false)}>
              <Text style={styles.modalCancel} numberOfLines={1} ellipsizeMode="tail">
                Cancel
              </Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Select Account</Text>
            <View style={{ width: 60 }} />
          </View>
          <FlatList
            data={[
              { accountId: null, displayName: 'All Accounts' }, 
              ...accounts.filter(acc => acc.isActive).map(acc => ({ accountId: acc.id, displayName: acc.name }))
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
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            contentContainerStyle={{ paddingBottom: insets.bottom }}
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
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyStateText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  emptyStateSubtext: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
  },
  filtersContainer: {
    padding: spacing.base,
    backgroundColor: colors.background.elevated,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  dateSelectionRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.sm,
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
  dateSelectionLabel: {
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
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.base,
    backgroundColor: colors.background.primary,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
  },
  filterLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    width: 100,
  },
  filterValue: {
    flex: 1,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.primary,
    flexShrink: 1,
  },
  chevron: {
    fontSize: typography.fontSize.lg,
    color: colors.neutral[400],
  },
  clearFiltersButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.base,
    backgroundColor: colors.primary[50],
    borderRadius: borderRadius.md,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  clearFiltersText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.primary[500],
  },
  summaryCard: {
    margin: spacing.base,
    padding: spacing.lg,
    backgroundColor: colors.background.elevated,
    borderRadius: borderRadius.xl,
    ...shadows.md,
  },
  summaryTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  summaryItem: {
    flex: 1,
    minWidth: '45%',
  },
  summaryItemLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  summaryItemValue: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
  },
  incomeExpenseRow: {
    flexDirection: 'row',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
    gap: spacing.md,
  },
  incomeExpenseItem: {
    flex: 1,
  },
  incomeExpenseRowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  incomeExpenseLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
  },
  incomeExpenseValue: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold,
  },
  reportsContainer: {
    padding: spacing.base,
  },
  sectionTitle: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
    marginLeft: spacing.sm,
  },
  categoryCard: {
    backgroundColor: colors.background.elevated,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
  },
  categoryIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  categoryIconText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold,
  },
  categoryInfo: {
    flex: 1,
  },
  categoryName: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.text.primary,
    flexShrink: 1,
  },
  categoryMeta: {
    fontSize: typography.fontSize.xs,
    color: colors.text.secondary,
    marginTop: 1,
  },
  categoryBalance: {
    alignItems: 'flex-end',
    marginRight: spacing.xs,
    minWidth: 70,
  },
  categoryBalanceLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.text.tertiary,
    flexShrink: 0,
    width: '100%',
    textAlign: 'right',
  },
  categoryBalanceValue: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.text.primary,
  },
  expandIcon: {
    fontSize: typography.fontSize.sm,
    color: colors.neutral[400],
    marginLeft: spacing.xs,
  },
  subCategoriesContainer: {
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.sm,
  },
  subCategoryCard: {
    backgroundColor: colors.background.primary,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginTop: spacing.xs,
    borderLeftWidth: 2,
    borderLeftColor: colors.primary[300],
  },
  subCategoryHeader: {
    marginBottom: spacing.xs,
  },
  subCategoryName: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
    flexShrink: 1,
  },
  subCategoryStats: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  statItem: {
    flex: 1,
  },
  statLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.text.secondary,
    marginBottom: 1,
  },
  statValue: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.text.primary,
  },
  transactionSummary: {
    marginTop: spacing.xs,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs / 2,
    minHeight: 20,
  },
  summaryLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.text.secondary,
    flex: 1,
    marginRight: spacing.sm,
  },
  summaryValue: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.primary,
    flexShrink: 0,
    textAlign: 'right',
    minWidth: 80,
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
    fontSize: typography.fontSize.sm,
    color: colors.primary[500],
    flexShrink: 0,
    minWidth: 60,
  },
  modalTitle: {
    fontSize: typography.fontSize.base,
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
    fontSize: typography.fontSize.sm,
    color: colors.text.primary,
    flex: 1,
    flexShrink: 1,
    marginRight: spacing.sm,
  },
  categoryOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.base,
  },
  categoryOptionText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.primary,
    flex: 1,
    flexShrink: 1,
    marginRight: spacing.sm,
  },
  checkmark: {
    fontSize: typography.fontSize.sm,
    color: colors.primary[500],
    fontWeight: typography.fontWeight.bold,
  },
  separator: {
    height: 1,
    backgroundColor: colors.border.light,
  },
  viewModeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    margin: spacing.base,
    backgroundColor: colors.background.elevated,
    borderRadius: borderRadius.md,
    padding: spacing.xs,
    gap: spacing.xs,
  },
  viewModeButton: {
    flex: 1,
    minWidth: '45%',
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: borderRadius.sm,
  },
  viewModeButtonActive: {
    backgroundColor: colors.primary[500],
  },
  viewModeText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.secondary,
  },
  viewModeTextActive: {
    color: colors.neutral[0],
    fontWeight: typography.fontWeight.semiBold,
  },
  dateModeSelector: {
    flexDirection: 'row',
    marginBottom: spacing.sm,
    backgroundColor: colors.background.primary,
    borderRadius: borderRadius.md,
    padding: spacing.xs,
  },
  dateModeButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: borderRadius.sm,
  },
  dateModeButtonActive: {
    backgroundColor: colors.primary[500],
  },
  dateModeText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.secondary,
  },
  dateModeTextActive: {
    color: colors.neutral[0],
    fontWeight: typography.fontWeight.semiBold,
  },
  expenseIncomeContainer: {
    padding: spacing.base,
    gap: spacing.base,
  },
  expenseIncomeCard: {
    backgroundColor: colors.background.elevated,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    ...shadows.sm,
  },
  expenseIncomeTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
  },
  expenseIncomeAmount: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    marginBottom: spacing.md,
  },
  expenseIncomeBreakdown: {
    gap: spacing.sm,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  breakdownCategoryContainer: {
    flex: 1,
  },
  breakdownCategory: {
    fontSize: typography.fontSize.xs,
    color: colors.text.tertiary,
    fontWeight: typography.fontWeight.medium,
    marginBottom: 2,
    flexShrink: 1,
  },
  breakdownSubCategory: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    fontWeight: typography.fontWeight.regular,
    flexShrink: 1,
  },
  breakdownAmount: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.text.primary,
    marginLeft: spacing.sm,
  },
  emptyBreakdown: {
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  emptyBreakdownText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.tertiary,
    fontStyle: 'italic',
  },
  transactionsContainer: {
    padding: spacing.base,
  },
  transactionsList: {
    gap: spacing.sm,
  },
  transactionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.background.elevated,
    borderRadius: borderRadius.md,
    padding: spacing.base,
    ...shadows.sm,
  },
  transactionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
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
    fontSize: typography.fontSize.base,
    color: colors.neutral[0],
  },
  transactionInfo: {
    flex: 1,
  },
  transactionAccount: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.text.primary,
    marginBottom: 2,
    flexShrink: 1,
  },
  transactionCategory: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    marginBottom: 2,
    flexShrink: 1,
  },
  transactionDate: {
    fontSize: typography.fontSize.xs,
    color: colors.text.tertiary,
  },
  transactionRight: {
    alignItems: 'flex-end',
  },
  transactionAmount: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.bold,
    marginBottom: 2,
  },
  transactionNote: {
    fontSize: typography.fontSize.xs,
    color: colors.text.tertiary,
    maxWidth: 150,
  },
  emptyTransactions: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  emptyTransactionsText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
  },
  monthToMonthContainer: {
    marginTop: spacing.lg,
  },
  dateRangeText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  monthToMonthList: {
    gap: spacing.md,
  },
  monthToMonthItem: {
    backgroundColor: colors.background.elevated,
    borderRadius: borderRadius.lg,
    padding: spacing.base,
    ...shadows.sm,
  },
  monthToMonthHeader: {
    marginBottom: spacing.sm,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  monthToMonthName: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.text.primary,
  },
  monthToMonthDetails: {
    gap: spacing.xs,
  },
  monthToMonthRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  monthToMonthNetRow: {
    marginTop: spacing.xs,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },
  monthToMonthLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
  },
  monthToMonthValue: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
  },
  monthToMonthNet: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semiBold,
  },
  modalDone: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.primary[500],
    flexShrink: 0,
    minWidth: 60,
  },
  monthYearPickerContainer: {
    flexDirection: 'row',
    flex: 1,
    paddingHorizontal: spacing.sm,
  },
  pickerColumn: {
    flex: 1,
    marginHorizontal: spacing.xs,
    minWidth: 140,
  },
  pickerColumnLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.text.secondary,
    textAlign: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  pickerOption: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
    width: '100%',
  },
  pickerOptionSelected: {
    backgroundColor: colors.primary[50],
  },
  pickerOptionDisabled: {
    opacity: 0.3,
  },
  pickerOptionText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.primary,
    textAlign: 'center',
    width: '100%',
    flexShrink: 0,
    paddingHorizontal: spacing.xs,
  },
  pickerOptionTextSelected: {
    color: colors.primary[500],
    fontWeight: typography.fontWeight.semiBold,
  },
  pickerOptionTextDisabled: {
    color: colors.text.secondary,
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
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.neutral[0],
  },
  accountTypeSection: {
    marginBottom: spacing.md,
  },
  accountTypeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  accountTypeIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.xs,
  },
  accountTypeIconText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold,
  },
  accountTypeTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
  },
});

export default ReportsScreen;
