/**
 * Application constants for Gharkharch
 */

import { AccountCategory, AccountType } from '../types';

/**
 * Default currency for new users
 */
export const DEFAULT_CURRENCY = 'INR';

/**
 * Predefined account categories following standard accounting practices
 * 
 * ACCOUNTING RULES:
 * - Assets: Things you own (increase with debit)
 * - Liabilities: Things you owe (increase with credit)
 * - Income: Money earned (increase with credit)
 * - Expenses: Money spent (increase with debit)
 */
export const ACCOUNT_CATEGORIES: AccountCategory[] = [
  // Asset Categories
  {
    parentCategory: 'Cash & Bank',
    subCategories: ['Cash in Hand', 'Savings Account', 'Current Account', 'Fixed Deposit', 'Wallet'],
    accountType: 'asset',
  },
  {
    parentCategory: 'Investments',
    subCategories: ['Stocks', 'Mutual Funds', 'PPF', 'NPS', 'Gold', 'Real Estate', 'Crypto', 'Other Investments'],
    accountType: 'asset',
  },
  {
    parentCategory: 'Receivables',
    subCategories: ['Money Lent', 'Deposits', 'Advances', 'Tax Refunds'],
    accountType: 'asset',
  },
  
  // Liability Categories
  {
    parentCategory: 'Credit Cards',
    subCategories: ['Credit Card'],
    accountType: 'liability',
  },
  {
    parentCategory: 'Loans',
    subCategories: ['Home Loan', 'Car Loan', 'Personal Loan', 'Education Loan', 'Other Loans'],
    accountType: 'liability',
  },
  {
    parentCategory: 'Payables',
    subCategories: ['Money Borrowed', 'Bills Payable', 'EMI Due'],
    accountType: 'liability',
  },
  
  // Income Categories
  {
    parentCategory: 'Earned Income',
    subCategories: ['Salary', 'Bonus', 'Freelance', 'Business Income', 'Commission'],
    accountType: 'income',
  },
  {
    parentCategory: 'Investment Income',
    subCategories: ['Dividends', 'Interest', 'Capital Gains', 'Rental Income'],
    accountType: 'income',
  },
  {
    parentCategory: 'Other Income',
    subCategories: ['Gifts Received', 'Cashback', 'Refunds', 'Other Income'],
    accountType: 'income',
  },
  
  // Expense Categories
  {
    parentCategory: 'Housing',
    subCategories: ['Rent', 'Maintenance', 'Property Tax', 'Home Insurance', 'Repairs'],
    accountType: 'expense',
  },
  {
    parentCategory: 'Utilities',
    subCategories: ['Electricity', 'Water', 'Gas', 'Internet', 'Mobile', 'DTH/Cable'],
    accountType: 'expense',
  },
  {
    parentCategory: 'Transportation',
    subCategories: ['Fuel', 'Public Transport', 'Cab/Auto', 'Vehicle Maintenance', 'Parking', 'Vehicle Insurance'],
    accountType: 'expense',
  },
  {
    parentCategory: 'Food & Dining',
    subCategories: ['Groceries', 'Restaurants', 'Food Delivery', 'Snacks & Beverages'],
    accountType: 'expense',
  },
  {
    parentCategory: 'Shopping',
    subCategories: ['Clothing', 'Electronics', 'Home & Kitchen', 'Personal Care', 'Gifts'],
    accountType: 'expense',
  },
  {
    parentCategory: 'Healthcare',
    subCategories: ['Doctor', 'Medicine', 'Lab Tests', 'Health Insurance', 'Gym & Fitness'],
    accountType: 'expense',
  },
  {
    parentCategory: 'Entertainment',
    subCategories: ['Movies', 'Subscriptions', 'Games', 'Hobbies', 'Travel & Vacation'],
    accountType: 'expense',
  },
  {
    parentCategory: 'Education',
    subCategories: ['Tuition', 'Books', 'Courses', 'Stationery'],
    accountType: 'expense',
  },
  {
    parentCategory: 'Financial',
    subCategories: ['Bank Charges', 'Interest Paid', 'Insurance Premium', 'Taxes'],
    accountType: 'expense',
  },
  {
    parentCategory: 'Miscellaneous',
    subCategories: ['Charity', 'Gifts Given', 'Other Expenses'],
    accountType: 'expense',
  },
];

/**
 * Get categories by account type
 */
export const getCategoriesByType = (accountType: AccountType): AccountCategory[] => {
  return ACCOUNT_CATEGORIES.filter(cat => cat.accountType === accountType);
};

/**
 * Get all parent categories for an account type
 */
export const getParentCategories = (accountType: AccountType): string[] => {
  return getCategoriesByType(accountType).map(cat => cat.parentCategory);
};

/**
 * Get sub-categories for a parent category
 */
export const getSubCategories = (parentCategory: string): string[] => {
  const category = ACCOUNT_CATEGORIES.find(cat => cat.parentCategory === parentCategory);
  return category?.subCategories ?? [];
};

/**
 * Color palette for accounts
 */
export const ACCOUNT_COLORS = [
  '#2E7D32', // Green
  '#1565C0', // Blue
  '#7B1FA2', // Purple
  '#C62828', // Red
  '#EF6C00', // Orange
  '#00838F', // Teal
  '#4527A0', // Deep Purple
  '#AD1457', // Pink
  '#558B2F', // Light Green
  '#6A1B9A', // Purple
];

/**
 * Icon options for accounts
 */
export const ACCOUNT_ICONS = [
  'wallet',
  'bank',
  'credit-card',
  'cash',
  'piggy-bank',
  'chart-line',
  'home',
  'car',
  'briefcase',
  'shopping-bag',
  'utensils',
  'plane',
  'heart',
  'graduation-cap',
  'gift',
];

/**
 * Date format for display
 */
export const DATE_FORMAT = 'DD MMM YYYY';
export const DATE_TIME_FORMAT = 'DD MMM YYYY, hh:mm A';

/**
 * Currency formatting options
 */
export const CURRENCY_CONFIG: Record<string, { symbol: string; locale: string }> = {
  INR: { symbol: '₹', locale: 'en-IN' },
  USD: { symbol: '$', locale: 'en-US' },
  EUR: { symbol: '€', locale: 'de-DE' },
  GBP: { symbol: '£', locale: 'en-GB' },
};

/**
 * Format currency amount
 */
export const formatCurrency = (amount: number, currency: string = DEFAULT_CURRENCY, showPlusSign: boolean = false): string => {
  const config = CURRENCY_CONFIG[currency] ?? CURRENCY_CONFIG.INR;
  const formatted = new Intl.NumberFormat(config.locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(amount));
  
  // Add + sign for positive amounts if requested, - sign is already included for negative
  if (showPlusSign && amount > 0) {
    return `+${formatted}`;
  }
  
  // For negative amounts, ensure minus sign is shown
  if (amount < 0) {
    return `-${formatted}`;
  }
  
  return formatted;
};

/**
 * Firestore collection names
 */
export const COLLECTIONS = {
  USERS: 'users',
  ACCOUNTS: 'accounts',
  TRANSACTIONS: 'transactions',
} as const;
