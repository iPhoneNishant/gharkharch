/**
 * Report calculation utilities
 * Generates reports based on transactions and accounts
 */

import { Transaction, Account, AccountType, MonthlyReport, CategoryReport, SubCategoryReport } from '../types';

/**
 * Calculate balance change for an account based on transaction
 */
function calculateBalanceChange(
  accountType: AccountType,
  amount: number,
  isDebit: boolean
): number {
  if (accountType === 'asset') {
    return isDebit ? amount : -amount;
  } else if (accountType === 'liability') {
    return isDebit ? -amount : amount;
  }
  // Income and expense accounts don't have balances
  return 0;
}

/**
 * Get opening balance for an account at the start of a specific date
 * Opening balance = balance at the end of the previous day (before first transaction of the day)
 * Only applies to asset and liability accounts
 */
export function getOpeningBalance(
  account: Account,
  transactions: Transaction[],
  date: Date
): number {
  // Only asset and liability accounts have balances
  if (account.accountType !== 'asset' && account.accountType !== 'liability') {
    return 0;
  }

  const openingBalance = account.openingBalance ?? 0;
  
  // Calculate the start of the given date (00:00:00.000)
  // Opening balance = balance before first transaction of this day
  // So we include all transactions up to the end of the previous day
  const startOfDate = new Date(date);
  startOfDate.setHours(0, 0, 0, 0);
  
  // Find all transactions before the start of the given date
  // This gives us the balance at the end of the previous day
  const transactionsBeforeDate = transactions.filter(txn => {
    const txnDate = new Date(txn.date);
    // Compare dates by setting time to midnight for accurate day comparison
    const txnDateOnly = new Date(txnDate.getFullYear(), txnDate.getMonth(), txnDate.getDate());
    const startDateOnly = new Date(startOfDate.getFullYear(), startOfDate.getMonth(), startOfDate.getDate());
    return txnDateOnly < startDateOnly && 
           (txn.debitAccountId === account.id || txn.creditAccountId === account.id);
  });

  // Calculate balance changes from those transactions
  let balanceChange = 0;
  transactionsBeforeDate.forEach(txn => {
    const isDebit = txn.debitAccountId === account.id;
    balanceChange += calculateBalanceChange(account.accountType, txn.amount, isDebit);
  });

  return openingBalance + balanceChange;
}

/**
 * Get closing balance for an account at the end of a specific date
 * Closing balance = balance at the end of the given day (after last transaction of the day)
 * Only applies to asset and liability accounts
 */
export function getClosingBalance(
  account: Account,
  transactions: Transaction[],
  date: Date
): number {
  // Only asset and liability accounts have balances
  if (account.accountType !== 'asset' && account.accountType !== 'liability') {
    return 0;
  }

  const openingBalance = account.openingBalance ?? 0;
  
  // Calculate the end of the given day (23:59:59.999)
  // Closing balance = balance after last transaction of this day
  // So we include all transactions up to and including the end of the given day
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);
  
  // Find all transactions up to the end of the given day
  // This gives us the balance at the end of the given day
  const transactionsUpToDate = transactions.filter(txn => {
    const txnDate = new Date(txn.date);
    // Compare dates by setting time to end of day for accurate day comparison
    const txnDateOnly = new Date(txnDate.getFullYear(), txnDate.getMonth(), txnDate.getDate());
    const endDateOnly = new Date(endOfDay.getFullYear(), endOfDay.getMonth(), endOfDay.getDate());
    return txnDateOnly <= endDateOnly && 
           (txn.debitAccountId === account.id || txn.creditAccountId === account.id);
  });

  // Calculate balance changes
  let balanceChange = 0;
  transactionsUpToDate.forEach(txn => {
    const isDebit = txn.debitAccountId === account.id;
    balanceChange += calculateBalanceChange(account.accountType, txn.amount, isDebit);
  });

  return openingBalance + balanceChange;
}

/**
 * Get transactions for a specific month
 */
export function getTransactionsForMonth(
  transactions: Transaction[],
  year: number,
  month: number
): Transaction[] {
  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 0, 23, 59, 59, 999);

  return transactions.filter(txn => {
    const txnDate = new Date(txn.date);
    return txnDate >= monthStart && txnDate <= monthEnd;
  });
}

/**
 * Get transactions for a date range
 */
export function getTransactionsForDateRange(
  transactions: Transaction[],
  startDate: Date,
  endDate: Date
): Transaction[] {
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);

  return transactions.filter(txn => {
    const txnDate = new Date(txn.date);
    return txnDate >= start && txnDate <= end;
  });
}

