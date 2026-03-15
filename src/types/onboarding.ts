/**
 * Types for onboarding account setup flow
 */

export interface OnboardingAsset {
  id: string;
  name: string;
  openingBalance: number;
  type: 'BANK' | 'CASH' | 'FD';
  isSelected: boolean;
  parentCategory?: string;
  subCategory?: string;
}

export interface OnboardingLiability {
  id: string;
  name: string;
  amount: number; // Outstanding amount
  isSelected: boolean;
  parentCategory?: string;
  subCategory?: string;
}

export interface OnboardingExpense {
  id: string;
  name: string;
  type: 'EXPENSE';
  isSelected: boolean;
  parentCategory?: string;
  subCategory?: string;
}

export interface OnboardingIncome {
  id: string;
  name: string;
  type: 'INCOME';
  isSelected: boolean;
  parentCategory?: string;
  subCategory?: string;
}

export interface OnboardingState {
  assets: OnboardingAsset[];
  liabilities: OnboardingLiability[];
  expenses: OnboardingExpense[];
  income: OnboardingIncome[];
  
  // Actions
  setAssets: (assets: OnboardingAsset[]) => void;
  setLiabilities: (liabilities: OnboardingLiability[]) => void;
  setExpenses: (expenses: OnboardingExpense[]) => void;
  setIncome: (income: OnboardingIncome[]) => void;
  
  // Asset actions
  toggleAsset: (id: string) => void;
  updateAsset: (id: string, updates: Partial<OnboardingAsset>) => void;
  duplicateAsset: (id: string) => void;
  addAsset: (asset: Omit<OnboardingAsset, 'id'>) => void;
  
  // Liability actions
  toggleLiability: (id: string) => void;
  updateLiability: (id: string, updates: Partial<OnboardingLiability>) => void;
  duplicateLiability: (id: string) => void;
  addLiability: (liability: Omit<OnboardingLiability, 'id'>) => void;
  
  // Expense actions
  toggleExpense: (id: string) => void;
  updateExpense: (id: string, updates: Partial<OnboardingExpense>) => void;
  duplicateExpense: (id: string) => void;
  addExpense: (expense: Omit<OnboardingExpense, 'id'>) => void;
  
  // Income actions
  toggleIncome: (id: string) => void;
  updateIncome: (id: string, updates: Partial<OnboardingIncome>) => void;
  duplicateIncome: (id: string) => void;
  addIncome: (income: Omit<OnboardingIncome, 'id'>) => void;
  
  // Reset
  reset: () => void;
}
