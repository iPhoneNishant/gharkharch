/**
 * Settings Screen for Gharkharch
 * User profile and app settings
 */

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Switch,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';

import { useAuthStore } from '../stores';
import { RootStackParamList } from '../types';
import { colors, spacing, setFontScale, getFontScale, typography } from '../config/theme';
import { getSettingsScreenStyles } from '../styles/screens/SettingsScreen.styles';
import {
  isPinSetup,
  isBiometricEnabled,
  isBiometricAvailable,
  getBiometricType,
  enableBiometric,
  disableBiometric,
} from '../services/pinAuthService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FONT_SCALE_OPTIONS } from '../config/constants';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const SettingsScreen: React.FC = () => {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const { user, signOut, deleteAccount, isLoading } = useAuthStore();
  const styles = getSettingsScreenStyles();
  
  const [pinSetup, setPinSetup] = useState<boolean | null>(null);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricType, setBiometricType] = useState<string | null>(null);
  const [isLoadingPin, setIsLoadingPin] = useState(false);
  const [fontScale, setFontScaleState] = useState<number>(getFontScale());
  const [fontScaleLabel, setFontScaleLabel] = useState<string>('Default');
  const [showLanguageSheet, setShowLanguageSheet] = useState(false);
  const [showFontSheet, setShowFontSheet] = useState(false);
  const [pendingLanguage, setPendingLanguage] = useState<string | null>(null);
  const [pendingFontScale, setPendingFontScale] = useState<number | null>(null);


  useEffect(() => {
    checkPinStatus();
    loadFontScale();
  }, []);

  const checkPinStatus = async () => {
    setIsLoadingPin(true);
    try {
      const setup = await isPinSetup();
      setPinSetup(setup);
      
      if (setup) {
        const enabled = await isBiometricEnabled();
        setBiometricEnabled(enabled);
      }
      
      const available = await isBiometricAvailable();
      setBiometricAvailable(available);
      if (available) {
        const type = await getBiometricType();
        setBiometricType(type);
      }
    } catch (error) {
      console.error('Error checking PIN status:', error);
    } finally {
      setIsLoadingPin(false);
    }
  };

  const handleLanguageChange = () => {
    setPendingLanguage(i18n.language);
    setShowLanguageSheet(true);
  };

  const loadFontScale = async () => {
    try {
      const stored = await AsyncStorage.getItem('user-font-scale');
      const val = stored ? parseFloat(stored) : 1;
      setFontScale(val);
      setFontScaleState(val);
      setFontScaleLabel(String(val));
    } catch {}
  };

  const handleFontSizeChange = () => {
    setPendingFontScale(fontScale);
    setShowFontSheet(true);
  };

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut();
            } catch (error) {
              Alert.alert('Error', 'Failed to sign out. Please try again.');
            }
          },
        },
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This action cannot be undone. All your accounts, transactions, and data will be permanently deleted.\n\nAre you sure you want to delete your account?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Account',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteAccount();
              // Navigation will be handled by auth state change
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to delete account');
            }
          },
        },
      ]
    );
  };

  const handleChangePin = () => {
    navigation.navigate('PinChange', {
      onComplete: () => {
        checkPinStatus();
        Alert.alert('Success', 'PIN has been updated successfully.');
      },
      allowBack: true, // Allow back when accessed from Settings
    });
  };


  const handleSetupPin = () => {
    navigation.navigate('PinSetup', {
      onComplete: () => {
        checkPinStatus();
      },
      allowBack: true, // Allow back when accessed from Settings
    });
  };


  const handleBiometricToggle = async (value: boolean) => {
    try {
      if (value) {
        await enableBiometric();
      } else {
        await disableBiometric();
      }
      setBiometricEnabled(value);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update biometric settings.');
      // Revert state
      setBiometricEnabled(!value);
    }
  };

  return (
    <>
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: insets.bottom + spacing.lg }}
    >
      {/* User Profile Card */}
      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {user?.displayName?.charAt(0).toUpperCase() ??
              user?.email?.charAt(0).toUpperCase() ??
              '?'}
          </Text>
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.profileName}>{user?.displayName ?? 'User'}</Text>
          <Text style={styles.profileEmail}>{user?.email ?? ''}</Text>
        </View>
      </View>

      {/* Security Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('settings.security')}</Text>
        <View style={styles.settingsList}>
          {pinSetup ? (
            <>
              <TouchableOpacity style={styles.settingItem} onPress={handleChangePin}>
                <Text style={styles.settingLabel}>{t('settings.changePin')}</Text>
                <Text style={styles.chevron}>›</Text>
              </TouchableOpacity>

              {biometricAvailable && (
                <View style={styles.settingItem}>
                  <Text style={styles.settingLabel}>
                    {biometricType || 'Biometric'} Authentication
                  </Text>
                  <Switch
                    value={biometricEnabled}
                    onValueChange={handleBiometricToggle}
                    trackColor={{ false: colors.neutral[300], true: colors.primary[300] }}
                    thumbColor={biometricEnabled ? colors.primary[500] : colors.neutral[500]}
                  />
                </View>
              )}
            </>
          ) : (
            <TouchableOpacity style={styles.settingItem} onPress={handleSetupPin}>
              <Text style={styles.settingLabel}>{t('settings.setupPin')}</Text>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Settings Sections */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('settings.appSettings')}</Text>
        <View style={styles.settingsList}>
          <TouchableOpacity style={styles.settingItem} onPress={handleLanguageChange}>
            <Text style={styles.settingLabel}>{t('settings.language')}</Text>
            <View style={styles.settingValue}>
              <Text style={styles.settingValueText}>
                {i18n.language === 'hi' ? 'हिंदी' : 'English'}
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingItem} onPress={handleFontSizeChange}>
            <Text style={styles.settingLabel}>{t('settings.fontSize')}</Text>
            <View style={styles.settingValue}>
              <Text style={styles.settingValueText}>AAA</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingItem}>
            <Text style={styles.settingLabel}>{t('settings.currency')}</Text>
            <View style={styles.settingValue}>
              <Text style={styles.settingValueText}>{user?.currency ?? 'INR'}</Text>
            </View>
          </TouchableOpacity>

          {/* TODO: Implement currency selection */}
          {/* TODO: Implement theme selection (dark/light mode) */}
          {/* TODO: Implement notification preferences */}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('settings.data')}</Text>
        <View style={styles.settingsList}>
          <TouchableOpacity
            style={[styles.settingItem, styles.deleteAccountItem]}
            onPress={handleDeleteAccount}
          >
            <Text style={styles.deleteAccountLabel}>{t('settings.deleteAccount')}</Text>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>

          {/* TODO: Implement data export functionality */}
          {/* TODO: Implement data import functionality */}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('settings.about')}</Text>
        <View style={styles.settingsList}>
          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>{t('settings.version')}</Text>
            <Text style={styles.settingValueText}>1.0.0</Text>
          </View>

          <TouchableOpacity
            style={styles.settingItem}
            onPress={() => navigation.navigate('PrivacyPolicy')}
          >
            <Text style={styles.settingLabel}>{t('more.privacyPolicy')}</Text>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingItem}>
            <Text style={styles.settingLabel}>{t('settings.termsOfService')}</Text>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Sign Out Button */}
      <TouchableOpacity
        style={styles.signOutButton}
        onPress={handleSignOut}
        disabled={isLoading}
      >
        <Text style={styles.signOutText}>{t('settings.signOut')}</Text>
      </TouchableOpacity>

      {/* App Info */}
      <View style={styles.appInfo}>
        <Text style={styles.appName}>DailyMunim</Text>
        <Text style={styles.appTagline}>Ghar Ka Daily Hisab Kitab</Text>
      </View>
    </ScrollView>

    <Modal
      visible={showLanguageSheet}
      animationType="fade"
      transparent
      onRequestClose={() => {
        setPendingLanguage(null);
        setShowLanguageSheet(false);
      }}
    >
      <View style={styles.bottomSheetBackdrop}>
        <TouchableOpacity
          style={styles.bottomSheetBackdropTouchable}
          activeOpacity={1}
          onPress={() => {
            setPendingLanguage(null);
            setShowLanguageSheet(false);
          }}
        />
        <View style={[styles.bottomSheet, { paddingBottom: insets.bottom }]}>
          <View style={styles.bottomSheetHandle} />
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => {
              setPendingLanguage(null);
              setShowLanguageSheet(false);
            }}>
              <Text style={styles.modalCancel}>{t('common.cancel')}</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{t('settings.language')}</Text>
            <TouchableOpacity onPress={() => {
              if (pendingLanguage) {
                i18n.changeLanguage(pendingLanguage);
              }
              setPendingLanguage(null);
              setShowLanguageSheet(false);
            }}>
              <Text style={styles.modalDone}>{t('common.done')}</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={styles.sheetOption}
            onPress={() => {
              setPendingLanguage('en');
            }}
          >
            <Text style={styles.sheetOptionText}>English</Text>
            {pendingLanguage === 'en' && <Text style={styles.checkmark}>✓</Text>}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.sheetOption}
            onPress={() => {
              setPendingLanguage('hi');
            }}
          >
            <Text style={styles.sheetOptionText}>हिंदी</Text>
            {pendingLanguage === 'hi' && <Text style={styles.checkmark}>✓</Text>}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>

    <Modal
      visible={showFontSheet}
      animationType="fade"
      transparent
      onRequestClose={() => {
        setPendingFontScale(null);
        setShowFontSheet(false);
      }}
    >
      <View style={styles.bottomSheetBackdrop}>
        <TouchableOpacity
          style={styles.bottomSheetBackdropTouchable}
          activeOpacity={1}
          onPress={() => {
            setPendingFontScale(null);
            setShowFontSheet(false);
          }}
        />
        <View style={[styles.bottomSheet, { paddingBottom: insets.bottom }]}>
          <View style={styles.bottomSheetHandle} />
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => {
              setPendingFontScale(null);
              setShowFontSheet(false);
            }}>
              <Text style={styles.modalCancel}>{t('common.cancel')}</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{t('settings.fontSize')}</Text>
            <TouchableOpacity onPress={async () => {
              if (pendingFontScale !== null) {
                setFontScale(pendingFontScale);
                setFontScaleState(pendingFontScale);
                setFontScaleLabel(String(pendingFontScale));
                await AsyncStorage.setItem('user-font-scale', String(pendingFontScale));
              }
              setPendingFontScale(null);
              setShowFontSheet(false);
            }}>
              <Text style={styles.modalDone}>{t('common.done')}</Text>
            </TouchableOpacity>
          </View>
          {FONT_SCALE_OPTIONS.map((val) => (
            <TouchableOpacity 
              key={val}
              style={styles.sheetOption}
              onPress={async () => {
                setPendingFontScale(val);
                setFontScaleLabel(String(val));
              }}
            >
              <Text style={[styles.sheetOptionText, {
                fontSize: Math.round((typography.fontSize.base / getFontScale()) * val),
              }]}>AAA</Text>
              {Math.abs(((pendingFontScale ?? fontScale)) - val) < 0.001 && <Text style={styles.checkmark}>✓</Text>}
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </Modal>
    </>
  );
};


export default SettingsScreen;