/**
 * Calculate expense and income totals by category/sub-category
 */
export function calculateExpenseIncomeTotals(
  accounts: Account[],
  transactions: Transaction[],
  startDate: Date,
  endDate: Date
): {
  expenses: Map<string, { category: string; subCategory: string; total: number; transactions: Transaction[] }>;
  income: Map<string, { category: string; subCategory: string; total: number; transactions: Transaction[] }>;
} {
  const expenses = new Map<string, { category: string; subCategory: string; total: number; transactions: Transaction[] }>();
  const income = new Map<string, { category: string; subCategory: string; total: number; transactions: Transaction[] }>();

  const dateRangeTransactions = getTransactionsForDateRange(transactions, startDate, endDate);

  dateRangeTransactions.forEach(txn => {
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
}

/**
 * Generate report for a date range
 */
export function generateDateRangeReport(
  accounts: Account[],
  transactions: Transaction[],
  startDate: Date,
  endDate: Date
): MonthlyReport {
  const rangeTransactions = getTransactionsForDateRange(transactions, startDate, endDate);
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);

  // Group accounts by account type first, then by category
  const accountTypeMap = new Map<AccountType, Map<string, Account[]>>();
  accounts.forEach(account => {
    if (!accountTypeMap.has(account.accountType)) {
      accountTypeMap.set(account.accountType, new Map());
    }
    const categoryMap = accountTypeMap.get(account.accountType)!;
    const key = account.parentCategory;
    if (!categoryMap.has(key)) {
      categoryMap.set(key, []);
    }
    categoryMap.get(key)!.push(account);
  });

  // Generate category reports grouped by account type
  const categoryReports: CategoryReport[] = [];
  let totalOpeningBalance = 0;
  let totalClosingBalance = 0;

  // Process each account type (asset, liability, income, expense)
  const accountTypeOrder: AccountType[] = ['asset', 'liability', 'income', 'expense'];
  accountTypeOrder.forEach(accountType => {
    const categoryMap = accountTypeMap.get(accountType);
    if (!categoryMap || categoryMap.size === 0) return;

    categoryMap.forEach((categoryAccounts, categoryName) => {
      // Group by sub-category
      const subCategoryMap = new Map<string, Account[]>();
      categoryAccounts.forEach(account => {
        const key = account.subCategory;
        if (!subCategoryMap.has(key)) {
          subCategoryMap.set(key, []);
        }
        subCategoryMap.get(key)!.push(account);
      });

      const subCategoryReports: SubCategoryReport[] = [];
      let categoryOpeningBalance = 0;
      let categoryClosingBalance = 0;
      let categoryTransactionCount = 0;

      subCategoryMap.forEach((subCategoryAccounts, subCategoryName) => {
        const accountIds = subCategoryAccounts.map(acc => acc.id);

        // Get transactions involving these accounts
        const subCategoryTransactions = rangeTransactions.filter(txn =>
          accountIds.includes(txn.debitAccountId) || accountIds.includes(txn.creditAccountId)
        );

        // Calculate balances (only for asset/liability accounts)
        let subCategoryOpeningBalance = 0;
        let subCategoryClosingBalance = 0;
        let totalDebits = 0;
        let totalCredits = 0;

        subCategoryAccounts.forEach(account => {
          // Only calculate balances for asset/liability accounts
          if (account.accountType === 'asset' || account.accountType === 'liability') {
            const opening = getOpeningBalance(account, transactions, start);
            const closing = getClosingBalance(account, transactions, end);
            subCategoryOpeningBalance += opening;
            subCategoryClosingBalance += closing;
          }
        });

        // Calculate debits and credits
        subCategoryTransactions.forEach(txn => {
          if (accountIds.includes(txn.debitAccountId)) {
            totalDebits += txn.amount;
          }
          if (accountIds.includes(txn.creditAccountId)) {
            totalCredits += txn.amount;
          }
        });

        // For income/expense accounts, net change is debits - credits
        // For asset/liability accounts, net change is closing - opening
        const netChange = (subCategoryOpeningBalance !== 0 || subCategoryClosingBalance !== 0)
          ? subCategoryClosingBalance - subCategoryOpeningBalance
          : totalDebits - totalCredits;

        subCategoryReports.push({
          subCategory: subCategoryName,
          accountIds,
          openingBalance: subCategoryOpeningBalance,
          closingBalance: subCategoryClosingBalance,
          transactionCount: subCategoryTransactions.length,
          totalDebits,
          totalCredits,
          netChange,
          transactions: subCategoryTransactions,
        });

        categoryOpeningBalance += subCategoryOpeningBalance;
        categoryClosingBalance += subCategoryClosingBalance;
        categoryTransactionCount += subCategoryTransactions.length;
      });

      categoryReports.push({
        category: categoryName,
        accountType: accountType,
        subCategoryReports,
        totalOpeningBalance: categoryOpeningBalance,
        totalClosingBalance: categoryClosingBalance,
        totalTransactions: categoryTransactionCount,
      });

      totalOpeningBalance += categoryOpeningBalance;
      totalClosingBalance += categoryClosingBalance;
    });
  });

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  return {
    month: `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}`,
    displayName: `${formatDate(start)} - ${formatDate(end)}`,
    categoryReports,
    totalOpeningBalance,
    totalClosingBalance,
    totalTransactions: rangeTransactions.length,
  };
}

/**
 * Generate monthly report
 */
export function generateMonthlyReport(
  accounts: Account[],
  transactions: Transaction[],
  year: number,
  month: number
): MonthlyReport {
  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 0, 23, 59, 59, 999);
  return generateDateRangeReport(accounts, transactions, monthStart, monthEnd);
}

