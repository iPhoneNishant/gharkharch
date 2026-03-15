/**
 * Setup Expenses Screen
 * "What are your daily expenses?"
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../types';
import { useOnboardingStore } from '../stores/onboardingStore';
import { OnboardingExpense } from '../types/onboarding';
import { useAccountStore, useAuthStore } from '../stores';
import { colors, spacing, typography, borderRadius, shadows, addFontScaleListener } from '../config/theme';
import { ACCOUNT_CATEGORIES, getCategoriesByType, getSubCategories } from '../config/constants';
import { useMemo } from 'react';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'SetupExpenses'>;

const getStyles = (fontScaleVersion: number) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  headerTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    flex: 1,
    textAlign: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  subtitle: {
    fontSize: typography.fontSize.base,
    color: colors.text.secondary,
    marginTop: spacing.base,
    marginBottom: spacing.lg,
  },
  listContent: {
    paddingBottom: spacing.base,
  },
  itemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.elevated,
    borderRadius: borderRadius.md,
    padding: spacing.base,
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  checkboxContainer: {
    marginRight: spacing.base,
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
  itemContent: {
    flex: 1,
  },
  itemNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  itemName: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.text.primary,
    flex: 1,
  },
  itemNameDisabled: {
    color: colors.text.tertiary,
  },
  itemCategory: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
  },
  itemCategoryDisabled: {
    color: colors.text.tertiary,
  },
  badge: {
    backgroundColor: colors.neutral[200],
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  badgeText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.secondary,
  },
  itemContainerDisabled: {
    opacity: 0.6,
    backgroundColor: colors.neutral[50],
  },
  checkboxDisabled: {
    backgroundColor: colors.neutral[200],
    borderColor: colors.border.light,
  },
  actionButton: {
    padding: spacing.xs,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary[500],
    borderRadius: borderRadius.md,
    padding: spacing.base,
    marginTop: spacing.base,
    marginBottom: spacing.base,
  },
  addButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.neutral[0],
    marginLeft: spacing.sm,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.base,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },
  footerText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary[500],
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
  },
  nextButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.neutral[0],
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.background.elevated,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    marginBottom: spacing.lg,
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
  modalButtons: {
    flexDirection: 'row',
    gap: spacing.base,
    marginTop: spacing.lg,
  },
  modalButton: {
    flex: 1,
    padding: spacing.base,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  modalButtonCancel: {
    backgroundColor: colors.neutral[200],
  },
  modalButtonSave: {
    backgroundColor: colors.primary[500],
  },
  modalButtonTextCancel: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.text.primary,
  },
  modalButtonTextSave: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.neutral[0],
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
  categoryButtonDisabled: {
    opacity: 0.5,
  },
  pickerModalContent: {
    backgroundColor: colors.background.elevated,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    width: '90%',
    maxHeight: '70%',
  },
  pickerItem: {
    padding: spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  pickerItemText: {
    fontSize: typography.fontSize.base,
    color: colors.text.primary,
  },
});

const SetupExpensesScreen: React.FC = () => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const { expenses, toggleExpense, updateExpense, duplicateExpense, addExpense } = useOnboardingStore();
  const { accounts } = useAccountStore();
  const { updateOnboardingComplete } = useAuthStore();
  const [fontScaleVersion, setFontScaleVersion] = React.useState(0);
  
  React.useEffect(() => {
    const unsub = addFontScaleListener(() => {
      setFontScaleVersion(v => v + 1);
    });
    return () => {
      unsub();
    };
  }, []);
  
  const styles = useMemo(() => getStyles(fontScaleVersion), [fontScaleVersion]);
  
  // Check if this is onboarding flow (no accounts exist)
  const isOnboarding = accounts.length === 0;
  

  // Check which expenses are already created
  const isExpenseAlreadyCreated = (expenseName: string): boolean => {
    return accounts.some(account => 
      account.name.toLowerCase().trim() === expenseName.toLowerCase().trim() && 
      account.accountType === 'expense'
    );
  };
  
  const [editingItem, setEditingItem] = useState<OnboardingExpense | null>(null);
  const [editName, setEditName] = useState('');
  const [editParentCategory, setEditParentCategory] = useState<string>('');
  const [editSubCategory, setEditSubCategory] = useState<string>('');
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showSubCategoryPicker, setShowSubCategoryPicker] = useState(false);
  const [isEditingCategory, setIsEditingCategory] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemParentCategory, setNewItemParentCategory] = useState<string>('Food & Dining');
  const [newItemSubCategory, setNewItemSubCategory] = useState<string>('Groceries');

  // Get available categories for expenses
  const availableCategories = useMemo(() => {
    return getCategoriesByType('expense');
  }, []);

  // Get subcategories for selected parent category
  const availableSubCategories = useMemo(() => {
    const parentCat = isEditingCategory ? editParentCategory : newItemParentCategory;
    if (!parentCat) return [];
    return getSubCategories(parentCat);
  }, [editParentCategory, newItemParentCategory, isEditingCategory]);

  const handleEdit = (item: OnboardingExpense) => {
    setEditingItem(item);
    setEditName(item.name);
    
    // Set default categories based on name matching
    let defaultParentCategory = 'Food & Dining';
    let defaultSubCategory = 'Groceries';
    
    const nameLower = item.name.toLowerCase();
    if (nameLower.includes('groceries') || nameLower.includes('milk') || nameLower.includes('vegetable')) {
      defaultParentCategory = 'Food & Dining';
      defaultSubCategory = 'Groceries';
    } else if (nameLower.includes('electricity')) {
      defaultParentCategory = 'Utilities';
      defaultSubCategory = 'Electricity';
    } else if (nameLower.includes('gas')) {
      defaultParentCategory = 'Utilities';
      defaultSubCategory = 'Gas';
    } else if (nameLower.includes('maid') || nameLower.includes('cook') || nameLower.includes('helper')) {
      defaultParentCategory = 'Utilities';
      defaultSubCategory = 'Helper';
    } else if (nameLower.includes('repair') || nameLower.includes('maintenance')) {
      defaultParentCategory = 'Housing';
      defaultSubCategory = 'Repairs';
    } else if (nameLower.includes('school') || nameLower.includes('fee')) {
      defaultParentCategory = 'Education';
      defaultSubCategory = 'Tuition';
    }
    
    setEditParentCategory(item.parentCategory || defaultParentCategory);
    setEditSubCategory(item.subCategory || defaultSubCategory);
    setIsEditingCategory(true);
  };

  const handleSaveEdit = () => {
    if (!editingItem) return;
    
    const trimmedName = editName.trim();
    if (!trimmedName) {
      Alert.alert(t('common.error'), t('onboarding.expenses.error.enterName'));
      return;
    }
    
    // Check for duplicate account name (excluding current item, exact match only)
    const expenseAccounts = accounts.filter(acc => acc.accountType === 'expense');
    const duplicateCheck = expenseAccounts.find(
      account => account.name.toLowerCase() === trimmedName.toLowerCase() && account.name !== editingItem.name
    );
    if (duplicateCheck) {
      Alert.alert(
        t('common.error'),
        t('onboarding.expenses.error.duplicateAccount', { name: duplicateCheck.name })
      );
      return;
    }
    
    updateExpense(editingItem.id, {
      name: trimmedName,
      parentCategory: editParentCategory || undefined,
      subCategory: editSubCategory || undefined,
    });
    setEditingItem(null);
    setEditName('');
    setEditParentCategory('');
    setEditSubCategory('');
  };

  const handleAdd = () => {
    if (!newItemName.trim()) {
      Alert.alert(t('common.error'), t('onboarding.expenses.error.enterName'));
      return;
    }
    
    const trimmedName = newItemName.trim();
    
    // Check for duplicate account name (case-insensitive, exact match only)
    const expenseAccounts = accounts.filter(acc => acc.accountType === 'expense');
    const duplicateCheck = expenseAccounts.find(
      account => account.name.toLowerCase() === trimmedName.toLowerCase()
    );
    if (duplicateCheck) {
      Alert.alert(
        t('common.error'),
        t('onboarding.expenses.error.duplicateAccount', { name: duplicateCheck.name })
      );
      return;
    }
    
    addExpense({
      name: trimmedName,
      type: 'EXPENSE',
      isSelected: true,
      parentCategory: newItemParentCategory || undefined,
      subCategory: newItemSubCategory || undefined,
    });
    setShowAddModal(false);
    setNewItemName('');
    setNewItemParentCategory('Food & Dining');
    setNewItemSubCategory('Groceries');
  };

  const renderItem = ({ item }: { item: OnboardingExpense }) => {
    const alreadyCreated = isExpenseAlreadyCreated(item.name);
    const isDisabled = alreadyCreated;
    
    return (
      <View style={[styles.itemContainer, isDisabled && styles.itemContainerDisabled]}>
        <TouchableOpacity
          style={styles.checkboxContainer}
          onPress={() => !isDisabled && toggleExpense(item.id)}
          disabled={isDisabled}
        >
          <View style={[
            styles.checkbox, 
            item.isSelected && !isDisabled && styles.checkboxChecked,
            isDisabled && styles.checkboxDisabled
          ]}>
            {item.isSelected && !isDisabled && <Ionicons name="checkmark" size={16} color={colors.neutral[0]} />}
            {isDisabled && <Ionicons name="checkmark" size={16} color={colors.text.tertiary} />}
          </View>
        </TouchableOpacity>

        <View style={styles.itemContent}>
          <View style={styles.itemNameRow}>
            <Text style={[styles.itemName, isDisabled && styles.itemNameDisabled]}>{item.name}</Text>
            {alreadyCreated && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{t('onboarding.expenses.alreadyCreated')}</Text>
              </View>
            )}
          </View>
          {((item.parentCategory && item.parentCategory.trim()) || (item.subCategory && item.subCategory.trim())) && (
            <Text style={[styles.itemCategory, isDisabled && styles.itemCategoryDisabled]}>
              {item.parentCategory && item.parentCategory.trim() ? item.parentCategory : ''}
              {item.parentCategory && item.parentCategory.trim() && item.subCategory && item.subCategory.trim() ? ' > ' : ''}
              {item.subCategory && item.subCategory.trim() ? item.subCategory : ''}
            </Text>
          )}
        </View>

        <View style={styles.itemActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => duplicateExpense(item.id)}
          >
            <Ionicons name="copy-outline" size={20} color={colors.primary[500]} />
          </TouchableOpacity>
          {!isDisabled && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleEdit(item)}
            >
              <Ionicons name="create-outline" size={20} color={colors.primary[500]} />
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  const selectedCount = expenses.filter(e => e.isSelected && !isExpenseAlreadyCreated(e.name)).length;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('onboarding.expenses.title')}</Text>
          {isOnboarding ? (
            <TouchableOpacity
              onPress={() => {
                Alert.alert(
                  t('onboarding.expenses.skipSetupTitle'),
                  t('onboarding.expenses.skipSetupMessage'),
                  [
                    {
                      text: 'Cancel',
                      style: 'cancel',
                    },
                    {
                      text: 'Skip',
                      style: 'destructive',
                      onPress: () => {
                        // Don't mark onboarding as complete when skipping
                        // User can still access setup from More screen later
                        navigation.reset({ index: 0, routes: [{ name: 'Main' }] });
                      },
                    },
                  ]
                );
              }}
            >
              <Text style={styles.skipButton}>Skip</Text>
            </TouchableOpacity>
          ) : (
            <View style={{ width: 24 }} />
          )}
        </View>

        <View style={styles.content}>
          <Text style={styles.subtitle}>
            {t('onboarding.expenses.subtitle')}
          </Text>

          <FlatList
            data={expenses}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />

          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setShowAddModal(true)}
          >
            <Ionicons name="add" size={24} color={colors.neutral[0]} />
            <Text style={styles.addButtonText}>{t('onboarding.expenses.addNew')}</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.base }]}>
          <Text style={styles.footerText}>
            {t('onboarding.expenses.accountsSelected', { count: selectedCount })}
          </Text>
          <TouchableOpacity
            style={styles.nextButton}
            onPress={() => navigation.navigate('SetupIncome')}
          >
            <Text style={styles.nextButtonText}>{t('onboarding.expenses.next')}</Text>
            <Ionicons name="arrow-forward" size={20} color={colors.neutral[0]} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Edit Modal */}
      <Modal
        visible={!!editingItem}
        transparent
        animationType="slide"
        onRequestClose={() => setEditingItem(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t('onboarding.expenses.editAccount')}</Text>
            
            <Text style={styles.inputLabel}>{t('onboarding.expenses.name')}</Text>
            <TextInput
              style={styles.input}
              value={editName}
              onChangeText={setEditName}
              placeholder={t('onboarding.expenses.accountName')}
            />

            <Text style={styles.inputLabel}>{t('onboarding.expenses.category')}</Text>
            <TouchableOpacity
              style={styles.categoryButton}
              onPress={() => {
                setIsEditingCategory(true);
                setShowCategoryPicker(true);
              }}
            >
              <Text style={styles.categoryButtonText}>
                {editParentCategory || t('onboarding.expenses.selectCategory')}
              </Text>
              <Ionicons name="chevron-down" size={20} color={colors.text.secondary} />
            </TouchableOpacity>

            <Text style={styles.inputLabel}>{t('onboarding.expenses.subCategory')}</Text>
            <TouchableOpacity
              style={[styles.categoryButton, !editParentCategory && styles.categoryButtonDisabled]}
              onPress={() => {
                if (!editParentCategory) {
                  Alert.alert(t('common.error'), t('onboarding.expenses.error.selectCategoryFirst'));
                  return;
                }
                setIsEditingCategory(true);
                setShowSubCategoryPicker(true);
              }}
              disabled={!editParentCategory}
            >
              <Text style={[styles.categoryButtonText, !editSubCategory && styles.categoryButtonPlaceholder]}>
                {editSubCategory || t('onboarding.expenses.selectSubCategory')}
              </Text>
              <Ionicons name="chevron-down" size={20} color={colors.text.secondary} />
            </TouchableOpacity>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => setEditingItem(null)}
              >
                <Text style={styles.modalButtonTextCancel}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSave]}
                onPress={handleSaveEdit}
              >
                <Text style={styles.modalButtonTextSave}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Add Modal */}
      <Modal
        visible={showAddModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t('onboarding.expenses.addNewAccount')}</Text>
            
            <Text style={styles.inputLabel}>{t('onboarding.expenses.name')}</Text>
            <TextInput
              style={styles.input}
              value={newItemName}
              onChangeText={setNewItemName}
              placeholder={t('onboarding.expenses.accountName')}
            />

            <Text style={styles.inputLabel}>{t('onboarding.expenses.category')}</Text>
            <TouchableOpacity
              style={styles.categoryButton}
              onPress={() => {
                setIsEditingCategory(false);
                setShowCategoryPicker(true);
              }}
            >
              <Text style={styles.categoryButtonText}>
                {newItemParentCategory || t('onboarding.expenses.selectCategory')}
              </Text>
              <Ionicons name="chevron-down" size={20} color={colors.text.secondary} />
            </TouchableOpacity>

            {newItemParentCategory && (
              <>
                <Text style={styles.inputLabel}>{t('onboarding.expenses.subCategory')}</Text>
                <TouchableOpacity
                  style={styles.categoryButton}
                  onPress={() => {
                    setIsEditingCategory(false);
                    setShowSubCategoryPicker(true);
                  }}
                >
                  <Text style={[styles.categoryButtonText, !newItemSubCategory && styles.categoryButtonPlaceholder]}>
                    {newItemSubCategory || t('onboarding.expenses.selectSubCategory')}
                  </Text>
                  <Ionicons name="chevron-down" size={20} color={colors.text.secondary} />
                </TouchableOpacity>
              </>
            )}

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => setShowAddModal(false)}
              >
                <Text style={styles.modalButtonTextCancel}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSave]}
                onPress={handleAdd}
              >
                <Text style={styles.modalButtonTextSave}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Category Picker Modal */}
      <Modal
        visible={showCategoryPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCategoryPicker(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.pickerModalContent}>
            <Text style={styles.modalTitle}>{t('onboarding.expenses.selectCategory')}</Text>
            <FlatList
              data={availableCategories}
              keyExtractor={(item) => item.parentCategory}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.pickerItem}
                  onPress={() => {
                    if (isEditingCategory) {
                      setEditParentCategory(item.parentCategory);
                      setEditSubCategory(''); // Reset subcategory when parent changes
                    } else {
                      setNewItemParentCategory(item.parentCategory);
                      setNewItemSubCategory(''); // Reset subcategory when parent changes
                    }
                    setShowCategoryPicker(false);
                  }}
                >
                  <Text style={styles.pickerItemText}>{item.parentCategory}</Text>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity
              style={[styles.modalButton, styles.modalButtonCancel]}
              onPress={() => setShowCategoryPicker(false)}
            >
              <Text style={styles.modalButtonTextCancel}>{t('common.cancel')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Sub Category Picker Modal */}
      <Modal
        visible={showSubCategoryPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowSubCategoryPicker(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.pickerModalContent}>
            <Text style={styles.modalTitle}>{t('onboarding.expenses.selectSubCategory')}</Text>
            <FlatList
              data={availableSubCategories}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.pickerItem}
                  onPress={() => {
                    if (isEditingCategory) {
                      setEditSubCategory(item);
                    } else {
                      setNewItemSubCategory(item);
                    }
                    setShowSubCategoryPicker(false);
                  }}
                >
                  <Text style={styles.pickerItemText}>{item}</Text>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity
              style={[styles.modalButton, styles.modalButtonCancel]}
              onPress={() => setShowSubCategoryPicker(false)}
            >
              <Text style={styles.modalButtonTextCancel}>{t('common.cancel')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
};

export default SetupExpensesScreen;
