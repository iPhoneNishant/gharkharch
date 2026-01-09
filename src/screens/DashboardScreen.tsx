/**
 * Dashboard Screen for Gharkharch
 * Shows financial overview with net worth and quick actions
 */

import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { useAuthStore, useAccountStore } from '../stores';
import { RootStackParamList, AccountType } from '../types';
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

const DashboardScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  
  const { user } = useAuthStore();
  const { 
    accounts,
    isLoading: accountsLoading, 
    subscribeToAccounts,
    getTotalAssets,
    getTotalLiabilities,
    getNetWorth,
  } = useAccountStore();

  const [refreshing, setRefreshing] = React.useState(false);

  useEffect(() => {
    if (user?.id) {
      const unsubAccounts = subscribeToAccounts(user.id);
      
      return () => {
        unsubAccounts();
      };
    }
  }, [user?.id, subscribeToAccounts]);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    // Subscriptions auto-refresh, so just simulate a delay
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const currency = user?.currency ?? DEFAULT_CURRENCY;
  const totalAssets = getTotalAssets();
  const totalLiabilities = getTotalLiabilities();
  const netWorth = getNetWorth();

  const handleAddTransaction = () => {
    navigation.navigate('AddTransaction');
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xl }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Net Worth Card */}
      <View style={styles.netWorthCard}>
        <Text style={styles.netWorthLabel}>Net Worth</Text>
        <Text style={[
          styles.netWorthValue,
          netWorth < 0 && styles.negativeValue
        ]}>
          {formatCurrency(netWorth, currency)}
        </Text>
        
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <View style={[styles.summaryDot, { backgroundColor: colors.asset }]} />
            <View>
              <Text style={styles.summaryLabel}>Assets</Text>
              <Text style={styles.summaryValue}>{formatCurrency(totalAssets, currency)}</Text>
            </View>
          </View>
          <View style={styles.summaryItem}>
            <View style={[styles.summaryDot, { backgroundColor: colors.liability }]} />
            <View>
              <Text style={styles.summaryLabel}>Liabilities</Text>
              <Text style={styles.summaryValue}>{formatCurrency(totalLiabilities, currency)}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <TouchableOpacity 
          style={styles.addButton}
          onPress={handleAddTransaction}
        >
          <Text style={styles.addButtonIcon}>+</Text>
          <Text style={styles.addButtonText}>Add Transaction</Text>
        </TouchableOpacity>
      </View>

      {/* Account Summary */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Accounts</Text>
        </View>

        {accountsLoading ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>Loading...</Text>
          </View>
        ) : accounts.filter(a => a.isActive && (a.accountType === 'asset' || a.accountType === 'liability')).length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No accounts yet</Text>
            <Text style={styles.emptyStateSubtext}>
              Add your bank accounts and credit cards
            </Text>
          </View>
        ) : (
          <View style={styles.accountsList}>
            {accounts
              .filter(a => a.isActive && (a.accountType === 'asset' || a.accountType === 'liability'))
              .sort((a, b) => {
                // Assets first, then liabilities
                if (a.accountType === 'asset' && b.accountType === 'liability') return -1;
                if (a.accountType === 'liability' && b.accountType === 'asset') return 1;
                // Within same type, sort by name
                return a.name.localeCompare(b.name);
              })
              .map((account) => (
                <TouchableOpacity
                  key={account.id}
                  style={styles.accountItem}
                  onPress={() => navigation.navigate('AccountDetail', { accountId: account.id })}
                >
                  <View style={[
                    styles.accountIcon,
                    { backgroundColor: getAccountTypeBgColor(account.accountType) }
                  ]}>
                    <Text style={[
                      styles.accountIconText,
                      { color: getAccountTypeColor(account.accountType) }
                    ]}>
                      {account.accountType === 'asset' ? '↗' : '↙'}
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
                  <Text style={[
                    styles.accountBalance,
                    account.accountType === 'liability' && styles.liabilityBalance
                  ]}>
                    {formatCurrency(account.currentBalance ?? 0, currency)}
                  </Text>
                </TouchableOpacity>
              ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  netWorthCard: {
    backgroundColor: colors.primary[500],
    margin: spacing.base,
    padding: spacing.xl,
    borderRadius: borderRadius.xl,
    ...shadows.lg,
  },
  netWorthLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.primary[100],
    marginBottom: spacing.xs,
  },
  netWorthValue: {
    fontSize: typography.fontSize['4xl'],
    fontWeight: typography.fontWeight.bold,
    color: colors.neutral[0],
    marginBottom: spacing.lg,
  },
  negativeValue: {
    color: '#FFCDD2',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: spacing.sm,
  },
  summaryLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.primary[200],
  },
  summaryValue: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.neutral[0],
  },
  quickActions: {
    paddingHorizontal: spacing.base,
    marginBottom: spacing.lg,
  },
  addButton: {
    backgroundColor: colors.secondary[500],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    ...shadows.md,
  },
  addButtonIcon: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.neutral[900],
    marginRight: spacing.sm,
  },
  addButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.neutral[900],
  },
  section: {
    paddingHorizontal: spacing.base,
    marginBottom: spacing.xl,
  },
  sectionHeader: {
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.text.primary,
  },
  emptyState: {
    backgroundColor: colors.background.elevated,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    ...shadows.sm,
  },
  emptyStateText: {
    fontSize: typography.fontSize.base,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  emptyStateSubtext: {
    fontSize: typography.fontSize.sm,
    color: colors.text.tertiary,
    textAlign: 'center',
  },
  accountsList: {
    backgroundColor: colors.background.elevated,
    borderRadius: borderRadius.lg,
    ...shadows.sm,
  },
  accountItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
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
  },
  liabilityBalance: {
    color: colors.liability,
  },
});

export default DashboardScreen;
