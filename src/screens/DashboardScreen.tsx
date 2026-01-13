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
                    {formatCurrency(getClosingBalance(account, transactions, today), currency)}
                  </Text>
                </TouchableOpacity>
              ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
};


export default DashboardScreen;
