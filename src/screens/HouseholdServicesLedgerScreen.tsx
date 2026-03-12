/**
 * Household Services Ledger Screen
 * Displays monthly ledger view with all services
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
import DateTimePicker from '@react-native-community/datetimepicker';

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
  generateMonthlyLedger,
  getServiceEntryForDate,
  calculateMonthlySalary,
  getOverrideForDate,
} from '../services/householdServices/calculationEngine';
import { colors, spacing, typography, borderRadius, shadows, addFontScaleListener } from '../config/theme';
import { formatCurrency, DEFAULT_CURRENCY } from '../config/constants';
import { useAuthStore } from '../stores';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const HouseholdServicesLedgerScreen: React.FC = () => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const { user } = useAuthStore();
  const currency = user?.currency ?? DEFAULT_CURRENCY;
  const [fontScaleVersion, setFontScaleVersion] = useState(0);

  // Current month/year state
  const [currentDate, setCurrentDate] = useState(new Date());
  const month = currentDate.getMonth() + 1;
  const year = currentDate.getFullYear();

  // Data state
  const [services, setServices] = useState<HouseholdService[]>([]);
  const [priceHistory, setPriceHistory] = useState<PriceHistoryEntry[]>([]);
  const [quantityHistory, setQuantityHistory] = useState<QuantityHistoryEntry[]>([]);
  const [overrides, setOverrides] = useState<DailyOverride[]>([]);
  const [loading, setLoading] = useState(true);

  // Selected service state
  const [selectedService, setSelectedService] = useState<HouseholdService | null>(null);
  const [showServicePicker, setShowServicePicker] = useState(false);

  // Modal state
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [showMonthlyCalculationModal, setShowMonthlyCalculationModal] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<{
    date: Date;
    service: HouseholdService;
    entry: ServiceLedgerEntry;
  } | null>(null);
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

  // Calculate allowed date range (current month - 2 to current month + 1)
  const today = getTodayInTimezoneSync();
  const currentMonth = today.getMonth() + 1;
  const currentYear = today.getFullYear();
  
  const minDate = useMemo(() => {
    // First day of (current month - 2)
    const minMonth = currentMonth - 2;
    const minYear = minMonth <= 0 ? currentYear - 1 : currentYear;
    const adjustedMinMonth = minMonth <= 0 ? minMonth + 12 : minMonth;
    return new Date(minYear, adjustedMinMonth - 1, 1);
  }, [currentMonth, currentYear]);
  
  const maxDate = useMemo(() => {
    // First day of (current month + 1) for comparison
    const maxMonth = currentMonth + 1;
    const maxYear = maxMonth > 12 ? currentYear + 1 : currentYear;
    const adjustedMaxMonth = maxMonth > 12 ? maxMonth - 12 : maxMonth;
    return new Date(maxYear, adjustedMaxMonth - 1, 1); // First day of the month
  }, [currentMonth, currentYear]);

  // Ensure currentDate is within allowed range
  useEffect(() => {
    const currentMonthNum = currentDate.getMonth() + 1;
    const currentYearNum = currentDate.getFullYear();
    const currentDateMonth = new Date(currentYearNum, currentMonthNum - 1, 1);
    
    if (currentDateMonth.getTime() < minDate.getTime()) {
      setCurrentDate(new Date(minDate));
    } else if (currentDateMonth.getTime() > maxDate.getTime()) {
      setCurrentDate(new Date(maxDate));
    }
  }, [minDate, maxDate, currentDate]);

  // Check if navigation buttons should be disabled
  const canGoPrevious = useMemo(() => {
    const currentMonthNum = currentDate.getMonth() + 1;
    const currentYearNum = currentDate.getFullYear();
    const currentDateMonth = new Date(currentYearNum, currentMonthNum - 1, 1);
    return currentDateMonth.getTime() > minDate.getTime();
  }, [currentDate, minDate]);

  const canGoNext = useMemo(() => {
    const currentMonthNum = currentDate.getMonth() + 1;
    const currentYearNum = currentDate.getFullYear();
    const currentDateMonth = new Date(currentYearNum, currentMonthNum - 1, 1);
    return currentDateMonth.getTime() < maxDate.getTime();
  }, [currentDate, maxDate]);

  // Calculate date range for the month
  const startDate = useMemo(() => new Date(year, month - 1, 1), [year, month]);
  const endDate = useMemo(() => new Date(year, month, 0), [year, month]);

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

    // Subscribe to overrides for current month
    const unsubOverrides = subscribeToDailyOverrides(
      startDate,
      endDate,
      setOverrides
    );
    unsubscribers.push(unsubOverrides);

    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }, [startDate, endDate]);

  // Auto-select first service when services are loaded
  useEffect(() => {
    if (services.length > 0 && !selectedService) {
      const activeServices = services.filter(s => s.isActive);
      if (activeServices.length > 0) {
        setSelectedService(activeServices[0]);
      }
    }
  }, [services, selectedService]);

  // Generate ledger entries for selected service
  const ledgerEntries = useMemo(() => {
    if (!selectedService) return [];

    const daysInMonth = endDate.getDate();
    const entries: Array<{ date: Date; entry: ServiceLedgerEntry }> = [];

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month - 1, day);
      const entry = getServiceEntryForDate(
        date,
        selectedService,
        priceHistory.filter(p => p.serviceId === selectedService.id),
        quantityHistory.filter(q => q.serviceId === selectedService.id),
        overrides.filter(o => o.serviceId === selectedService.id)
      );
      entries.push({ date, entry });
    }

    return entries;
  }, [selectedService, priceHistory, quantityHistory, overrides, year, month, endDate]);

  // Calculate today's entry for all services
  const todayEntry = useMemo(() => {
    if (!selectedService) {
      return null;
    }
    const today = getTodayInTimezoneSync();
    return getServiceEntryForDate(
      today,
      selectedService,
      priceHistory.filter(p => p.serviceId === selectedService.id),
      quantityHistory.filter(q => q.serviceId === selectedService.id),
      overrides.filter(o => o.serviceId === selectedService.id)
    );
  }, [selectedService, priceHistory, quantityHistory, overrides]);

  // Handle entry tap
  const handleEntryTap = (date: Date, service: HouseholdService, entry: ServiceLedgerEntry) => {
    setSelectedEntry({ date, service, entry });
    
    // Set initial quantity - use override quantity if available, otherwise use entry quantity or default
    if (entry.hasOverride && entry.overrideType === 'quantity' && entry.quantity) {
      setOverrideQuantity(entry.quantity.toString());
    } else if (entry.quantity) {
      setOverrideQuantity(entry.quantity.toString());
    } else if (service.billingType === 'DAILY_QUANTITY' && service.defaultQuantity) {
      setOverrideQuantity(service.defaultQuantity.toString());
    } else {
      setOverrideQuantity('');
    }
    
    // Set initial override type based on entry status
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
      setSelectedOverrideType(null);
    }
    setShowOverrideModal(true);
  };

  // Handle override save
  const handleSaveOverride = async () => {
    if (!selectedEntry || saving) return;

    const { date, service, entry } = selectedEntry;

    try {
      setSaving(true);

      // Determine override type and quantity
      if (!selectedOverrideType) {
        const options = service.billingType === 'MONTHLY_SALARY' 
          ? t('householdServices.leaveOrHoliday')
          : t('householdServices.leaveHolidayEditQuantityOrSkip');
        Alert.alert(t('common.error'), t('householdServices.pleaseSelectOption', { options }));
        setSaving(false);
        return;
      }

      // If "Present" is selected, remove any existing override
      if (selectedOverrideType === 'present') {
        if (entry.hasOverride && entry.overrideType) {
          // Find override by comparing date strings (YYYY-MM-DD format) in user's timezone
          const dateStr = await formatDateToISO(date);
          const { formatDateForComparison } = await import('../services/householdServices/calculationEngine');
          const existingOverride = overrides.find(
            o => {
              const overrideDateStr = formatDateForComparison(o.date);
              const targetDateStr = formatDateForComparison(date);
              return o.serviceId === service.id && overrideDateStr === targetDateStr;
            }
          );
          if (existingOverride) {
            await deleteDailyOverride(existingOverride.id);
          }
        }
        setShowOverrideModal(false);
        setSelectedEntry(null);
        setSelectedOverrideType(null);
        setOverrideQuantity('');
        setSaving(false);
        return;
      }

      let overrideType: OverrideType = selectedOverrideType;
      let quantity: number | undefined;

      // For quantity override, validate and use the input value (only for DAILY_QUANTITY)
      if (selectedOverrideType === 'quantity' && service.billingType === 'DAILY_QUANTITY') {
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
      if (service.billingType === 'MONTHLY_SALARY') {
        if (selectedOverrideType !== 'leave' && selectedOverrideType !== 'holiday') {
          Alert.alert(t('common.error'), t('householdServices.monthlySalaryOnlyLeaveOrHoliday'));
          setSaving(false);
          return;
        }
      }

      // Format date as YYYY-MM-DD in user's timezone
      const dateStr = await formatDateToISO(date);

      
      // Add or update override (addDailyOverride handles existing override updates)
      await addDailyOverride({
        serviceId: service.id,
        date: dateStr,
        overrideType,
        quantity,
      });

      setShowOverrideModal(false);
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

  // Handle remove override
  const handleRemoveOverride = async () => {
    if (!selectedEntry || saving) return;

    const { date, service, entry } = selectedEntry;

    try {
      setSaving(true);

      if (entry.hasOverride && entry.overrideType) {
        // Find override by comparing date strings (YYYY-MM-DD format) in user's timezone
        const dateStr = await formatDateToISO(date);
        const { formatDateForComparison } = await import('../services/householdServices/calculationEngine');
        const existingOverride = overrides.find(
          o => {
            const overrideDateStr = formatDateForComparison(o.date);
            const targetDateStr = formatDateForComparison(date);
            return o.serviceId === service.id && overrideDateStr === targetDateStr;
          }
        );
        if (existingOverride) {
          await deleteDailyOverride(existingOverride.id);
        }
      }

      setShowOverrideModal(false);
      setSelectedEntry(null);
      setSelectedOverrideType(null);
      setOverrideQuantity('');
      setSaving(false);
    } catch (error: any) {
      console.error('Error removing override:', error);
      Alert.alert(t('common.error'), error.message || t('householdServices.failedToRemoveOverride'));
      setSaving(false);
    }
  };

  // Format entry display
  const formatEntryDisplay = (entry: ServiceLedgerEntry, service: HouseholdService): string => {
    if (entry.status === 'skip') return t('householdServices.skip');
    if (entry.status === 'leave') return t('householdServices.leave');
    if (entry.status === 'holiday') return t('householdServices.holiday');

    switch (service.billingType) {
      case 'DAILY_QUANTITY':
        if (entry.quantity && entry.price) {
          return `${entry.quantity}${service.unit || 'L'} ${formatCurrency(entry.amount, currency)}`;
        }
        return formatCurrency(entry.amount, currency);

      case 'DAILY_FIXED':
        return formatCurrency(entry.amount, currency);

      case 'MONTHLY_SALARY':
        return '✓';

      default:
        return '';
    }
  };

  // Get entry background color
  const getEntryBackgroundColor = (entry: ServiceLedgerEntry): string => {
    switch (entry.status) {
      case 'skip':
        return colors.neutral[200];
      case 'leave':
        return colors.warning[100];
      case 'holiday':
        return colors.info[100];
      default:
        return colors.background.elevated;
    }
  };

  const styles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background.primary,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: spacing.base,
      backgroundColor: colors.background.elevated,
      borderBottomWidth: 1,
      borderBottomColor: colors.border.light,
    },
    monthSelector: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.base,
    },
    monthText: {
      fontSize: typography.fontSize.lg,
      fontWeight: typography.fontWeight.semiBold,
      color: colors.text.primary,
      minWidth: 150,
      textAlign: 'center',
    },
    tableContainer: {
      flex: 1,
    },
    tableHeader: {
      flexDirection: 'row',
      backgroundColor: colors.primary[500],
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.xs,
    },
    headerCell: {
      flex: 1,
      padding: spacing.xs,
      borderRightWidth: 1,
      borderRightColor: colors.neutral[0],
    },
    headerText: {
      fontSize: typography.fontSize.sm,
      fontWeight: typography.fontWeight.semiBold,
      color: colors.neutral[0],
      textAlign: 'center',
    },
    dateCell: {
      width: 60,
      padding: spacing.xs,
      borderRightWidth: 1,
      borderRightColor: colors.neutral[0],
    },
    dateText: {
      fontSize: typography.fontSize.sm,
      fontWeight: typography.fontWeight.medium,
      color: colors.neutral[0],
      textAlign: 'center',
    },
    row: {
      flexDirection: 'row',
      borderBottomWidth: 1,
      borderBottomColor: colors.border.light,
    },
    dateColumn: {
      width: 60,
      padding: spacing.xs,
      backgroundColor: colors.background.secondary,
      borderRightWidth: 1,
      borderRightColor: colors.border.light,
      justifyContent: 'center',
    },
    dateTextRow: {
      fontSize: typography.fontSize.sm,
      fontWeight: typography.fontWeight.medium,
      color: colors.text.primary,
      textAlign: 'center',
    },
    entryCell: {
      flex: 1,
      padding: spacing.xs,
      borderRightWidth: 1,
      borderRightColor: colors.border.light,
      minHeight: 40,
      justifyContent: 'center',
    },
    entryText: {
      fontSize: typography.fontSize.xs,
      color: colors.text.primary,
      textAlign: 'center',
    },
    totalRow: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: colors.background.elevated,
      padding: spacing.base,
      borderTopWidth: 2,
      borderTopColor: colors.primary[500],
      ...shadows.md,
      zIndex: 10,
    },
    totalRowContent: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: spacing.sm,
    },
    totalRowText: {
      flex: 1,
    },
    totalLabel: {
      fontSize: typography.fontSize.base,
      fontWeight: typography.fontWeight.semiBold,
      color: colors.text.primary,
      marginBottom: spacing.xs / 2,
    },
    totalAmount: {
      fontSize: typography.fontSize.lg,
      fontWeight: typography.fontWeight.bold,
      color: colors.primary[500],
    },
    createTransactionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primary[500],
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.base,
      borderRadius: borderRadius.md,
      gap: spacing.xs,
    },
    createTransactionButtonDisabled: {
      backgroundColor: colors.neutral[200],
      opacity: 0.6,
    },
    createTransactionButtonText: {
      fontSize: typography.fontSize.sm,
      fontWeight: typography.fontWeight.semiBold,
      color: colors.neutral[0],
    },
    createTransactionButtonTextDisabled: {
      color: colors.text.tertiary,
    },
    modalContainer: {
      flex: 1,
      justifyContent: 'flex-end',
    },
    modalBackdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    modalContent: {
      backgroundColor: colors.background.elevated,
      borderRadius: borderRadius.lg,
      padding: spacing.lg,
      width: '90%',
      maxWidth: 400,
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
      paddingBottom: spacing.base,
      borderTopWidth: 1,
      borderTopColor: colors.border.light,
    },
    modalTitle: {
      fontSize: typography.fontSize.lg,
      fontWeight: typography.fontWeight.semiBold,
      color: colors.text.primary,
      marginBottom: spacing.base,
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
    modalButtons: {
      flexDirection: 'row',
      gap: spacing.base,
      marginTop: spacing.base,
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
    serviceSelectorContainer: {
      padding: spacing.base,
      backgroundColor: colors.background.elevated,
      borderBottomWidth: 1,
      borderBottomColor: colors.border.light,
    },
    serviceSelector: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: spacing.base,
      backgroundColor: colors.background.primary,
      borderRadius: borderRadius.md,
      borderWidth: 1,
      borderColor: colors.border.medium,
    },
    serviceSelectorLabel: {
      fontSize: typography.fontSize.base,
      fontWeight: typography.fontWeight.medium,
      color: colors.text.secondary,
      marginRight: spacing.sm,
    },
    serviceSelectorValue: {
      flex: 1,
      fontSize: typography.fontSize.base,
      fontWeight: typography.fontWeight.semiBold,
      color: colors.text.primary,
    },
    listContainer: {
      flex: 1,
    },
    serviceInfoHeader: {
      marginHorizontal: spacing.base,
      marginTop: spacing.base,
      marginBottom: spacing.md,
      padding: spacing.lg,
      backgroundColor: colors.background.elevated,
      borderRadius: borderRadius.xl,
      borderWidth: 1,
      borderColor: colors.border.light,
      ...shadows.sm,
    },
    serviceInfoTitle: {
      fontSize: typography.fontSize.lg,
      fontWeight: typography.fontWeight.bold,
      color: colors.text.primary,
      marginBottom: spacing.xs,
    },
    serviceInfoSubtitle: {
      fontSize: typography.fontSize.sm,
      color: colors.text.secondary,
      marginTop: spacing.xs / 2,
    },
    todayInfoHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: spacing.md,
      paddingBottom: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.border.light,
    },
    todayInfoHeaderIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.primary[50],
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: spacing.sm,
    },
    todayInfoHeaderText: {
      flex: 1,
    },
    todayInfoHeaderTitle: {
      fontSize: typography.fontSize.base,
      fontWeight: typography.fontWeight.semiBold,
      color: colors.text.primary,
      marginBottom: spacing.xs / 2,
    },
    todayInfoHeaderSubtitle: {
      fontSize: typography.fontSize.xs,
      color: colors.text.secondary,
    },
    todayInfoContainer: {
      marginTop: spacing.base,
      padding: spacing.base,
      backgroundColor: colors.background.secondary,
      borderRadius: borderRadius.md,
      borderWidth: 1,
      borderColor: colors.border.light,
    },
    todayInfoRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.xs,
      borderRadius: borderRadius.sm,
      marginBottom: spacing.xs,
    },
    todayInfoRowLast: {
      marginBottom: 0,
    },
    todayInfoLabel: {
      fontSize: typography.fontSize.sm,
      fontWeight: typography.fontWeight.medium,
      color: colors.text.secondary,
      flex: 1,
    },
    todayInfoValue: {
      fontSize: typography.fontSize.base,
      fontWeight: typography.fontWeight.semiBold,
      color: colors.text.primary,
      flex: 1,
      textAlign: 'right',
    },
    editTodayButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: spacing.sm,
      paddingVertical: spacing.xs,
      paddingHorizontal: spacing.base,
      backgroundColor: colors.background.primary,
      borderRadius: borderRadius.md,
      borderWidth: 1,
      borderColor: colors.primary[500],
      gap: spacing.xs,
    },
    editTodayButtonText: {
      fontSize: typography.fontSize.sm,
      fontWeight: typography.fontWeight.medium,
      color: colors.primary[500],
    },
    ledgerItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: spacing.base,
      borderBottomWidth: 1,
      borderBottomColor: colors.border.light,
    },
    ledgerItemLeft: {
      width: 70,
      marginRight: spacing.base,
    },
    ledgerItemDate: {
      fontSize: typography.fontSize.base,
      fontWeight: typography.fontWeight.semiBold,
      color: colors.text.primary,
    },
    ledgerItemDay: {
      fontSize: typography.fontSize.xs,
      color: colors.text.secondary,
      marginTop: spacing.xs / 2,
    },
    ledgerItemCenter: {
      flex: 1,
      marginRight: spacing.base,
    },
    ledgerItemDisplay: {
      fontSize: typography.fontSize.sm,
      color: colors.text.primary,
      marginBottom: spacing.xs / 2,
    },
    ledgerItemStatus: {
      fontSize: typography.fontSize.xs,
      color: colors.text.secondary,
      fontStyle: 'italic',
    },
    ledgerItemRight: {
      alignItems: 'flex-end',
    },
    ledgerItemAmount: {
      fontSize: typography.fontSize.base,
      fontWeight: typography.fontWeight.semiBold,
      color: colors.text.primary,
    },
    emptyStateText: {
      fontSize: typography.fontSize.base,
      fontWeight: typography.fontWeight.semiBold,
      color: colors.text.primary,
      marginBottom: spacing.sm,
    },
    emptyStateSubtext: {
      fontSize: typography.fontSize.sm,
      color: colors.text.secondary,
      textAlign: 'center',
    },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.base,
      paddingVertical: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.border.light,
    },
    modalCancel: {
      fontSize: typography.fontSize.base,
      color: colors.primary[500],
      minWidth: 60,
    },
    serviceOption: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: spacing.base,
      borderBottomWidth: 1,
      borderBottomColor: colors.border.light,
    },
    serviceOptionLeft: {
      flex: 1,
    },
    serviceOptionName: {
      fontSize: typography.fontSize.base,
      fontWeight: typography.fontWeight.semiBold,
      color: colors.text.primary,
      marginBottom: spacing.xs / 2,
    },
    serviceOptionType: {
      fontSize: typography.fontSize.sm,
      color: colors.text.secondary,
    },
    buttonDanger: {
      backgroundColor: colors.error[500],
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
    modalHint: {
      fontSize: typography.fontSize.xs,
      color: colors.text.tertiary,
      marginTop: spacing.xs,
      fontStyle: 'italic',
    },
    monthlySalaryInfo: {
      marginTop: spacing.base,
      padding: spacing.base,
      backgroundColor: colors.primary[50],
      borderRadius: borderRadius.md,
    },
    viewCalculationHeaderButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: spacing.sm,
      padding: spacing.sm,
      paddingHorizontal: spacing.base,
      backgroundColor: colors.primary[500],
      borderRadius: borderRadius.md,
      gap: spacing.xs,
      alignSelf: 'flex-start',
    },
    viewCalculationHeaderButtonText: {
      fontSize: typography.fontSize.sm,
      fontWeight: typography.fontWeight.semiBold,
      color: colors.neutral[0],
    },
    calculationCard: {
      backgroundColor: colors.background.elevated,
      borderRadius: borderRadius.lg,
      padding: spacing.lg,
      marginBottom: spacing.base,
      borderWidth: 1,
      borderColor: colors.border.light,
    },
    calculationCardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: spacing.base,
    },
    calculationServiceName: {
      fontSize: typography.fontSize.lg,
      fontWeight: typography.fontWeight.bold,
      color: colors.text.primary,
      flex: 1,
    },
    calculationBadge: {
      backgroundColor: colors.primary[100],
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      borderRadius: borderRadius.sm,
    },
    calculationBadgeText: {
      fontSize: typography.fontSize.xs,
      fontWeight: typography.fontWeight.medium,
      color: colors.primary[700],
    },
    calculationRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: spacing.sm,
    },
    calculationLabel: {
      fontSize: typography.fontSize.base,
      color: colors.text.secondary,
      flex: 1,
    },
    calculationValue: {
      fontSize: typography.fontSize.base,
      fontWeight: typography.fontWeight.semiBold,
      color: colors.text.primary,
    },
    calculationDivider: {
      height: 1,
      backgroundColor: colors.border.light,
      marginVertical: spacing.sm,
    },
    calculationFinalRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingTop: spacing.sm,
      marginTop: spacing.xs,
      borderTopWidth: 2,
      borderTopColor: colors.primary[500],
    },
    calculationFinalLabel: {
      fontSize: typography.fontSize.lg,
      fontWeight: typography.fontWeight.bold,
      color: colors.text.primary,
    },
    calculationFinalValue: {
      fontSize: typography.fontSize.xl,
      fontWeight: typography.fontWeight.bold,
      color: colors.primary[500],
    },
    leaveDatesContainer: {
      marginTop: spacing.base,
      paddingTop: spacing.base,
      borderTopWidth: 1,
      borderTopColor: colors.border.light,
    },
    leaveDatesTitle: {
      fontSize: typography.fontSize.sm,
      fontWeight: typography.fontWeight.medium,
      color: colors.text.secondary,
      marginBottom: spacing.sm,
    },
    leaveDatesList: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.xs,
    },
    leaveDateChip: {
      backgroundColor: colors.warning[100],
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      borderRadius: borderRadius.sm,
    },
    leaveDateText: {
      fontSize: typography.fontSize.xs,
      color: colors.warning[700],
      fontWeight: typography.fontWeight.medium,
    },
    monthlyCalendarContainer: {
      marginTop: spacing.base,
      paddingTop: spacing.base,
      borderTopWidth: 1,
      borderTopColor: colors.border.light,
    },
    monthlyCalendarTitle: {
      fontSize: typography.fontSize.base,
      fontWeight: typography.fontWeight.semiBold,
      color: colors.text.primary,
      marginBottom: spacing.base,
    },
    monthlyCalendarTable: {
      borderWidth: 1,
      borderColor: colors.border.medium,
      borderRadius: borderRadius.md,
      overflow: 'hidden',
    },
    monthlyCalendarHeader: {
      flexDirection: 'row',
      backgroundColor: colors.primary[50],
      padding: spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: colors.border.medium,
    },
    monthlyCalendarHeaderTextLeft: {
        flex: 1,
        fontSize: typography.fontSize.sm,
        fontWeight: typography.fontWeight.semiBold,
        color: colors.text.primary,
      },
    monthlyCalendarHeaderText: {
      flex: 1,
      fontSize: typography.fontSize.sm,
      fontWeight: typography.fontWeight.semiBold,
      color: colors.text.primary,
      textAlign: 'center',
    },
    monthlyCalendarRow: {
      flexDirection: 'row',
      padding: spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: colors.border.light,
      alignItems: 'center',
    },
    monthlyCalendarDate: {
      flex: 1,
      fontSize: typography.fontSize.sm,
      color: colors.text.primary,
    },
    monthlyCalendarStatus: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
    },
    monthlyCalendarEmoji: {
      fontSize: typography.fontSize.base,
    },
    monthlyCalendarStatusText: {
      fontSize: typography.fontSize.sm,
      fontWeight: typography.fontWeight.medium,
      flex: 1,
    },
    monthlyCalendarQuantity: {
      flex: 1,
      fontSize: typography.fontSize.sm,
      fontWeight: typography.fontWeight.medium,
      color: colors.text.primary,
      textAlign: 'center',
    },
    monthlyCalendarPrice: {
      flex: 1,
      fontSize: typography.fontSize.sm,
      fontWeight: typography.fontWeight.semiBold,
      color: colors.text.primary,
      textAlign: 'right',
    },
    monthlyCalendarAmount: {
      flex: 1,
      fontSize: typography.fontSize.sm,
      fontWeight: typography.fontWeight.semiBold,
      color: colors.text.primary,
      textAlign: 'right',
    },
    monthlyCalendarEditButton: {
      padding: spacing.xs,
      marginLeft: spacing.sm,
      alignItems: 'center',
      justifyContent: 'center',
    },
  }), [fontScaleVersion, insets]);

  const activeServices = services.filter(s => s.isActive);
  const monthlyTotal = useMemo(() => {
    const today = getTodayInTimezoneSync();
    const isCurrentMonth = month === today.getMonth() + 1 && year === today.getFullYear();
    
    // If current month, only calculate till today; otherwise calculate for full month
    if (isCurrentMonth) {
      return ledgerEntries
        .filter(({ date }) => {
          const entryDate = setMidnightInTimezoneSync(new Date(date));
          return entryDate <= today;
        })
        .reduce((sum, { entry }) => sum + entry.amount, 0);
    } else {
      return ledgerEntries.reduce((sum, { entry }) => sum + entry.amount, 0);
    }
  }, [ledgerEntries, month, year]);

  // Calculate final salary for monthly salary services
  const finalSalary = useMemo(() => {
    if (!selectedService || selectedService.billingType !== 'MONTHLY_SALARY') {
      return null;
    }
    
    const today = getTodayInTimezoneSync();
    const isCurrentMonth = month === today.getMonth() + 1 && year === today.getFullYear();
    const endDate = isCurrentMonth ? today : undefined;
    
    try {
      const calculation = calculateMonthlySalary(
        month,
        year,
        selectedService,
        overrides.filter(o => o.serviceId === selectedService.id),
        endDate
      );
      return calculation.finalSalary;
    } catch (error) {
      return null;
    }
  }, [selectedService, month, year, overrides]);

  // Handle create transaction from ledger
  const handleCreateTransaction = () => {
    if (!selectedService) return;
    
    const today = getTodayInTimezoneSync();
    const amount = selectedService.billingType === 'MONTHLY_SALARY' && finalSalary !== null
      ? finalSalary
      : monthlyTotal;
    
    // Check if amount is zero
    if (amount === 0) {
      Alert.alert(
        t('common.error'),
        t('householdServices.cannotCreateTransactionWithZeroAmount') || 'Cannot create transaction with zero amount. Please add entries for this month.',
        [{ text: t('common.ok') || 'OK' }]
      );
      return;
    }
    
    // Round amount to 2 decimal places
    const roundedAmount = Math.round(amount * 100) / 100;
    
    const monthName = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const note = `${selectedService.name} - ${monthName}`;
    
    // Get parent navigator to navigate to AddTransaction
    const parent = navigation.getParent();
    if (parent) {
      parent.navigate('AddTransaction', {
        prefill: {
          amount: roundedAmount,
          note: note,
          date: today.toISOString(),
          serviceId: selectedService.id,
        },
        postSaveNavigationTarget: 'HouseholdServicesLedger',
      });
    } else {
      navigation.navigate('AddTransaction', {
        prefill: {
          amount: roundedAmount,
          note: note,
          date: today.toISOString(),
          serviceId: selectedService.id,
        },
        postSaveNavigationTarget: 'HouseholdServicesLedger',
      });
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary[500]} />
      </View>
    );
  }

  if (activeServices.length === 0) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', padding: spacing.xl }]}>
        <Text style={styles.emptyStateText}>{t('householdServices.noActiveServicesFound')}</Text>
        <Text style={styles.emptyStateSubtext}>{t('householdServices.createServicesInMoreTab')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => {
            if (canGoPrevious) {
              const prevMonth = new Date(year, month - 2, 1);
              setCurrentDate(prevMonth);
            }
          }}
          disabled={!canGoPrevious}
          style={!canGoPrevious ? { opacity: 0.5 } : undefined}
        >
          <Ionicons name="chevron-back" size={24} color={canGoPrevious ? colors.text.primary : colors.text.tertiary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.monthSelector}
          onPress={() => setShowDatePicker(true)}
        >
          <Text style={styles.monthText}>
            {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => {
            if (canGoNext) {
              const nextMonth = new Date(year, month, 1);
              setCurrentDate(nextMonth);
            }
          }}
          disabled={!canGoNext}
          style={!canGoNext ? { opacity: 0.5 } : undefined}
        >
          <Ionicons name="chevron-forward" size={24} color={canGoNext ? colors.text.primary : colors.text.tertiary} />
        </TouchableOpacity>
      </View>

      {/* Service Selector */}
      <View style={styles.serviceSelectorContainer}>
        <TouchableOpacity
          style={styles.serviceSelector}
          onPress={() => setShowServicePicker(true)}
        >
          <Text style={styles.serviceSelectorLabel}>Service:</Text>
          <Text style={styles.serviceSelectorValue}>
            {selectedService?.name || t('householdServices.selectService')}
          </Text>
          <Ionicons name="chevron-down" size={20} color={colors.text.secondary} />
        </TouchableOpacity>
      </View>

      {selectedService ? (
        <View style={{ flex: 1 }}>
        <ScrollView style={styles.listContainer} contentContainerStyle={{ paddingBottom: 120 + insets.bottom }}>
          {/* Service Info Header - Today's Info */}
          {todayEntry && (
            <View style={styles.serviceInfoHeader}>
              {/* Header with Icon */}
              <View style={styles.todayInfoHeader}>
                <View style={styles.todayInfoHeaderIcon}>
                  <Ionicons name="today-outline" size={20} color={colors.primary[500]} />
                </View>
                <View style={styles.todayInfoHeaderText}>
                  <Text style={styles.todayInfoHeaderTitle}>{t('householdServices.todaysInfo')}</Text>
                  <Text style={styles.todayInfoHeaderSubtitle}>
                    {selectedService.name} • {todayEntry.date.toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </Text>
                </View>
              </View>

              {/* Info Rows */}
              {selectedService.billingType === 'DAILY_QUANTITY' ? (
                <>
                  <View style={styles.todayInfoRow}>
                    <Text style={styles.todayInfoLabel}>{t('householdServices.quantity')}</Text>
                    <Text style={styles.todayInfoValue}>
                      {todayEntry.quantity || 0} {selectedService.unit || ''}
                    </Text>
                  </View>
                  <View style={styles.todayInfoRow}>
                    <Text style={styles.todayInfoLabel}>{t('householdServices.price')}</Text>
                    <Text style={styles.todayInfoValue}>
                      {todayEntry.price ? formatCurrency(todayEntry.price, currency) : '-'}
                    </Text>
                  </View>
                  <View style={[styles.todayInfoRow, styles.todayInfoRowLast]}>
                    <Text style={styles.todayInfoLabel}>{t('householdServices.total')}</Text>
                    <Text style={[styles.todayInfoValue, { color: colors.primary[500] }]}>
                      {formatCurrency(todayEntry.amount, currency)}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.editTodayButton}
                    onPress={() => {
                      const today = getTodayInTimezoneSync();
                      handleEntryTap(today, selectedService, todayEntry);
                    }}
                  >
                    <Ionicons name="pencil-outline" size={16} color={colors.primary[500]} />
                    <Text style={styles.editTodayButtonText}>{t('common.edit')}</Text>
                  </TouchableOpacity>
                </>
              ) : selectedService.billingType === 'DAILY_FIXED' ? (
                <>
                  <View style={[styles.todayInfoRow, styles.todayInfoRowLast]}>
                    <Text style={styles.todayInfoLabel}>{t('householdServices.amount')}</Text>
                    <Text style={[styles.todayInfoValue, { color: colors.primary[500] }]}>
                      {todayEntry.price ? formatCurrency(todayEntry.price, currency) : '-'}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.editTodayButton}
                    onPress={() => {
                      const today = getTodayInTimezoneSync();
                      handleEntryTap(today, selectedService, todayEntry);
                    }}
                  >
                    <Ionicons name="pencil-outline" size={16} color={colors.primary[500]} />
                    <Text style={styles.editTodayButtonText}>{t('common.edit')}</Text>
                  </TouchableOpacity>
                </>
              ) : selectedService.billingType === 'MONTHLY_SALARY' ? (
                <>
                  <View style={styles.todayInfoRow}>
                    <Text style={styles.todayInfoLabel}>{t('householdServices.status')}</Text>
                    <Text style={styles.todayInfoValue}>
                      {todayEntry.status === 'leave' ? `❌ ${t('householdServices.leave')}` :
                       todayEntry.status === 'holiday' ? `🌴 ${t('householdServices.holiday')}` :
                       todayEntry.status === 'skip' ? `⏭️ ${t('householdServices.skip')}` :
                       todayEntry.status === 'inactive' ? `🚫 ${t('householdServices.noService')}` :
                       `✅ ${t('householdServices.present')}`}
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm }}>
                    <TouchableOpacity
                      style={[styles.editTodayButton, { flex: 1 }]}
                      onPress={() => {
                        const today = getTodayInTimezoneSync();
                        handleEntryTap(today, selectedService, todayEntry);
                      }}
                    >
                      <Ionicons name="pencil-outline" size={16} color={colors.primary[500]} />
                      <Text style={styles.editTodayButtonText}>{t('common.edit')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.viewCalculationHeaderButton}
                      onPress={() => setShowMonthlyCalculationModal(true)}
                    >
                      <Ionicons name="calculator-outline" size={18} color={colors.neutral[0]} />
                      <Text style={styles.viewCalculationHeaderButtonText}>{t('householdServices.viewMonthlyCalculation')}</Text>
                    </TouchableOpacity>
                  </View>
                </>
              ) : null}
            </View>
          )}

          {/* Ledger Entries Table */}
          <View style={styles.monthlyCalendarContainer}>
            <View style={styles.monthlyCalendarTable}>
              <View style={styles.monthlyCalendarHeader}>
                <Text style={styles.monthlyCalendarHeaderTextLeft}>{t('householdServices.date')}</Text>
                {selectedService.billingType === 'DAILY_QUANTITY' ? (
                  <>
                    <Text style={styles.monthlyCalendarHeaderText}>{t('householdServices.quantity')}</Text>
                    <Text style={styles.monthlyCalendarHeaderText}>{t('householdServices.price')}</Text>
                    <Text style={styles.monthlyCalendarHeaderText}>{t('householdServices.total')}</Text>
                  </>
                ) : selectedService.billingType === 'MONTHLY_SALARY' ? (
                  <Text style={styles.monthlyCalendarHeaderText}>{t('householdServices.status')}</Text>
                ) : (
                  <>
                    <Text style={styles.monthlyCalendarHeaderText}>{selectedService.name}</Text>
                    <Text style={styles.monthlyCalendarHeaderText}>{t('householdServices.amount')}</Text>
                  </>
                )}
              </View>
              {ledgerEntries.map(({ date, entry }, index) => {
                const todayTz = getTodayInTimezoneSync();
                const dateOnly = setMidnightInTimezoneSync(new Date(date));
                
                const isFuture = dateOnly > todayTz;

                let status: string;
                let statusEmoji: string = '✅';
                let statusColor: string;
                let showEmoji = true;
                
                if (entry.status === 'inactive') {
                  status = t('householdServices.noService');
                  statusEmoji = '🚫';
                  statusColor = colors.text.tertiary;
                } else if (entry.status === 'leave') {
                  status = t('householdServices.leave');
                  statusEmoji = '❌';
                  statusColor = colors.error[500];
                } else if (entry.status === 'holiday') {
                  status = t('householdServices.holiday');
                  statusEmoji = '🌴';
                  statusColor = colors.warning[500];
                } else if (entry.status === 'skip') {
                  status = t('householdServices.skip');
                  statusEmoji = '⏭️';
                  statusColor = colors.text.secondary;
                } else if (isFuture && !entry.hasOverride) {
                  // Only show future if there's no override set
                  status = t('householdServices.future');
                  statusEmoji = '⏳';
                  statusColor = colors.text.tertiary;
                } else {
                  // Active/Present
                  if (selectedService.billingType === 'MONTHLY_SALARY') {
                    status = t('householdServices.present');
                    statusEmoji = '✅';
                    statusColor = typeof colors.success === 'string' ? colors.success : (colors.success?.[500] || colors.primary[500]);
                  } else if (selectedService.billingType === 'DAILY_QUANTITY') {
                    // For DAILY_QUANTITY, if quantity > 0, don't show emoji
                    if (entry.quantity && entry.quantity > 0) {
                      showEmoji = false;
                      status = `${entry.quantity}${selectedService.unit || 'L'}`;
                      statusColor = colors.text.primary;
                    } else {
                      status = formatEntryDisplay(entry, selectedService);
                      statusEmoji = '✅';
                      statusColor = colors.text.primary;
                    }
                  } else {
                    // For other services, show the entry details
                    status = formatEntryDisplay(entry, selectedService);
                    statusEmoji = '✅';
                    statusColor = colors.text.primary;
                  }
                }
                
                return (
                  <View
                    key={index}
                    style={styles.monthlyCalendarRow}
                  >
                    <Text style={styles.monthlyCalendarDate}>
                      {date.getDate()} {date.toLocaleDateString('en-IN', { month: 'short' })}
                    </Text>
                    {selectedService.billingType === 'DAILY_QUANTITY' ? (
                      <>
                        <Text style={[styles.monthlyCalendarQuantity, { color: statusColor }]} numberOfLines={1}>
                          {showEmoji && <Text style={styles.monthlyCalendarEmoji}>{statusEmoji}</Text>}
                          {status}
                        </Text>
                        <Text style={styles.monthlyCalendarPrice}>
                          {entry.price ? formatCurrency(entry.price, currency) : '-'}
                        </Text>
                        <Text style={styles.monthlyCalendarAmount}>
                          {isFuture ? t('householdServices.future') : formatCurrency(entry.amount, currency)}
                        </Text>
                      </>
                    ) : selectedService.billingType === 'MONTHLY_SALARY' ? (
                      <View style={styles.monthlyCalendarStatus}>
                        <Text style={styles.monthlyCalendarEmoji}>{statusEmoji}</Text>
                        <Text style={[styles.monthlyCalendarStatusText, { color: statusColor || colors.text.primary }]} numberOfLines={1}>
                          {status}
                        </Text>
                      </View>
                    ) : (
                      <>
                        <View style={styles.monthlyCalendarStatus}>
                          <Text style={styles.monthlyCalendarEmoji}>{statusEmoji}</Text>
                          <Text style={[styles.monthlyCalendarStatusText, { color: statusColor }]} numberOfLines={1}>
                            {status}
                          </Text>
                        </View>
                        <Text style={styles.monthlyCalendarAmount}>
                          {formatCurrency(entry.amount, currency)}
                        </Text>
                      </>
                    )}
                    <TouchableOpacity
                      style={styles.monthlyCalendarEditButton}
                      onPress={() => {
                        handleEntryTap(date, selectedService, entry);
                      }}
                    >
                      <Ionicons name="create-outline" size={18} color={colors.primary[500]} />
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          </View>

        </ScrollView>
        
        {/* Monthly Total / Final Salary - Sticky Footer */}
        <View style={[styles.totalRow, { paddingBottom: spacing.base + insets.bottom }]}>
          <View style={styles.totalRowContent}>
            <View style={styles.totalRowText}>
              <Text style={styles.totalLabel}>
                {selectedService?.billingType === 'MONTHLY_SALARY' ? (
                  t('householdServices.finalSalary')
                ) : (
                  (() => {
                    const today = getTodayInTimezoneSync();
                    const isCurrentMonth = month === today.getMonth() + 1 && year === today.getFullYear();
                    return isCurrentMonth ? t('householdServices.totalTillDate') : t('householdServices.monthlyTotal');
                  })()
                )}
              </Text>
              <Text style={styles.totalAmount}>
                {selectedService?.billingType === 'MONTHLY_SALARY' && finalSalary !== null
                  ? formatCurrency(finalSalary, currency)
                  : formatCurrency(monthlyTotal, currency)}
              </Text>
            </View>
            <TouchableOpacity
              style={[
                styles.createTransactionButton,
                ((selectedService?.billingType === 'MONTHLY_SALARY' && finalSalary === 0) ||
                 (selectedService?.billingType !== 'MONTHLY_SALARY' && monthlyTotal === 0)) &&
                styles.createTransactionButtonDisabled
              ]}
              onPress={handleCreateTransaction}
            >
              <Ionicons 
                name="add-circle-outline" 
                size={20} 
                color={
                  ((selectedService?.billingType === 'MONTHLY_SALARY' && finalSalary === 0) ||
                   (selectedService?.billingType !== 'MONTHLY_SALARY' && monthlyTotal === 0))
                    ? colors.text.tertiary
                    : colors.neutral[0]
                } 
              />
              <Text style={[
                styles.createTransactionButtonText,
                ((selectedService?.billingType === 'MONTHLY_SALARY' && finalSalary === 0) ||
                 (selectedService?.billingType !== 'MONTHLY_SALARY' && monthlyTotal === 0)) &&
                styles.createTransactionButtonTextDisabled
              ]}>
                {t('householdServices.createTransaction')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
        </View>
      ) : (
        <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', padding: spacing.xl }]}>
          <Text style={styles.emptyStateText}>Please select a service</Text>
        </View>
      )}

      {/* Service Picker Modal */}
      <Modal
        visible={showServicePicker}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowServicePicker(false)}
      >
        <View style={[styles.modalContainer, { paddingTop: insets.top }]}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowServicePicker(false)}>
              <Text style={styles.modalCancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{t('householdServices.selectService')}</Text>
            <View style={{ width: 60 }} />
          </View>
          <ScrollView
            contentContainerStyle={{ paddingBottom: insets.bottom }}
          >
            {activeServices.map((service) => (
              <TouchableOpacity
                key={service.id}
                style={styles.serviceOption}
                onPress={() => {
                  setSelectedService(service);
                  setShowServicePicker(false);
                }}
              >
                <View style={styles.serviceOptionLeft}>
                  <Text style={styles.serviceOptionName}>{service.name}</Text>
                  <Text style={styles.serviceOptionType}>
                    {service.billingType.replace('_', ' ')}
                  </Text>
                </View>
                {selectedService?.id === service.id && (
                  <Ionicons name="checkmark" size={24} color={colors.primary[500]} />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </Modal>

      {/* Date Picker Modal */}
      {showDatePicker && Platform.OS === 'ios' && (
        <Modal
          visible={showDatePicker}
          transparent
          animationType="slide"
          onRequestClose={() => setShowDatePicker(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <DateTimePicker
                value={currentDate}
                mode="date"
                display="spinner"
                minimumDate={minDate}
                maximumDate={maxDate}
                onChange={(event, date) => {
                  if (date) {
                    // Ensure the selected date is within allowed range
                    const selectedMonth = date.getMonth() + 1;
                    const selectedYear = date.getFullYear();
                    const selectedDateMonth = new Date(selectedYear, selectedMonth - 1, 1);
                    
                    if (selectedDateMonth >= minDate && selectedDateMonth <= maxDate) {
                      setCurrentDate(date);
                    }
                  }
                  setShowDatePicker(false);
                }}
              />
            </View>
          </View>
        </Modal>
      )}

      {/* Override Bottom Sheet */}
      <Modal
        visible={showOverrideModal}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setShowOverrideModal(false);
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
              setSelectedEntry(null);
              setSelectedOverrideType(null);
            }}
          />
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1, justifyContent: 'flex-end' }}
          >
            <View style={[styles.bottomSheet, { paddingBottom: insets.bottom }]}>
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
                  {selectedEntry?.service.name} - {selectedEntry?.date.toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    setShowOverrideModal(false);
                    setSelectedEntry(null);
                    setSelectedOverrideType(null);
                  }}
                >
                  <Ionicons name="close" size={24} color={colors.text.primary} />
                </TouchableOpacity>
              </View>
              <ScrollView
                style={styles.bottomSheetContent}
                contentContainerStyle={{ flexGrow: 1 }}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                nestedScrollEnabled={false}
              >

              {/* Override Type Selection */}
              <Text style={styles.modalLabel}>Mark as:</Text>
              <View style={styles.overrideTypeContainer}>
                {selectedEntry?.service.billingType === 'DAILY_QUANTITY' ? (
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
                ) : selectedEntry?.service.billingType === 'MONTHLY_SALARY' ? (
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
              {selectedEntry?.service.billingType === 'DAILY_QUANTITY' && (
                <>
                  <Text style={styles.modalLabel}>{t('householdServices.quantity')}:</Text>
                  <TextInput
                    style={[styles.input, selectedOverrideType === 'holiday' && styles.inputDisabled]}
                    placeholder={t('householdServices.quantityPlaceholder', { unit: selectedEntry.service.unit || '' })}
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

              {/* Monthly Salary Info */}
              {selectedEntry?.service.billingType === 'MONTHLY_SALARY' && (
                <View style={styles.monthlySalaryInfo}>
                  <Text style={styles.modalHint}>
                    Marking leave/holiday/vacation will affect the monthly salary calculation.
                  </Text>
                </View>
              )}
              </ScrollView>

              <View style={styles.bottomSheetButtons}>
                {selectedEntry?.entry.hasOverride && (
                  <TouchableOpacity
                    style={[styles.button, styles.buttonDanger, { flex: 1, marginRight: spacing.sm }, saving && styles.buttonDisabled]}
                    onPress={handleRemoveOverride}
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
                  <Text style={styles.buttonText}>{saving ? t('common.saving') : 'Save'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {showDatePicker && Platform.OS === 'android' && (
        <DateTimePicker
          value={currentDate}
          mode="date"
          display="default"
          minimumDate={minDate}
          maximumDate={maxDate}
          onChange={(event, date) => {
            setShowDatePicker(false);
            if (date) {
              // Ensure the selected date is within allowed range
              const selectedMonth = date.getMonth() + 1;
              const selectedYear = date.getFullYear();
              const selectedDateMonth = new Date(selectedYear, selectedMonth - 1, 1);
              
              if (selectedDateMonth >= minDate && selectedDateMonth <= maxDate) {
                setCurrentDate(date);
              }
            }
          }}
        />
      )}

      {/* Monthly Calculation Bottom Sheet */}
      <Modal
        visible={showMonthlyCalculationModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowMonthlyCalculationModal(false)}
      >
        <View style={styles.bottomSheetBackdrop}>
          <TouchableOpacity
            style={styles.bottomSheetBackdropTouchable}
            activeOpacity={1}
            onPress={() => setShowMonthlyCalculationModal(false)}
          />
          <View style={[styles.bottomSheet, { paddingBottom: insets.bottom, maxHeight: Dimensions.get('window').height * 0.85 }]}>
            <View style={styles.bottomSheetHandle} />
            <View style={styles.bottomSheetHeader}>
              <Text style={styles.bottomSheetTitle} numberOfLines={1}>
                {selectedService ? `${selectedService.name} - ${month}/${year}` : `Monthly Calculation - ${month}/${year}`}
              </Text>
              <TouchableOpacity
                onPress={() => setShowMonthlyCalculationModal(false)}
              >
                <Ionicons name="close" size={24} color={colors.text.primary} />
              </TouchableOpacity>
            </View>
            <ScrollView
              style={styles.bottomSheetContent}
              contentContainerStyle={{ paddingBottom: spacing.base }}
              showsVerticalScrollIndicator={false}
            >
              {selectedService && selectedService.billingType === 'MONTHLY_SALARY' ? (
                (() => {
                  // Check if selected month is current month
                  const todayTz = getTodayInTimezoneSync();
                  const isCurrentMonth = month === todayTz.getMonth() + 1 && year === todayTz.getFullYear();
                  
                  // If current month, calculate till today; otherwise calculate for full month
                  const endDate = isCurrentMonth ? todayTz : undefined;
                  
                  const calculation = calculateMonthlySalary(
                    month,
                    year,
                    selectedService,
                    overrides.filter(o => o.serviceId === selectedService.id),
                    endDate // Calculate till today if current month, otherwise full month
                  );
                  return (
                    <View key={selectedService.id} style={styles.calculationCard}>
                      <View style={styles.calculationCardHeader}>
                        <Text style={styles.calculationServiceName}>{selectedService.name}</Text>
                        <View style={styles.calculationBadge}>
                          <Text style={styles.calculationBadgeText}>{t('householdServices.monthlySalary')}</Text>
                        </View>
                      </View>
                      
                      <View style={styles.calculationRow}>
                        <Text style={styles.calculationLabel}>{t('householdServices.monthlySalary')}:</Text>
                        <Text style={styles.calculationValue}>
                          {formatCurrency(calculation.monthlySalary, currency)}
                        </Text>
                      </View>
                      
                      <View style={styles.calculationRow}>
                        <Text style={styles.calculationLabel}>{t('householdServices.daysInMonth')}:</Text>
                        <Text style={styles.calculationValue}>{calculation.daysInMonth}</Text>
                      </View>
                      
                      <View style={styles.calculationRow}>
                        <Text style={styles.calculationLabel}>{t('householdServices.perDaySalary')}:</Text>
                        <Text style={styles.calculationValue}>
                          {formatCurrency(calculation.perDaySalary, currency)}
                        </Text>
                      </View>
                      
                      <View style={styles.calculationDivider} />
                      
                      <View style={styles.calculationRow}>
                        <Text style={styles.calculationLabel}>{t('householdServices.totalWorkingDays')}:</Text>
                        <Text style={[styles.calculationValue, { color: colors.success?.[500] || colors.primary[500] }]}>
                          {calculation.totalWorkingDays}
                        </Text>
                      </View>
                      
                      <View style={styles.calculationRow}>
                        <Text style={styles.calculationLabel}>{t('householdServices.leavesTaken')}:</Text>
                        <Text style={[styles.calculationValue, { color: calculation.leavesTaken > 0 ? colors.warning[500] : colors.text.primary }]}>
                          {calculation.leavesTaken}
                        </Text>
                      </View>
                      
                      <View style={styles.calculationRow}>
                        <Text style={styles.calculationLabel}>{t('householdServices.allowedLeaves')}:</Text>
                        <Text style={styles.calculationValue}>{calculation.allowedLeaves}</Text>
                      </View>
                      
                      <View style={styles.calculationRow}>
                        <Text style={styles.calculationLabel}>{t('householdServices.extraLeaves')}:</Text>
                        <Text style={[styles.calculationValue, { color: calculation.extraLeaves > 0 ? colors.error[500] : colors.text.primary }]}>
                          {calculation.extraLeaves}
                        </Text>
                      </View>
                      
                      {calculation.extraLeaves > 0 && (
                        <View style={styles.calculationRow}>
                          <Text style={styles.calculationLabel}>{t('householdServices.deduction')}:</Text>
                          <Text style={[styles.calculationValue, { color: colors.error[500] }]}>
                            -{formatCurrency(calculation.deduction, currency)}
                          </Text>
                        </View>
                      )}
                      
                      <View style={styles.calculationDivider} />
                      
                      <View style={styles.calculationFinalRow}>
                        <Text style={styles.calculationFinalLabel}>{t('householdServices.finalSalary')}:</Text>
                        <Text style={styles.calculationFinalValue}>
                          {formatCurrency(calculation.finalSalary, currency)}
                        </Text>
                      </View>
                    </View>
                  );
                })()
              ) : (
                <View style={styles.calculationCard}>
                  <Text style={styles.calculationServiceName}>
                    {selectedService ? t('householdServices.notMonthlySalaryService') : t('householdServices.pleaseSelectMonthlySalaryService')}
                  </Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default HouseholdServicesLedgerScreen;
