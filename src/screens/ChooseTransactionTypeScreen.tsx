/**
 * Choose Transaction Type Screen
 * Shown when adding a transaction from the app (not from Bank SMS).
 * User picks Expense, Income, Transfer, or Return; then goes to Add Transaction with that type fixed.
 */

import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import { RootStackParamList } from '../types';
import {
  colors,
  spacing,
  typography,
  borderRadius,
  shadows,
  addFontScaleListener,
} from '../config/theme';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'ChooseTransactionType'>;
type RouteType = RouteProp<RootStackParamList, 'ChooseTransactionType'>;

const { width } = Dimensions.get('window');
const CARD_SIZE = (width - spacing.lg * 3) / 2;

type TransactionTypeOption = 'expense' | 'income' | 'transfer' | 'return';

const ChooseTransactionTypeScreen: React.FC = () => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteType>();
  const [fontScaleVersion, setFontScaleVersion] = React.useState(0);

  React.useEffect(() => {
    const unsub = addFontScaleListener(() => {
      setFontScaleVersion((v) => v + 1);
    });
    return () => {
      unsub();
    };
  }, []);

  const { prefill, postSaveNavigationTarget } = route.params ?? {};

  const options: { type: TransactionTypeOption; icon: keyof typeof Ionicons.glyphMap; color: string; bgColor: string }[] = useMemo(
    () => [
      {
        type: 'expense',
        icon: 'arrow-up-circle-outline',
        color: colors.expense,
        bgColor: '#FFF3E0',
      },
      {
        type: 'income',
        icon: 'arrow-down-circle-outline',
        color: colors.income,
        bgColor: '#E3F2FD',
      },
      {
        type: 'transfer',
        icon: 'swap-horizontal-outline',
        color: colors.asset,
        bgColor: colors.primary[50],
      },
      {
        type: 'return',
        icon: 'return-down-back-outline',
        color: colors.expense,
        bgColor: '#FFF3E0',
      },
    ],
    []
  );

  const getStyles = (v: number) =>
    StyleSheet.create({
      container: {
        flex: 1,
        backgroundColor: colors.background.primary,
      },
      content: {
        padding: spacing.lg,
        paddingBottom: insets.bottom + spacing.xl,
      },
      header: {
        marginBottom: spacing.xl,
      },
      headerTitle: {
        fontSize: typography.fontSize['2xl'],
        fontWeight: typography.fontWeight.bold,
        color: colors.text.primary,
        marginBottom: spacing.xs,
      },
      headerSubtitle: {
        fontSize: typography.fontSize.base,
        color: colors.text.secondary,
      },
      grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
      },
      cardWrapper: {
        width: '50%',
        alignItems: 'center',
        marginBottom: spacing.base,
      },
      card: {
        width: CARD_SIZE,
        minHeight: CARD_SIZE,
        backgroundColor: colors.background.elevated,
        borderRadius: borderRadius.lg,
        padding: spacing.sm,
        alignItems: 'center',
        justifyContent: 'center',
        ...shadows.md,
      },
      iconContainer: {
        width: 56,
        height: 56,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.base,
      },
      cardTitle: {
        fontSize: typography.fontSize.base,
        fontWeight: typography.fontWeight.semiBold,
        color: colors.text.primary,
        textAlign: 'center',
      },
      cardSubtitle: {
        fontSize: typography.fontSize.sm,
        color: colors.text.secondary,
        textAlign: 'center',
        marginTop: spacing.xs,
        paddingHorizontal: spacing.xs,
      },
    });

  const styles = useMemo(() => getStyles(fontScaleVersion), [fontScaleVersion, insets.bottom]);

  const handleSelect = (type: TransactionTypeOption) => {
    navigation.navigate('AddTransaction', {
      presetTransactionType: type,
      prefill,
      postSaveNavigationTarget,
    });
  };

  const getLabel = (type: TransactionTypeOption) => {
    switch (type) {
      case 'expense':
        return t('addTransaction.expense');
      case 'income':
        return t('addTransaction.income');
      case 'transfer':
        return t('addTransaction.transfer');
      case 'return':
        return t('addTransaction.return');
    }
  };

  const getSubtitle = (type: TransactionTypeOption) => {
    switch (type) {
      case 'expense':
        return t('chooseTransactionType.expenseSubtitle');
      case 'income':
        return t('chooseTransactionType.incomeSubtitle');
      case 'transfer':
        return t('chooseTransactionType.transferSubtitle');
      case 'return':
        return t('chooseTransactionType.returnSubtitle');
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('chooseTransactionType.title')}</Text>
        <Text style={styles.headerSubtitle}>{t('chooseTransactionType.subtitle')}</Text>
      </View>
      <View style={styles.grid}>
        {options.map((opt) => (
          <View key={opt.type} style={styles.cardWrapper}>
            <TouchableOpacity
              style={styles.card}
              onPress={() => handleSelect(opt.type)}
              activeOpacity={0.7}
            >
              <View style={[styles.iconContainer, { backgroundColor: opt.bgColor }]}>
                <Ionicons name={opt.icon} size={28} color={opt.color} />
              </View>
              <Text style={styles.cardTitle}>{getLabel(opt.type)}</Text>
              <Text style={styles.cardSubtitle} numberOfLines={2}>
                {getSubtitle(opt.type)}
              </Text>
            </TouchableOpacity>
          </View>
        ))}
      </View>
    </ScrollView>
  );
};

export default ChooseTransactionTypeScreen;
