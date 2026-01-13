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
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Modal,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

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
  
  const { createAccount, accounts, isLoading, error: accountError } = useAccountStore();

  // Form state
  const [accountType, setAccountType] = useState<AccountType>('asset');
  const [name, setName] = useState('');
  const [parentCategory, setParentCategory] = useState<string | null>(null);
  const [subCategory, setSubCategory] = useState<string | null>(null);
  const [openingBalance, setOpeningBalance] = useState('');
  const [selectedColor, setSelectedColor] = useState(ACCOUNT_COLORS[0]);

  // Modal state
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showSubCategoryPicker, setShowSubCategoryPicker] = useState(false);
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
  const [showAddSubCategoryModal, setShowAddSubCategoryModal] = useState(false);
  const [showAccountTypeInfo, setShowAccountTypeInfo] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newSubCategoryName, setNewSubCategoryName] = useState('');

  // Get categories for selected account type
  const availableCategories = useMemo(() => {
    return getCategoriesByType(accountType);
  }, [accountType]);

  // Custom categories state (in a real app, these would be stored per user in Firestore)
  const [customCategories, setCustomCategories] = useState<Record<string, string[]>>({});

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
   * Handle account type change
   * Reset category selections when type changes
   */
  const handleTypeChange = (type: AccountType) => {
    setAccountType(type);
    setParentCategory(null);
    setSubCategory(null);
    setOpeningBalance('');
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
      Alert.alert('Error', 'Please enter a category name');
      return;
    }

    // Check if category already exists
    const exists = availableCategories.some(cat => 
      cat.parentCategory.toLowerCase() === newCategoryName.trim().toLowerCase()
    );
    
    if (exists) {
      Alert.alert('Error', 'This category already exists');
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
      Alert.alert('Error', 'Please enter a sub-category name');
      return;
    }

    if (!parentCategory) {
      Alert.alert('Error', 'Please select a category first');
      return;
    }

    // Check if subcategory already exists
    const exists = availableSubCategories.some(subCat => 
      subCat.toLowerCase() === newSubCategoryName.trim().toLowerCase()
    );
    
    if (exists) {
      Alert.alert('Error', 'This sub-category already exists');
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
      Alert.alert('Error', 'Please enter an account name');
      return;
    }

    // Check for duplicate account name (case-insensitive)
    const trimmedName = name.trim();
    const duplicateAccount = accounts.find(
      account => account.name.toLowerCase() === trimmedName.toLowerCase()
    );
    if (duplicateAccount) {
      Alert.alert(
        'Duplicate Account Name',
        `An account with the name "${duplicateAccount.name}" already exists. Please use a different name.`
      );
      return;
    }

    // Validate categories
    if (!parentCategory || !subCategory) {
      Alert.alert('Error', 'Please select a category');
      return;
    }

    // Validate opening balance for asset/liability accounts
    let balance: number | undefined;
    if (hasBalance && openingBalance.trim()) {
      balance = parseFloat(openingBalance);
      if (isNaN(balance)) {
        Alert.alert('Error', 'Please enter a valid opening balance');
        return;
      }
      // Allow negative balances for liability accounts (representing debts)
      // and for asset accounts (representing overdrafts)
    } else if (hasBalance) {
      // Default to 0 if no balance is provided for asset/liability accounts
      balance = 0;
    }

    try {
      await createAccount({
        name: name.trim(),
        accountType,
        parentCategory,
        subCategory,
        openingBalance: balance,
        color: selectedColor,
      });

      navigation.goBack();
    } catch (error: any) {
      const errorMessage = error?.message || accountError || 'Failed to create account. Please try again.';
      console.error('Account creation error:', error);
      Alert.alert('Error', errorMessage);
    }
  };

  /**
   * Get description for account type
   */
  const getTypeDescription = (type: AccountType): string => {
    switch (type) {
      case 'asset':
        return 'Things you own (bank accounts, investments, cash)';
      case 'liability':
        return 'Things you owe (credit cards, loans)';
      case 'income':
        return 'Sources of money earned';
      case 'expense':
        return 'Categories for money spent';
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + spacing.xl }
        ]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Account Type Selector */}
        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <Text style={styles.sectionTitle}>Account Type</Text>
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
                  accountType === type && styles.typeCardActive,
                  accountType === type && { borderColor: getAccountTypeColor(type) },
                ]}
                onPress={() => handleTypeChange(type)}
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
                  accountType === type && { color: getAccountTypeColor(type) }
                ]}>
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.typeDescription}>
            {getTypeDescription(accountType)}
          </Text>
        </View>

        {/* Category Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Category</Text>
          <View style={styles.formCard}>
            <TouchableOpacity
              style={styles.selector}
              onPress={() => setShowCategoryPicker(true)}
            >
              <Text style={styles.selectorLabel}>Category</Text>
              {parentCategory ? (
                <Text style={styles.selectorValue}>{parentCategory}</Text>
              ) : (
                <Text style={styles.selectorPlaceholder}>Select category</Text>
              )}
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>

            {parentCategory && (
              <>
                <View style={styles.divider} />
                <TouchableOpacity
                  style={styles.selector}
                  onPress={() => setShowSubCategoryPicker(true)}
                >
                  <Text style={styles.selectorLabel}>Sub-category</Text>
                  {subCategory ? (
                    <Text style={styles.selectorValue}>{subCategory}</Text>
                  ) : (
                    <Text style={styles.selectorPlaceholder}>Select sub-category</Text>
                  )}
                  <Text style={styles.chevron}>›</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>

        {/* Account Name */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account Name</Text>
          <View style={styles.formCard}>
            <TextInput
              style={styles.textInput}
              placeholder="Enter account name"
              placeholderTextColor={colors.neutral[400]}
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
            />
          </View>
        </View>

        {/* Opening Balance (only for asset/liability) */}
        {hasBalance && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Opening Balance</Text>
            <View style={styles.formCard}>
              <View style={styles.balanceInput}>
                <Text style={styles.currencySymbol}>₹</Text>
                <TextInput
                  style={styles.balanceTextInput}
                  placeholder="0.00"
                  placeholderTextColor={colors.neutral[400]}
                  value={openingBalance}
                  onChangeText={setOpeningBalance}
                  keyboardType="decimal-pad"
                />
              </View>
            </View>
            <Text style={styles.helperText}>
              {accountType === 'asset' 
                ? 'Current balance in this account'
                : 'Current amount owed'}
            </Text>
          </View>
        )}

        {/* Color Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Color</Text>
          <View style={styles.colorGrid}>
            {ACCOUNT_COLORS.map((color) => (
              <TouchableOpacity
                key={color}
                style={[
                  styles.colorOption,
                  { backgroundColor: color },
                  selectedColor === color && styles.colorOptionSelected,
                ]}
                onPress={() => setSelectedColor(color)}
              >
                {selectedColor === color && (
                  <Text style={styles.colorCheck}>✓</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={isLoading}
        >
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator color={colors.neutral[0]} size="small" />
              <Text style={styles.submitButtonText}>Creating...</Text>
            </View>
          ) : (
            <Text style={styles.submitButtonText}>Create Account</Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* Loading Overlay */}
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingContent}>
            <ActivityIndicator size="large" color={colors.primary[500]} />
            <Text style={styles.loadingText}>Creating Account...</Text>
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
            data={availableCategories}
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
                  <Text style={styles.addCustomButtonText}>+ Add Custom Category</Text>
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
                  <Text style={styles.addCustomButtonText}>+ Add Custom Sub-category</Text>
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
              <Text style={styles.modalCancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Add Custom Category</Text>
            <TouchableOpacity onPress={handleAddCustomCategory}>
              <Text style={styles.modalDone}>Done</Text>
            </TouchableOpacity>
          </View>
          <ScrollView
            contentContainerStyle={styles.modalContent}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={styles.inputLabel}>Category Name</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Enter category name"
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
              <Text style={styles.modalCancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Add Custom Sub-category</Text>
            <TouchableOpacity onPress={handleAddCustomSubCategory}>
              <Text style={styles.modalDone}>Done</Text>
            </TouchableOpacity>
          </View>
          <ScrollView
            contentContainerStyle={styles.modalContent}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={styles.inputLabel}>Sub-category Name</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Enter sub-category name"
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
            <Text style={styles.modalTitle}>Account Types</Text>
            <TouchableOpacity onPress={() => setShowAccountTypeInfo(false)}>
              <Text style={styles.modalDone}>Done</Text>
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
                <Text style={styles.infoTitle}>Assets – What you own</Text>
              </View>
              <View style={styles.infoCardBody}>
                <Text style={styles.infoDescription}>
                  Money you have, like bank balance, cash, gold, or investments. These accounts track what you own and can have opening balances. Examples include savings accounts, checking accounts, fixed deposits, stocks, mutual funds, gold, property, and cash in hand.
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
                <Text style={styles.infoTitle}>Liabilities – What you owe</Text>
              </View>
              <View style={styles.infoCardBody}>
                <Text style={styles.infoDescription}>
                  Loans, credit card dues, or any money you need to pay. These accounts track what you owe to others and can have opening balances. Examples include home loans, car loans, personal loans, credit card balances, education loans, and any other debts you need to repay.
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
                <Text style={styles.infoTitle}>Income – Money you receive</Text>
              </View>
              <View style={styles.infoCardBody}>
                <Text style={styles.infoDescription}>
                  Salary, business income, rent, or any money coming in. These accounts track sources of money you receive. Examples include salary, freelance income, business profits, rental income, dividends, interest earned, gifts received, and any other money coming into your accounts.
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
                <Text style={styles.infoTitle}>Expenses – Money you spend</Text>
              </View>
              <View style={styles.infoCardBody}>
                <Text style={styles.infoDescription}>
                  Daily costs like food, bills, travel, shopping, etc. These accounts track where your money goes. Examples include groceries, utilities, rent, transportation, entertainment, medical expenses, education fees, shopping, dining out, and any other money you spend.
                </Text>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  scrollContent: {
    padding: spacing.base,
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
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  typeCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: colors.background.elevated,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    ...shadows.sm,
  },
  typeCardActive: {
    // Border color set dynamically
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
  typeDescription: {
    fontSize: typography.fontSize.sm,
    color: colors.text.tertiary,
    textAlign: 'center',
    marginTop: spacing.md,
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
    color: colors.text.primary,
    marginBottom: spacing.sm,
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
  textInput: {
    fontSize: typography.fontSize.base,
    color: colors.text.primary,
    padding: spacing.base,
  },
  balanceInput: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.base,
  },
  currencySymbol: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.secondary,
    marginRight: spacing.sm,
  },
  balanceTextInput: {
    flex: 1,
    fontSize: typography.fontSize.base,
    color: colors.text.primary,
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
  submitButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.neutral[0],
  },
  // Modal styles
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
});

export default AddAccountScreen;