/**
 * Get available months from transactions
 */
export function getAvailableMonths(transactions: Transaction[]): { year: number; month: number; displayName: string }[] {
  const monthSet = new Set<string>();
  
  transactions.forEach(txn => {
    const date = new Date(txn.date);
    const key = `${date.getFullYear()}-${date.getMonth() + 1}`;
    monthSet.add(key);
  });

  const months = Array.from(monthSet)
    .map(key => {
      const [year, month] = key.split('-').map(Number);
      return { year, month, key };
    })
    .sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year;
      return b.month - a.month;
    });

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  return months.map(({ year, month }) => ({
    year,
    month,
    displayName: `${monthNames[month - 1]} ${year}`,
  }));
}

/**
 * Month-to-month breakdown interface
 */
export interface MonthToMonthBreakdown {
  year: number;
  month: number;
  displayName: string;
  income: number;
  expense: number;
  net: number; // income - expense
}

/**
 * Generate month-to-month breakdown for expenses and income
 * Returns an array of monthly totals from startDate to endDate
 * 
 * @param accounts - All accounts
 * @param transactions - All transactions
 * @param startDate - Start date for the report
 * @param endDate - End date for the report
 * @param filterCategory - Optional category filter
 * @param filterSubCategory - Optional sub-category filter
 * @param filterAccountId - Optional account ID filter
 */
export function generateMonthToMonthBreakdown(
  accounts: Account[],
  transactions: Transaction[],
  startDate: Date,
  endDate: Date,
  filterCategory?: string | null,
  filterSubCategory?: string | null,
  filterAccountId?: string | null
): MonthToMonthBreakdown[] {
  const breakdown: MonthToMonthBreakdown[] = [];
  
  // Create a date iterator starting from the first day of startDate's month
  const start = new Date(startDate);
  start.setDate(1);
  start.setHours(0, 0, 0, 0);
  
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);
  
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  
  // Iterate through each month from start to end
  // Ensure we process at least one month even if start and end are in the same month
  const current = new Date(start);
  const endMonthStart = new Date(end.getFullYear(), end.getMonth(), 1);
  endMonthStart.setHours(0, 0, 0, 0);
  
  // Process at least one month
  let currentMonthStart: Date;
  do {
    const year = current.getFullYear();
    const month = current.getMonth() + 1;
    
    // Calculate month start and end
    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 0, 23, 59, 59, 999);
    
    // Get transactions for this month
    let monthTransactions = getTransactionsForDateRange(transactions, monthStart, monthEnd);
    
    // Apply filters
    if (filterCategory || filterSubCategory || filterAccountId) {
      monthTransactions = monthTransactions.filter(txn => {
        const debitAccount = accounts.find(acc => acc.id === txn.debitAccountId);
        const creditAccount = accounts.find(acc => acc.id === txn.creditAccountId);
        
        // Filter by account ID
        if (filterAccountId) {
          if (txn.debitAccountId !== filterAccountId && txn.creditAccountId !== filterAccountId) {
            return false;
          }
        }
        
        // Filter by category
        if (filterCategory) {
          const matchesCategory = 
            debitAccount?.parentCategory === filterCategory ||
            creditAccount?.parentCategory === filterCategory;
          if (!matchesCategory) return false;
        }
        
        // Filter by sub-category
        if (filterSubCategory) {
          const matchesSubCategory = 
            debitAccount?.subCategory === filterSubCategory ||
            creditAccount?.subCategory === filterSubCategory;
          if (!matchesSubCategory) return false;
        }
        
        return true;
      });
    }
    
    // Calculate income and expenses
    let income = 0;
    let expense = 0;
    
    monthTransactions.forEach(txn => {
      const debitAccount = accounts.find(acc => acc.id === txn.debitAccountId);
      const creditAccount = accounts.find(acc => acc.id === txn.creditAccountId);
      
      // Expense: debit account is expense type
      if (debitAccount?.accountType === 'expense') {
        expense += txn.amount;
      }
      
      // Income: credit account is income type
      if (creditAccount?.accountType === 'income') {
        income += txn.amount;
      }
    });
    
    breakdown.push({
      year,
      month,
      displayName: `${monthNames[month - 1]} ${year}`,
      income,
      expense,
      net: income - expense,
    });
    
    // Move to next month for next iteration
    current.setMonth(current.getMonth() + 1);
    current.setDate(1);
    current.setHours(0, 0, 0, 0);
    
    // Check if we've passed the end month
    currentMonthStart = new Date(current.getFullYear(), current.getMonth(), 1);
    currentMonthStart.setHours(0, 0, 0, 0);
    
    // Break if we've processed beyond the end month
    if (currentMonthStart > endMonthStart) {
      break;
    }
  } while (true); // Always process at least one month
  
  return breakdown;
}

