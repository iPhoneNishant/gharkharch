/**
 * Core data types for Gharkharch - Double-Entry Accounting App
 * 
 * ACCOUNTING RULES:
 * - Every transaction has exactly ONE debit account and ONE credit account
 * - Income and Expense accounts NEVER store balances
 * - Asset and Liability accounts ALWAYS store balances
 */

export type AccountType = 'asset' | 'liability' | 'income' | 'expense';

/**
 * Account represents a ledger account in the chart of accounts.
 * 
 * Balance behavior by account type:
 * - asset: currentBalance increases with debits, decreases with credits
 * - liability: currentBalance increases with credits, decreases with debits
 * - income: NO balance stored (flows through to equity)
 * - expense: NO balance stored (flows through to equity)
 */
export interface Account {
  id: string;
  name: string;
  accountType: AccountType;
  parentCategory: string;
  subCategory: string;
  /** Opening balance - only applicable for asset/liability accounts */
  openingBalance?: number;
  /** Current balance - only applicable for asset/liability accounts */
  currentBalance?: number;
  /** User who owns this account */
  userId: string;
  /** Timestamp when account was created */
  createdAt: Date;
  /** Timestamp when account was last updated */
  updatedAt: Date;
  /** Whether the account is active */
  isActive: boolean;
  /** Optional icon identifier */
  icon?: string;
  /** Optional color for UI */
  color?: string;
}

/**
 * Transaction represents a double-entry accounting transaction.
 * 
 * DOUBLE-ENTRY RULE:
 * - debitAccountId: The account being debited (receiving value)
 * - creditAccountId: The account being credited (giving value)
 * - amount: Always positive, represents the transaction value
 * 
 * Examples:
 * - Salary received: Debit Bank (asset), Credit Salary (income)
 * - Rent paid: Debit Rent (expense), Credit Bank (asset)
 * - Credit card payment: Debit Credit Card (liability), Credit Bank (asset)
 */
export interface Transaction {
  id: string;
  date: Date;
  /** Transaction amount - always positive */
  amount: number;
  /** Account being debited */
  debitAccountId: string;
  /** Account being credited */
  creditAccountId: string;
  /** Optional note/description */
  note?: string;
  /** User who owns this transaction */
  userId: string;
  /** Timestamp when transaction was created */
  createdAt: Date;
  /** Timestamp when transaction was last updated */
  updatedAt: Date;
  /** Optional tags for categorization */
  tags?: string[];
}

/**
 * User profile stored in Firestore
 */
export interface UserProfile {
  id: string;
  email: string;
  displayName?: string;
  createdAt: Date;
  updatedAt: Date;
  /** User's preferred currency code (ISO 4217) */
  currency: string;
  /** Whether onboarding is complete */
  onboardingComplete: boolean;
}

/**
 * Predefined account categories for organizing the chart of accounts
 */
export interface AccountCategory {
  parentCategory: string;
  subCategories: string[];
  accountType: AccountType;
}

/**
 * Request payload for creating a new account via Cloud Function
 */
export interface CreateAccountRequest {
  name: string;
  accountType: AccountType;
  parentCategory: string;
  subCategory: string;
  openingBalance?: number;
  icon?: string;
  color?: string;
}

/**
 * Request payload for creating a new transaction via Cloud Function
 */
export interface CreateTransactionRequest {
  date: string; // ISO date string
  amount: number;
  debitAccountId: string;
  creditAccountId: string;
  note?: string;
  tags?: string[];
}

/**
 * Request payload for updating an account via Cloud Function
 */
export interface UpdateAccountRequest {
  accountId: string;
  name?: string;
  icon?: string;
  color?: string;
  isActive?: boolean;
}

/**
 * Request payload for updating a transaction via Cloud Function
 */
export interface UpdateTransactionRequest {
  transactionId: string;
  date?: string;
  amount?: number;
  debitAccountId?: string;
  creditAccountId?: string;
  note?: string;
  tags?: string[];
}

/**
 * Response from Cloud Functions
 */
export interface CloudFunctionResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Navigation param types
 */
export type RootStackParamList = {
  Auth: undefined;
  PinSetup: { onComplete?: () => void; allowBack?: boolean } | undefined;
  PinVerification: undefined;
  Main: undefined;
  AddTransaction: { editTransactionId?: string } | undefined;
  AddAccount: { editAccountId?: string } | undefined;
  AccountDetail: { accountId: string; fromDate?: Date; toDate?: Date };
  TransactionDetail: { transactionId: string };
  SummaryMonthReport: undefined;
  SummaryCustomReport: undefined;
  TransactionsMonthReport: undefined;
  TransactionsCustomReport: undefined;
};

export type MainTabParamList = {
  Dashboard: undefined;
  Transactions: undefined;
  Accounts: undefined;
  Reports: undefined;
  Settings: undefined;
};

/**
 * Auth state
 */
export interface AuthState {
  user: UserProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

/**
 * Report data for a specific period/category
 */
export interface ReportData {
  /** Month and year (YYYY-MM format) */
  period: string;
  /** Parent category name */
  category: string;
  /** Sub-category name */
  subCategory: string;
  /** Account type */
  accountType: AccountType;
  /** Opening balance at start of period */
  openingBalance: number;
  /** Closing balance at end of period */
  closingBalance: number;
  /** Total transactions in period */
  transactionCount: number;
  /** Total debit amount */
  totalDebits: number;
  /** Total credit amount */
  totalCredits: number;
  /** Net change (debits - credits) */
  netChange: number;
  /** List of transactions in this period */
  transactions: Transaction[];
}

/**
 * Monthly report summary
 */
export interface MonthlyReport {
  /** Month and year (YYYY-MM format) */
  month: string;
  /** Display name (e.g., "January 2024") */
  displayName: string;
  /** Reports grouped by category */
  categoryReports: CategoryReport[];
  /** Total opening balance across all accounts */
  totalOpeningBalance: number;
  /** Total closing balance across all accounts */
  totalClosingBalance: number;
  /** Total transactions in month */
  totalTransactions: number;
}

/**
 * Category report summary
 */
export interface CategoryReport {
  /** Parent category name */
  category: string;
  /** Account type */
  accountType: AccountType;
  /** Sub-category reports */
  subCategoryReports: SubCategoryReport[];
  /** Total opening balance for category */
  totalOpeningBalance: number;
  /** Total closing balance for category */
  totalClosingBalance: number;
  /** Total transactions in category */
  totalTransactions: number;
}

/**
 * Sub-category report summary
 */
export interface SubCategoryReport {
  /** Sub-category name */
  subCategory: string;
  /** Account IDs in this sub-category */
  accountIds: string[];
  /** Opening balance */
  openingBalance: number;
  /** Closing balance */
  closingBalance: number;
  /** Transaction count */
  transactionCount: number;
  /** Total debits */
  totalDebits: number;
  /** Total credits */
  totalCredits: number;
  /** Net change */
  netChange: number;
  /** Transactions */
  transactions: Transaction[];
}
