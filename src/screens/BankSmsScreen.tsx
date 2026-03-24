/**
 * Bank SMS Screen
 * Displays all bank transaction SMS messages from inbox
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { colors, spacing, typography, borderRadius, shadows, addFontScaleListener } from '../config/theme';
import { formatCurrency, DEFAULT_CURRENCY } from '../config/constants';
import { readRecentSms, SmsMessage, checkSmsPermission, requestSmsPermission, openPermissionSettings } from '../services/smsService';
import { parseTransaction, isBankSender } from '../services/transactionParser';
import { getSmsReadCount, getSmsDateGapDays, getSmsSinceTimestamp } from '../services/smsSettingsService';
import { useNavigation, CommonActions } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { navigationRef } from '../navigation/navigationRef';
import { useAccountStore } from '../stores/accountStore';
import { useSmsAccountMappingStore } from '../stores/smsAccountMappingStore';
import { useAuthStore } from '../stores/authStore';
import { hashSmsTransaction, isSmsProcessed } from '../services/firebaseService';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface BankSmsItem extends SmsMessage {
  parsed?: {
    amount?: number;
    type?: 'debit' | 'credit';
    merchant?: string;
    date?: Date;
    bankName?: string;
    accountLast4?: string;
  };
  isProcessed?: boolean; // Whether this SMS has already been processed
}

const BankSmsScreen: React.FC = () => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const [smsList, setSmsList] = useState<BankSmsItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fontScaleVersion, setFontScaleVersion] = useState(0);
  
  const { user } = useAuthStore();
  const { accounts, getExpenseAccounts, getIncomeAccounts, getAssetAccounts } = useAccountStore();
  const { subscribeToMappings } = useSmsAccountMappingStore();
  
  const currency = user?.currency ?? DEFAULT_CURRENCY;

  useEffect(() => {
    const unsub = addFontScaleListener(() => {
      setFontScaleVersion(v => v + 1);
    });
    return () => {
      unsub();
    };
  }, []);

  const checkPermission = async () => {
    if (Platform.OS !== 'android') {
      setHasPermission(false);
      return;
    }
    const granted = await checkSmsPermission();
    setHasPermission(granted);
    return granted;
  };

  const requestPermission = async () => {
    if (Platform.OS !== 'android') {
      Alert.alert(t('settings.smsPermissionNotAvailable'));
      return;
    }
    const granted = await requestSmsPermission();
    setHasPermission(granted);
    if (granted) {
      loadSmsMessages();
    } else {
      Alert.alert(
        t('settings.smsPermissionDenied'),
        t('settings.smsPermissionDeniedMessage'),
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('settings.openSettings'),
            onPress: openPermissionSettings,
          },
        ]
      );
    }
  };

  const loadSmsMessages = async () => {
    if (Platform.OS !== 'android') {
      setError(t('bankSms.smsReadingOnlyAndroid'));
      return;
    }

    const granted = await checkPermission();
    if (!granted) {
      setError(t('bankSms.smsPermissionNotGranted'));
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Read recent SMS using user-configured count and date gap
      const readCount = await getSmsReadCount();
      const dateGapDays = await getSmsDateGapDays();
      const sinceTimestamp = await getSmsSinceTimestamp();
      
      // Read messages and filter by date gap
      const messages = await readRecentSms(readCount);
      const filteredMessages = messages.filter(msg => msg.timestamp >= sinceTimestamp);

      // Filter bank SMS and parse them
      // Only include messages that parse successfully (excludes password/OTP messages)
      const bankSms: BankSmsItem[] = filteredMessages
        .filter((msg) => isBankSender(msg.senderId))
        .map((msg) => {
          const parsed = parseTransaction(msg.body, msg.senderId);
          return {
            ...msg,
              parsed: parsed
                ? {
                    amount: parsed.amount,
                    type: parsed.type,
                    merchant: parsed.merchant,
                    date: parsed.date,
                    bankName: parsed.bankName,
                    accountLast4: parsed.accountLast4,
                  }
                : undefined,
          };
        })
        .filter((msg) => msg.parsed !== undefined); // Filter out password/OTP and other non-transaction messages

      // Check processed status for each SMS
      if (user?.id) {
        const processedChecks = await Promise.all(
          bankSms.map(async (sms) => {
            if (sms.parsed?.amount && sms.parsed?.date) {
              const smsHash = hashSmsTransaction(sms.timestamp, {
                amount: sms.parsed.amount,
                date: sms.parsed.date,
                merchant: sms.parsed.merchant,
                accountLast4: sms.parsed.accountLast4,
                type: sms.parsed.type,
              });
              const isProcessed = await isSmsProcessed(smsHash, user.id);
              return { sms, isProcessed };
            }
            return { sms, isProcessed: false };
          })
        );

        // Add isProcessed flag to each SMS
        const bankSmsWithStatus = processedChecks.map(({ sms, isProcessed }) => ({
          ...sms,
          isProcessed,
        }));

        // Sort by timestamp (newest first)
        bankSmsWithStatus.sort((a, b) => b.timestamp - a.timestamp);
        setSmsList(bankSmsWithStatus);
      } else {
        // Sort by timestamp (newest first)
        bankSms.sort((a, b) => b.timestamp - a.timestamp);
        setSmsList(bankSms);
      }
    } catch (err) {
      console.error('Error loading SMS:', err);
      setError(err instanceof Error ? err.message : t('bankSms.failedToLoadSmsMessages'));
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadSmsMessages();
  };

  const handleSmsPress = (sms: BankSmsItem) => {
    if (sms.parsed?.amount && sms.parsed?.type) {
      const { getMapping } = useSmsAccountMappingStore.getState();
      
      // Get merchant and bank separately
      const merchant = sms.parsed.merchant && sms.parsed.merchant.trim() ? sms.parsed.merchant : undefined;
      const bankName = sms.parsed.bankName && sms.parsed.bankName.trim() ? sms.parsed.bankName : undefined;
      
      // Prepare prefill data
      const prefill: any = {
        amount: sms.parsed.amount,
        note: sms.body.substring(0, 200),
        date: sms.parsed.date?.toISOString() || new Date(sms.timestamp).toISOString(),
      };

      // Get merchant mapping
      let merchantAccountId: string | undefined = undefined;
      if (merchant) {
        const merchantMapping = getMapping(merchant);
        if (merchantMapping) {
          merchantAccountId = merchantMapping.accountId;
        }
      }
      
      // Get bank mapping
      let bankAccountId: string | undefined = undefined;
      if (bankName) {
        const bankMapping = getMapping(bankName);
        if (bankMapping) {
          bankAccountId = bankMapping.accountId;
        }
      }
      
      // Apply mappings based on transaction type
      if (sms.parsed.type === 'debit') {
        // Debit: From Account = Bank, To Account = Merchant
        prefill.creditAccountId = bankAccountId || getAssetAccounts()[0]?.id;
        prefill.debitAccountId = merchantAccountId || getExpenseAccounts()[0]?.id;
      } else {
        // Credit: From Account = Merchant, To Account = Bank
        prefill.creditAccountId = merchantAccountId || getIncomeAccounts()[0]?.id;
        prefill.debitAccountId = bankAccountId || getAssetAccounts()[0]?.id;
      }

      // Push AddTransaction on Main stack (as summary page)
      // Get parent navigator (RootNavigator) to push AddTransaction
      const params = {
        prefill,
        postSaveNavigationTarget: 'BankSms', // Return to Bank SMS screen after saving
        smsBankInfo: (merchant || bankName) ? {
          senderId: sms.senderId,
          transactionType: sms.parsed.type,
          merchant: merchant || undefined,
          bankName: bankName || undefined,
          smsTimestamp: sms.timestamp, // SMS receiving timestamp for duplicate detection
          amount: sms.parsed.amount, // Parsed amount for duplicate detection
          accountLast4: sms.parsed.accountLast4, // Account last 4 digits for duplicate detection
          parsedDate: sms.parsed.date, // Original parsed date from SMS (for duplicate detection)
        } : undefined,
      };

      // Try to get parent navigator (RootNavigator) from Tab Navigator
      const parent = navigation.getParent();
      if (parent) {
        // Navigate using parent navigator (RootNavigator)
        parent.navigate('AddTransaction', params);
      } else if (navigationRef.isReady()) {
        // Fallback: use navigationRef
        (navigationRef as any).navigate('AddTransaction', params);
      } else {
        // Last fallback: use regular navigation
        (navigation as any).navigate('AddTransaction', params);
      }
    } else {
      // Show SMS details
      Alert.alert(
        t('bankSms.smsDetails'),
        `${t('bankSms.from')}: ${sms.senderId}\n\n${sms.body}`,
        [{ text: t('common.ok') }]
      );
    }
  };

  useFocusEffect(
    useCallback(() => {
      if (Platform.OS === 'android') {
        checkPermission().then((granted) => {
          if (granted) {
            loadSmsMessages();
          }
        });
      }
      
      // Subscribe to account mappings
      if (user?.id) {
        const unsubscribe = subscribeToMappings(user.id);
        return unsubscribe;
      }
    }, [user?.id, subscribeToMappings])
  );

  useEffect(() => {
    if (Platform.OS === 'android' && hasPermission === null) {
      checkPermission();
    }
  }, []);

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return t('bankSms.justNow');
    if (diffMins < 60) return t('bankSms.minutesAgo', { count: diffMins });
    if (diffHours < 24) return t('bankSms.hoursAgo', { count: diffHours });
    if (diffDays < 7) return t('bankSms.daysAgo', { count: diffDays });

    return date.toLocaleDateString(t('common.locale') || 'en-IN', {
      day: 'numeric',
      month: 'short',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    });
  };

  const renderSmsItem = ({ item }: { item: BankSmsItem }) => {
    const isDebit = item.parsed?.type === 'debit';
    const isCredit = item.parsed?.type === 'credit';
    const hasAmount = !!item.parsed?.amount;
    const isProcessed = item.isProcessed || false;

    return (
      <TouchableOpacity
        style={[
          styles.smsItem,
          isProcessed && styles.smsItemProcessed,
          { borderLeftWidth: 4, borderLeftColor: isDebit ? colors.error[500] : isCredit ? colors.success[500] : colors.neutral[300] },
        ]}
        onPress={() => handleSmsPress(item)}
        activeOpacity={0.7}
        disabled={isProcessed}
      >
        <View style={styles.smsHeader}>
          <View style={styles.smsSenderContainer}>
            {/* <View
              style={[
                styles.senderIcon,
                { 
                  backgroundColor: isDebit ? colors.error[500] : isCredit ? colors.success[500] : colors.primary[500],
                  ...shadows.md,
                },
              ]}
            >
              <Ionicons
                name={isDebit ? 'arrow-down' : isCredit ? 'arrow-up' : 'document-text'}
                size={10}
                color={colors.neutral[0]}
              />
            </View> */}
            <View style={styles.smsSenderInfo}>
              <View style={styles.senderNameRow}>
                <Text style={styles.senderName} numberOfLines={1}>
                  {item.senderId}
                </Text>
  
              </View>
              <View style={styles.timeContainer}>
                <Ionicons name="time-outline" size={12} color={colors.text.tertiary} />
                <Text style={styles.smsTime}>{formatDate(item.timestamp)}</Text>
              </View>
            </View>
          </View>
          {hasAmount && (
            <View
              style={[
                styles.amountBadge,
                { 
                  backgroundColor: isDebit ? colors.error[500] : colors.success[500],
                  // ...shadows.sm,
                },
                isProcessed && { opacity: 0.5 },
              ]}
            >
              <Text
                style={[
                  styles.amountText,
                  { color: colors.neutral[1000] },
                  {backgroundColor: 't'},
                ]}
              >
                {item.parsed?.amount 
                  ? formatCurrency(
                      isDebit ? -item.parsed.amount : item.parsed.amount,
                      currency,
                      isCredit
                    )
                  : '₹0.00'}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.smsBodyContainer}>
          <Text style={styles.smsBody} numberOfLines={2}>
            {item.body}
          </Text>
        </View>

        {(item.parsed?.bankName || item.parsed?.merchant) && (
          <View style={styles.infoContainer}>
            {item.parsed?.bankName && (
              <View style={styles.infoBadge}>
                <Ionicons name="business" size={14} color={colors.primary[600]} />
                <Text style={styles.infoText}>{item.parsed.bankName}</Text>
              </View>
            )}
            {item.parsed?.merchant && (
              <View style={styles.infoBadge}>
                <Ionicons name="storefront" size={14} color={colors.primary[600]} />
                <Text style={styles.infoText}>{item.parsed.merchant}</Text>
              </View>
            )}
          </View>
        )}

        {hasAmount && !isProcessed && (
          <TouchableOpacity
            style={[styles.createButton, shadows.sm]}
            onPress={() => handleSmsPress(item)}
            activeOpacity={0.8}
          >
            <Ionicons name="add-circle" size={18} color={colors.neutral[0]} />
            <Text style={styles.createButtonText}>{t('bankSms.createTransaction')}</Text>
          </TouchableOpacity>
        )}
        {isProcessed && (
          <View style={styles.processedMessage}>
            <Ionicons name="checkmark-done-circle" size={20} color={colors.success[600]} />
            <Text style={styles.processedMessageText}>{t('bankSms.transactionAlreadyCreated')}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderEmpty = () => {
    if (isLoading) {
      return (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color={colors.primary[500]} />
          <Text style={styles.emptyText}>{t('bankSms.loadingSmsMessages')}</Text>
        </View>
      );
    }

    if (hasPermission === false) {
      return (
        <View style={styles.emptyContainer}>
          <Ionicons name="lock-closed" size={64} color={colors.text.tertiary} />
          <Text style={styles.emptyTitle}>{t('bankSms.smsPermissionRequired')}</Text>
          <Text style={styles.emptyText}>
            {t('bankSms.smsPermissionRequiredMessage')}
          </Text>
          <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
            <Text style={styles.permissionButtonText}>{t('bankSms.grantPermission')}</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.emptyContainer}>
          <Ionicons name="alert-circle" size={64} color={colors.error[500]} />
          <Text style={styles.emptyTitle}>{t('common.error')}</Text>
          <Text style={styles.emptyText}>{error}</Text>
          <TouchableOpacity style={styles.permissionButton} onPress={loadSmsMessages}>
            <Text style={styles.permissionButtonText}>{t('common.retry')}</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="mail-outline" size={64} color={colors.text.tertiary} />
        <Text style={styles.emptyTitle}>{t('bankSms.noBankSmsFound')}</Text>
        <Text style={styles.emptyText}>
          {t('bankSms.noBankSmsFoundMessage')}
        </Text>
        <TouchableOpacity style={styles.permissionButton} onPress={handleRefresh}>
          <Text style={styles.permissionButtonText}>{t('common.refresh')}</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const styles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background.primary,
    },
    header: {
      paddingHorizontal: spacing.base,
      paddingVertical: spacing.lg,
      backgroundColor: colors.background.elevated,
      borderBottomWidth: 1,
      borderBottomColor: colors.border.light,
    },
    headerContent: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    headerIconContainer: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: colors.primary[50],
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: spacing.md,
    },
    headerTextContainer: {
      flex: 1,
    },
    headerTitle: {
      fontSize: typography.fontSize['2xl'],
      fontWeight: typography.fontWeight.bold,
      color: colors.text.primary,
      marginBottom: spacing.xs / 2,
    },
    headerSubtitle: {
      fontSize: typography.fontSize.sm,
      color: colors.text.secondary,
      fontWeight: typography.fontWeight.medium,
    },
    listContent: {
      padding: spacing.base,
    },
    listContentEmpty: {
      flexGrow: 1,
    },
    smsItem: {
      backgroundColor: colors.background.elevated,
      borderRadius: borderRadius.xl,
      padding: spacing.lg,
      marginBottom: spacing.md,
      ...shadows.md,
      borderWidth: 1,
      borderColor: colors.border.light,
    },
    smsHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: spacing.md,
    },
    smsSenderContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    senderIcon: {
      width: 48,
      height: 48,
      borderRadius: 24,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: spacing.md,
    },
    smsSenderInfo: {
      flex: 1,
    },
    senderNameRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: spacing.xs,
    },
    senderName: {
      fontSize: typography.fontSize.base,
      fontWeight: typography.fontWeight.bold,
      color: colors.text.primary,
      flex: 1,
    },
    processedBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.success[50],
      paddingHorizontal: spacing.sm,
      paddingVertical: 4,
      borderRadius: borderRadius.md,
      marginLeft: spacing.xs,
    },
    processedText: {
      fontSize: typography.fontSize.xs,
      color: colors.success[700],
      fontWeight: typography.fontWeight.semiBold,
      marginLeft: 4,
    },
    smsItemProcessed: {
      opacity: 0.65,
      backgroundColor: colors.neutral[50],
    },
    processedMessage: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.success[50],
      padding: spacing.md,
      borderRadius: borderRadius.md,
      marginTop: spacing.sm,
      borderWidth: 1,
      borderColor: colors.success[200],
    },
    processedMessageText: {
      fontSize: typography.fontSize.sm,
      color: colors.success[700],
      fontWeight: typography.fontWeight.semiBold,
      marginLeft: spacing.xs,
    },
    timeContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 2,
    },
    smsTime: {
      fontSize: typography.fontSize.xs,
      color: colors.text.tertiary,
      marginLeft: 4,
      fontWeight: typography.fontWeight.medium,
    },
    amountBadge: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: borderRadius.lg,
      minWidth: 80,
      alignItems: 'center',
    },
    amountText: {
      fontSize: typography.fontSize.base,
      fontWeight: typography.fontWeight.bold,
      color: '#FFFFFF',
    },
    smsBodyContainer: {
      backgroundColor: colors.background.primary,
      padding: spacing.sm,
      borderRadius: borderRadius.md,
      marginBottom: spacing.md,
    },
    smsBody: {
      fontSize: typography.fontSize.sm,
      color: colors.text.secondary,
      lineHeight: 20,
    },
    infoContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.xs,
      marginBottom: spacing.sm,
    },
    infoBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.primary[50],
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      borderRadius: borderRadius.md,
      borderWidth: 1,
      borderColor: colors.primary[100],
    },
    infoText: {
      fontSize: typography.fontSize.xs,
      color: colors.primary[700],
      marginLeft: spacing.xs,
      fontWeight: typography.fontWeight.medium,
    },
    createButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.base,
      backgroundColor: colors.primary[500],
      borderRadius: borderRadius.lg,
      marginTop: spacing.sm,
    },
    createButtonText: {
      fontSize: typography.fontSize.base,
      fontWeight: typography.fontWeight.semiBold,
      color: colors.neutral[0],
      marginLeft: spacing.sm,
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: spacing['2xl'],
    },
    emptyTitle: {
      fontSize: typography.fontSize.xl,
      fontWeight: typography.fontWeight.bold,
      color: colors.text.primary,
      marginTop: spacing.base,
      marginBottom: spacing.sm,
    },
    emptyText: {
      fontSize: typography.fontSize.base,
      color: colors.text.secondary,
      textAlign: 'center',
      marginBottom: spacing.base,
      lineHeight: 22,
    },
    permissionButton: {
      backgroundColor: colors.primary[500],
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.md,
      borderRadius: borderRadius.lg,
      marginTop: spacing.base,
      ...shadows.md,
    },
    permissionButtonText: {
      fontSize: typography.fontSize.base,
      fontWeight: typography.fontWeight.semiBold,
      color: colors.neutral[0],
    },
  }), [fontScaleVersion]);

  return (
    <View style={[styles.container]}>
      {/* <View style={[styles.header, shadows.sm]}>
        <View style={styles.headerContent}>
          <View style={styles.headerIconContainer}>
            <Ionicons name="mail" size={28} color={colors.primary[500]} />
          </View>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>Bank SMS</Text>
            <Text style={styles.headerSubtitle}>
              {smsList.length} {smsList.length === 1 ? 'transaction' : 'transactions'}
            </Text>
          </View>
        </View>
      </View> */}

      <FlatList
        data={smsList}
        renderItem={renderSmsItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.listContent,
          smsList.length === 0 && styles.listContentEmpty,
        ]}
        ListEmptyComponent={renderEmpty}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={[colors.primary[500]]}
            tintColor={colors.primary[500]}
          />
        }
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

export default BankSmsScreen;
