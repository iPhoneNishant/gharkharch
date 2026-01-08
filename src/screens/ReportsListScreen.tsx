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

const ReportsListScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();

  const reportOptions = [
    {
      id: 'summary-month',
      title: 'Summary Month Wise',
      description: 'View financial summary for a specific month',
      icon: '📊',
      screen: 'SummaryMonthReport' as keyof RootStackParamList,
    },
    {
      id: 'summary-custom',
      title: 'Summary Custom Range',
      description: 'View financial summary for a custom date range',
      icon: '📈',
      screen: 'SummaryCustomReport' as keyof RootStackParamList,
    },
    {
      id: 'transactions-month',
      title: 'Transactions Month Wise',
      description: 'View all transactions for a specific month',
      icon: '📋',
      screen: 'TransactionsMonthReport' as keyof RootStackParamList,
    },
    {
      id: 'transactions-custom',
      title: 'Transactions Custom Range',
      description: 'View all transactions for a custom date range',
      icon: '📑',
      screen: 'TransactionsCustomReport' as keyof RootStackParamList,
    },
  ];

  const handleReportPress = (screen: keyof RootStackParamList) => {
    navigation.navigate(screen);
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={{
          padding: spacing.base,
          paddingBottom: insets.bottom + spacing.xl,
        }}
      >
        <Text style={styles.title}>Reports</Text>
        <Text style={styles.subtitle}>Select a report type to view</Text>

        <View style={styles.optionsContainer}>
          {reportOptions.map((option) => (
            <TouchableOpacity
              key={option.id}
              style={styles.optionCard}
              onPress={() => handleReportPress(option.screen)}
              activeOpacity={0.7}
            >
              <View style={styles.optionIcon}>
                <Text style={styles.iconText}>{option.icon}</Text>
              </View>
              <View style={styles.optionContent}>
                <Text style={styles.optionTitle}>{option.title}</Text>
                <Text style={styles.optionDescription}>{option.description}</Text>
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
  title: {
    fontSize: typography.fontSize.xxl,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: typography.fontSize.base,
    color: colors.text.secondary,
    marginBottom: spacing.xl,
  },
  optionsContainer: {
    gap: spacing.md,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.elevated,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    ...shadows.sm,
  },
  optionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  iconText: {
    fontSize: 28,
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  optionDescription: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
  },
  chevron: {
    fontSize: typography.fontSize.xl,
    color: colors.neutral[400],
    marginLeft: spacing.sm,
  },
});

export default ReportsListScreen;
