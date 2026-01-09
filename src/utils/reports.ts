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
 * Get opening balance for an account at the start of a month
 * Only applies to asset and liability accounts
 */
export function getOpeningBalance(
  account: Account,
  transactions: Transaction[],
  monthStart: Date
): number {
  // Only asset and liability accounts have balances
  if (account.accountType !== 'asset' && account.accountType !== 'liability') {
    return 0;
  }

  const openingBalance = account.openingBalance ?? 0;
  
  // Find all transactions before the month start
  const transactionsBeforeMonth = transactions.filter(txn => {
    const txnDate = new Date(txn.date);
    return txnDate < monthStart && 
           (txn.debitAccountId === account.id || txn.creditAccountId === account.id);
  });

  // Calculate balance changes from those transactions
  let balanceChange = 0;
  transactionsBeforeMonth.forEach(txn => {
    const isDebit = txn.debitAccountId === account.id;
    balanceChange += calculateBalanceChange(account.accountType, txn.amount, isDebit);
  });

  return openingBalance + balanceChange;
}

/**
 * Get closing balance for an account at the end of a month
 * Only applies to asset and liability accounts
 */
export function getClosingBalance(
  account: Account,
  transactions: Transaction[],
  monthEnd: Date
): number {
  // Only asset and liability accounts have balances
  if (account.accountType !== 'asset' && account.accountType !== 'liability') {
    return 0;
  }

  const openingBalance = account.openingBalance ?? 0;
  
  // Find all transactions up to month end
  const transactionsUpToMonth = transactions.filter(txn => {
    const txnDate = new Date(txn.date);
    return txnDate <= monthEnd && 
           (txn.debitAccountId === account.id || txn.creditAccountId === account.id);
  });

  // Calculate balance changes
  let balanceChange = 0;
  transactionsUpToMonth.forEach(txn => {
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
