/**
 * Add Account Screen for Gharkharch
 * 
 * ACCOUNTING RULES:
 * - Asset accounts: Track things you own (bank accounts, investments, cash)
 * - Liability accounts: Track things you owe (credit cards, loans)
 * - Income accounts: Categories for money earned (salary, dividends)
 * - Expense accounts: Categories for money spent (rent, food, utilities)
 * 
 * Only Asset and Liability accounts have balances.
 * Income and Expense accounts are just categories for tracking flows.
 */

import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Modal,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import { useAccountStore } from '../stores';
import { RootStackParamList, AccountType } from '../types';
import { 
  colors, 
  typography, 
  spacing, 
  borderRadius, 
  shadows,
  getAccountTypeColor,
  getAccountTypeBgColor,
  addFontScaleListener,
} from '../config/theme';
import { 
  ACCOUNT_CATEGORIES, 
  getCategoriesByType, 
  getSubCategories,
  ACCOUNT_COLORS,
} from '../config/constants';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'AddAccount'>;
type RouteType = RouteProp<RootStackParamList, 'AddAccount'>;

const AddAccountScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteType>();
  const { t } = useTranslation();
  const [fontScaleVersion, setFontScaleVersion] = React.useState(0);
  React.useEffect(() => {
    const unsub = addFontScaleListener(() => {
      setFontScaleVersion(v => v + 1);
    });
    return () => {
      unsub();
    };
  }, []);
  
  const styles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background.primary,
    },
    scrollContent: {
      padding: spacing.base,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.base,
      paddingVertical: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.border.light,
      backgroundColor: colors.background.primary,
    },
    backButton: {
      padding: spacing.xs,
    },
    headerTitle: {
      fontSize: typography.fontSize.lg,
      fontWeight: typography.fontWeight.semiBold,
      color: colors.text.primary,
      flex: 1,
      textAlign: 'center',
    },
    section: {
      marginBottom: spacing.xl,
    },
    sectionTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: spacing.sm,
      marginLeft: spacing.sm,
    },
    sectionTitle: {
      fontSize: typography.fontSize.sm,
      fontWeight: typography.fontWeight.semiBold,
      color: colors.text.secondary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    infoButton: {
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: colors.primary[500],
      alignItems: 'center',
      justifyContent: 'center',
      marginLeft: spacing.xs,
    },
    infoButtonText: {
      fontSize: typography.fontSize.xs,
      fontWeight: typography.fontWeight.bold,
      color: colors.neutral[0],
    },
    typeGrid: {
      gap: spacing.md,
    },
    typeCard: {
      width: '100%',
      backgroundColor: colors.background.elevated,
      borderRadius: borderRadius.lg,
      padding: spacing.md,
      alignItems: 'center',
      borderWidth: 2,
      borderColor: 'transparent',
      ...shadows.sm,
    },
    typeCardActive: {
    },
    typeIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.sm,
    },
    typeIconText: {
      fontSize: typography.fontSize.lg,
      fontWeight: typography.fontWeight.bold,
    },
    typeName: {
      fontSize: typography.fontSize.sm,
      fontWeight: typography.fontWeight.medium,
      color: colors.text.secondary,
    },
    typeSubtitle: {
      fontSize: typography.fontSize.xs,
      color: colors.text.tertiary,
      textAlign: 'center',
      marginTop: spacing.xs,
      paddingHorizontal: spacing.xs,
      width: '100%',
    },
    typeDescription: {
      fontSize: typography.fontSize.base,
      fontWeight: typography.fontWeight.medium,
      color: colors.text.primary,
      textAlign: 'center',
      marginTop: spacing.md,
      paddingHorizontal: spacing.base,
      backgroundColor: colors.background.elevated,
      borderRadius: borderRadius.md,
      paddingVertical: spacing.sm,
    },
    formCard: {
      backgroundColor: colors.background.elevated,
      borderRadius: borderRadius.lg,
      ...shadows.sm,
    },
    selector: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: spacing.base,
    },
    selectorLabel: {
      fontSize: typography.fontSize.sm,
      color: colors.text.secondary,
      width: 100,
    },
    inputLabel: {
      fontSize: typography.fontSize.sm,
      fontWeight: typography.fontWeight.medium,
      color: colors.text.secondary,
      marginBottom: spacing.xs,
      marginTop: spacing.base,
    },
    input: {
      borderWidth: 1,
      borderColor: colors.border.medium,
      borderRadius: borderRadius.md,
      padding: spacing.base,
      fontSize: typography.fontSize.base,
      color: colors.text.primary,
      backgroundColor: colors.background.primary,
    },
    categoryButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderWidth: 1,
      borderColor: colors.border.medium,
      borderRadius: borderRadius.md,
      padding: spacing.base,
      backgroundColor: colors.background.primary,
      marginBottom: spacing.base,
    },
    categoryButtonText: {
      fontSize: typography.fontSize.base,
      color: colors.text.primary,
    },
    categoryButtonPlaceholder: {
      color: colors.text.tertiary,
    },
    balanceInputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border.medium,
      borderRadius: borderRadius.md,
      backgroundColor: colors.background.primary,
      paddingHorizontal: spacing.base,
    },
    selectorValue: {
      flex: 1,
      fontSize: typography.fontSize.base,
      fontWeight: typography.fontWeight.medium,
      color: colors.text.primary,
    },
    selectorPlaceholder: {
      flex: 1,
      fontSize: typography.fontSize.base,
      color: colors.text.tertiary,
    },
    chevron: {
      fontSize: typography.fontSize.xl,
      color: colors.neutral[400],
    },
    divider: {
      height: 1,
      backgroundColor: colors.border.light,
      marginLeft: spacing.base,
    },
    balanceInput: {
      flex: 1,
      fontSize: typography.fontSize.base,
      color: colors.text.primary,
      paddingVertical: spacing.base,
    },
    currencySymbol: {
      fontSize: typography.fontSize.base,
      fontWeight: typography.fontWeight.medium,
      color: colors.text.secondary,
      marginRight: spacing.sm,
    },
    helperText: {
      fontSize: typography.fontSize.sm,
      color: colors.text.tertiary,
      marginTop: spacing.sm,
      marginLeft: spacing.sm,
    },
    colorGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.md,
    },
    colorOption: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
    },
    colorOptionSelected: {
      borderWidth: 3,
      borderColor: colors.neutral[0],
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
      elevation: 4,
    },
    colorCheck: {
      color: colors.neutral[0],
      fontSize: typography.fontSize.lg,
      fontWeight: typography.fontWeight.bold,
    },
    submitButton: {
      backgroundColor: colors.primary[500],
      borderRadius: borderRadius.lg,
      paddingVertical: spacing.base,
      alignItems: 'center',
      marginTop: spacing.lg,
      ...shadows.md,
    },
    submitButtonDisabled: {
      opacity: 0.7,
    },
    loadingContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
    },
    submitButtonText: {
      fontSize: typography.fontSize.base,
      fontWeight: typography.fontWeight.semiBold,
      color: colors.neutral[0],
    },
    modalContainer: {
      flex: 1,
      backgroundColor: colors.background.primary,
    },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.border.light,
    },
    modalCancelButton: {
      paddingLeft: spacing.sm,
      paddingRight: spacing.sm,
      paddingVertical: spacing.xs,
      minWidth: 90,
      width: 90,
      flexShrink: 0,
      alignItems: 'flex-start',
      justifyContent: 'center',
    },
    modalCancel: {
      fontSize: typography.fontSize.base,
      color: colors.primary[500],
      includeFontPadding: false,
      textAlignVertical: 'center',
      flexShrink: 0,
    },
    modalTitle: {
      fontSize: typography.fontSize.lg,
      fontWeight: typography.fontWeight.semiBold,
      color: colors.text.primary,
      flex: 1,
      textAlign: 'center',
      marginHorizontal: spacing.sm,
    },
    optionItem: {
      padding: spacing.base,
      backgroundColor: colors.background.elevated,
    },
    optionText: {
      fontSize: typography.fontSize.base,
      fontWeight: typography.fontWeight.medium,
      color: colors.text.primary,
    },
    optionSubtext: {
      fontSize: typography.fontSize.sm,
      color: colors.text.tertiary,
      marginTop: 2,
    },
    separator: {
      height: 1,
      backgroundColor: colors.border.light,
    },
    addCustomButton: {
      padding: spacing.base,
      alignItems: 'center',
      backgroundColor: colors.primary[50],
    },
    addCustomButtonText: {
      fontSize: typography.fontSize.base,
      fontWeight: typography.fontWeight.semiBold,
      color: colors.primary[500],
    },
    modalContent: {
      padding: spacing.base,
    },
    modalDone: {
      fontSize: typography.fontSize.base,
      fontWeight: typography.fontWeight.semiBold,
      color: colors.primary[500],
    },
    loadingOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000,
    },
    loadingContent: {
      backgroundColor: colors.background.elevated,
      borderRadius: borderRadius.lg,
      padding: spacing.xl,
      alignItems: 'center',
      minWidth: 200,
      ...shadows.lg,
    },
    loadingText: {
      marginTop: spacing.base,
      fontSize: typography.fontSize.base,
      fontWeight: typography.fontWeight.medium,
      color: colors.text.primary,
    },
    infoModalContent: {
      paddingBottom: spacing.lg,
      paddingHorizontal: spacing.base,
    },
    infoCard: {
      backgroundColor: colors.background.elevated,
      borderRadius: borderRadius.md,
      marginBottom: spacing.sm,
      overflow: 'hidden',
      ...shadows.sm,
    },
    infoCardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: spacing.sm,
      paddingVertical: spacing.sm,
    },
    infoCardBody: {
      padding: spacing.sm,
      paddingTop: spacing.xs,
      paddingBottom: spacing.sm,
    },
    infoIcon: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: spacing.sm,
      backgroundColor: 'transparent',
    },
    infoIconText: {
      fontSize: typography.fontSize.base,
      fontWeight: typography.fontWeight.bold,
    },
    infoTitle: {
      fontSize: typography.fontSize.base,
      fontWeight: typography.fontWeight.semiBold,
      color: colors.text.primary,
      flex: 1,
    },
    infoDescription: {
      fontSize: typography.fontSize.sm,
      color: colors.text.primary,
      lineHeight: 18,
      marginTop: spacing.xs / 2,
    },
  }), [fontScaleVersion]);
  
  const { createAccount, accounts, error: accountError } = useAccountStore();

  // Step state
  const [currentStep, setCurrentStep] = useState<1 | 2>(1);
  
  // Form state
  const [accountType, setAccountType] = useState<AccountType | null>(null);
  const [name, setName] = useState('');
  const [parentCategory, setParentCategory] = useState<string | null>(null);
  const [subCategory, setSubCategory] = useState<string | null>(null);
  const [openingBalance, setOpeningBalance] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Modal state
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showSubCategoryPicker, setShowSubCategoryPicker] = useState(false);
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
  const [showAddSubCategoryModal, setShowAddSubCategoryModal] = useState(false);
  const [showAccountTypeInfo, setShowAccountTypeInfo] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newSubCategoryName, setNewSubCategoryName] = useState('');


  // Custom categories state (in a real app, these would be stored per user in Firestore)
  const [customCategories, setCustomCategories] = useState<Record<string, string[]>>({});

  // Get categories for selected account type
  const availableCategoriesForType = useMemo(() => {
    if (!accountType) return [];
    return getCategoriesByType(accountType);
  }, [accountType]);

  // Get sub-categories for selected parent category (including custom ones)
  const availableSubCategories = useMemo(() => {
    if (!parentCategory) return [];
    const predefined = getSubCategories(parentCategory);
    const custom = customCategories[parentCategory] || [];
    return [...predefined, ...custom];
  }, [parentCategory, customCategories]);

  // Whether this account type has a balance
  const hasBalance = accountType === 'asset' || accountType === 'liability';

  /**
   * Handle account type selection (Step 1)
   * Move to Step 2 when type is selected
   */
  const handleTypeSelect = (type: AccountType) => {
    setAccountType(type);
    setParentCategory(null);
    setSubCategory(null);
    setOpeningBalance('');
    setCurrentStep(2);
  };

  /**
   * Handle parent category selection
   */
  const handleCategorySelect = (category: string) => {
    setParentCategory(category);
    setSubCategory(null);
    setShowCategoryPicker(false);
  };

  /**
   * Handle sub-category selection
   */
  const handleSubCategorySelect = (subCat: string) => {
    setSubCategory(subCat);
    setShowSubCategoryPicker(false);
    
    // Auto-fill name if empty
    if (!name.trim()) {
      setName(subCat);
    }
  };

  /**
   * Handle adding custom category
   */
  const handleAddCustomCategory = () => {
    if (!newCategoryName.trim()) {
      Alert.alert(t('common.error'), t('addAccount.error.enterCategoryName'));
      return;
    }

    // Check if category already exists
    const exists = availableCategoriesForType.some((cat: { parentCategory: string }) => 
      cat.parentCategory.toLowerCase() === newCategoryName.trim().toLowerCase()
    );
    
    if (exists) {
      Alert.alert(t('common.error'), t('addAccount.error.categoryExists'));
      return;
    }

    // Add custom category
    setCustomCategories(prev => ({
      ...prev,
      [newCategoryName.trim()]: []
    }));
    
    setParentCategory(newCategoryName.trim());
    setShowAddCategoryModal(false);
    setShowCategoryPicker(false);
    setNewCategoryName('');
  };

  /**
   * Handle adding custom subcategory
   */
  const handleAddCustomSubCategory = () => {
    if (!newSubCategoryName.trim()) {
      Alert.alert(t('common.error'), t('addAccount.error.enterSubCategoryName'));
      return;
    }

    if (!parentCategory) {
      Alert.alert(t('common.error'), t('addAccount.error.selectCategoryFirst'));
      return;
    }

    // Check if subcategory already exists
    const exists = availableSubCategories.some(subCat => 
      subCat.toLowerCase() === newSubCategoryName.trim().toLowerCase()
    );
    
    if (exists) {
      Alert.alert(t('common.error'), t('addAccount.error.subCategoryExists'));
      return;
    }

    // Add custom subcategory
    setCustomCategories(prev => ({
      ...prev,
      [parentCategory]: [...(prev[parentCategory] || []), newSubCategoryName.trim()]
    }));
    
    setSubCategory(newSubCategoryName.trim());
    setShowAddSubCategoryModal(false);
    setShowSubCategoryPicker(false);
    setNewSubCategoryName('');
    
    // Auto-fill name if empty
    if (!name.trim()) {
      setName(newSubCategoryName.trim());
    }
  };

  /**
   * Validate and submit account
   */
  const handleSubmit = async () => {
    // Validate name
    if (!name.trim()) {
      Alert.alert(t('common.error'), t('addAccount.error.enterAccountName'));
      return;
    }

    // Check for duplicate account name (case-insensitive, exact match only)
    const trimmedName = name.trim();
    const duplicateCheck = accounts.find(
      account => account.name.toLowerCase() === trimmedName.toLowerCase()
    );
    if (duplicateCheck) {
      Alert.alert(
        'Duplicate Account Name',
        `An account with the name "${duplicateCheck.name}" already exists. Please use a different name.`
      );
      return;
    }

    // Validate categories
    if (!parentCategory || !subCategory) {
      Alert.alert(t('common.error'), t('addAccount.error.selectCategory'));
      return;
    }

    // Validate opening balance for asset/liability accounts
    let balance: number | undefined;
    if (hasBalance && openingBalance.trim()) {
      balance = parseFloat(openingBalance);
      if (isNaN(balance)) {
        Alert.alert(t('common.error'), t('addAccount.error.enterValidBalance'));
        return;
      }
      // Allow negative balances for liability accounts (representing debts)
      // and for asset accounts (representing overdrafts)
    } else if (hasBalance) {
      // Default to 0 if no balance is provided for asset/liability accounts
      balance = 0;
    }

    setIsCreating(true);
    try {
      await createAccount({
        name: name.trim(),
        accountType: accountType!,
        parentCategory,
        subCategory,
        openingBalance: balance,
      });

      navigation.goBack();
    } catch (error: any) {
      const errorMessage = error?.message || accountError || 'Failed to create account. Please try again.';
      console.error('Account creation error:', error);
      setIsCreating(false);
      Alert.alert('Error', errorMessage);
    }
  };

  // Step 1: Account Type Selection
  const renderStep1 = () => (
    <ScrollView
      contentContainerStyle={[
        styles.scrollContent,
        { paddingBottom: insets.bottom + spacing.xl }
      ]}
    >
      <View style={styles.section}>
        <View style={styles.sectionTitleRow}>
          <Text style={styles.sectionTitle}>{t('addAccount.accountType')}</Text>
          <TouchableOpacity
            style={styles.infoButton}
            onPress={() => setShowAccountTypeInfo(true)}
          >
            <Text style={styles.infoButtonText}>i</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.typeGrid}>
          {(['asset', 'liability', 'income', 'expense'] as AccountType[]).map((type) => (
            <TouchableOpacity
              key={type}
              style={[
                styles.typeCard,
                { borderColor: getAccountTypeColor(type) },
              ]}
              onPress={() => handleTypeSelect(type)}
            >
              <View style={[
                styles.typeIcon,
                { backgroundColor: getAccountTypeBgColor(type) }
              ]}>
                <Text style={[
                  styles.typeIconText,
                  { color: getAccountTypeColor(type) }
                ]}>
                  {type === 'asset' ? '↗' : type === 'liability' ? '↙' : type === 'income' ? '↓' : '↑'}
                </Text>
              </View>
              <Text style={[
                styles.typeName,
                { color: getAccountTypeColor(type) }
              ]}>
                {type === 'asset' ? t('addAccount.asset') : type === 'liability' ? t('addAccount.liability') : type === 'income' ? t('addAccount.income') : t('addAccount.expense')}
              </Text>
              <Text style={styles.typeSubtitle} numberOfLines={2}>
                {type === 'asset' 
                  ? t('addAccount.assetSubtitle')
                  : type === 'liability'
                  ? t('addAccount.liabilitySubtitle')
                  : type === 'expense'
                  ? t('addAccount.expenseSubtitle')
                  : t('addAccount.incomeSubtitle')}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </ScrollView>
  );

  // Step 2: Account Details Form
  const renderStep2 = () => (
    <ScrollView
      contentContainerStyle={[
        styles.scrollContent,
        { paddingBottom: insets.bottom + spacing.xl }
      ]}
      keyboardShouldPersistTaps="handled"
    >
      {/* Category Selection */}
      <View style={styles.section}>
        <Text style={styles.inputLabel}>{t('addAccount.category')}</Text>
        <TouchableOpacity
          style={styles.categoryButton}
          onPress={() => {
            Keyboard.dismiss();
            setShowCategoryPicker(true);
          }}
        >
          <Text style={[styles.categoryButtonText, !parentCategory && styles.categoryButtonPlaceholder]}>
            {parentCategory || t('addAccount.selectCategory')}
          </Text>
          <Ionicons name="chevron-down" size={20} color={colors.text.secondary} />
        </TouchableOpacity>

        {parentCategory && (
          <>
            <Text style={styles.inputLabel}>{t('addAccount.subCategory')}</Text>
            <TouchableOpacity
              style={styles.categoryButton}
              onPress={() => {
                Keyboard.dismiss();
                setShowSubCategoryPicker(true);
              }}
            >
              <Text style={[styles.categoryButtonText, !subCategory && styles.categoryButtonPlaceholder]}>
                {subCategory || t('addAccount.selectSubCategory')}
              </Text>
              <Ionicons name="chevron-down" size={20} color={colors.text.secondary} />
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* Account Name */}
      <View style={styles.section}>
        <Text style={styles.inputLabel}>{t('addAccount.accountName')}</Text>
        <TextInput
          style={styles.input}
          placeholder={t('addAccount.enterAccountName')}
          placeholderTextColor={colors.neutral[400]}
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
        />
      </View>

      {/* Opening Balance (only for asset/liability) */}
      {hasBalance && accountType && (
        <View style={styles.section}>
          <Text style={styles.inputLabel}>{t('addAccount.openingBalance')}</Text>
          <View style={styles.balanceInputContainer}>
            <Text style={styles.currencySymbol}>₹</Text>
            <TextInput
              style={styles.balanceInput}
              placeholder="0"
              placeholderTextColor={colors.neutral[400]}
              value={openingBalance}
              onChangeText={setOpeningBalance}
              keyboardType="decimal-pad"
            />
          </View>
        </View>
      )}

      {/* Submit Button */}
      <TouchableOpacity
        style={[styles.submitButton, isCreating && styles.submitButtonDisabled]}
        onPress={handleSubmit}
        disabled={isCreating}
      >
        {isCreating ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color={colors.neutral[0]} size="small" />
            <Text style={styles.submitButtonText}>{t('addAccount.creating')}</Text>
          </View>
        ) : (
          <Text style={styles.submitButtonText}>{t('addAccount.createAccount')}</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header with back button on Step 2 */}
      {currentStep === 2 && (
        <View style={[styles.header, { paddingTop: insets.top }]}>
          <TouchableOpacity
            onPress={() => setCurrentStep(1)}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {accountType === 'asset' ? t('addAccount.asset') : 
             accountType === 'liability' ? t('addAccount.liability') : 
             accountType === 'income' ? t('addAccount.income') : 
             t('addAccount.expense')}
          </Text>
          <View style={{ width: 24 }} />
        </View>
      )}
      
      {currentStep === 1 ? renderStep1() : renderStep2()}

      {/* Loading Overlay */}
      {isCreating && (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingContent}>
            <ActivityIndicator size="large" color={colors.primary[500]} />
            <Text style={styles.loadingText}>{t('addAccount.creatingAccount')}</Text>
          </View>
        </View>
      )}

      {/* Category Picker Modal */}
      <Modal
        visible={showCategoryPicker}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowCategoryPicker(false)}
      >
        <View style={[styles.modalContainer, { paddingTop: insets.top }]}>
          <View style={styles.modalHeader}>
            <TouchableOpacity 
              onPress={() => setShowCategoryPicker(false)}
              style={styles.modalCancelButton}
            >
              <Text style={styles.modalCancel}>Cancel </Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Select Category</Text>
            <View style={{ width: 90 }} />
          </View>

          <FlatList
            data={availableCategoriesForType}
            keyExtractor={(item) => item.parentCategory}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.optionItem}
                onPress={() => handleCategorySelect(item.parentCategory)}
              >
                <Text style={styles.optionText}>{item.parentCategory}</Text>
                <Text style={styles.optionSubtext}>
                  {item.subCategories.length} sub-categories
                </Text>
              </TouchableOpacity>
            )}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            ListFooterComponent={() => (
              <>
                <View style={styles.separator} />
                <TouchableOpacity
                  style={styles.addCustomButton}
                  onPress={() => {
                    setShowCategoryPicker(false);
                    setShowAddCategoryModal(true);
                  }}
                >
                  <Text style={styles.addCustomButtonText}>+ {t('addAccount.addCustomCategory')}</Text>
                </TouchableOpacity>
              </>
            )}
            contentContainerStyle={{ paddingBottom: insets.bottom }}
          />
        </View>
      </Modal>

      {/* Sub-Category Picker Modal */}
      <Modal
        visible={showSubCategoryPicker}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowSubCategoryPicker(false)}
      >
        <View style={[styles.modalContainer, { paddingTop: insets.top }]}>
          <View style={styles.modalHeader}>
            <TouchableOpacity 
              onPress={() => setShowSubCategoryPicker(false)}
              style={styles.modalCancelButton}
            >
              <Text style={styles.modalCancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Select Sub-category</Text>
            <View style={{ width: 90 }} />
          </View>

          <FlatList
            data={availableSubCategories}
            keyExtractor={(item) => item}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.optionItem}
                onPress={() => handleSubCategorySelect(item)}
              >
                <Text style={styles.optionText}>{item}</Text>
              </TouchableOpacity>
            )}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            ListFooterComponent={() => (
              <>
                <View style={styles.separator} />
                <TouchableOpacity
                  style={styles.addCustomButton}
                  onPress={() => {
                    setShowSubCategoryPicker(false);
                    setShowAddSubCategoryModal(true);
                  }}
                >
                  <Text style={styles.addCustomButtonText}>+ {t('addAccount.addCustomSubCategory')}</Text>
                </TouchableOpacity>
              </>
            )}
            contentContainerStyle={{ paddingBottom: insets.bottom }}
          />
        </View>
      </Modal>

      {/* Add Custom Category Modal */}
      <Modal
        visible={showAddCategoryModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => {
          setShowAddCategoryModal(false);
          setNewCategoryName('');
        }}
      >
        <KeyboardAvoidingView
          style={[styles.modalContainer, { paddingTop: insets.top }]}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => {
              setShowAddCategoryModal(false);
              setNewCategoryName('');
            }}>
              <Text style={styles.modalCancel}>{t('common.cancel')}</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{t('addAccount.addCustomCategory')}</Text>
            <TouchableOpacity onPress={handleAddCustomCategory}>
              <Text style={styles.modalDone}>{t('common.done')}</Text>
            </TouchableOpacity>
          </View>
          <ScrollView
            contentContainerStyle={styles.modalContent}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={styles.inputLabel}>{t('addAccount.categoryName')}</Text>
            <TextInput
              style={styles.input}
              placeholder={t('addAccount.enterCategoryName')}
              placeholderTextColor={colors.neutral[400]}
              value={newCategoryName}
              onChangeText={setNewCategoryName}
              autoCapitalize="words"
              autoFocus
            />
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* Add Custom Sub-category Modal */}
      <Modal
        visible={showAddSubCategoryModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => {
          setShowAddSubCategoryModal(false);
          setNewSubCategoryName('');
        }}
      >
        <KeyboardAvoidingView
          style={[styles.modalContainer, { paddingTop: insets.top }]}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => {
              setShowAddSubCategoryModal(false);
              setNewSubCategoryName('');
            }}>
              <Text style={styles.modalCancel}>{t('common.cancel')}</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{t('addAccount.addCustomSubCategory')}</Text>
            <TouchableOpacity onPress={handleAddCustomSubCategory}>
              <Text style={styles.modalDone}>{t('common.done')}</Text>
            </TouchableOpacity>
          </View>
          <ScrollView
            contentContainerStyle={styles.modalContent}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={styles.inputLabel}>{t('addAccount.subCategoryName')}</Text>
            <TextInput
              style={styles.input}
              placeholder={t('addAccount.enterSubCategoryName')}
              placeholderTextColor={colors.neutral[400]}
              value={newSubCategoryName}
              onChangeText={setNewSubCategoryName}
              autoCapitalize="words"
              autoFocus
            />
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* Account Type Info Modal */}
      <Modal
        visible={showAccountTypeInfo}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowAccountTypeInfo(false)}
      >
        <View style={[styles.modalContainer, { paddingTop: insets.top }]}>
          <View style={styles.modalHeader}>
            <View style={{ width: 90 }} />
            <Text style={styles.modalTitle}>{t('addAccount.accountTypesTitle')}</Text>
            <TouchableOpacity onPress={() => setShowAccountTypeInfo(false)}>
              <Text style={styles.modalDone}>{t('common.done')}</Text>
            </TouchableOpacity>
          </View>
          <ScrollView
            contentContainerStyle={[styles.modalContent, styles.infoModalContent]}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.infoCard}>
              <View style={[styles.infoCardHeader, { backgroundColor: getAccountTypeBgColor('asset') }]}>
                <View style={styles.infoIcon}>
                  <Text style={[styles.infoIconText, { color: getAccountTypeColor('asset') }]}>
                    ↗
                  </Text>
                </View>
                <Text style={styles.infoTitle}>{t('addAccount.info.assetTitle')}</Text>
              </View>
              <View style={styles.infoCardBody}>
                <Text style={styles.infoDescription}>
                  {t('addAccount.info.assetDescription')}
                </Text>
              </View>
            </View>

            <View style={styles.infoCard}>
              <View style={[styles.infoCardHeader, { backgroundColor: getAccountTypeBgColor('liability') }]}>
                <View style={styles.infoIcon}>
                  <Text style={[styles.infoIconText, { color: getAccountTypeColor('liability') }]}>
                    ↙
                  </Text>
                </View>
                <Text style={styles.infoTitle}>{t('addAccount.info.liabilityTitle')}</Text>
              </View>
              <View style={styles.infoCardBody}>
                <Text style={styles.infoDescription}>
                  {t('addAccount.info.liabilityDescription')}
                </Text>
              </View>
            </View>

            <View style={styles.infoCard}>
              <View style={[styles.infoCardHeader, { backgroundColor: getAccountTypeBgColor('income') }]}>
                <View style={styles.infoIcon}>
                  <Text style={[styles.infoIconText, { color: getAccountTypeColor('income') }]}>
                    ↓
                  </Text>
                </View>
                <Text style={styles.infoTitle}>{t('addAccount.info.incomeTitle')}</Text>
              </View>
              <View style={styles.infoCardBody}>
                <Text style={styles.infoDescription}>
                  {t('addAccount.info.incomeDescription')}
                </Text>
              </View>
            </View>

            <View style={styles.infoCard}>
              <View style={[styles.infoCardHeader, { backgroundColor: getAccountTypeBgColor('expense') }]}>
                <View style={styles.infoIcon}>
                  <Text style={[styles.infoIconText, { color: getAccountTypeColor('expense') }]}>
                    ↑
                  </Text>
                </View>
                <Text style={styles.infoTitle}>{t('addAccount.info.expenseTitle')}</Text>
              </View>
              <View style={styles.infoCardBody}>
                <Text style={styles.infoDescription}>
                  {t('addAccount.info.expenseDescription')}
                </Text>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
};


export default AddAccountScreen;
