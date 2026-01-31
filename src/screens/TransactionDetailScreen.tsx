/**
 * Transaction Detail Screen for Gharkharch
 * Shows full details of a transaction with edit/delete options
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { useAuthStore, useAccountStore, useTransactionStore } from '../stores';
import { RootStackParamList } from '../types';
import { 
  colors, 
  typography, 
  spacing, 
  borderRadius, 
  shadows,
  getAccountTypeColor,
  getAccountTypeBgColor,
  addFontScaleListener,
} from '../config/theme';
import { formatCurrency, DEFAULT_CURRENCY } from '../config/constants';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'TransactionDetail'>;
type RouteType = RouteProp<RootStackParamList, 'TransactionDetail'>;

const TransactionDetailScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteType>();
  const { t } = useTranslation();
  const [fontScaleVersion, setFontScaleVersion] = React.useState(0);
  React.useEffect(() => {
    const unsub = addFontScaleListener(() => {
      setFontScaleVersion(v => v + 1);
    });
    return () => {
      unsub();
    };
  }, []);
  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background.primary,
    },
    emptyState: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    emptyStateText: {
      fontSize: typography.fontSize.lg,
      color: colors.text.secondary,
    },
    amountCard: {
      margin: spacing.base,
      padding: spacing.xl,
      borderRadius: borderRadius.xl,
      alignItems: 'center',
      ...shadows.lg,
    },
    amountLabel: {
      fontSize: typography.fontSize.sm,
      fontWeight: typography.fontWeight.medium,
      color: 'rgba(255, 255, 255, 0.8)',
      textTransform: 'uppercase',
      letterSpacing: 1,
      marginBottom: spacing.sm,
    },
    amountValue: {
      fontSize: typography.fontSize['4xl'],
      fontWeight: typography.fontWeight.bold,
      color: colors.neutral[0],
      marginBottom: spacing.sm,
    },
    amountDate: {
      fontSize: typography.fontSize.sm,
      color: 'rgba(255, 255, 255, 0.8)',
      textAlign: 'center',
    },
    flowSection: {
      paddingHorizontal: spacing.base,
      marginBottom: spacing.lg,
    },
    sectionTitle: {
      fontSize: typography.fontSize.sm,
      fontWeight: typography.fontWeight.semiBold,
      color: colors.text.secondary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: spacing.sm,
      marginLeft: spacing.sm,
    },
    flowCard: {
      backgroundColor: colors.background.elevated,
      borderRadius: borderRadius.lg,
      ...shadows.sm,
    },
    accountRow: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: spacing.base,
    },
    accountIcon: {
      width: 48,
      height: 48,
      borderRadius: 24,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: spacing.md,
    },
    accountIconText: {
      fontSize: typography.fontSize.xl,
      fontWeight: typography.fontWeight.bold,
    },
    accountInfo: {
      flex: 1,
    },
    accountLabel: {
      fontSize: typography.fontSize.xs,
      color: colors.text.tertiary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    accountName: {
      fontSize: typography.fontSize.base,
      fontWeight: typography.fontWeight.semiBold,
      color: colors.text.primary,
      marginTop: 2,
    },
    accountCategory: {
      fontSize: typography.fontSize.sm,
      color: colors.text.secondary,
      marginTop: 2,
    },
    chevron: {
      fontSize: typography.fontSize.xl,
      color: colors.neutral[400],
    },
    arrowContainer: {
      alignItems: 'center',
      paddingVertical: spacing.xs,
    },
    arrowLine: {
      width: 2,
      height: 8,
      backgroundColor: colors.border.medium,
    },
    arrowHead: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: colors.neutral[100],
      alignItems: 'center',
      justifyContent: 'center',
    },
    arrowText: {
      fontSize: typography.fontSize.base,
      color: colors.text.secondary,
    },
    detailsSection: {
      paddingHorizontal: spacing.base,
      marginBottom: spacing.lg,
    },
    detailsCard: {
      backgroundColor: colors.background.elevated,
      borderRadius: borderRadius.lg,
      ...shadows.sm,
    },
    detailRow: {
      padding: spacing.base,
      borderBottomWidth: 1,
      borderBottomColor: colors.border.light,
    },
    detailLabel: {
      fontSize: typography.fontSize.sm,
      color: colors.text.tertiary,
      marginBottom: spacing.xs,
    },
    detailValue: {
      fontSize: typography.fontSize.base,
      color: colors.text.primary,
    },
    detailValueSmall: {
      fontSize: typography.fontSize.sm,
      color: colors.text.secondary,
      fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    },
    explanationSection: {
      paddingHorizontal: spacing.base,
      marginBottom: spacing.lg,
    },
    explanationCard: {
      backgroundColor: colors.primary[50],
      borderRadius: borderRadius.lg,
      padding: spacing.base,
      borderLeftWidth: 4,
      borderLeftColor: colors.primary[500],
    },
    explanationText: {
      fontSize: typography.fontSize.sm,
      color: colors.text.secondary,
      lineHeight: 20,
      marginBottom: spacing.sm,
    },
    explanationBold: {
      fontWeight: typography.fontWeight.semiBold,
      color: colors.text.primary,
    },
    explanationHighlight: {
      fontWeight: typography.fontWeight.semiBold,
      color: colors.primary[700],
    },
    actionButtons: {
      paddingHorizontal: spacing.base,
      marginTop: spacing.lg,
      gap: spacing.md,
    },
    editButton: {
      paddingVertical: spacing.base,
      borderRadius: borderRadius.lg,
      alignItems: 'center',
      backgroundColor: colors.primary[500],
      ...shadows.sm,
    },
    editButtonText: {
      fontSize: typography.fontSize.base,
      fontWeight: typography.fontWeight.semiBold,
      color: colors.neutral[0],
    },
    deleteButton: {
      paddingVertical: spacing.base,
      borderRadius: borderRadius.lg,
      alignItems: 'center',
      backgroundColor: colors.background.elevated,
      ...shadows.sm,
    },
    deleteButtonText: {
      fontSize: typography.fontSize.base,
      fontWeight: typography.fontWeight.semiBold,
      color: colors.error,
    },
  });
  
  const { transactionId } = route.params;
  
  const { user } = useAuthStore();
  const { getAccountById } = useAccountStore();
  const { getTransactionById, deleteTransaction } = useTransactionStore();

  const transaction = getTransactionById(transactionId);
  const debitAccount = transaction ? getAccountById(transaction.debitAccountId) : null;
  const creditAccount = transaction ? getAccountById(transaction.creditAccountId) : null;
  
  const currency = user?.currency ?? DEFAULT_CURRENCY;

  /**
   * Determine transaction type for display
   */
  const getTransactionType = () => {
    if (!debitAccount || !creditAccount) return 'Unknown';
    
    if (debitAccount.accountType === 'expense') {
      return 'Expense';
    } else if (creditAccount.accountType === 'income') {
      return 'Income';
    } else {
      return 'Transfer';
    }
  };

  /**
   * Handle transaction deletion
   */
  const handleDelete = () => {
    Alert.alert(
      t('transactionDetail.deleteTitle'),
      t('transactionDetail.deleteMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteTransaction(transactionId);
              navigation.goBack();
            } catch (error) {
              Alert.alert(t('common.error'), t('transactionDetail.deleteErrorMessage'));
            }
          },
        },
      ]
    );
  };

  if (!transaction) {
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyStateText}>{t('transactionDetail.notFound')}</Text>
      </View>
    );
  }

  const transactionType = getTransactionType();
  const typeColor = transactionType === 'Expense' 
    ? colors.expense 
    : transactionType === 'Income' 
      ? colors.income 
      : colors.asset;
  const displayTypeLabel =
    transactionType === 'Expense'
      ? t('addTransaction.expense')
      : transactionType === 'Income'
      ? t('addTransaction.income')
      : transactionType === 'Transfer'
      ? t('addTransaction.transfer')
      : t('common.unknown');
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xl }}
    >
      {/* Amount Card */}
      <View style={[styles.amountCard, { backgroundColor: typeColor }]}>
        <Text style={styles.amountLabel}>{displayTypeLabel}</Text>
        <Text style={styles.amountValue}>
          {formatCurrency(transaction.amount, currency)}
        </Text>
        <Text style={styles.amountDate}>
          {transaction.date.toLocaleDateString('en-IN', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })}
        </Text>
      </View>

      {/* Transaction Flow */}
      <View style={styles.flowSection}>
        <Text style={styles.sectionTitle}>{t('transactionDetail.flowTitle')}</Text>
        
        <View style={styles.flowCard}>
          {/* Credit Account (Source) */}
          <TouchableOpacity
            style={styles.accountRow}
            onPress={() => creditAccount && navigation.navigate('AccountDetail', { accountId: creditAccount.id })}
            disabled={!creditAccount}
          >
            <View style={[
              styles.accountIcon,
              { backgroundColor: creditAccount ? getAccountTypeBgColor(creditAccount.accountType) : colors.neutral[200] }
            ]}>
              <Text style={[
                styles.accountIconText,
                { color: creditAccount ? getAccountTypeColor(creditAccount.accountType) : colors.neutral[500] }
              ]}>
                {creditAccount?.name.charAt(0).toUpperCase() ?? '?'}
              </Text>
            </View>
            <View style={styles.accountInfo}>
              <Text style={styles.accountLabel}>{t('transactionDetail.fromCredit')}</Text>
              <Text style={styles.accountName}>{creditAccount?.name ?? t('transactionDetail.unknownAccount')}</Text>
              <Text style={styles.accountCategory}>
                {creditAccount?.subCategory ?? t('common.unknown')}
              </Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>

          {/* Arrow */}
          <View style={styles.arrowContainer}>
            <View style={styles.arrowLine} />
            <View style={styles.arrowHead}>
              <Text style={styles.arrowText}>↓</Text>
            </View>
            <View style={styles.arrowLine} />
          </View>

          {/* Debit Account (Destination) */}
          <TouchableOpacity
            style={styles.accountRow}
            onPress={() => debitAccount && navigation.navigate('AccountDetail', { accountId: debitAccount.id })}
            disabled={!debitAccount}
          >
            <View style={[
              styles.accountIcon,
              { backgroundColor: debitAccount ? getAccountTypeBgColor(debitAccount.accountType) : colors.neutral[200] }
            ]}>
              <Text style={[
                styles.accountIconText,
                { color: debitAccount ? getAccountTypeColor(debitAccount.accountType) : colors.neutral[500] }
              ]}>
                {debitAccount?.name.charAt(0).toUpperCase() ?? '?'}
              </Text>
            </View>
            <View style={styles.accountInfo}>
              <Text style={styles.accountLabel}>{t('transactionDetail.toDebit')}</Text>
              <Text style={styles.accountName}>{debitAccount?.name ?? t('transactionDetail.unknownAccount')}</Text>
              <Text style={styles.accountCategory}>
                {debitAccount?.subCategory ?? t('common.unknown')}
              </Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        </View>
      </View>

  

      {/* Accounting Explanation */}
      <View style={styles.explanationSection}>
        <View style={styles.explanationCard}>
          <Text style={styles.explanationText}>
            {t('transactionDetail.explain.intro', { type: displayTypeLabel.toLowerCase() })}{' '}
            <Text style={styles.explanationHighlight}>
              {formatCurrency(transaction.amount, currency)}
            </Text>
            .
          </Text>
          <Text style={styles.explanationText}>
            • <Text style={styles.explanationBold}>{t('transactionDetail.explain.debit')}</Text>{' '}
            {t('transactionDetail.explain.to')}{' '}
            <Text style={styles.explanationHighlight}>{debitAccount?.name ?? t('common.unknown')}</Text>
            {debitAccount?.accountType === 'asset' && ` ${t('transactionDetail.explain.assetDebitEffect')}`}
            {debitAccount?.accountType === 'expense' && ` ${t('transactionDetail.explain.expenseDebitEffect')}`}
            {debitAccount?.accountType === 'liability' && ` ${t('transactionDetail.explain.liabilityDebitEffect')}`}
          </Text>
          <Text style={styles.explanationText}>
            • <Text style={styles.explanationBold}>{t('transactionDetail.explain.credit')}</Text>{' '}
            {t('transactionDetail.explain.to')}{' '}
            <Text style={styles.explanationHighlight}>{creditAccount?.name ?? t('common.unknown')}</Text>
            {creditAccount?.accountType === 'asset' && ` ${t('transactionDetail.explain.assetCreditEffect')}`}
            {creditAccount?.accountType === 'income' && ` ${t('transactionDetail.explain.incomeCreditEffect')}`}
            {creditAccount?.accountType === 'liability' && ` ${t('transactionDetail.explain.liabilityCreditEffect')}`}
          </Text>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => navigation.navigate('AddTransaction', { editTransactionId: transactionId })}
        >
          <Text style={styles.editButtonText}>{t('transactionDetail.editTransaction')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={handleDelete}
        >
          <Text style={styles.deleteButtonText}>{t('transactionDetail.deleteTransaction')}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

 

export default TransactionDetailScreen;
