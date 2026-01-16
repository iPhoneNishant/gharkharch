/**
 * Dashboard Screen for Gharkharch
 * Shows financial overview with net worth and quick actions
 */

import React, { useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { useAuthStore, useAccountStore, useTransactionStore } from '../stores';
import { RootStackParamList, AccountType } from '../types';
import { 
  colors,
  spacing,
  getAccountTypeColor,
  getAccountTypeBgColor,
} from '../config/theme';
import { dashboardScreenStyles as styles } from '../styles/screens/DashboardScreen.styles';
import { formatCurrency, DEFAULT_CURRENCY } from '../config/constants';
import { getClosingBalance } from '../utils/reports';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const DashboardScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  
  const { user } = useAuthStore();
  const { 
    accounts,
    isLoading: accountsLoading, 
    subscribeToAccounts,
  } = useAccountStore();
  const { transactions, subscribeToTransactions } = useTransactionStore();

  const [refreshing, setRefreshing] = React.useState(false);

  useEffect(() => {
    if (user?.id) {
      const unsubAccounts = subscribeToAccounts(user.id);
      const unsubTransactions = subscribeToTransactions(user.id);
      
      return () => {
        unsubAccounts();
        unsubTransactions();
      };
    }
  }, [user?.id, subscribeToAccounts, subscribeToTransactions]);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    // Subscriptions auto-refresh, so just simulate a delay
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const currency = user?.currency ?? DEFAULT_CURRENCY;
  
  // Calculate balances from transactions up to today's date for consistency
  const today = new Date();
  const totalAssets = React.useMemo(() => {
    return accounts
      .filter(a => a.isActive && a.accountType === 'asset')
      .reduce((sum, account) => {
        return sum + getClosingBalance(account, transactions, today);
      }, 0);
  }, [accounts, transactions]);

  const totalLiabilities = React.useMemo(() => {
    return accounts
      .filter(a => a.isActive && a.accountType === 'liability')
      .reduce((sum, account) => {
        return sum + getClosingBalance(account, transactions, today);
      }, 0);
  }, [accounts, transactions]);

  const netWorth = totalAssets - totalLiabilities;

  const [showAddMenu, setShowAddMenu] = React.useState(false);

  const activeAssets = React.useMemo(
    () => accounts.filter(a => a.isActive && a.accountType === 'asset'),
    [accounts]
  );

  const activeLiabilities = React.useMemo(
    () => accounts.filter(a => a.isActive && a.accountType === 'liability'),
    [accounts]
  );

  const getDashboardBalanceMeta = (accountType: AccountType, balance: number) => {
    const isNegative = balance < 0;

    // Liability:
    // - positive => red (owe)
    // - negative => green (to receive)
    if (accountType === 'liability') {
      return {
        color: isNegative ? colors.success : colors.error,
        label: isNegative ? '(to receive)' : null,
      };
    }

    // Asset:
    // - positive => green (have)
    // - negative => red (to pay)
    return {
      color: isNegative ? colors.error : colors.success,
      label: isNegative ? '(to pay)' : null,
    };
  };

  const handleAddTransaction = () => {
    setShowAddMenu(false);
    navigation.navigate('AddTransaction');
  };

  const handleAddRecurringTransaction = () => {
    setShowAddMenu(false);
    console.log('Attempting to navigate to AddRecurringTransaction');
    navigation.navigate('AddRecurringTransaction');
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
            <View>
              <Text style={styles.summaryLabel}>Assets</Text>
              <Text style={styles.summaryMeaningLabel}>What we have</Text>
              <Text style={[styles.summaryValue, { color: colors.neutral[0]  }]}>
                {formatCurrency(Math.abs(totalAssets), currency)}
              </Text>
              {totalAssets < 0 && (
                <Text style={[styles.summarySubLabel, { color: colors.error }]}>
                  (to pay)
                </Text>
              )}
            </View>
          </View>
          <View style={styles.summaryItem}>
            <View>
              <Text style={styles.summaryLabel}>Liabilities</Text>
              <Text style={styles.summaryMeaningLabel}>What We Have to Pay </Text>
              <Text style={[styles.summaryValue, { color: colors.neutral[0] }]}>
                {formatCurrency(totalLiabilities, currency)}
              </Text>
              {totalLiabilities < 0 && (
                <Text style={[styles.summarySubLabel, { color: colors.neutral[0]  }]}>
                  (to receive)
                </Text>
              )}
            </View>
          </View>
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <TouchableOpacity 
          style={styles.addButton}
          onPress={() => setShowAddMenu(!showAddMenu)}
        >
          <Text style={styles.addButtonIcon}>+</Text>
          <Text style={styles.addButtonText}>Add Transaction</Text>
        </TouchableOpacity>
        
        {/* Add Menu */}
        {showAddMenu && (
          <View style={styles.addMenu}>
            <TouchableOpacity
              style={styles.addMenuItem}
              onPress={handleAddTransaction}
            >
              <Text style={styles.addMenuItemIcon}>📝</Text>
              <Text style={styles.addMenuItemText}>Add Transaction</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.addMenuItem}
              onPress={handleAddRecurringTransaction}
            >
              <Text style={styles.addMenuItemIcon}>🔄</Text>
              <Text style={styles.addMenuItemText}>Add Recurring</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Assets */}
      <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <View>
            <Text style={styles.sectionTitle}>Assets</Text>
            <Text style={styles.sectionMeaning}>What we have</Text>
          </View>
          <View style={styles.sectionTotalContainer}>
            <Text style={[styles.sectionTotal, { color: totalAssets < 0 ? colors.error : colors.success }]}>
              {formatCurrency(Math.abs(totalAssets), currency)}
            </Text>
            {totalAssets < 0 && (
              <Text style={[styles.sectionSubLabel, { color: colors.error }]}>(to pay)</Text>
            )}
          </View>
        </View>

        {accountsLoading ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>Loading...</Text>
          </View>
        ) : activeAssets.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No asset accounts yet</Text>
            <Text style={styles.emptyStateSubtext}>Add your bank accounts and cash</Text>
          </View>
        ) : (
          <View style={styles.accountsList}>
            {activeAssets
              .slice()
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((account) => {
                const balance = getClosingBalance(account, transactions, today);
                const meta = getDashboardBalanceMeta(account.accountType, balance);
                return (
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
                        ↗
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
                    <View style={styles.balanceContainer}>
                      <Text style={[styles.accountBalance, { color: meta.color }]}>
                        {formatCurrency(Math.abs(balance), currency)}
                      </Text>
                      {meta.label && (
                        <Text style={[styles.balanceLabel, { color: meta.color }]}>
                          {meta.label}
                        </Text>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
          </View>
        )}
      </View>

      {/* Liabilities */}
      <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <View>
            <Text style={styles.sectionTitle}>Liabilities</Text>
            <Text style={styles.sectionMeaning}>What We Have to Pay</Text>
          </View>
          <View style={styles.sectionTotalContainer}>
            <Text style={[styles.sectionTotal, { color: totalLiabilities < 0 ? colors.success : colors.error }]}>
              {formatCurrency(Math.abs(totalLiabilities), currency)}
            </Text>
            {totalLiabilities < 0 && (
              <Text style={[styles.sectionSubLabel, { color: colors.success }]}>(to receive)</Text>
            )}
          </View>
        </View>

        {accountsLoading ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>Loading...</Text>
          </View>
        ) : activeLiabilities.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No liability accounts yet</Text>
            <Text style={styles.emptyStateSubtext}>Add your credit cards and loans</Text>
          </View>
        ) : (
          <View style={styles.accountsList}>
            {activeLiabilities
              .slice()
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((account) => {
                const balance = getClosingBalance(account, transactions, today);
                const meta = getDashboardBalanceMeta(account.accountType, balance);
                return (
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
                        ↙
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
                    <View style={styles.balanceContainer}>
                      <Text style={[styles.accountBalance, { color: meta.color }]}>
                        {formatCurrency(Math.abs(balance), currency)}
                      </Text>
                      {meta.label && (
                        <Text style={[styles.balanceLabel, { color: meta.color }]}>
                          {meta.label}
                        </Text>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
          </View>
        )}
      </View>
    </ScrollView>
  );
};


export default DashboardScreen;
