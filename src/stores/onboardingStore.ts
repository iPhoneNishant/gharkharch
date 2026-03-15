/**
 * Onboarding Store
 * Manages temporary state during account setup onboarding
 */

import { create } from 'zustand';
import { OnboardingState, OnboardingAsset, OnboardingLiability, OnboardingExpense, OnboardingIncome } from '../types/onboarding';

// Default assets
const defaultAssets: OnboardingAsset[] = [
  { id: '1', name: 'State Bank of India', openingBalance: 0, type: 'BANK', isSelected: false, parentCategory: 'Cash & Bank', subCategory: 'Savings Account' },
  { id: '2', name: 'HDFC Bank', openingBalance: 0, type: 'BANK', isSelected: false, parentCategory: 'Cash & Bank', subCategory: 'Savings Account' },
  { id: '3', name: 'ICICI Bank', openingBalance: 0, type: 'BANK', isSelected: false, parentCategory: 'Cash & Bank', subCategory: 'Savings Account' },
  { id: '4', name: 'Axis Bank', openingBalance: 0, type: 'BANK', isSelected: false, parentCategory: 'Cash & Bank', subCategory: 'Savings Account' },
  { id: '5', name: 'Cash', openingBalance: 0, type: 'CASH', isSelected: false, parentCategory: 'Cash & Bank', subCategory: 'Cash in Hand' },
  { id: '6', name: 'Fixed Deposit', openingBalance: 0, type: 'FD', isSelected: false, parentCategory: 'Cash & Bank', subCategory: 'Fixed Deposit' },
];

// Default liabilities
const defaultLiabilities: OnboardingLiability[] = [
  { id: '1', name: 'Credit Card', amount: 0, isSelected: false, parentCategory: 'Credit Cards', subCategory: 'Credit Card' },
  { id: '2', name: 'Home Loan', amount: 0, isSelected: false, parentCategory: 'Loans', subCategory: 'Home Loan' },
  { id: '3', name: 'Personal Loan', amount: 0, isSelected: false, parentCategory: 'Loans', subCategory: 'Personal Loan' },
  { id: '4', name: 'Car Loan', amount: 0, isSelected: false, parentCategory: 'Loans', subCategory: 'Car Loan' },
  { id: '5', name: 'Borrowed Money', amount: 0, isSelected: false, parentCategory: 'Payables', subCategory: 'Money Borrowed' },
];

// Default expenses
const defaultExpenses: OnboardingExpense[] = [
  { id: '1', name: 'Groceries', type: 'EXPENSE', isSelected: false, parentCategory: 'Food & Dining', subCategory: 'Groceries' },
  { id: '2', name: 'Milk', type: 'EXPENSE', isSelected: false, parentCategory: 'Food & Dining', subCategory: 'Groceries' },
  { id: '3', name: 'Vegetables', type: 'EXPENSE', isSelected: false, parentCategory: 'Food & Dining', subCategory: 'Groceries' },
  { id: '4', name: 'Electricity', type: 'EXPENSE', isSelected: false, parentCategory: 'Utilities', subCategory: 'Electricity' },
  { id: '5', name: 'Gas', type: 'EXPENSE', isSelected: false, parentCategory: 'Utilities', subCategory: 'Gas' },
  { id: '6', name: 'Maid', type: 'EXPENSE', isSelected: false, parentCategory: 'Utilities', subCategory: 'Helper' },
  { id: '7', name: 'Cook', type: 'EXPENSE', isSelected: false, parentCategory: 'Utilities', subCategory: 'Helper' },
  { id: '8', name: 'Home Repair', type: 'EXPENSE', isSelected: false, parentCategory: 'Housing', subCategory: 'Repairs' },
  { id: '9', name: 'School Fees', type: 'EXPENSE', isSelected: false, parentCategory: 'Education', subCategory: 'Tuition' },
];

// Default income
const defaultIncome: OnboardingIncome[] = [
  { id: '1', name: 'Salary', type: 'INCOME', isSelected: false, parentCategory: 'Earned Income', subCategory: 'Salary' },
  { id: '2', name: 'Interest', type: 'INCOME', isSelected: false, parentCategory: 'Investment Income', subCategory: 'Interest' },
  { id: '3', name: 'Rent', type: 'INCOME', isSelected: false, parentCategory: 'Rental Income', subCategory: 'Rent' },
  { id: '4', name: 'Business Income', type: 'INCOME', isSelected: false, parentCategory: 'Business Income', subCategory: 'Business' },
  { id: '5', name: 'Pension', type: 'INCOME', isSelected: false, parentCategory: 'Other Income', subCategory: 'Pension' },
  { id: '6', name: 'Other Income', type: 'INCOME', isSelected: false, parentCategory: 'Other Income', subCategory: 'Other' },
];

