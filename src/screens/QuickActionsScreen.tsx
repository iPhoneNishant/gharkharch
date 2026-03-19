/**
 * Quick Actions Screen - Task-based entry point
 * Simple, user-friendly screen with square boxes for common actions
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
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { navigationRef } from '../navigation/navigationRef';
import { Ionicons } from '@expo/vector-icons';

import { RootStackParamList } from '../types';
import { colors, spacing, typography, borderRadius, shadows, addFontScaleListener } from '../config/theme';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const { width } = Dimensions.get('window');
const CARD_SIZE = (width - spacing.lg * 3) / 2; // 2 columns with padding

interface QuickAction {
  id: string;
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  backgroundColor: string;
  onPress: () => void;
}

const QuickActionsScreen: React.FC = () => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const [fontScaleVersion, setFontScaleVersion] = React.useState(0);

  React.useEffect(() => {
    const unsub = addFontScaleListener(() => {
      setFontScaleVersion(v => v + 1);
    });
    return () => {
      unsub();
    };
  }, []);

  const getStyles = (fontScaleVersion: number) => StyleSheet.create({
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
    actionsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
    },
    actionCard: {
      width: CARD_SIZE,
      height: CARD_SIZE,
      backgroundColor: colors.background.elevated,
      borderRadius: borderRadius.lg,
      padding: spacing.lg,
      marginBottom: spacing.base,
      alignItems: 'center',
      justifyContent: 'center',
      ...shadows.md,
    },
    actionCardWrapper: {
      width: '100%',
      alignItems: 'center',
    },
    actionIconContainer: {
      width: 56,
      height: 56,
      borderRadius: borderRadius.full,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.base,
    },
    actionIcon: {
      fontSize: 28,
    },
    actionTitle: {
      fontSize: typography.fontSize.base,
      fontWeight: typography.fontWeight.semiBold,
      color: colors.text.primary,
      textAlign: 'center',
      marginTop: spacing.xs,
    },
  });

  const styles = useMemo(() => getStyles(fontScaleVersion), [fontScaleVersion, insets.bottom]);

  const quickActions: QuickAction[] = useMemo(() => [
    {
        id: 'view-transactions',
        title: t('quickActions.viewTransactions'),
        icon: 'list-outline',
        color: colors.neutral[0],
        backgroundColor: colors.warning,
        onPress: () => {
          // Navigate to AddTransaction tab which shows transaction list
          const tabNavigation = navigation.getParent();
          if (tabNavigation) {
            (tabNavigation as any).navigate('ChooseTransactionType');
          }
        },
      },
      {
        id: 'bank-sms',
        title: t('quickActions.bankSms'),
        icon: 'chatbubble-outline',
        color: colors.neutral[0],
        backgroundColor: colors.primary[600],
        onPress: () => {
          const tabNavigation = navigation.getParent();
          if (tabNavigation) {
            (tabNavigation as any).navigate('BankSms');
          }
        },
      },
    {
      id: 'household-services',
      title: t('quickActions.householdServices'),
      icon: 'home-outline',
      color: colors.neutral[0],
      backgroundColor: colors.success,
      onPress: () => navigation.navigate('HouseholdServicesToday'),
    },
    {
      id: 'manage-household-services',
      title: t('quickActions.manageHouseholdServices'),
      icon: 'settings-outline',
      color: colors.neutral[0],
      backgroundColor: colors.primary[400],
      onPress: () => navigation.navigate('HouseholdServicesManagement'),
    },
    {
      id: 'view-accounts',
      title: t('quickActions.viewAccounts'),
      icon: 'wallet-outline',
      color: colors.neutral[0],
      backgroundColor: colors.info,
      onPress: () => navigation.navigate('Accounts'),
    },
    {
      id: 'create-account',
      title: t('quickActions.createAccount'),
      icon: 'add-circle-outline',
      color: colors.neutral[0],
      backgroundColor: colors.primary[500],
      onPress: () => navigation.navigate('AddAccount'),
    },
    {
      id: 'repeat-transaction',
      title: t('quickActions.repeatTransaction'),
      icon: 'repeat-outline',
      color: colors.neutral[0],
      backgroundColor: colors.primary[300],
      onPress: () => navigation.navigate('RecurringTransactions'),
    },
    ], [t, navigation]);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.actionsGrid}>
        {quickActions.map((action, index) => {
          const isLastItem = index === quickActions.length - 1;
          const isOddCount = quickActions.length % 2 === 1;
          const shouldCenter = isLastItem && isOddCount;
          
          const card = (
            <TouchableOpacity
              style={styles.actionCard}
              onPress={action.onPress}
              activeOpacity={0.7}
            >
              <View style={[styles.actionIconContainer, { backgroundColor: action.backgroundColor }]}>
                <Ionicons name={action.icon} size={28} color={action.color} />
              </View>
              <Text style={styles.actionTitle}>{action.title}</Text>
            </TouchableOpacity>
          );
          
          if (shouldCenter) {
            return (
              <View key={action.id} style={styles.actionCardWrapper}>
                {card}
              </View>
            );
          }
          
          return <View key={action.id}>{card}</View>;
        })}
      </View>
    </ScrollView>
  );
};

export default QuickActionsScreen;
