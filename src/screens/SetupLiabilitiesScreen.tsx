/**
 * Setup Liabilities Screen
 * "Do you have any loans?"
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
import { OnboardingLiability } from '../types/onboarding';
import { useAccountStore, useAuthStore } from '../stores';
import { colors, spacing, typography, borderRadius, shadows, addFontScaleListener } from '../config/theme';
import { ACCOUNT_CATEGORIES, getCategoriesByType, getSubCategories } from '../config/constants';
import { useMemo } from 'react';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'SetupLiabilities'>;

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
    minWidth: 0,
  },
  itemNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
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
    flexShrink: 1,
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
  itemAmount: {
    fontSize: typography.fontSize.sm,
    color: colors.text.tertiary,
  },
  itemActions: {
    flexDirection: 'row',
    gap: spacing.sm,
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
  footerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.base,
  },
  skipButton: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
  },
  skipButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.secondary,
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
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.border.medium,
    borderRadius: borderRadius.md,
    padding: spacing.base,
    backgroundColor: colors.background.primary,
    marginBottom: spacing.base,
  },
  categoryButtonText: {
    flex: 1,
    flexShrink: 1,
    marginRight: spacing.sm,
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
    width: '100%',
    alignSelf: 'stretch',
  },
  pickerItemText: {
    fontSize: typography.fontSize.base,
    color: colors.text.primary,
    flexShrink: 1,
  },
});

const SetupLiabilitiesScreen: React.FC = () => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const { liabilities, toggleLiability, updateLiability, duplicateLiability, addLiability } = useOnboardingStore();
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
  

  // Check which liabilities are already created
  const isLiabilityAlreadyCreated = (liabilityName: string): boolean => {
    return accounts.some(account => 
      account.name.toLowerCase().trim() === liabilityName.toLowerCase().trim() && 
      account.accountType === 'liability'
    );
  };
  
  const [editingItem, setEditingItem] = useState<OnboardingLiability | null>(null);
  const [editName, setEditName] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editParentCategory, setEditParentCategory] = useState<string>('');
  const [editSubCategory, setEditSubCategory] = useState<string>('');
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showSubCategoryPicker, setShowSubCategoryPicker] = useState(false);
  const [isEditingCategory, setIsEditingCategory] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemAmount, setNewItemAmount] = useState('0');
  const [newItemParentCategory, setNewItemParentCategory] = useState<string>('Loans');
  const [newItemSubCategory, setNewItemSubCategory] = useState<string>('Other Loans');

  // Get available categories for liabilities
  const availableCategories = useMemo(() => {
    return getCategoriesByType('liability');
  }, []);

  // Get subcategories for selected parent category
  const availableSubCategories = useMemo(() => {
    const parentCat = isEditingCategory ? editParentCategory : newItemParentCategory;
    if (!parentCat) return [];
    return getSubCategories(parentCat);
  }, [editParentCategory, newItemParentCategory, isEditingCategory]);

  const handleEdit = (item: OnboardingLiability) => {
    setEditingItem(item);
    setEditName(item.name);
    setEditAmount(item.amount.toString());
    
    // Set default categories based on name matching
    let defaultParentCategory = 'Loans';
    let defaultSubCategory = 'Other Loans';
    
    const nameLower = item.name.toLowerCase();
    if (nameLower.includes('credit card')) {
      defaultParentCategory = 'Credit Cards';
      defaultSubCategory = 'Credit Card';
    } else if (nameLower.includes('home')) {
      defaultParentCategory = 'Loans';
      defaultSubCategory = 'Home Loan';
    } else if (nameLower.includes('car')) {
      defaultParentCategory = 'Loans';
      defaultSubCategory = 'Car Loan';
    } else if (nameLower.includes('personal')) {
      defaultParentCategory = 'Loans';
      defaultSubCategory = 'Personal Loan';
    } else if (nameLower.includes('education')) {
      defaultParentCategory = 'Loans';
      defaultSubCategory = 'Education Loan';
    } else if (nameLower.includes('borrow')) {
      defaultParentCategory = 'Payables';
      defaultSubCategory = 'Money Borrowed';
    }
    
    setEditParentCategory(item.parentCategory || defaultParentCategory);
    setEditSubCategory(item.subCategory || defaultSubCategory);
    setIsEditingCategory(true);
  };

  const handleSaveEdit = () => {
    if (!editingItem) return;
    
    const trimmedName = editName.trim();
    
    // Check for duplicate account name (excluding current item, exact match only)
    const liabilityAccounts = accounts.filter(acc => acc.accountType === 'liability');
    const duplicateCheck = liabilityAccounts.find(
      account => account.name.toLowerCase() === trimmedName.toLowerCase() && account.name !== editingItem.name
    );
    if (duplicateCheck) {
      Alert.alert(
        t('common.error'),
        t('onboarding.liabilities.error.duplicateAccount', { name: duplicateCheck.name })
      );
      return;
    }
    
    const amount = parseFloat(editAmount) || 0;
    updateLiability(editingItem.id, {
      name: trimmedName,
      amount: amount,
      parentCategory: editParentCategory || undefined,
      subCategory: editSubCategory || undefined,
    });
    setEditingItem(null);
    setEditName('');
    setEditAmount('');
    setEditParentCategory('');
    setEditSubCategory('');
  };

  const handleAdd = () => {
    if (!newItemName.trim()) {
      Alert.alert(t('common.error'), t('onboarding.liabilities.error.enterName'));
      return;
    }
    
    const trimmedName = newItemName.trim();
    
    // Check for duplicate account name (case-insensitive, exact match only)
    const liabilityAccounts = accounts.filter(acc => acc.accountType === 'liability');
    const duplicateCheck = liabilityAccounts.find(
      account => account.name.toLowerCase() === trimmedName.toLowerCase()
    );
    if (duplicateCheck) {
      Alert.alert(
        t('common.error'),
        t('onboarding.liabilities.error.duplicateAccount', { name: duplicateCheck.name })
      );
      return;
    }
    
    const amount = parseFloat(newItemAmount) || 0;
    addLiability({
      name: trimmedName,
      amount: amount,
      isSelected: true,
      parentCategory: newItemParentCategory || undefined,
      subCategory: newItemSubCategory || undefined,
    });
    setShowAddModal(false);
    setNewItemName('');
    setNewItemAmount('0');
    setNewItemParentCategory('Loans');
    setNewItemSubCategory('Other Loans');
  };

  const renderItem = ({ item }: { item: OnboardingLiability }) => {
    const alreadyCreated = isLiabilityAlreadyCreated(item.name);
    const isDisabled = alreadyCreated;
    
    return (
      <View style={[styles.itemContainer, isDisabled && styles.itemContainerDisabled]}>
        <TouchableOpacity
          style={styles.checkboxContainer}
          onPress={() => !isDisabled && toggleLiability(item.id)}
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
                <Text style={styles.badgeText}>{t('onboarding.liabilities.alreadyCreated')}</Text>
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
          {item.isSelected && !isDisabled && (
            <Text style={styles.itemAmount}>
              {t('onboarding.liabilities.outstanding')}: {item.amount.toLocaleString('en-IN', {
                style: 'currency',
                currency: 'INR',
                minimumFractionDigits: 0,
              })}
            </Text>
          )}
        </View>

        <View style={styles.itemActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => duplicateLiability(item.id)}
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

  const selectedCount = liabilities.filter(l => l.isSelected && !isLiabilityAlreadyCreated(l.name)).length;

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
          <Text style={styles.headerTitle}>{t('onboarding.liabilities.title')}</Text>
          {isOnboarding ? (
            <TouchableOpacity
              onPress={() => {
                Alert.alert(
                  t('onboarding.liabilities.skipSetupTitle'),
                  t('onboarding.liabilities.skipSetupMessage'),
                  [
                    {
                      text: t('common.cancel'),
                      style: 'cancel',
                    },
                    {
                      text: t('onboarding.assets.skip'),
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
              <Text style={styles.skipButton}>{t('onboarding.assets.skip')}</Text>
            </TouchableOpacity>
          ) : (
            <View style={{ width: 24 }} />
          )}
        </View>

        <View style={styles.content}>
          <Text style={styles.subtitle}>
            {t('onboarding.liabilities.subtitle')}
          </Text>

          <FlatList
            data={liabilities}
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
            <Text style={styles.addButtonText}>{t('onboarding.liabilities.addNew')}</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.base }]}>
          <Text style={styles.footerText}>
            {t('onboarding.liabilities.loansSelected', { count: selectedCount })}
          </Text>
          <TouchableOpacity
            style={styles.nextButton}
            onPress={() => navigation.navigate('SetupExpenses')}
          >
            <Text style={styles.nextButtonText}>{t('onboarding.liabilities.next')}</Text>
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
            <Text style={styles.modalTitle}>{t('onboarding.liabilities.editLoan')}</Text>
            
            <Text style={styles.inputLabel}>{t('onboarding.liabilities.name')}</Text>
            <TextInput
              style={styles.input}
              value={editName}
              onChangeText={setEditName}
              placeholder={t('onboarding.liabilities.accountName')}
            />

            <Text style={styles.inputLabel}>{t('onboarding.liabilities.amount')}</Text>
            <TextInput
              style={styles.input}
              value={editAmount}
              onChangeText={setEditAmount}
              placeholder={t('onboarding.assets.zeroPlaceholder')}
              keyboardType="numeric"
            />

            <Text style={styles.inputLabel}>{t('onboarding.liabilities.category')}</Text>
            <TouchableOpacity
              style={styles.categoryButton}
              onPress={() => {
                setIsEditingCategory(true);
                setShowCategoryPicker(true);
              }}
            >
              <Text style={styles.categoryButtonText}>
                {editParentCategory || t('onboarding.liabilities.selectCategory')}
              </Text>
              <Ionicons name="chevron-down" size={20} color={colors.text.secondary} />
            </TouchableOpacity>

            <Text style={styles.inputLabel}>{t('onboarding.liabilities.subCategory')}</Text>
            <TouchableOpacity
              style={[styles.categoryButton, !editParentCategory && styles.categoryButtonDisabled]}
              onPress={() => {
                if (!editParentCategory) {
                  Alert.alert(t('common.error'), t('onboarding.liabilities.error.selectCategoryFirst'));
                  return;
                }
                setIsEditingCategory(true);
                setShowSubCategoryPicker(true);
              }}
              disabled={!editParentCategory}
            >
              <Text style={[styles.categoryButtonText, !editSubCategory && styles.categoryButtonPlaceholder]}>
                {editSubCategory || t('onboarding.liabilities.selectSubCategory')}
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
                <Text style={styles.modalButtonTextSave}>{t('common.save')}</Text>
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
            <Text style={styles.modalTitle}>{t('onboarding.liabilities.addNewAccount')}</Text>
            
            <Text style={styles.inputLabel}>{t('onboarding.liabilities.name')}</Text>
            <TextInput
              style={styles.input}
              value={newItemName}
              onChangeText={setNewItemName}
              placeholder={t('onboarding.liabilities.accountName')}
            />

            <Text style={styles.inputLabel}>{t('onboarding.liabilities.amount')}</Text>
            <TextInput
              style={styles.input}
              value={newItemAmount}
              onChangeText={setNewItemAmount}
              placeholder={t('onboarding.assets.zeroPlaceholder')}
              keyboardType="numeric"
            />

            <Text style={styles.inputLabel}>{t('onboarding.liabilities.category')}</Text>
            <TouchableOpacity
              style={styles.categoryButton}
              onPress={() => {
                setIsEditingCategory(false);
                setShowCategoryPicker(true);
              }}
            >
              <Text style={styles.categoryButtonText}>
                {newItemParentCategory || t('onboarding.liabilities.selectCategory')}
              </Text>
              <Ionicons name="chevron-down" size={20} color={colors.text.secondary} />
            </TouchableOpacity>

            {newItemParentCategory && (
              <>
                <Text style={styles.inputLabel}>{t('onboarding.liabilities.subCategory')}</Text>
                <TouchableOpacity
                  style={styles.categoryButton}
                  onPress={() => {
                    setIsEditingCategory(false);
                    setShowSubCategoryPicker(true);
                  }}
                >
                  <Text style={[styles.categoryButtonText, !newItemSubCategory && styles.categoryButtonPlaceholder]}>
                    {newItemSubCategory || t('onboarding.liabilities.selectSubCategory')}
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
                <Text style={styles.modalButtonTextSave}>{t('addTransaction.add')}</Text>
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
            <Text style={styles.modalTitle}>{t('onboarding.liabilities.selectCategory')}</Text>
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
            <Text style={styles.modalTitle}>{t('onboarding.liabilities.selectSubCategory')}</Text>
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

export default SetupLiabilitiesScreen;