export const useOnboardingStore = create<OnboardingState>((set, get) => ({
  assets: defaultAssets,
  liabilities: defaultLiabilities,
  expenses: defaultExpenses,
  income: defaultIncome,

  setAssets: (assets) => set({ assets }),
  setLiabilities: (liabilities) => set({ liabilities }),
  setExpenses: (expenses) => set({ expenses }),
  setIncome: (income) => set({ income }),

  toggleAsset: (id) => {
    const assets = get().assets.map(asset =>
      asset.id === id ? { ...asset, isSelected: !asset.isSelected } : asset
    );
    set({ assets });
  },

  updateAsset: (id, updates) => {
    const assets = get().assets.map(asset =>
      asset.id === id ? { ...asset, ...updates } : asset
    );
    set({ assets });
  },

  duplicateAsset: (id) => {
    const asset = get().assets.find(a => a.id === id);
    if (asset) {
      // Find the next available number for duplicate name
      const baseName = asset.name.replace(/\s+\d+$/, ''); // Remove trailing number if exists
      const existingNames = get().assets.map(a => a.name);
      let counter = 2;
      let newName = `${baseName} ${counter}`;
      while (existingNames.includes(newName)) {
        counter++;
        newName = `${baseName} ${counter}`;
      }
      
      const newAsset: OnboardingAsset = {
        ...asset,
        id: Date.now().toString(),
        name: newName,
        isSelected: false, // Reset selection for duplicate
      };
      set({ assets: [...get().assets, newAsset] });
    }
  },

  addAsset: (asset) => {
    const newAsset: OnboardingAsset = {
      ...asset,
      id: Date.now().toString(),
    };
    set({ assets: [...get().assets, newAsset] });
  },

  toggleLiability: (id) => {
    const liabilities = get().liabilities.map(liability =>
      liability.id === id ? { ...liability, isSelected: !liability.isSelected } : liability
    );
    set({ liabilities });
  },

  updateLiability: (id, updates) => {
    const liabilities = get().liabilities.map(liability =>
      liability.id === id ? { ...liability, ...updates } : liability
    );
    set({ liabilities });
  },

  duplicateLiability: (id) => {
    const liability = get().liabilities.find(l => l.id === id);
    if (liability) {
      // Find the next available number for duplicate name
      const baseName = liability.name.replace(/\s+\d+$/, ''); // Remove trailing number if exists
      const existingNames = get().liabilities.map(l => l.name);
      let counter = 2;
      let newName = `${baseName} ${counter}`;
      while (existingNames.includes(newName)) {
        counter++;
        newName = `${baseName} ${counter}`;
      }
      
      const newLiability: OnboardingLiability = {
        ...liability,
        id: Date.now().toString(),
        name: newName,
        isSelected: false, // Reset selection for duplicate
      };
      set({ liabilities: [...get().liabilities, newLiability] });
    }
  },

  addLiability: (liability) => {
    const newLiability: OnboardingLiability = {
      ...liability,
      id: Date.now().toString(),
    };
    set({ liabilities: [...get().liabilities, newLiability] });
  },

  toggleExpense: (id) => {
    const expenses = get().expenses.map(expense =>
      expense.id === id ? { ...expense, isSelected: !expense.isSelected } : expense
    );
    set({ expenses });
  },

  updateExpense: (id, updates) => {
    const expenses = get().expenses.map(expense =>
      expense.id === id ? { ...expense, ...updates } : expense
    );
    set({ expenses });
  },

  duplicateExpense: (id) => {
    const expense = get().expenses.find(e => e.id === id);
    if (expense) {
      // Find the next available number for duplicate name
      const baseName = expense.name.replace(/\s+\d+$/, ''); // Remove trailing number if exists
      const existingNames = get().expenses.map(e => e.name);
      let counter = 2;
      let newName = `${baseName} ${counter}`;
      while (existingNames.includes(newName)) {
        counter++;
        newName = `${baseName} ${counter}`;
      }
      
      const newExpense: OnboardingExpense = {
        ...expense,
        id: Date.now().toString(),
        name: newName,
        isSelected: false, // Reset selection for duplicate
      };
      set({ expenses: [...get().expenses, newExpense] });
    }
  },

  addExpense: (expense) => {
    const newExpense: OnboardingExpense = {
      ...expense,
      id: Date.now().toString(),
    };
    set({ expenses: [...get().expenses, newExpense] });
  },

  toggleIncome: (id) => {
    const income = get().income.map(item =>
      item.id === id ? { ...item, isSelected: !item.isSelected } : item
    );
    set({ income });
  },

  updateIncome: (id, updates) => {
    const income = get().income.map(item =>
      item.id === id ? { ...item, ...updates } : item
    );
    set({ income });
  },

  duplicateIncome: (id) => {
    const incomeItem = get().income.find(i => i.id === id);
    if (incomeItem) {
      // Find the next available number for duplicate name
      const baseName = incomeItem.name.replace(/\s+\d+$/, ''); // Remove trailing number if exists
      const existingNames = get().income.map(i => i.name);
      let counter = 2;
      let newName = `${baseName} ${counter}`;
      while (existingNames.includes(newName)) {
        counter++;
        newName = `${baseName} ${counter}`;
      }
      
      const newIncome: OnboardingIncome = {
        ...incomeItem,
        id: Date.now().toString(),
        name: newName,
        isSelected: false, // Reset selection for duplicate
      };
      set({ income: [...get().income, newIncome] });
    }
  },

  addIncome: (income) => {
    const newIncome: OnboardingIncome = {
      ...income,
      id: Date.now().toString(),
    };
    set({ income: [...get().income, newIncome] });
  },

  reset: () => {
    set({
      assets: defaultAssets,
      liabilities: defaultLiabilities,
      expenses: defaultExpenses,
      income: defaultIncome,
    });
  },
}));
