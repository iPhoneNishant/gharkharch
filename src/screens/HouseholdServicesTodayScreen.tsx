/**
 * Household Services Today Screen
 * View and edit today's status for all services in one place
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import { RootStackParamList } from '../types';
import {
  HouseholdService,
  PriceHistoryEntry,
  QuantityHistoryEntry,
  DailyOverride,
  ServiceLedgerEntry,
  OverrideType,
} from '../types/householdServices';
import {
  getServices,
  subscribeToServices,
  getPriceHistory,
  subscribeToPriceHistory,
  getQuantityHistory,
  subscribeToQuantityHistory,
  getDailyOverrides,
  subscribeToDailyOverrides,
  addDailyOverride,
  deleteDailyOverride,
} from '../services/householdServices/householdServicesService';
import { getTodayInTimezoneSync, setMidnightInTimezoneSync, initializeTimezoneCache, formatDateToISO } from '../services/timezoneService';
import {
  getServiceEntryForDate,
} from '../services/householdServices/calculationEngine';
import { colors, spacing, typography, borderRadius, shadows, addFontScaleListener } from '../config/theme';
import { formatCurrency, DEFAULT_CURRENCY } from '../config/constants';
import { useAuthStore } from '../stores';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const HouseholdServicesTodayScreen: React.FC = () => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const { user } = useAuthStore();
  const currency = user?.currency ?? DEFAULT_CURRENCY;
  const [fontScaleVersion, setFontScaleVersion] = useState(0);

  // Data state
  const [services, setServices] = useState<HouseholdService[]>([]);
  const [priceHistory, setPriceHistory] = useState<PriceHistoryEntry[]>([]);
  const [quantityHistory, setQuantityHistory] = useState<QuantityHistoryEntry[]>([]);
  const [overrides, setOverrides] = useState<DailyOverride[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal state
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [selectedService, setSelectedService] = useState<HouseholdService | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<ServiceLedgerEntry | null>(null);
  const [overrideQuantity, setOverrideQuantity] = useState('');
  const [selectedOverrideType, setSelectedOverrideType] = useState<OverrideType | 'present' | null>(null);
  const [saving, setSaving] = useState(false);

  // Font scaling support
  useEffect(() => {
    const unsub = addFontScaleListener(() => {
      setFontScaleVersion(v => v + 1);
    });
    return () => {
      unsub();
    };
  }, []);

  // Get today's date
  const today = useMemo(() => getTodayInTimezoneSync(), []);

  // Subscribe to data changes
  useEffect(() => {
    initializeTimezoneCache();
    const unsubscribers: Array<() => void> = [];

    // Subscribe to services
    const unsubServices = subscribeToServices(setServices);
    unsubscribers.push(unsubServices);

    // Load price and quantity history for all services
    const loadHistory = async () => {
      setLoading(true);
      try {
        const allPriceHistory: PriceHistoryEntry[] = [];
        const allQuantityHistory: QuantityHistoryEntry[] = [];

        const currentServices = await getServices();
        for (const service of currentServices) {
          const prices = await getPriceHistory(service.id);
          allPriceHistory.push(...prices);

          if (service.billingType === 'DAILY_QUANTITY') {
            const quantities = await getQuantityHistory(service.id);
            allQuantityHistory.push(...quantities);
          }
        }

        setPriceHistory(allPriceHistory);
        setQuantityHistory(allQuantityHistory);
      } catch (error) {
        console.error('Error loading history:', error);
      } finally {
        setLoading(false);
      }
    };

    loadHistory();

    // Subscribe to overrides for today
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const unsubOverrides = subscribeToDailyOverrides(
      today,
      tomorrow,
      setOverrides
    );
    unsubscribers.push(unsubOverrides);

    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }, [today]);

  // Get today's entry for a service
  const getTodayEntry = (service: HouseholdService): ServiceLedgerEntry => {
    return getServiceEntryForDate(
      today,
      service,
      priceHistory.filter(p => p.serviceId === service.id),
      quantityHistory.filter(q => q.serviceId === service.id),
      overrides.filter(o => o.serviceId === service.id)
    );
  };

  // Handle service tap
  const handleServiceTap = (service: HouseholdService) => {
    const entry = getTodayEntry(service);
    setSelectedService(service);
    setSelectedEntry(entry);
    
    // Set initial quantity
    if (entry.hasOverride && entry.overrideType === 'quantity' && entry.quantity) {
      setOverrideQuantity(entry.quantity.toString());
    } else if (entry.quantity) {
      setOverrideQuantity(entry.quantity.toString());
    } else if (service.billingType === 'DAILY_QUANTITY' && service.defaultQuantity) {
      setOverrideQuantity(service.defaultQuantity.toString());
    } else {
      setOverrideQuantity('');
    }
    
    // Set initial override type
    if (entry.hasOverride && entry.overrideType) {
      setSelectedOverrideType(entry.overrideType);
    } else if (entry.status === 'holiday') {
      setSelectedOverrideType('holiday');
    } else if (service.billingType === 'DAILY_QUANTITY') {
      // For DAILY_QUANTITY, default to quantity edit
      setSelectedOverrideType('quantity');
    } else if (entry.status === 'leave') {
      setSelectedOverrideType('leave');
    } else {
      setSelectedOverrideType('present');
    }
    setShowOverrideModal(true);
  };

  // Handle override save
  const handleSaveOverride = async () => {
    if (!selectedService || !selectedEntry || saving) return;

    try {
      setSaving(true);

      if (!selectedOverrideType) {
        Alert.alert(t('common.error'), t('householdServices.pleaseSelectOption', { options: 'Present, Leave, Holiday, etc.' }));
        setSaving(false);
        return;
      }

      // If "Present" is selected, remove any existing override
      if (selectedOverrideType === 'present') {
        if (selectedEntry.hasOverride && selectedEntry.overrideType) {
          const dateStr = await formatDateToISO(today);
          const { formatDateForComparison } = await import('../services/householdServices/calculationEngine');
          const existingOverride = overrides.find(
            o => {
              const overrideDateStr = formatDateForComparison(o.date);
              const targetDateStr = formatDateForComparison(today);
              return o.serviceId === selectedService.id && overrideDateStr === targetDateStr;
            }
          );
          if (existingOverride) {
            await deleteDailyOverride(existingOverride.id);
          }
        }
        setShowOverrideModal(false);
        setSelectedService(null);
        setSelectedEntry(null);
        setSelectedOverrideType(null);
        setOverrideQuantity('');
        setSaving(false);
        return;
      }

      let overrideType: OverrideType = selectedOverrideType;
      let quantity: number | undefined;

      // For quantity override, validate and use the input value
      if (selectedOverrideType === 'quantity' && selectedService.billingType === 'DAILY_QUANTITY') {
        const qty = parseFloat(overrideQuantity);
        if (!isNaN(qty) && qty > 0) {
          quantity = qty;
        } else {
          Alert.alert(t('common.error'), t('householdServices.pleaseEnterValidQuantity'));
          setSaving(false);
          return;
        }
      }

      // For monthly salary, only allow leave or holiday
      if (selectedService.billingType === 'MONTHLY_SALARY') {
        if (selectedOverrideType !== 'leave' && selectedOverrideType !== 'holiday') {
          Alert.alert(t('common.error'), t('householdServices.monthlySalaryOnlyLeaveOrHoliday'));
          setSaving(false);
          return;
        }
      }

      // Format date as YYYY-MM-DD in user's timezone
      const dateStr = await formatDateToISO(today);
      
      // Add or update override
      await addDailyOverride({
        serviceId: selectedService.id,
        date: dateStr,
        overrideType,
        quantity,
      });

      setShowOverrideModal(false);
      setSelectedService(null);
      setSelectedEntry(null);
      setSelectedOverrideType(null);
      setOverrideQuantity('');
      setSaving(false);
    } catch (error: any) {
      console.error('Error saving override:', error);
      Alert.alert(t('common.error'), error.message || t('householdServices.failedToSaveOverride'));
      setSaving(false);
    }
  };

  // Format status display
  const formatStatusDisplay = (entry: ServiceLedgerEntry, service: HouseholdService): string => {
    if (entry.status === 'skip') return `⏭️ ${t('householdServices.skip')}`;
    if (entry.status === 'leave') return `❌ ${t('householdServices.leave')}`;
    if (entry.status === 'holiday') return `🌴 ${t('householdServices.holiday')}`;
    if (entry.status === 'inactive') return `🚫 ${t('householdServices.noService')}`;

    switch (service.billingType) {
      case 'DAILY_QUANTITY':
        if (entry.quantity && entry.price) {
          return `${entry.quantity}${service.unit || 'L'} • ${formatCurrency(entry.amount, currency)}`;
        }
        return formatCurrency(entry.amount, currency);

      case 'DAILY_FIXED':
        return formatCurrency(entry.amount, currency);

      case 'MONTHLY_SALARY':
        return `✅ ${t('householdServices.present')}`;

      default:
        return '';
    }
  };

  // Get status color
  const getStatusColor = (entry: ServiceLedgerEntry): string => {
    switch (entry.status) {
      case 'skip':
        return colors.text.secondary;
      case 'leave':
        return colors.error[500];
      case 'holiday':
        return colors.warning[500];
      case 'inactive':
        return colors.text.tertiary;
      default:
        return colors.text.primary;
    }
  };

  const styles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background.primary,
    },
    header: {
      padding: spacing.base,
      backgroundColor: colors.background.elevated,
      borderBottomWidth: 1,
      borderBottomColor: colors.border.light,
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
    content: {
      padding: spacing.base,
    },
    serviceCard: {
      backgroundColor: colors.background.elevated,
      borderRadius: borderRadius.lg,
      padding: spacing.base,
      marginBottom: spacing.base,
      borderWidth: 1,
      borderColor: colors.border.light,
      ...shadows.sm,
    },
    serviceHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.sm,
    },
    serviceName: {
      fontSize: typography.fontSize.lg,
      fontWeight: typography.fontWeight.semiBold,
      color: colors.text.primary,
      flex: 1,
    },
    serviceType: {
      fontSize: typography.fontSize.xs,
      color: colors.text.secondary,
      marginTop: spacing.xs / 2,
    },
    statusContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: spacing.sm,
    },
    statusText: {
      fontSize: typography.fontSize.base,
      fontWeight: typography.fontWeight.medium,
      flex: 1,
    },
    editButton: {
      padding: spacing.xs,
      marginLeft: spacing.sm,
    },
    emptyState: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: spacing.xl,
    },
    emptyStateText: {
      fontSize: typography.fontSize.base,
      fontWeight: typography.fontWeight.semiBold,
      color: colors.text.primary,
      marginBottom: spacing.sm,
      textAlign: 'center',
    },
    emptyStateSubtext: {
      fontSize: typography.fontSize.sm,
      color: colors.text.secondary,
      textAlign: 'center',
    },
    bottomSheetBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    bottomSheetBackdropTouchable: {
      flex: 1,
    },
    bottomSheet: {
      backgroundColor: colors.background.elevated,
      borderTopLeftRadius: borderRadius.xl,
      borderTopRightRadius: borderRadius.xl,
      maxHeight: Dimensions.get('window').height * 0.85,
    },
    bottomSheetHandle: {
      width: 40,
      height: 4,
      backgroundColor: colors.border.medium,
      borderRadius: 2,
      alignSelf: 'center',
      marginTop: spacing.sm,
      marginBottom: spacing.base,
    },
    bottomSheetHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.base,
      borderBottomWidth: 1,
      borderBottomColor: colors.border.light,
    },
    bottomSheetTitle: {
      fontSize: typography.fontSize.lg,
      fontWeight: typography.fontWeight.semiBold,
      color: colors.text.primary,
      flex: 1,
      marginRight: spacing.base,
    },
    bottomSheetContent: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.base,
    },
    bottomSheetButtons: {
      flexDirection: 'row',
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.base,
      paddingBottom: spacing.lg,
      borderTopWidth: 1,
      borderTopColor: colors.border.light,
    },
    modalLabel: {
      fontSize: typography.fontSize.sm,
      fontWeight: typography.fontWeight.medium,
      color: colors.text.secondary,
      marginBottom: spacing.sm,
      marginTop: spacing.base,
    },
    overrideTypeContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
      marginBottom: spacing.base,
    },
    overrideTypeButton: {
      flex: 1,
      minWidth: '45%',
      padding: spacing.base,
      borderRadius: borderRadius.md,
      borderWidth: 1,
      borderColor: colors.border.medium,
      backgroundColor: colors.background.primary,
      alignItems: 'center',
    },
    overrideTypeButtonSelected: {
      backgroundColor: colors.primary[500],
      borderColor: colors.primary[500],
    },
    overrideTypeButtonText: {
      fontSize: typography.fontSize.base,
      fontWeight: typography.fontWeight.medium,
      color: colors.text.primary,
    },
    overrideTypeButtonTextSelected: {
      color: colors.neutral[0],
    },
    input: {
      borderWidth: 1,
      borderColor: colors.border.medium,
      borderRadius: borderRadius.md,
      padding: spacing.base,
      fontSize: typography.fontSize.base,
      color: colors.text.primary,
      marginBottom: spacing.base,
    },
    inputDisabled: {
      backgroundColor: colors.neutral[100],
      opacity: 0.6,
    },
    button: {
      flex: 1,
      padding: spacing.base,
      borderRadius: borderRadius.md,
      alignItems: 'center',
    },
    buttonPrimary: {
      backgroundColor: colors.primary[500],
    },
    buttonSecondary: {
      backgroundColor: colors.neutral[200],
    },
    buttonText: {
      fontSize: typography.fontSize.base,
      fontWeight: typography.fontWeight.medium,
      color: colors.neutral[0],
    },
    buttonTextSecondary: {
      color: colors.text.primary,
    },
    buttonDanger: {
      backgroundColor: colors.error[500],
    },
    modalHint: {
      fontSize: typography.fontSize.xs,
      color: colors.text.tertiary,
      marginTop: spacing.xs,
      fontStyle: 'italic',
    },
    loadingOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0, 0, 0, 0.3)',
      justifyContent: 'center',
      alignItems: 'center',
      borderRadius: borderRadius.xl,
      zIndex: 1000,
    },
    loadingContainer: {
      backgroundColor: colors.background.elevated,
      borderRadius: borderRadius.lg,
      padding: spacing.xl,
      alignItems: 'center',
      minWidth: 120,
    },
    loadingText: {
      marginTop: spacing.base,
      fontSize: typography.fontSize.base,
      fontWeight: typography.fontWeight.medium,
      color: colors.text.primary,
    },
    buttonDisabled: {
      opacity: 0.6,
    },
  }), [fontScaleVersion]);

  const activeServices = services.filter(s => s.isActive);

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary[500]} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          {today.toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            weekday: 'long',
          })}
        </Text>
      </View>

      <ScrollView 
        style={styles.content}
        contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xl }}
      >
        {activeServices.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>{t('householdServices.noActiveServicesFound')}</Text>
            <Text style={styles.emptyStateSubtext}>{t('householdServices.createServicesInMoreTab')}</Text>
          </View>
        ) : (
          activeServices.map(service => {
            const entry = getTodayEntry(service);
            const statusColor = getStatusColor(entry);
            
            return (
              <TouchableOpacity
                key={service.id}
                style={styles.serviceCard}
                onPress={() => handleServiceTap(service)}
                activeOpacity={0.7}
              >
                <View style={styles.serviceHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.serviceName}>{service.name}</Text>
                    <Text style={styles.serviceType}>
                      {service.billingType.replace('_', ' ')}
                    </Text>
                  </View>
                  <Ionicons name="create-outline" size={20} color={colors.text.tertiary} />
                </View>
                <View style={styles.statusContainer}>
                  <Text style={[styles.statusText, { color: statusColor }]}>
                    {formatStatusDisplay(entry, service)}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      {/* Override Bottom Sheet */}
      <Modal
        visible={showOverrideModal}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setShowOverrideModal(false);
          setSelectedService(null);
          setSelectedEntry(null);
          setSelectedOverrideType(null);
        }}
      >
        <View style={styles.bottomSheetBackdrop}>
          <TouchableOpacity
            style={styles.bottomSheetBackdropTouchable}
            activeOpacity={1}
            onPress={() => {
              setShowOverrideModal(false);
              setSelectedService(null);
              setSelectedEntry(null);
              setSelectedOverrideType(null);
            }}
          />
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
            style={{ flex: 1, justifyContent: 'flex-end' }}
          >
            <View style={[styles.bottomSheet, { paddingBottom: insets.bottom + spacing.lg, maxHeight: Dimensions.get('window').height * 0.85 }]}>
              {saving && (
                <View style={styles.loadingOverlay}>
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.primary[500]} />
                    <Text style={styles.loadingText}>{t('common.saving')}</Text>
                  </View>
                </View>
              )}
              <View style={styles.bottomSheetHandle} />
              <View style={styles.bottomSheetHeader}>
                <Text style={styles.bottomSheetTitle} numberOfLines={1}>
                  {selectedService?.name} - {today.toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    setShowOverrideModal(false);
                    setSelectedService(null);
                    setSelectedEntry(null);
                    setSelectedOverrideType(null);
                  }}
                >
                  <Ionicons name="close" size={24} color={colors.text.primary} />
                </TouchableOpacity>
              </View>
              <View style={styles.bottomSheetContent}>
                {/* Override Type Selection */}
                <Text style={styles.modalLabel}>Mark as:</Text>
                <View style={styles.overrideTypeContainer}>
                  {selectedService?.billingType === 'DAILY_QUANTITY' ? (
                    <>
                      <TouchableOpacity
                        style={[
                          styles.overrideTypeButton,
                          selectedOverrideType === 'quantity' && styles.overrideTypeButtonSelected,
                        ]}
                        onPress={() => setSelectedOverrideType('quantity')}
                      >
                        <Text style={[
                          styles.overrideTypeButtonText,
                          selectedOverrideType === 'quantity' && styles.overrideTypeButtonTextSelected,
                        ]}>
                          {t('householdServices.editQuantity')}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.overrideTypeButton,
                          selectedOverrideType === 'holiday' && styles.overrideTypeButtonSelected,
                        ]}
                        onPress={() => setSelectedOverrideType('holiday')}
                      >
                        <Text style={[
                          styles.overrideTypeButtonText,
                          selectedOverrideType === 'holiday' && styles.overrideTypeButtonTextSelected,
                        ]}>
                          {t('householdServices.holiday')}
                        </Text>
                      </TouchableOpacity>
                    </>
                  ) : selectedService?.billingType === 'MONTHLY_SALARY' ? (
                    <>
                      <TouchableOpacity
                        style={[
                          styles.overrideTypeButton,
                          selectedOverrideType === 'present' && styles.overrideTypeButtonSelected,
                        ]}
                        onPress={() => setSelectedOverrideType('present')}
                      >
                        <Text style={[
                          styles.overrideTypeButtonText,
                          selectedOverrideType === 'present' && styles.overrideTypeButtonTextSelected,
                        ]}>
                          {t('householdServices.present')}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.overrideTypeButton,
                          selectedOverrideType === 'leave' && styles.overrideTypeButtonSelected,
                        ]}
                        onPress={() => setSelectedOverrideType('leave')}
                      >
                        <Text style={[
                          styles.overrideTypeButtonText,
                          selectedOverrideType === 'leave' && styles.overrideTypeButtonTextSelected,
                        ]}>
                          {t('householdServices.leave')}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.overrideTypeButton,
                          selectedOverrideType === 'holiday' && styles.overrideTypeButtonSelected,
                        ]}
                        onPress={() => setSelectedOverrideType('holiday')}
                      >
                        <Text style={[
                          styles.overrideTypeButtonText,
                          selectedOverrideType === 'holiday' && styles.overrideTypeButtonTextSelected,
                        ]}>
                          {t('householdServices.holiday')}
                        </Text>
                      </TouchableOpacity>
                    </>
                  ) : (
                    <>
                      <TouchableOpacity
                        style={[
                          styles.overrideTypeButton,
                          selectedOverrideType === 'present' && styles.overrideTypeButtonSelected,
                        ]}
                        onPress={() => setSelectedOverrideType('present')}
                      >
                        <Text style={[
                          styles.overrideTypeButtonText,
                          selectedOverrideType === 'present' && styles.overrideTypeButtonTextSelected,
                        ]}>
                          {t('householdServices.present')}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.overrideTypeButton,
                          selectedOverrideType === 'leave' && styles.overrideTypeButtonSelected,
                        ]}
                        onPress={() => setSelectedOverrideType('leave')}
                      >
                        <Text style={[
                          styles.overrideTypeButtonText,
                          selectedOverrideType === 'leave' && styles.overrideTypeButtonTextSelected,
                        ]}>
                          {t('householdServices.leave')}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.overrideTypeButton,
                          selectedOverrideType === 'holiday' && styles.overrideTypeButtonSelected,
                        ]}
                        onPress={() => setSelectedOverrideType('holiday')}
                      >
                        <Text style={[
                          styles.overrideTypeButtonText,
                          selectedOverrideType === 'holiday' && styles.overrideTypeButtonTextSelected,
                        ]}>
                          {t('householdServices.holiday')}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.overrideTypeButton,
                          selectedOverrideType === 'skip' && styles.overrideTypeButtonSelected,
                        ]}
                        onPress={() => setSelectedOverrideType('skip')}
                      >
                        <Text style={[
                          styles.overrideTypeButtonText,
                          selectedOverrideType === 'skip' && styles.overrideTypeButtonTextSelected,
                        ]}>
                          {t('householdServices.skip')}
                        </Text>
                      </TouchableOpacity>
                    </>
                  )}
                </View>

                {/* Quantity Input for Daily Quantity services */}
                {selectedService?.billingType === 'DAILY_QUANTITY' && (
                  <>
                    <Text style={styles.modalLabel}>{t('householdServices.quantity')}:</Text>
                    <TextInput
                      style={[styles.input, selectedOverrideType === 'holiday' && styles.inputDisabled]}
                      placeholder={t('householdServices.quantityPlaceholder', { unit: selectedService.unit || '' })}
                      value={overrideQuantity}
                      onChangeText={setOverrideQuantity}
                      keyboardType="numeric"
                      editable={selectedOverrideType !== 'holiday'}
                    />
                    <Text style={styles.modalHint}>
                      {selectedOverrideType === 'quantity' 
                        ? t('householdServices.enterQuantityToOverride')
                        : selectedOverrideType === 'holiday'
                        ? t('householdServices.quantityWillBeIgnored')
                        : t('householdServices.selectEditQuantityOrLeaveHolidaySkip')}
                    </Text>
                  </>
                )}
              </View>

              <View style={[styles.bottomSheetButtons, { paddingBottom: spacing.lg + insets.bottom }]}>
                {selectedEntry?.hasOverride && (
                  <TouchableOpacity
                    style={[styles.button, styles.buttonDanger, { flex: 1, marginRight: spacing.sm }, saving && styles.buttonDisabled]}
                    onPress={async () => {
                      if (saving) return;
                      if (selectedService && selectedEntry?.hasOverride) {
                        const dateStr = await formatDateToISO(today);
                        const { formatDateForComparison } = await import('../services/householdServices/calculationEngine');
                        const existingOverride = overrides.find(
                          o => {
                            const overrideDateStr = formatDateForComparison(o.date);
                            const targetDateStr = formatDateForComparison(today);
                            return o.serviceId === selectedService.id && overrideDateStr === targetDateStr;
                          }
                        );
                        if (existingOverride) {
                          await deleteDailyOverride(existingOverride.id);
                        }
                      }
                      setShowOverrideModal(false);
                      setSelectedService(null);
                      setSelectedEntry(null);
                      setSelectedOverrideType(null);
                    }}
                    disabled={saving}
                  >
                    <Text style={styles.buttonText}>Remove</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={[styles.button, styles.buttonSecondary, { flex: 1, marginRight: spacing.sm }, saving && styles.buttonDisabled]}
                  onPress={() => {
                    if (saving) return;
                    setShowOverrideModal(false);
                    setSelectedService(null);
                    setSelectedEntry(null);
                    setSelectedOverrideType(null);
                  }}
                  disabled={saving}
                >
                  <Text style={[styles.buttonText, styles.buttonTextSecondary]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.button, styles.buttonPrimary, { flex: 1 }, saving && styles.buttonDisabled]}
                  onPress={handleSaveOverride}
                  disabled={saving}
                >
                  <Text style={styles.buttonText}>{saving ?  'Saving...' : 'Save'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
};

export default HouseholdServicesTodayScreen;
