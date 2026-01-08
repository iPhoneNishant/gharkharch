/**
 * Accounts Screen for Gharkharch
 * Lists all accounts organized by type (Assets, Liabilities, Income, Expenses)
 */

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SectionList,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { useAuthStore, useAccountStore } from '../stores';
import { RootStackParamList, Account, AccountType } from '../types';
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

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

type TabType = 'balance' | 'income' | 'expense';

const AccountsScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  
  const { user } = useAuthStore();
  const { 
    accounts, 
    isLoading,
    getTotalAssets,
    getTotalLiabilities,
  } = useAccountStore();

  const [activeTab, setActiveTab] = useState<TabType>('balance');

  const currency = user?.currency ?? DEFAULT_CURRENCY;

  /**
   * Get accounts filtered and grouped by the active tab
   */
  const sections = useMemo(() => {
    const activeAccounts = accounts.filter(a => a.isActive);
    
    if (activeTab === 'balance') {
      // Show asset and liability accounts
      const assetAccounts = activeAccounts.filter(a => a.accountType === 'asset');
      const liabilityAccounts = activeAccounts.filter(a => a.accountType === 'liability');
      
      const result: { title: string; data: Account[]; type: AccountType; total: number }[] = [];
      
      if (assetAccounts.length > 0) {
        result.push({
          title: 'Assets',
          data: assetAccounts,
          type: 'asset',
          total: getTotalAssets(),
        });
      }
      
      if (liabilityAccounts.length > 0) {
        result.push({
          title: 'Liabilities',
          data: liabilityAccounts,
          type: 'liability',
          total: getTotalLiabilities(),
        });
      }
      
      return result;
    } else if (activeTab === 'income') {
      const incomeAccounts = activeAccounts.filter(a => a.accountType === 'income');
      
      // Group by parent category
      const grouped = incomeAccounts.reduce((acc, account) => {
        const category = account.parentCategory;
        if (!acc[category]) {
          acc[category] = [];
        }
        acc[category].push(account);
        return acc;
      }, {} as Record<string, Account[]>);
      
      return Object.entries(grouped).map(([category, data]) => ({
        title: category,
        data,
        type: 'income' as AccountType,
        total: 0, // Income accounts don't have balances
      }));
    } else {
      const expenseAccounts = activeAccounts.filter(a => a.accountType === 'expense');
      
      // Group by parent category
      const grouped = expenseAccounts.reduce((acc, account) => {
        const category = account.parentCategory;
        if (!acc[category]) {
          acc[category] = [];
        }
        acc[category].push(account);
        return acc;
      }, {} as Record<string, Account[]>);
      
      return Object.entries(grouped).map(([category, data]) => ({
        title: category,
        data,
        type: 'expense' as AccountType,
        total: 0, // Expense accounts don't have balances
      }));
    }
  }, [accounts, activeTab, getTotalAssets, getTotalLiabilities]);

  const handleAddAccount = () => {
    navigation.navigate('AddAccount');
  };

  const handleAccountPress = (accountId: string) => {
    navigation.navigate('AccountDetail', { accountId });
  };

  const renderAccount = ({ item: account }: { item: Account }) => {
    const showBalance = account.accountType === 'asset' || account.accountType === 'liability';
    
    return (
      <TouchableOpacity
        style={styles.accountItem}
        onPress={() => handleAccountPress(account.id)}
      >
        <View style={[
          styles.accountIcon,
          { backgroundColor: getAccountTypeBgColor(account.accountType) }
        ]}>
          <Text style={[
            styles.accountIconText,
            { color: getAccountTypeColor(account.accountType) }
          ]}>
            {account.name.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={styles.accountInfo}>
          <Text style={styles.accountName} numberOfLines={1}>
            {account.name}
          </Text>
          <Text style={styles.accountCategory} numberOfLines={1}>
            {account.subCategory}
          </Text>
        </View>
        {showBalance && (
          <Text style={[
            styles.accountBalance,
            account.accountType === 'liability' && styles.liabilityBalance
          ]}>
            {formatCurrency(account.currentBalance ?? 0, currency)}
          </Text>
        )}
        <Text style={styles.chevron}>›</Text>
      </TouchableOpacity>
    );
  };

  const renderSectionHeader = ({ section }: { section: { title: string; type: AccountType; total: number } }) => (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionTitleRow}>
        <View style={[
          styles.sectionDot,
          { backgroundColor: getAccountTypeColor(section.type) }
        ]} />
        <Text style={styles.sectionTitle}>{section.title}</Text>
      </View>
      {(section.type === 'asset' || section.type === 'liability') && (
        <Text style={[
          styles.sectionTotal,
          section.type === 'liability' && styles.liabilityBalance
        ]}>
          {formatCurrency(section.total, currency)}
        </Text>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Tab Bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'balance' && styles.activeTab]}
          onPress={() => setActiveTab('balance')}
        >
          <Text style={[styles.tabText, activeTab === 'balance' && styles.activeTabText]}>
            Balance Sheet
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'income' && styles.activeTab]}
          onPress={() => setActiveTab('income')}
        >
          <Text style={[styles.tabText, activeTab === 'income' && styles.activeTabText]}>
            Income
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'expense' && styles.activeTab]}
          onPress={() => setActiveTab('expense')}
        >
          <Text style={[styles.tabText, activeTab === 'expense' && styles.activeTabText]}>
            Expenses
          </Text>
        </TouchableOpacity>
      </View>

      {/* Accounts List */}
      {isLoading ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>Loading...</Text>
        </View>
      ) : sections.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateIcon}>
            {activeTab === 'balance' ? '🏦' : activeTab === 'income' ? '💰' : '💸'}
          </Text>
          <Text style={styles.emptyStateText}>
            No {activeTab === 'balance' ? 'balance sheet' : activeTab} accounts yet
          </Text>
          <Text style={styles.emptyStateSubtext}>
            Add your first account to get started
          </Text>
        </View>
      ) : (
        <SectionList
          sections={sections}
          renderItem={renderAccount}
          renderSectionHeader={renderSectionHeader}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: insets.bottom + 80 }}
          stickySectionHeadersEnabled={false}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          SectionSeparatorComponent={() => <View style={styles.sectionSeparator} />}
        />
      )}

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, { bottom: insets.bottom + spacing.lg }]}
        onPress={handleAddAccount}
      >
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.background.elevated,
    marginHorizontal: spacing.base,
    marginVertical: spacing.md,
    borderRadius: borderRadius.lg,
    padding: spacing.xs,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: borderRadius.md,
  },
  activeTab: {
    backgroundColor: colors.primary[500],
  },
  tabText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.secondary,
  },
  activeTabText: {
    color: colors.neutral[0],
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  emptyStateIcon: {
    fontSize: 48,
    marginBottom: spacing.md,
  },
  emptyStateText: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  emptyStateSubtext: {
    fontSize: typography.fontSize.sm,
    color: colors.text.tertiary,
    textAlign: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    backgroundColor: colors.background.primary,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: spacing.sm,
  },
  sectionTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.text.primary,
  },
  sectionTotal: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.asset,
  },
  accountItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.elevated,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
  },
  accountIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  accountIconText: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
  },
  accountInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  accountName: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.primary,
  },
  accountCategory: {
    fontSize: typography.fontSize.sm,
    color: colors.text.tertiary,
    marginTop: 2,
  },
  accountBalance: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.asset,
    marginRight: spacing.sm,
  },
  liabilityBalance: {
    color: colors.liability,
  },
  chevron: {
    fontSize: typography.fontSize.xl,
    color: colors.neutral[400],
  },
  separator: {
    height: 1,
    backgroundColor: colors.border.light,
    marginLeft: spacing.base + 40 + spacing.md,
  },
  sectionSeparator: {
    height: spacing.md,
  },
  fab: {
    position: 'absolute',
    right: spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary[500],
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.lg,
  },
  fabIcon: {
    fontSize: 28,
    color: colors.neutral[0],
    fontWeight: typography.fontWeight.medium,
  },
});

export default AccountsScreen;
