/**
 * Household Services Management Screen
 * Create and manage services, price history, quantity history, and overrides
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
  FlatList,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { formatDateToISO } from '../services/timezoneService';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Platform } from 'react-native';

import { RootStackParamList } from '../types';
import {
  HouseholdService,
  ServiceBillingType,
  PriceHistoryEntry,
  QuantityHistoryEntry,
} from '../types/householdServices';
import {
  getServices,
  subscribeToServices,
  createService,
  updateService,
  deleteService,
  addPriceHistory,
  addQuantityHistory,
  getPriceHistory,
  getQuantityHistory,
} from '../services/householdServices/householdServicesService';
import { colors, spacing, typography, borderRadius, shadows, addFontScaleListener } from '../config/theme';
import { formatCurrency, DEFAULT_CURRENCY } from '../config/constants';
import { useAuthStore } from '../stores';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const HouseholdServicesManagementScreen: React.FC = () => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const { user } = useAuthStore();
  const currency = user?.currency ?? DEFAULT_CURRENCY;
  const [fontScaleVersion, setFontScaleVersion] = useState(0);

  const [services, setServices] = useState<HouseholdService[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedService, setSelectedService] = useState<HouseholdService | null>(null);
  // Modal states
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [showPriceModal, setShowPriceModal] = useState(false);
  const [showQuantityModal, setShowQuantityModal] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerType, setDatePickerType] = useState<'start' | 'price' | 'quantity'>('start');

  // Service form state
  const [serviceName, setServiceName] = useState('');
  const [billingType, setBillingType] = useState<ServiceBillingType>('DAILY_FIXED');
  const [defaultQuantity, setDefaultQuantity] = useState('');
  const [unit, setUnit] = useState('');
  const [monthlySalary, setMonthlySalary] = useState('');
  const [allowedLeaves, setAllowedLeaves] = useState('');
  const [startDate, setStartDate] = useState(new Date());
  const [isEditing, setIsEditing] = useState(false);

  // Font scaling support
  useEffect(() => {
    const unsub = addFontScaleListener(() => {
      setFontScaleVersion(v => v + 1);
    });
    return () => {
      unsub();
    };
  }, []);

  // Price form state
  const [price, setPrice] = useState('');
  const [priceEffectiveDate, setPriceEffectiveDate] = useState(new Date());
  
  // Handle price input with 2 decimal limit
  const handlePriceChange = (text: string) => {
    // Allow only numbers and one decimal point
    const cleaned = text.replace(/[^0-9.]/g, '');
    // Ensure only one decimal point
    const parts = cleaned.split('.');
    if (parts.length > 2) {
      return; // Don't update if more than one decimal point
    }
    // Limit to 2 decimal places
    if (parts.length === 2 && parts[1].length > 2) {
      return; // Don't update if more than 2 decimal places
    }
    setPrice(cleaned);
  };

  // Quantity form state
  const [quantity, setQuantity] = useState('');
  const [quantityEffectiveDate, setQuantityEffectiveDate] = useState(new Date());

  // Subscribe to services
  useEffect(() => {
    const unsubscribe = subscribeToServices((updatedServices) => {
      setServices(updatedServices);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Reset service form
  const resetServiceForm = () => {
    setServiceName('');
    setBillingType('DAILY_FIXED');
    setDefaultQuantity('');
    setUnit('');
    setMonthlySalary('');
    setAllowedLeaves('');
    setPrice('');
    setStartDate(new Date());
    setIsEditing(false);
    setSelectedService(null);
  };

  // Open service form for editing
  const handleEditService = (service: HouseholdService) => {
    setSelectedService(service);
    setServiceName(service.name);
    setBillingType(service.billingType);
    setDefaultQuantity(service.defaultQuantity?.toString() || '');
    setUnit(service.unit || '');
    setMonthlySalary(service.monthlySalary?.toString() || '');
    setAllowedLeaves(service.allowedLeaves?.toString() || '');
    setStartDate(service.startDate || new Date());
    setIsEditing(true);
    setShowServiceModal(true);
  };

  // Open service form for creating
  const handleCreateService = () => {
    resetServiceForm();
    setShowServiceModal(true);
  };

  // Save service
  const handleSaveService = async () => {
    if (!serviceName.trim()) {
      Alert.alert('Error', 'Please enter a service name');
      return;
    }

    // Validate required fields based on billing type
    if (billingType === 'DAILY_QUANTITY') {
      if (!defaultQuantity.trim() || isNaN(parseFloat(defaultQuantity)) || parseFloat(defaultQuantity) <= 0) {
        Alert.alert('Error', 'Please enter a valid default quantity');
        return;
      }
      if (!unit.trim()) {
        Alert.alert('Error', 'Please enter a unit (e.g., L, kg)');
        return;
      }
    }

    if (billingType === 'MONTHLY_SALARY') {
      if (!monthlySalary.trim() || isNaN(parseFloat(monthlySalary)) || parseFloat(monthlySalary) <= 0) {
        Alert.alert('Error', 'Please enter a valid monthly salary');
        return;
      }
    }

    // Validate price for non-salary services (required during creation)
    if (!isEditing && billingType !== 'MONTHLY_SALARY') {
      if (!price.trim() || isNaN(parseFloat(price)) || parseFloat(price) <= 0) {
        Alert.alert('Error', 'Please enter a valid price');
        return;
      }
    }

    setSaving(true);
    try {
      if (isEditing && selectedService) {
        await updateService(selectedService.id, {
          name: serviceName.trim(),
          defaultQuantity: defaultQuantity ? parseFloat(defaultQuantity) : undefined,
          unit: unit.trim() || undefined,
          monthlySalary: monthlySalary ? parseFloat(monthlySalary) : undefined,
          allowedLeaves: allowedLeaves ? parseInt(allowedLeaves, 10) : undefined,
          startDate: await formatDateToISO(startDate),
        });
      } else {
        // Create service
        const serviceId = await createService({
          name: serviceName.trim(),
          billingType,
          defaultQuantity: billingType === 'DAILY_QUANTITY' ? parseFloat(defaultQuantity) : undefined,
          unit: billingType === 'DAILY_QUANTITY' ? unit.trim() : undefined,
          monthlySalary: billingType === 'MONTHLY_SALARY' ? parseFloat(monthlySalary) : undefined,
          allowedLeaves: billingType === 'MONTHLY_SALARY' && allowedLeaves ? parseInt(allowedLeaves, 10) : undefined,
          startDate: await formatDateToISO(startDate),
        });

        // Add first price automatically for non-salary services
        // Use startDate as effective date for the first price
        if (billingType !== 'MONTHLY_SALARY' && price.trim()) {
          // Round price to 2 decimal places
          const priceValue = Math.round(parseFloat(price) * 100) / 100;
          await addPriceHistory({
            serviceId,
            price: priceValue,
            effectiveDate: await formatDateToISO(startDate),
          });
        }
      }
      setShowServiceModal(false);
      resetServiceForm();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save service');
    } finally {
      setSaving(false);
    }
  };

  // Delete service
  const handleDeleteService = (service: HouseholdService) => {
    Alert.alert(
      t('householdServices.deleteService'),
      `Are you sure you want to delete "${service.name}"?`,
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteService(service.id);
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to delete service');
            }
          },
        },
      ]
    );
  };

  // Open price modal
  const handleAddPrice = (service: HouseholdService) => {
    setSelectedService(service);
    setPrice('');
    setPriceEffectiveDate(new Date());
    setShowPriceModal(true);
  };

  // View price/quantity history
  const handleViewHistory = (service: HouseholdService, type: 'price' | 'quantity') => {
    navigation.navigate('HouseholdServicesHistory', {
      service,
      historyType: type,
    });
  };

  // Save price history
  const handleSavePrice = async () => {
    if (!selectedService) return;
    if (!price.trim() || isNaN(parseFloat(price)) || parseFloat(price) <= 0) {
      Alert.alert('Error', 'Please enter a valid price');
      return;
    }

    // Close date picker if open
    if (showDatePicker) {
      setShowDatePicker(false);
    }

    const serviceId = selectedService.id;
    // Round price to 2 decimal places
    const priceValue = Math.round(parseFloat(price) * 100) / 100;
    const effectiveDateValue = await formatDateToISO(priceEffectiveDate);

    try {
      await addPriceHistory({
        serviceId,
        price: priceValue,
        effectiveDate: effectiveDateValue,
      });
      
      // Close modal immediately
      setShowPriceModal(false);
      // Reset fields after a brief delay
      setTimeout(() => {
        setPrice('');
        setPriceEffectiveDate(new Date());
        setSelectedService(null);
      }, 100);
    } catch (error: any) {
      // Close modal immediately even on error
      setShowPriceModal(false);
      // Reset and show error after modal closes
      setTimeout(() => {
        setPrice('');
        setPriceEffectiveDate(new Date());
        setSelectedService(null);
        Alert.alert('Error', error.message || 'Failed to add price');
      }, 100);
    }
  };

  // Open quantity modal
  const handleAddQuantity = (service: HouseholdService) => {
    if (service.billingType !== 'DAILY_QUANTITY') {
      Alert.alert('Error', 'Quantity history is only for DAILY_QUANTITY services');
      return;
    }
    setSelectedService(service);
    setQuantity('');
    setQuantityEffectiveDate(new Date());
    setShowQuantityModal(true);
  };

  // Save quantity history
  const handleSaveQuantity = async () => {
    if (!selectedService) return;
    if (!quantity.trim() || isNaN(parseFloat(quantity)) || parseFloat(quantity) <= 0) {
      Alert.alert('Error', 'Please enter a valid quantity');
      return;
    }

    // Close date picker if open
    setShowDatePicker(false);

    try {
      await addQuantityHistory({
        serviceId: selectedService.id,
        quantity: parseFloat(quantity),
        effectiveDate: await formatDateToISO(quantityEffectiveDate),
      });
      // Close modal first, then reset fields
      setShowQuantityModal(false);
      setQuantity('');
      setQuantityEffectiveDate(new Date());
      setSelectedService(null);
    } catch (error: any) {
      // Close modal even on error
      setShowQuantityModal(false);
      setQuantity('');
      setQuantityEffectiveDate(new Date());
      setSelectedService(null);
      Alert.alert('Error', error.message || 'Failed to add quantity');
    }
  };

  const styles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background.primary,
    },
    content: {
      padding: spacing.base,
    },
    emptyState: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing['2xl'],
      minHeight: 400,
    },
    emptyStateIcon: {
      fontSize: 64,
      marginBottom: spacing.base,
    },
    emptyStateText: {
      fontSize: typography.fontSize.lg,
      fontWeight: typography.fontWeight.semiBold,
      color: colors.text.primary,
      marginBottom: spacing.sm,
      textAlign: 'center',
    },
    emptyStateSubtext: {
      fontSize: typography.fontSize.base,
      color: colors.text.secondary,
      textAlign: 'center',
      marginBottom: spacing.xl,
    },
    emptyStateButton: {
      backgroundColor: colors.primary[500],
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.base,
      borderRadius: borderRadius.md,
      ...shadows.sm,
    },
    emptyStateButtonText: {
      color: colors.neutral[0],
      fontSize: typography.fontSize.base,
      fontWeight: typography.fontWeight.semiBold,
    },
    fab: {
      position: 'absolute',
      right: spacing.lg,
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: colors.primary[500],
      alignItems: 'center',
      justifyContent: 'center',
      ...shadows.lg,
    },
    fabIcon: {
      fontSize: 28,
      color: colors.neutral[0],
      fontWeight: typography.fontWeight.medium,
    },
    serviceCard: {
      backgroundColor: colors.background.elevated,
      borderRadius: borderRadius.md,
      padding: spacing.base,
      marginBottom: spacing.base,
      ...shadows.sm,
    },
    serviceHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.sm,
    },
    serviceHeaderLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
      gap: 8,
    },
    serviceName: {
      fontSize: typography.fontSize.lg,
      fontWeight: typography.fontWeight.semiBold,
      color: colors.text.primary,
      flex: 1,
    },
    serviceHeaderRight: {
      marginLeft: 8,
    },
    serviceType: {
      fontSize: typography.fontSize.sm,
      color: colors.text.secondary,
      marginBottom: spacing.xs,
    },
    serviceDetails: {
      fontSize: typography.fontSize.sm,
      color: colors.text.secondary,
      marginTop: spacing.xs,
    },
    actionButtons: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
      marginTop: spacing.base,
    },
    actionButton: {
      width: '48%',
      padding: spacing.sm,
      borderRadius: borderRadius.sm,
      alignItems: 'center',
      backgroundColor: colors.primary[50],
    },
    actionButtonText: {
      fontSize: typography.fontSize.sm,
      color: colors.primary[500],
      fontWeight: typography.fontWeight.medium,
    },
    deleteButton: {
      backgroundColor: colors.error[50],
    },
    deleteButtonText: {
      color: colors.error[500],
    },
    modalContainer: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalContent: {
      backgroundColor: colors.background.elevated,
      borderRadius: borderRadius.lg,
      padding: spacing.lg,
      width: '70%',
      maxWidth: 400,
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
    pickerButton: {
      borderWidth: 1,
      borderColor: colors.border.medium,
      borderRadius: borderRadius.md,
      padding: spacing.base,
      marginBottom: spacing.base,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    pickerButtonText: {
      fontSize: typography.fontSize.base,
      color: colors.text.primary,
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
    bottomSheetBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.35)',
      justifyContent: 'flex-end',
    },
    bottomSheetBackdropTouchable: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 0,
    },
    bottomSheet: {
      backgroundColor: colors.background.primary,
      borderTopLeftRadius: borderRadius.lg,
      borderTopRightRadius: borderRadius.lg,
      overflow: 'hidden',
      maxHeight: '85%',
      width: '100%',
      zIndex: 1,
    },
    bottomSheetHandle: {
      alignSelf: 'center',
      width: 48,
      height: 5,
      borderRadius: 999,
      backgroundColor: colors.neutral[300],
      marginTop: spacing.sm,
      marginBottom: spacing.xs,
    },
    bottomSheetHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.base,
      paddingVertical: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.border.light,
    },
    bottomSheetTitle: {
      flex: 1,
      fontSize: typography.fontSize.lg,
      fontWeight: typography.fontWeight.semiBold,
      color: colors.text.primary,
    },
    historyList: {
      flex: 1,
    },
    emptyHistory: {
      padding: spacing.xl,
      alignItems: 'center',
    },
    emptyHistoryText: {
      fontSize: typography.fontSize.base,
      color: colors.text.secondary,
      textAlign: 'center',
    },
    checkbox: {
      width: 24,
      height: 24,
      borderRadius: borderRadius.sm,
      borderWidth: 2,
      borderColor: colors.border.medium,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.background.primary,
    },
    checkboxChecked: {
      backgroundColor: colors.primary[500],
      borderColor: colors.primary[500],
    },
    buttonDisabled: {
      opacity: 0.6,
    },
    loadingOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    loadingContainer: {
      backgroundColor: colors.background.primary,
      borderRadius: borderRadius.lg,
      padding: spacing.xl,
      alignItems: 'center',
      minWidth: 120,
    },
    loadingText: {
      marginTop: spacing.base,
      fontSize: typography.fontSize.base,
      color: colors.text.primary,
      fontWeight: typography.fontWeight.medium,
    },
  }), [fontScaleVersion]);

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary[500]} />
      </View>
    );
  }

  return (
    <View style={styles.container}>

      <ScrollView 
        style={styles.content}
        contentContainerStyle={{ paddingBottom: insets.bottom + 80 }}
      >
        {services.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateIcon}>🏠</Text>
            <Text style={styles.emptyStateText}>{t('householdServices.noServicesYet')}</Text>
            <Text style={styles.emptyStateSubtext}>
              {t('householdServices.createFirstServiceDescription')}
            </Text>
            <TouchableOpacity 
              style={styles.emptyStateButton} 
              onPress={handleCreateService}
            >
              <Text style={styles.emptyStateButtonText}>{t('householdServices.createService')}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          services.map(service => (
          <View key={service.id} style={styles.serviceCard}>
            <View style={styles.serviceHeader}>
              <View style={styles.serviceHeaderLeft}>
                <Text style={styles.serviceName}>{service.name}</Text>
                <TouchableOpacity onPress={() => handleDeleteService(service)}>
                  <Ionicons name="trash-outline" size={20} color={colors.error} />
                </TouchableOpacity>
              </View>
              <View style={styles.serviceHeaderRight}>
                <TouchableOpacity onPress={() => handleEditService(service)}>
                  <Ionicons name="create-outline" size={20} color={colors.primary[500]} />
                </TouchableOpacity>
              </View>
            </View>
            <Text style={styles.serviceType}>
              Type: {service.billingType.replace('_', ' ')}
            </Text>
            {service.billingType === 'DAILY_QUANTITY' && (
              <Text style={styles.serviceDetails}>
                Default: {service.defaultQuantity} {service.unit}
              </Text>
            )}
            {service.billingType === 'MONTHLY_SALARY' && (
              <Text style={styles.serviceDetails}>
                Salary: {formatCurrency(service.monthlySalary || 0, currency)}/month
                {service.allowedLeaves !== undefined && (
                  <> • Allowed Leaves: {service.allowedLeaves}</>
                )}
              </Text>
            )}
            <View style={styles.actionButtons}>
              {service.billingType !== 'MONTHLY_SALARY' && (
                <>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleAddPrice(service)}
                  >
                    <Text style={styles.actionButtonText}>{t('householdServices.addPrice')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleViewHistory(service, 'price')}
                  >
                    <Text style={styles.actionButtonText}>{t('householdServices.viewPrices')}</Text>
                  </TouchableOpacity>
                </>
              )}
              {service.billingType === 'DAILY_QUANTITY' && (
                <>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleAddQuantity(service)}
                  >
                    <Text style={styles.actionButtonText}>Add Quantity</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleViewHistory(service, 'quantity')}
                  >
                    <Text style={styles.actionButtonText}>View Quantities</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
          ))
        )}
      </ScrollView>

      {/* FAB */}
      {services.length > 0 && (
        <TouchableOpacity
          style={[styles.fab, { bottom: insets.bottom + spacing.lg }]}
          onPress={handleCreateService}
        >
          <Text style={styles.fabIcon}>+</Text>
        </TouchableOpacity>
      )}

      {/* Service Modal */}
      <Modal visible={showServiceModal} transparent animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {isEditing ? t('householdServices.editService') : t('householdServices.addService')}
            </Text>

            <TextInput
              style={styles.input}
              placeholder={t('householdServices.serviceNamePlaceholder')}
              value={serviceName}
              onChangeText={setServiceName}
            />

            {!isEditing && (
              <TouchableOpacity
                style={styles.pickerButton}
                onPress={() => {
                  Alert.alert(
                    t('householdServices.selectBillingType'),
                    '',
                    [
                      {
                        text: t('householdServices.dailyQuantityMilk'),
                        onPress: () => {
                          setBillingType('DAILY_QUANTITY');
                        },
                      },
                      {
                        text: t('householdServices.dailyFixedNewspaper'),
                        onPress: () => {
                          setBillingType('DAILY_FIXED');
                        },
                      },
                      {
                        text: t('householdServices.monthlySalaryMaidCook'),
                        onPress: () => {
                          setBillingType('MONTHLY_SALARY');
                        },
                      },
                      { text: t('common.cancel'), style: 'cancel' },
                    ]
                  );
                }}
              >
                <Text style={styles.pickerButtonText}>
                  Type: {billingType.replace('_', ' ')}
                </Text>
                <Ionicons name="chevron-down" size={20} color={colors.text.secondary} />
              </TouchableOpacity>
            )}

            {billingType === 'DAILY_QUANTITY' && (
              <>
                <TextInput
                  style={styles.input}
                  placeholder={t('householdServices.defaultQuantityPlaceholder')}
                  value={defaultQuantity}
                  onChangeText={setDefaultQuantity}
                  keyboardType="numeric"
                />
                <TextInput
                  style={styles.input}
                  placeholder={t('householdServices.unitPlaceholder')}
                  value={unit}
                  onChangeText={setUnit}
                />
                {!isEditing && (
                  <TextInput
                    style={styles.input}
                    placeholder={t('householdServices.pricePerUnitPlaceholder')}
                    value={price}
                    onChangeText={handlePriceChange}
                    keyboardType="decimal-pad"
                  />
                )}
              </>
            )}

            {billingType === 'DAILY_FIXED' && !isEditing && (
              <TextInput
                style={styles.input}
                placeholder={t('householdServices.pricePlaceholder')}
                value={price}
                onChangeText={handlePriceChange}
                keyboardType="decimal-pad"
              />
            )}
            {billingType === 'MONTHLY_SALARY' && (
              <>
                <TextInput
                  style={styles.input}
                  placeholder={t('householdServices.monthlySalaryPlaceholder')}
                  value={monthlySalary}
                  onChangeText={setMonthlySalary}
                  keyboardType="numeric"
                />
                <TextInput
                  style={styles.input}
                  placeholder="Allowed Leaves per Month"
                  value={allowedLeaves}
                  onChangeText={setAllowedLeaves}
                  keyboardType="numeric"
                />
              </>
            )}

            <TouchableOpacity
              style={styles.pickerButton}
              onPress={() => {
                setDatePickerType('start');
                setShowDatePicker(true);
              }}
            >
              <Text style={styles.pickerButtonText}>
                {t('householdServices.startDate')}: {startDate.toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </Text>
              <Ionicons name="calendar-outline" size={20} color={colors.text.secondary} />
            </TouchableOpacity>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.button, styles.buttonSecondary]}
                onPress={() => {
                  setShowServiceModal(false);
                  resetServiceForm();
                }}
              >
                <Text style={[styles.buttonText, styles.buttonTextSecondary]}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.buttonPrimary, saving && styles.buttonDisabled]}
                onPress={handleSaveService}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color={colors.neutral[0]} />
                ) : (
                  <Text style={styles.buttonText}>{t('common.save')}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Price Modal */}
      <Modal 
        visible={showPriceModal} 
        transparent 
        animationType="slide"
        onRequestClose={() => {
          setPrice('');
          setPriceEffectiveDate(new Date());
          setShowPriceModal(false);
          setSelectedService(null);
        }}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {t('householdServices.addPrice')} - {selectedService?.name}
            </Text>

            <TextInput
              style={styles.input}
              placeholder={t('householdServices.price')}
              value={price}
              onChangeText={handlePriceChange}
              keyboardType="decimal-pad"
            />

            <TouchableOpacity
              style={styles.pickerButton}
              onPress={() => {
                setDatePickerType('price');
                setShowDatePicker(true);
              }}
            >
              <Text style={styles.pickerButtonText}>
                {t('householdServices.effectiveDate')}: {priceEffectiveDate.toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </Text>
              <Ionicons name="calendar-outline" size={20} color={colors.text.secondary} />
            </TouchableOpacity>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.button, styles.buttonSecondary]}
                onPress={() => {
                  setPrice('');
                  setPriceEffectiveDate(new Date());
                  setShowPriceModal(false);
                  setSelectedService(null);
                }}
              >
                <Text style={[styles.buttonText, styles.buttonTextSecondary]}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.buttonPrimary]}
                onPress={handleSavePrice}
              >
                <Text style={styles.buttonText}>{t('common.save')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Quantity Modal */}
      <Modal 
        visible={showQuantityModal} 
        transparent 
        animationType="slide"
        onRequestClose={() => {
          setQuantity('');
          setQuantityEffectiveDate(new Date());
          setShowQuantityModal(false);
          setSelectedService(null);
        }}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              Add Quantity - {selectedService?.name}
            </Text>

            <TextInput
              style={styles.input}
              placeholder="Quantity"
              value={quantity}
              onChangeText={setQuantity}
              keyboardType="numeric"
            />

            <TouchableOpacity
              style={styles.pickerButton}
              onPress={() => {
                setDatePickerType('quantity');
                setShowDatePicker(true);
              }}
            >
              <Text style={styles.pickerButtonText}>
                {t('householdServices.effectiveDate')}: {quantityEffectiveDate.toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </Text>
              <Ionicons name="calendar-outline" size={20} color={colors.text.secondary} />
            </TouchableOpacity>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.button, styles.buttonSecondary]}
                onPress={() => {
                  setQuantity('');
                  setQuantityEffectiveDate(new Date());
                  setShowQuantityModal(false);
                  setSelectedService(null);
                }}
              >
                <Text style={[styles.buttonText, styles.buttonTextSecondary]}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.buttonPrimary]}
                onPress={handleSaveQuantity}
              >
                <Text style={styles.buttonText}>{t('common.save')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>


      {/* Date Picker */}
      {showDatePicker && (
        <DateTimePicker
          value={
            datePickerType === 'start' 
              ? startDate 
              : datePickerType === 'price' 
                ? priceEffectiveDate 
                : quantityEffectiveDate
          }
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(event, date) => {
            setShowDatePicker(false);
            if (date) {
              if (datePickerType === 'start') {
                setStartDate(date);
              } else if (datePickerType === 'price') {
                setPriceEffectiveDate(date);
              } else if (datePickerType === 'quantity') {
                setQuantityEffectiveDate(date);
              }
            }
          }}
        />
      )}

      {/* Loading Overlay */}
      <Modal
        visible={saving}
        transparent
        animationType="fade"
      >
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary[500]} />
            <Text style={styles.loadingText}>{t('common.saving')}</Text>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default HouseholdServicesManagementScreen;
