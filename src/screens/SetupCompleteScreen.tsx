/**
 * Setup Complete Screen
 * Creates all accounts from onboarding data
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../types';
import { useOnboardingStore } from '../stores/onboardingStore';
import { useAccountStore } from '../stores/accountStore';
import { useAuthStore } from '../stores';
import { colors, spacing, typography, borderRadius } from '../config/theme';
import { ACCOUNT_CATEGORIES } from '../config/constants';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'SetupComplete'>;

const SetupCompleteScreen: React.FC = () => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const { user, updateOnboardingComplete } = useAuthStore();
  const { createAccount, accounts } = useAccountStore();
  const { assets, liabilities, expenses, income, reset } = useOnboardingStore();
  
  // Helper to check if account already exists
  const accountExists = (name: string, accountType: 'asset' | 'liability' | 'expense' | 'income'): boolean => {
    return accounts.some(account => 
      account.name.toLowerCase().trim() === name.toLowerCase().trim() && 
      account.accountType === accountType
    );
  };
  
  const [isCreating, setIsCreating] = useState(false);
  const [createdCount, setCreatedCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  React.useEffect(() => {
    createAllAccounts();
  }, []);

  const getCategoryMapping = (name: string, accountType: 'asset' | 'liability' | 'income' | 'expense') => {
    // Find matching category from ACCOUNT_CATEGORIES
    const category = ACCOUNT_CATEGORIES.find(cat => cat.accountType === accountType);
    if (!category) {
      // Fallback categories
      if (accountType === 'asset') {
        return { parentCategory: 'Cash & Bank', subCategory: 'Savings Account' };
      } else if (accountType === 'liability') {
        return { parentCategory: 'Loans', subCategory: 'Other Loans' };
      } else if (accountType === 'income') {
        return { parentCategory: 'Other Income', subCategory: 'Other Income' };
      } else {
        return { parentCategory: 'Food & Dining', subCategory: 'Groceries' };
      }
    }

    // Try to match subcategory by name
    const matchingSubCategory = category.subCategories.find(sub =>
      sub.toLowerCase().includes(name.toLowerCase()) || name.toLowerCase().includes(sub.toLowerCase())
    );

    if (matchingSubCategory) {
      return { parentCategory: category.parentCategory, subCategory: matchingSubCategory };
    }

    // Use first subcategory as fallback
    return { parentCategory: category.parentCategory, subCategory: category.subCategories[0] };
  };

  const createAllAccounts = async () => {
    if (!user?.id) {
      Alert.alert(t('common.error'), t('setupComplete.userNotAuthenticated'));
      return;
    }

    setIsCreating(true);

    try {
      const selectedAssets = assets.filter(a => a.isSelected);
      const selectedLiabilities = liabilities.filter(l => l.isSelected);
      const selectedExpenses = expenses.filter(e => e.isSelected);
      const selectedIncome = income.filter(i => i.isSelected);

      const total = selectedAssets.length + selectedLiabilities.length + selectedExpenses.length + selectedIncome.length;
      setTotalCount(total);

      let count = 0;

      // Create Asset accounts
      for (const asset of selectedAssets) {
        // Skip if already created
        if (accountExists(asset.name, 'asset')) {
          continue;
        }
        
        try {
          const category = getCategoryMapping(asset.name, 'asset');
          
          // Map asset type to subcategory
          let subCategory = category.subCategory;
          if (asset.type === 'CASH') {
            subCategory = 'Cash in Hand';
          } else if (asset.type === 'FD') {
            subCategory = 'Fixed Deposit';
          } else if (asset.type === 'BANK') {
            // Try to match bank name
            const bankMatch = ACCOUNT_CATEGORIES
              .find(cat => cat.parentCategory === 'Cash & Bank')
              ?.subCategories.find(sub => 
                asset.name.toLowerCase().includes('savings') ? sub === 'Savings Account' :
                asset.name.toLowerCase().includes('current') ? sub === 'Current Account' :
                false
              );
            if (bankMatch) {
              subCategory = bankMatch;
            } else {
              subCategory = 'Savings Account';
            }
          }

          await createAccount({
            name: asset.name,
            accountType: 'asset',
            parentCategory: asset.parentCategory || 'Cash & Bank',
            subCategory: asset.subCategory || subCategory,
            openingBalance: asset.openingBalance,
          });
          count++;
          setCreatedCount(count);
        } catch (error) {
          console.error(`Error creating asset ${asset.name}:`, error);
        }
      }

      // Create Liability accounts
      for (const liability of selectedLiabilities) {
        try {
          const category = getCategoryMapping(liability.name, 'liability');
          
          // Map liability name to subcategory
          let subCategory = category.subCategory;
          if (liability.name.toLowerCase().includes('credit card')) {
            subCategory = 'Credit Card';
          } else if (liability.name.toLowerCase().includes('home')) {
            subCategory = 'Home Loan';
          } else if (liability.name.toLowerCase().includes('car')) {
            subCategory = 'Car Loan';
          } else if (liability.name.toLowerCase().includes('personal')) {
            subCategory = 'Personal Loan';
          }

          await createAccount({
            name: liability.name,
            accountType: 'liability',
            parentCategory: category.parentCategory,
            subCategory: subCategory,
            openingBalance: -liability.amount, // Liabilities are negative
          });
          count++;
          setCreatedCount(count);
        } catch (error) {
          console.error(`Error creating liability ${liability.name}:`, error);
        }
      }

      // Create Expense accounts
      for (const expense of selectedExpenses) {
        // Skip if already created
        if (accountExists(expense.name, 'expense')) {
          continue;
        }
        
        try {
          const category = getCategoryMapping(expense.name, 'expense');
          await createAccount({
            name: expense.name,
            accountType: 'expense',
            parentCategory: expense.parentCategory || category.parentCategory,
            subCategory: expense.subCategory || category.subCategory,
          });
          count++;
          setCreatedCount(count);
        } catch (error) {
          console.error(`Error creating expense ${expense.name}:`, error);
        }
      }

      // Create Income accounts
      for (const incomeItem of selectedIncome) {
        // Skip if already created
        if (accountExists(incomeItem.name, 'income')) {
          continue;
        }
        
        try {
          const category = getCategoryMapping(incomeItem.name, 'income');
          
          // Map income name to subcategory
          let subCategory = category.subCategory;
          if (incomeItem.name.toLowerCase().includes('salary')) {
            subCategory = 'Salary';
          } else if (incomeItem.name.toLowerCase().includes('interest')) {
            subCategory = 'Interest';
          } else if (incomeItem.name.toLowerCase().includes('rent')) {
            subCategory = 'Rental Income';
          } else if (incomeItem.name.toLowerCase().includes('business')) {
            subCategory = 'Business Income';
          }

          await createAccount({
            name: incomeItem.name,
            accountType: 'income',
            parentCategory: incomeItem.parentCategory || category.parentCategory,
            subCategory: incomeItem.subCategory || subCategory,
          });
          count++;
          setCreatedCount(count);
        } catch (error) {
          console.error(`Error creating income ${incomeItem.name}:`, error);
        }
      }

      // Reset onboarding store
      reset();

      // Mark onboarding as complete after accounts are created
      try {
        await updateOnboardingComplete(true);
      } catch (error) {
        console.error('Error updating onboarding status:', error);
        // Continue even if update fails
      }

      // Navigate to main app
      setTimeout(() => {
        navigation.reset({
          index: 0,
          routes: [{ name: 'Main' }],
        });
      }, 1000);
    } catch (error: any) {
      console.error('Error creating accounts:', error);
      Alert.alert(
        t('common.error'),
        t('setupComplete.failedToCreateSomeAccounts'),
        [
          {
            text: t('setupComplete.continueAnyway'),
            onPress: () => {
              reset();
              navigation.reset({
                index: 0,
                routes: [{ name: 'Main' }],
              });
            },
          },
        ]
      );
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons name="checkmark-circle" size={80} color={colors.primary[500]} />
        </View>

        <Text style={styles.title}>{t('setupComplete.settingUpAccounts')}</Text>
        <Text style={styles.subtitle}>{t('setupComplete.creatingAccountsMessage', { count: totalCount })}</Text>

        {isCreating && (
          <View style={styles.progressContainer}>
            <ActivityIndicator size="large" color={colors.primary[500]} />
            <Text style={styles.progressText}>
              {t('setupComplete.createdAccountsProgress', { created: createdCount, total: totalCount })}
            </Text>
          </View>
        )}

        {!isCreating && totalCount > 0 && (
          <View style={styles.successContainer}>
            <Ionicons name="checkmark-done-circle" size={60} color={colors.success} />
            <Text style={styles.successText}>{t('setupComplete.allAccountsCreatedSuccessfully')}</Text>
            <Text style={styles.successSubtext}>{t('setupComplete.redirectingToDashboard')}</Text>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  iconContainer: {
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: spacing.base,
  },
  subtitle: {
    fontSize: typography.fontSize.base,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  progressContainer: {
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  progressText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    marginTop: spacing.base,
  },
  successContainer: {
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  successText: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.success,
    marginTop: spacing.base,
    textAlign: 'center',
  },
  successSubtext: {
    fontSize: typography.fontSize.base,
    color: colors.text.secondary,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
});

export default SetupCompleteScreen;
