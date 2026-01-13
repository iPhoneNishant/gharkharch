/**
 * Styles for DashboardScreen
 * Extracted for better organization and maintainability
 */

import { StyleSheet } from 'react-native';
import { colors, typography, spacing, borderRadius, shadows } from '../../config/theme';

export const dashboardScreenStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  netWorthCard: {
    backgroundColor: colors.primary[500],
    margin: spacing.sm,
    marginHorizontal: spacing.base,
    padding: spacing.base,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    ...shadows.md,
  },
  netWorthLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.primary[100],
    marginBottom: spacing.xs / 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  netWorthValue: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: typography.fontWeight.bold,
    color: colors.neutral[0],
    marginBottom: spacing.sm,
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
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.neutral[0],
  },
  quickActions: {
    paddingHorizontal: spacing.base,
    marginBottom: spacing.md,
  },
  addButton: {
    backgroundColor: colors.secondary[500],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    ...shadows.sm,
  },
  addButtonIcon: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.neutral[900],
    marginRight: spacing.xs,
  },
  addButtonText: {
    fontSize: typography.fontSize.sm,
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
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.text.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  emptyState: {
    backgroundColor: colors.background.elevated,
    borderRadius: borderRadius.md,
    padding: spacing.base,
    alignItems: 'center',
    ...shadows.sm,
  },
  emptyStateText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  emptyStateSubtext: {
    fontSize: typography.fontSize.xs,
    color: colors.text.tertiary,
    textAlign: 'center',
  },
  accountsList: {
    backgroundColor: colors.background.elevated,
    borderRadius: borderRadius.md,
    ...shadows.sm,
  },
  accountItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    paddingVertical: spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  accountIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  accountIconText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.bold,
  },
  accountInfo: {
    flex: 1,
    marginRight: spacing.sm,
  },
  accountName: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.primary,
  },
  accountCategory: {
    fontSize: typography.fontSize.xs,
    color: colors.text.tertiary,
    marginTop: 1,
  },
  accountBalance: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.asset,
  },
  liabilityBalance: {
    color: colors.liability,
  },
});
