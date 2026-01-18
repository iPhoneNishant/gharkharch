/**
 * Reports List Screen for Gharkharch
 * Shows list of available report types
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { RootStackParamList } from '../types';
import {
  colors,
  typography,
  spacing,
  borderRadius,
  shadows,
} from '../config/theme';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

type ReportScreen =
  | 'SummaryMonthReport'
  | 'SummaryCustomReport'
  | 'TransactionsMonthReport'
  | 'TransactionsCustomReport'
  | 'MonthToMonthReport'
  | 'DayToDayReport';

const ReportsListScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();

  const reportOptions: Array<{
    id: string;
    title: string;
    description: string;
    icon: string;
    screen?: ReportScreen;
    variant?: 'summary' | 'transactions' | 'single';
  }> = [
    {
      id: 'summary',
      title: 'Summary',
      description: 'Category & sub-category summary',
      icon: '📊',
      variant: 'summary',
    },
    {
      id: 'transactions',
      title: 'Transactions',
      description: 'All transactions list for a period',
      icon: '📋',
      variant: 'transactions',
    },
    {
      id: 'month-to-month',
      title: 'Month-to-Month Report',
      description: 'View income and expenses breakdown by month',
      icon: '📅',
      screen: 'MonthToMonthReport',
      variant: 'single',
    },
    {
      id: 'day-to-day',
      title: 'Day-to-Day Report',
      description: 'View income and expenses breakdown by day (max 90 days)',
      icon: '📆',
      screen: 'DayToDayReport',
      variant: 'single',
    },
  ];

  const handleReportPress = (screen: ReportScreen) => {
    navigation.navigate(screen as never);
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={{
          padding: spacing.base,
          paddingBottom: insets.bottom + spacing.xl,
        }}
      >
        <View style={styles.optionsContainer}>
          {reportOptions.map((option) => (
            <TouchableOpacity
              key={option.id}
              style={styles.optionCard}
              onPress={() => {
                if (option.variant === 'summary') return handleReportPress('SummaryMonthReport');
                if (option.variant === 'transactions') return handleReportPress('TransactionsMonthReport');
                if (option.screen) return handleReportPress(option.screen);
              }}
              activeOpacity={0.7}
            >
              <View style={styles.optionIcon}>
                <Text style={styles.iconText}>{option.icon}</Text>
              </View>
              <View style={styles.optionContent}>
                <Text style={styles.optionTitle} numberOfLines={1}>
                  {option.title}
                </Text>
                <Text style={styles.optionDescription} numberOfLines={2}>
                  {option.description}
                </Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  header: {
    marginBottom: spacing.md,
    paddingHorizontal: spacing.xs,
  },
  title: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: typography.fontSize.base,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
  },
  optionsContainer: {
    gap: spacing.sm,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.elevated,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.base,
    paddingHorizontal: spacing.base,
    borderWidth: 1,
    borderColor: colors.border.light,
    ...shadows.sm,
  },
  optionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  iconText: {
    fontSize: 20,
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.text.primary,
    marginBottom: 2,
  },
  optionDescription: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    lineHeight: 18,
  },
  chevron: {
    fontSize: typography.fontSize.xl,
    color: colors.neutral[400],
    marginLeft: spacing.sm,
  },
});

export default ReportsListScreen;
