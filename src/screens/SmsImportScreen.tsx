/**
 * SMS Import Screen (Android-first)
 * Lets user paste a bank SMS and converts it into a prefilled Add Transaction flow.
 */

import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Platform, Alert, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { RootStackParamList } from '../types';
import { colors, spacing, typography, borderRadius, shadows } from '../config/theme';
import { parseBankSms } from '../utils/smsParser';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const SmsImportScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const [smsText, setSmsText] = useState('');

  const parsed = useMemo(() => parseBankSms(smsText), [smsText]);

  const canContinue = !!parsed.amount && smsText.trim().length > 0;

  const handleContinue = () => {
    if (Platform.OS !== 'android') {
      Alert.alert('Not Available', 'SMS import is currently available on Android only.');
      return;
    }
    if (!parsed.amount) {
      Alert.alert('Could not detect amount', 'Please paste a complete bank SMS that contains an amount (e.g. INR 123.45).');
      return;
    }

    navigation.navigate('AddTransaction', {
      prefill: {
        amount: parsed.amount,
        note: parsed.note,
        date: (parsed.date ?? new Date()).toISOString(),
      },
    });
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ padding: spacing.base, paddingBottom: insets.bottom + spacing.xl }}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.card}>
        <Text style={styles.title}>Import from SMS</Text>
        <Text style={styles.subtitle}>
          Paste a bank SMS below. We’ll detect amount/date and open Add Transaction with prefilled values.
        </Text>

        <Text style={styles.label}>SMS Text</Text>
        <TextInput
          value={smsText}
          onChangeText={setSmsText}
          style={styles.textArea}
          placeholder="Paste your SMS here…"
          placeholderTextColor={colors.text.tertiary}
          multiline
          textAlignVertical="top"
          autoCapitalize="none"
        />

        <View style={styles.previewRow}>
          <View style={styles.previewItem}>
            <Text style={styles.previewLabel}>Amount</Text>
            <Text style={styles.previewValue}>{parsed.amount ? `₹${parsed.amount}` : '—'}</Text>
          </View>
          <View style={styles.previewItem}>
            <Text style={styles.previewLabel}>Date</Text>
            <Text style={styles.previewValue}>
              {parsed.date ? parsed.date.toLocaleDateString() : '—'}
            </Text>
          </View>
          <View style={styles.previewItem}>
            <Text style={styles.previewLabel}>Type</Text>
            <Text style={styles.previewValue}>
              {parsed.direction === 'unknown' ? '—' : parsed.direction}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.cta, !canContinue && styles.ctaDisabled]}
          onPress={handleContinue}
          disabled={!canContinue}
          activeOpacity={0.8}
        >
          <Text style={[styles.ctaText, !canContinue && styles.ctaTextDisabled]}>Create Transaction</Text>
        </TouchableOpacity>

        <Text style={styles.helper}>
          Note: this does not read your inbox automatically; it only parses the SMS text you paste.
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  card: {
    backgroundColor: colors.background.elevated,
    borderRadius: borderRadius.lg,
    padding: spacing.base,
    ...shadows.sm,
  },
  title: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    marginBottom: spacing.base,
  },
  label: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  textArea: {
    minHeight: 140,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border.light,
    padding: spacing.sm,
    fontSize: typography.fontSize.sm,
    color: colors.text.primary,
    backgroundColor: colors.background.primary,
    marginBottom: spacing.base,
  },
  previewRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.base,
  },
  previewItem: {
    flex: 1,
    backgroundColor: colors.neutral[50],
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  previewLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.text.secondary,
    marginBottom: 2,
  },
  previewValue: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.text.primary,
  },
  cta: {
    backgroundColor: colors.primary[500],
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  ctaDisabled: {
    backgroundColor: colors.neutral[200],
  },
  ctaText: {
    color: colors.background.primary,
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semiBold,
  },
  ctaTextDisabled: {
    color: colors.text.secondary,
  },
  helper: {
    marginTop: spacing.base,
    fontSize: typography.fontSize.xs,
    color: colors.text.tertiary,
  },
});

export default SmsImportScreen;

