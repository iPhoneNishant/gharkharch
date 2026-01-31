/**
 * Accounts Screen for Gharkharch
 * Lists all accounts organized by type (Assets, Liabilities, Income, Expenses)
 */

import React, { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SectionList,
  Keyboard,
  Modal,
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { useAuthStore, useAccountStore, useTransactionStore } from '../stores';
import { RootStackParamList, Account, AccountType } from '../types';
import { 
  colors,
  spacing,
  getAccountTypeColor,
  getAccountTypeBgColor,
  addFontScaleListener,
} from '../config/theme';
import { getAccountsScreenStyles } from '../styles/screens/AccountsScreen.styles';
import { formatCurrency, DEFAULT_CURRENCY } from '../config/constants';
import { getOpeningBalance, getClosingBalance, getTransactionsForDateRange } from '../utils/reports';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

type TabType = 'balance' | 'income' | 'expense';

const AccountsScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const { t } = useTranslation();
  const styles = getAccountsScreenStyles();
  const [fontScaleVersion, setFontScaleVersion] = useState(0);
  
  const { user } = useAuthStore();
  const { 
    accounts, 
    isLoading,
    subscribeToAccounts,
    getTotalAssets,
    getTotalLiabilities,
  } = useAccountStore();
  const { transactions, subscribeToTransactions } = useTransactionStore();

  // Subscribe to accounts and transactions when user is available
  // This ensures data is loaded even if this screen loads before Dashboard
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
  useEffect(() => {
    const unsub = addFontScaleListener(() => {
      setFontScaleVersion(v => v + 1);
    });
    return () => {
      unsub();
    };
  }, []);

  const [activeTab, setActiveTab] = useState<TabType>('balance');
  
  // Date range state
  const [fromDate, setFromDate] = useState(() => {
    const date = new Date();
    date.setDate(1); // First day of current month
    return date;
  });
  const [toDate, setToDate] = useState(new Date());
  const [showFromDatePicker, setShowFromDatePicker] = useState(false);
  const [showToDatePicker, setShowToDatePicker] = useState(false);

  const currency = user?.currency ?? DEFAULT_CURRENCY;
  
  // Calculate opening and closing balances for accounts
  const accountBalances = useMemo(() => {
    const balances = new Map<string, { opening: number; closing: number }>();
    
    accounts.forEach(account => {
      if (account.accountType === 'asset' || account.accountType === 'liability') {
        const opening = getOpeningBalance(account, transactions, fromDate);
        const closing = getClosingBalance(account, transactions, toDate);
        // Always set balance, even if 0 or NaN
        balances.set(account.id, { 
          opening: isNaN(opening) ? 0 : opening, 
          closing: isNaN(closing) ? 0 : closing 
        });
      }
    });
    
    return balances;
  }, [accounts, transactions, fromDate, toDate]);

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
        const totalOpening = assetAccounts.reduce((sum, acc) => {
          const balance = accountBalances.get(acc.id);
          return sum + (balance?.opening ?? 0);
        }, 0);
        const totalClosing = assetAccounts.reduce((sum, acc) => {
          const balance = accountBalances.get(acc.id);
          return sum + (balance?.closing ?? 0);
        }, 0);
        
        result.push({
          title: t('accounts.assetSectionTitle'),
          data: assetAccounts,
          type: 'asset',
          total: totalClosing,
        });
      }
      
      if (liabilityAccounts.length > 0) {
        const totalOpening = liabilityAccounts.reduce((sum, acc) => {
          const balance = accountBalances.get(acc.id);
          return sum + (balance?.opening ?? 0);
        }, 0);
        const totalClosing = liabilityAccounts.reduce((sum, acc) => {
          const balance = accountBalances.get(acc.id);
          return sum + (balance?.closing ?? 0);
        }, 0);
        
        result.push({
          title: t('accounts.liabilitySectionTitle'),
          data: liabilityAccounts,
          type: 'liability',
          total: totalClosing,
        });
      }
      
      return result;
    } else if (activeTab === 'income') {
      const incomeAccounts = activeAccounts.filter(a => a.accountType === 'income');
      
      // Filter transactions for date range
      const periodTransactions = getTransactionsForDateRange(transactions, fromDate, toDate);
      
      // Group by parent category and calculate account-wise totals
      const categoryGroups = new Map<string, {
        accounts: Array<Account & { accountTotal: number }>;
        total: number;
      }>();
      
      incomeAccounts.forEach(account => {
        const category = account.parentCategory;
        
        if (!categoryGroups.has(category)) {
          categoryGroups.set(category, {
            accounts: [],
            total: 0,
          });
        }
        
        const catGroup = categoryGroups.get(category)!;
        
        // Calculate total for this account in the period (credit to income account)
        const accountTransactions = periodTransactions.filter(txn => 
          txn.creditAccountId === account.id
        );
        const accountTotal = accountTransactions.reduce((sum, txn) => sum + txn.amount, 0);
        
        catGroup.accounts.push({ ...account, accountTotal });
        catGroup.total += accountTotal;
      });
      
      // Flatten into sections with account-wise totals
      const result: { title: string; data: Array<Account & { accountTotal?: number }>; type: AccountType; total: number }[] = [];
      
      categoryGroups.forEach((catGroup, category) => {
        result.push({
          title: category,
          data: catGroup.accounts,
          type: 'income' as AccountType,
          total: catGroup.total,
        });
      });
      
      return result;
    } else {
      const expenseAccounts = activeAccounts.filter(a => a.accountType === 'expense');
      
      // Filter transactions for date range
      const periodTransactions = getTransactionsForDateRange(transactions, fromDate, toDate);
      
      // Group by parent category and calculate account-wise totals
      const categoryGroups = new Map<string, {
        accounts: Array<Account & { accountTotal: number }>;
        total: number;
      }>();
      
      expenseAccounts.forEach(account => {
        const category = account.parentCategory;
        
        if (!categoryGroups.has(category)) {
          categoryGroups.set(category, {
            accounts: [],
            total: 0,
          });
        }
        
        const catGroup = categoryGroups.get(category)!;
        
        // Calculate total for this account in the period
        // Debit to expense = expense, Credit to expense = return (subtract)
        const accountTransactions = periodTransactions.filter(txn => 
          txn.debitAccountId === account.id || txn.creditAccountId === account.id
        );
        const accountTotal = accountTransactions.reduce((sum, txn) => {
          if (txn.debitAccountId === account.id) {
            return sum + txn.amount; // Expense
          } else {
            return sum - txn.amount; // Return (subtract)
          }
        }, 0);
        
        catGroup.accounts.push({ ...account, accountTotal });
        catGroup.total += accountTotal;
      });
      
      // Flatten into sections with account-wise totals
      const result: { title: string; data: Array<Account & { accountTotal?: number }>; type: AccountType; total: number }[] = [];
      
      categoryGroups.forEach((catGroup, category) => {
        result.push({
          title: category,
          data: catGroup.accounts,
          type: 'expense' as AccountType,
          total: Math.abs(catGroup.total),
        });
      });
      
      return result;
    }
  }, [accounts, activeTab, accountBalances, transactions, fromDate, toDate]);

  const handleAddAccount = () => {
    navigation.navigate('AddAccount');
  };

  const handleAccountPress = (accountId: string) => {
    navigation.navigate('AccountDetail', { 
      accountId,
      fromDate,
      toDate,
    });
  };

  const renderAccount = ({ item: account }: { item: Account & { accountTotal?: number } }) => {
    const showBalance = account.accountType === 'asset' || account.accountType === 'liability';
    const showAccountTotal = (account.accountType === 'income' || account.accountType === 'expense') && account.accountTotal !== undefined;
    const balance = accountBalances.get(account.id);
    
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
        {showBalance && (() => {
          // Always use calculated balance from transactions, not stored balance
          // This ensures consistency with AccountDetailScreen
          const closingBalance = balance ? balance.closing : getClosingBalance(account, transactions, toDate);
          const openingBalance = balance ? balance.opening : getOpeningBalance(account, transactions, fromDate);
          
          // For liability: positive = red (owe money), negative = green (will receive)
          // For asset: positive = green (have money), negative = red (owe money)
          const getBalanceColor = (bal: number, accountType: AccountType) => {
            if (accountType === 'liability') {
              return bal >= 0 ? colors.error : colors.success;
            } else {
              return bal >= 0 ? colors.success : colors.error;
            }
          };
          
          return (
            <View style={styles.balanceContainer}>
              <Text 
                style={[
                  styles.accountBalance,
                  { color: getBalanceColor(closingBalance, account.accountType) }
                ]}
                allowFontScaling={true}
              >
                {formatCurrency(Math.abs(closingBalance), currency)}
              </Text>
            
            </View>
          );
        })()}
        {showAccountTotal && (
          <View style={styles.balanceContainer}>
            <Text 
              style={[
                styles.accountBalance,
                account.accountType === 'income' && { color: colors.income },
                account.accountType === 'expense' && { color: colors.expense },
              ]}
              allowFontScaling={true}
            >
              {formatCurrency(Math.abs(account.accountTotal ?? 0), currency)}
            </Text>
          </View>
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
      {section.total !== 0 && (
        <Text style={[
          styles.sectionTotal,
          // For liability: positive = red (owe money), negative = green (will receive)
          // For asset: positive = green (have money), negative = red (owe money)
          // For income/expense: income = green (money received), expense = red (money spent)
          section.type === 'liability'
            ? (section.total >= 0 ? { color: colors.error } : { color: colors.success })
            : section.type === 'asset'
            ? (section.total >= 0 ? { color: colors.success } : { color: colors.error })
            : (section.type === 'income' ? { color: colors.income } : { color: colors.expense })
        ]}>
          {formatCurrency(Math.abs(section.total), currency)}
        </Text>
      )}
    </View>
  );

  const onFromDateChange = (event: any, selectedDate?: Date) => {
    const currentDate = selectedDate || fromDate;
    setShowFromDatePicker(Platform.OS === 'ios');
    if (currentDate > toDate) {
      return;
    }
    setFromDate(currentDate);
  };

  const onToDateChange = (event: any, selectedDate?: Date) => {
    const currentDate = selectedDate || toDate;
    setShowToDatePicker(Platform.OS === 'ios');
    if (currentDate < fromDate) {
      return;
    }
    setToDate(currentDate);
  };

  return (
    <View style={styles.container}>
      {/* Period Selector */}
      <View style={styles.periodSection}>
          <View style={styles.dateRangeRow}>
            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => {
                Keyboard.dismiss();
                setShowFromDatePicker(true);
              }}
            >
              <View style={styles.dateButtonContent}>
                <Text style={styles.dateLabel}>{t('accountDetail.fromDateTitle')}</Text>
                <Text style={styles.dateValue} numberOfLines={1} ellipsizeMode="tail">
                  {fromDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => {
                Keyboard.dismiss();
                setShowToDatePicker(true);
              }}
            >
              <View style={styles.dateButtonContent}>
                <Text style={styles.dateLabel}>{t('accountDetail.toDateTitle')}</Text>
                <Text style={styles.dateValue} numberOfLines={1} ellipsizeMode="tail">
                  {toDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
          </View>
      </View>

      {/* Tab Bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'balance' && styles.activeTab]}
          onPress={() => setActiveTab('balance')}
        >
          <Text style={[styles.tabText, activeTab === 'balance' && styles.activeTabText]}>
            {t('accounts.tabBalance')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'income' && styles.activeTab]}
          onPress={() => setActiveTab('income')}
        >
          <Text style={[styles.tabText, activeTab === 'income' && styles.activeTabText]}>
            {t('accounts.tabIncome')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'expense' && styles.activeTab]}
          onPress={() => setActiveTab('expense')}
        >
          <Text style={[styles.tabText, activeTab === 'expense' && styles.activeTabText]}>
            {t('accounts.tabExpense')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Accounts List */}
      {isLoading ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>{t('common.loading')}</Text>
        </View>
      ) : sections.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateIcon}>
            {activeTab === 'balance' ? '🏦' : activeTab === 'income' ? '💰' : '💸'}
          </Text>
          <Text style={styles.emptyStateText}>
            {activeTab === 'balance' ? t('accounts.emptyTitleBalance') : activeTab === 'income' ? t('accounts.emptyTitleIncome') : t('accounts.emptyTitleExpense')}
          </Text>
          <Text style={styles.emptyStateSubtext}>
            {t('accounts.emptySubtext')}
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

      {/* From Date Picker Modal */}
      {showFromDatePicker && (
        Platform.OS === 'ios' ? (
          <Modal
            visible={showFromDatePicker}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={() => setShowFromDatePicker(false)}
          >
            <View style={[styles.modalContainer, { paddingTop: insets.top }]}>
              <View style={styles.modalHeader}>
                <TouchableOpacity onPress={() => setShowFromDatePicker(false)}>
                  <Text style={styles.modalCancel} numberOfLines={1} ellipsizeMode="tail">{t('common.cancel')}</Text>
                </TouchableOpacity>
                <Text style={styles.modalTitle} numberOfLines={1} ellipsizeMode="tail">{t('accountDetail.fromDateTitle')}</Text>
                <TouchableOpacity onPress={() => setShowFromDatePicker(false)}>
                  <Text style={styles.modalDone} numberOfLines={1} ellipsizeMode="tail">{t('common.done')}</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={fromDate}
                mode="date"
                display="spinner"
                onChange={onFromDateChange}
                maximumDate={toDate}
                style={{ flex: 1 }}
              />
            </View>
          </Modal>
        ) : (
          <DateTimePicker
            value={fromDate}
            mode="date"
            display="default"
            onChange={onFromDateChange}
            maximumDate={toDate}
          />
        )
      )}

      {/* To Date Picker Modal */}
      {showToDatePicker && (
        Platform.OS === 'ios' ? (
          <Modal
            visible={showToDatePicker}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={() => setShowToDatePicker(false)}
          >
            <View style={[styles.modalContainer, { paddingTop: insets.top }]}>
              <View style={styles.modalHeader}>
                <TouchableOpacity onPress={() => setShowToDatePicker(false)}>
                  <Text style={styles.modalCancel} numberOfLines={1} ellipsizeMode="tail">{t('common.cancel')}</Text>
                </TouchableOpacity>
                <Text style={styles.modalTitle} numberOfLines={1} ellipsizeMode="tail">{t('accountDetail.toDateTitle')}</Text>
                <TouchableOpacity onPress={() => setShowToDatePicker(false)}>
                  <Text style={styles.modalDone} numberOfLines={1} ellipsizeMode="tail">{t('common.done')}</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={toDate}
                mode="date"
                display="spinner"
                onChange={onToDateChange}
                minimumDate={fromDate}
                maximumDate={new Date()}
                style={{ flex: 1 }}
              />
            </View>
          </Modal>
        ) : (
          <DateTimePicker
            value={toDate}
            mode="date"
            display="default"
            onChange={onToDateChange}
            minimumDate={fromDate}
            maximumDate={new Date()}
          />
        )
      )}
    </View>
  );
};


export default AccountsScreen;
