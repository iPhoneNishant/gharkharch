/**
 * SMS Account Mapping Screen
 * Displays all account mappings (merchant or bank name → account)
 */

import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { colors, spacing, typography, borderRadius, shadows } from '../config/theme';
import { useSmsAccountMappingStore, SmsAccountMapping } from '../stores/smsAccountMappingStore';
import { useAccountStore } from '../stores/accountStore';
import { useAuthStore } from '../stores/authStore';

const SmsAccountMappingScreen: React.FC = () => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const { mappings = [], isLoading, error, subscribeToMappings, deleteMapping } = useSmsAccountMappingStore();
  const { getAccountById } = useAccountStore();

  // Subscribe to mappings when screen is focused
  useFocusEffect(
    useCallback(() => {
      if (!user?.id) {
        console.warn('SmsAccountMappingScreen: No user ID available');
        return;
      }

      const unsubscribe = subscribeToMappings(user.id);
      return () => {
        unsubscribe();
      };
    }, [user?.id, subscribeToMappings])
  );

  const handleDeleteMapping = (mapping: SmsAccountMapping) => {
    Alert.alert(
      t('smsAccountMapping.deleteTitle'),
      `Are you sure you want to delete the mapping for "${mapping.name}"?`,
      [
        {
          text: t('common.cancel'),
          style: 'cancel',
        },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteMapping(mapping.id);
            } catch (error) {
              console.error('Error deleting mapping:', error);
              Alert.alert(
                t('common.error'),
                t('smsAccountMapping.deleteError')
              );
            }
          },
        },
      ]
    );
  };

  const renderMappingItem = ({ item }: { item: SmsAccountMapping }) => {
    const account = getAccountById(item.accountId);

    return (
      <View style={styles.mappingCard}>
        <View style={styles.mappingHeader}>
          <View style={styles.nameInfo}>
            <View style={styles.nameBadge}>
              <Ionicons 
                name="storefront-outline" 
                size={16} 
                color={colors.primary[500]} 
              />
              <Text style={styles.nameText}>{item.name}</Text>
            </View>
          </View>
          <TouchableOpacity
            onPress={() => handleDeleteMapping(item)}
            style={styles.deleteButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="trash-outline" size={20} color={colors.error[500]} />
          </TouchableOpacity>
        </View>

        <View style={styles.accountInfo}>
          {account && (
            <View style={styles.accountRow}>
              <View style={styles.accountLabel}>
                <Ionicons 
                  name="wallet-outline" 
                  size={16} 
                  color={colors.success[500]} 
                />
                <Text style={styles.accountLabelText}>
                  Account
                </Text>
              </View>
              <Text style={styles.accountName}>
                {account.name}
              </Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="link-outline" size={64} color={colors.text.tertiary} />
      <Text style={styles.emptyTitle}>{t('smsAccountMapping.emptyTitle')}</Text>
      <Text style={styles.emptyMessage}>{t('smsAccountMapping.emptyMessage')}</Text>
    </View>
  );

  if (isLoading && mappings.length === 0) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={colors.primary[500]} />
        <Text style={styles.loadingText}>{t('common.loading')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {error && (
        <View style={styles.errorBanner}>
          <Ionicons name="alert-circle-outline" size={20} color={colors.error[500]} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {mappings.length === 0 ? (
        renderEmptyState()
      ) : (
        <FlatList
          data={mappings}
          renderItem={renderMappingItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: insets.bottom + spacing.xl }
          ]}
          ListHeaderComponent={
            <View style={styles.header}>
              <Text style={styles.headerTitle}>
                {t('smsAccountMapping.title')}
              </Text>
              <Text style={styles.headerSubtitle}>
                {mappings.length} {mappings.length === 1 ? 'mapping' : 'mappings'}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.error[50],
    padding: spacing.md,
    margin: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
  },
  errorText: {
    flex: 1,
    fontSize: typography.fontSize.sm,
    color: colors.error[700],
  },
  listContent: {
    padding: spacing.md,
  },
  header: {
    marginBottom: spacing.lg,
  },
  headerTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  headerSubtitle: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
  },
  mappingCard: {
    backgroundColor: colors.background.elevated,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  mappingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  nameInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  nameBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: colors.primary[50],
    borderRadius: borderRadius.sm,
  },
  nameText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.primary[700],
  },
  deleteButton: {
    padding: spacing.xs,
  },
  accountInfo: {
    gap: spacing.sm,
  },
  accountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  accountLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flex: 1,
  },
  accountLabelText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    fontWeight: typography.fontWeight.medium,
  },
  accountName: {
    fontSize: typography.fontSize.sm,
    color: colors.text.primary,
    fontWeight: typography.fontWeight.semiBold,
    flex: 1,
    textAlign: 'right',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.text.primary,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  emptyMessage: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default SmsAccountMappingScreen;