/**
 * Day-to-day breakdown data structure
 */
export interface DayToDayBreakdown {
  year: number;
  month: number;
  day: number;
  date: Date;
  displayName: string;
  income: number;
  expense: number;
  net: number;
}

/**
 * Generate day-to-day breakdown for a date range
 * Shows income and expense for each day
 */
export function generateDayToDayBreakdown(
  accounts: Account[],
  transactions: Transaction[],
  startDate: Date,
  endDate: Date,
  filterCategory?: string | null,
  filterSubCategory?: string | null,
  filterAccountId?: string | null
): DayToDayBreakdown[] {
  const breakdown: DayToDayBreakdown[] = [];
  
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);
  
  // Iterate through each day from start to end
  const current = new Date(start);
  
  while (current <= end) {
    const year = current.getFullYear();
    const month = current.getMonth() + 1;
    const day = current.getDate();
    
    // Calculate day start and end
    const dayStart = new Date(year, month - 1, day, 0, 0, 0, 0);
    const dayEnd = new Date(year, month - 1, day, 23, 59, 59, 999);
    
    // Get transactions for this day
    let dayTransactions = getTransactionsForDateRange(transactions, dayStart, dayEnd);
    
    // Apply filters
    if (filterCategory || filterSubCategory || filterAccountId) {
      dayTransactions = dayTransactions.filter(txn => {
        const debitAccount = accounts.find(acc => acc.id === txn.debitAccountId);
        const creditAccount = accounts.find(acc => acc.id === txn.creditAccountId);
        
        // Filter by account ID
        if (filterAccountId) {
          if (txn.debitAccountId !== filterAccountId && txn.creditAccountId !== filterAccountId) {
            return false;
          }
        }
        
        // Filter by category
        if (filterCategory) {
          const matchesCategory = 
            debitAccount?.parentCategory === filterCategory ||
            creditAccount?.parentCategory === filterCategory;
          if (!matchesCategory) return false;
        }
        
        // Filter by sub-category
        if (filterSubCategory) {
          const matchesSubCategory = 
            debitAccount?.subCategory === filterSubCategory ||
            creditAccount?.subCategory === filterSubCategory;
          if (!matchesSubCategory) return false;
        }
        
        return true;
      });
    }
    
    // Calculate income and expenses
    let income = 0;
    let expense = 0;
    
    dayTransactions.forEach(txn => {
      const debitAccount = accounts.find(acc => acc.id === txn.debitAccountId);
      const creditAccount = accounts.find(acc => acc.id === txn.creditAccountId);
      
      // Expense: debit account is expense type
      if (debitAccount?.accountType === 'expense') {
        expense += txn.amount;
      }
      
      // Income: credit account is income type
      if (creditAccount?.accountType === 'income') {
        income += txn.amount;
      }
    });
    
    breakdown.push({
      year,
      month,
      day,
      date: new Date(current),
      displayName: current.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      income,
      expense,
      net: income - expense,
    });
    
    // Move to next day
    current.setDate(current.getDate() + 1);
  }
  
  return breakdown;
}
