/**
 * Household Services History Screen
 * View price or quantity history for a service
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRoute } from '@react-navigation/native';
import { RouteProp } from '@react-navigation/native';

import { RootStackParamList } from '../types';
import {
  HouseholdService,
  PriceHistoryEntry,
  QuantityHistoryEntry,
} from '../types/householdServices';
import {
  getPriceHistory,
  getQuantityHistory,
} from '../services/householdServices/householdServicesService';
import { setMidnightInTimezoneSync, getTodayInTimezoneSync, initializeTimezoneCache } from '../services/timezoneService';
import { colors, spacing, typography, borderRadius, addFontScaleListener } from '../config/theme';
import { formatCurrency, DEFAULT_CURRENCY } from '../config/constants';

type HouseholdServicesHistoryRouteProp = RouteProp<RootStackParamList, 'HouseholdServicesHistory'>;

const HouseholdServicesHistoryScreen: React.FC = () => {
  const { t } = useTranslation();
  const route = useRoute<HouseholdServicesHistoryRouteProp>();
  const insets = useSafeAreaInsets();
  const { service, historyType } = route.params;
  const [fontScaleVersion, setFontScaleVersion] = useState(0);

  const [priceHistory, setPriceHistory] = useState<PriceHistoryEntry[]>([]);
  const [quantityHistory, setQuantityHistory] = useState<QuantityHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // Font scaling support
  useEffect(() => {
    const unsub = addFontScaleListener(() => {
      setFontScaleVersion(v => v + 1);
    });
    return () => {
      unsub();
    };
  }, []);

  useEffect(() => {
    initializeTimezoneCache();
    loadHistory();
  }, [service.id, historyType]);

  const loadHistory = async () => {
    setLoading(true);
    try {
      if (historyType === 'price') {
        const history = await getPriceHistory(service.id);
        setPriceHistory(history);
      } else {
        const history = await getQuantityHistory(service.id);
        setQuantityHistory(history);
      }
    } catch (error: any) {
      console.error('Error loading history:', error);
    } finally {
      setLoading(false);
    }
  };

  const styles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background.primary,
    },
    centerContent: {
      justifyContent: 'center',
      alignItems: 'center',
    },
    loadingText: {
      fontSize: typography.fontSize.base,
      color: colors.text.secondary,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      padding: spacing.base,
      paddingBottom: spacing.xl,
    },
    historyItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: spacing.base,
      borderBottomWidth: 1,
      borderBottomColor: colors.border.light,
    },
    historyItemLeft: {
      flex: 1,
    },
    historyItemValue: {
      fontSize: typography.fontSize.base,
      fontWeight: typography.fontWeight.semiBold,
      color: colors.text.primary,
    },
    historyItemDate: {
      fontSize: typography.fontSize.sm,
      color: colors.text.secondary,
      marginTop: spacing.xs,
    },
    historyItemRight: {
      alignItems: 'flex-end',
    },
    emptyHistory: {
      padding: spacing.xl,
      alignItems: 'center',
      justifyContent: 'center',
    },
    emptyHistoryText: {
      fontSize: typography.fontSize.base,
      color: colors.text.secondary,
    },
  }), [fontScaleVersion]);

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={colors.primary[500]} />
        <Text style={[styles.loadingText, { marginTop: spacing.base }]}>
          Loading history...
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={true}
      >
        {historyType === 'price' ? (
          priceHistory && priceHistory.length > 0 ? (
            priceHistory.map((entry, index) => {
              const today = getTodayInTimezoneSync();
              const effectiveDate = setMidnightInTimezoneSync(new Date(entry.effectiveDate));
              const isCurrent = effectiveDate <= today;

              return (
                <View key={entry.id || index} style={styles.historyItem}>
                  <View style={styles.historyItemLeft}>
                    <Text style={styles.historyItemValue}>
                      {formatCurrency(entry.price, DEFAULT_CURRENCY)}
                    </Text>
                    <Text style={styles.historyItemDate}>
                      {t('householdServices.effectiveFrom')}: {entry.effectiveDate.toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </Text>
                  </View>
                  <View style={styles.historyItemRight}>
                    {isCurrent && (
                      <Text style={[styles.historyItemDate, { color: colors.primary[500] }]}>
                        {t('householdServices.current')}
                      </Text>
                    )}
                  </View>
                </View>
              );
            })
          ) : (
            <View style={styles.emptyHistory}>
              <Text style={styles.emptyHistoryText}>{t('householdServices.noPriceHistoryFound')}</Text>
            </View>
          )
        ) : (
          quantityHistory && quantityHistory.length > 0 ? (
            quantityHistory.map((entry, index) => {
              const today = getTodayInTimezoneSync();
              const effectiveDate = setMidnightInTimezoneSync(new Date(entry.effectiveDate));
              const isCurrent = effectiveDate <= today;

              return (
                <View key={entry.id || index} style={styles.historyItem}>
                  <View style={styles.historyItemLeft}>
                    <Text style={styles.historyItemValue}>
                      {entry.quantity} {service.unit || ''}
                    </Text>
                    <Text style={styles.historyItemDate}>
                      {t('householdServices.effectiveFrom')}: {entry.effectiveDate.toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </Text>
                  </View>
                  <View style={styles.historyItemRight}>
                    {isCurrent && (
                      <Text style={[styles.historyItemDate, { color: colors.primary[500] }]}>
                        {t('householdServices.current')}
                      </Text>
                    )}
                  </View>
                </View>
              );
            })
          ) : (
            <View style={styles.emptyHistory}>
              <Text style={styles.emptyHistoryText}>{t('householdServices.noQuantityHistoryFound')}</Text>
            </View>
          )
        )}
      </ScrollView>

    </View>
  );
};

export default HouseholdServicesHistoryScreen;
