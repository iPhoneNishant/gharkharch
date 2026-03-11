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
  Linking,
  KeyboardAvoidingView,
  Keyboard,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation, useFocusEffect } from '@react-navigation/native';

import { useAuthStore } from '../stores';
import { RootStackParamList } from '../types';
import { colors, spacing, setFontScale, getFontScale, typography, borderRadius } from '../config/theme';
import { getSettingsScreenStyles } from '../styles/screens/SettingsScreen.styles';
import {
  isPinSetup,
  isBiometricEnabled,
  isBiometricAvailable,
  getBiometricType,
  enableBiometric,
  disableBiometric,
} from '../services/pinAuthService';
import { checkSmsPermission, requestSmsPermission, openPermissionSettings } from '../services/smsService';
import { loadSmsSettings, saveSmsSettings, SmsSettings } from '../services/smsSettingsService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FONT_SCALE_OPTIONS } from '../config/constants';
import { Platform, TextInput } from 'react-native';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const SettingsScreen: React.FC = () => {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const [keyboardHeight, setKeyboardHeight] = useState(0);
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
  const [smsPermissionGranted, setSmsPermissionGranted] = useState<boolean | null>(null);
  const [isCheckingSmsPermission, setIsCheckingSmsPermission] = useState(false);
  const [smsSettings, setSmsSettings] = useState<SmsSettings>({ readCount: 100, dateGapDays: 30 });
  const [showSmsReadCountModal, setShowSmsReadCountModal] = useState(false);
  const [showSmsDateGapModal, setShowSmsDateGapModal] = useState(false);
  const [tempReadCount, setTempReadCount] = useState<string>('100');
  const [tempDateGap, setTempDateGap] = useState<string>('30');


  useEffect(() => {
    checkPinStatus();
    loadFontScale();
    loadSmsSettingsData();
    // Always check SMS permission on Android
    if (Platform.OS === 'android') {
      checkSmsPermissionStatus();
    } else {
    }

    // Keyboard listeners for bottom sheet
    const keyboardWillShow = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        setKeyboardHeight(e.endCoordinates.height + 35);
      }
    );
    const keyboardWillHide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setKeyboardHeight(0);
      }
    );

    return () => {
      keyboardWillShow.remove();
      keyboardWillHide.remove();
    };
  }, []);

  const loadSmsSettingsData = async () => {
    try {
      const settings = await loadSmsSettings();
      setSmsSettings(settings);
      setTempReadCount(settings.readCount.toString());
      setTempDateGap(settings.dateGapDays.toString());
    } catch (error) {
      console.error('Error loading SMS settings:', error);
    }
  };

  const handleSaveSmsReadCount = async () => {
    const count = parseInt(tempReadCount, 10);
    if (isNaN(count) || count < 1 || count > 1000) {
      Alert.alert(t('settings.invalidValue'), t('settings.smsReadCountInvalid'));
      return;
    }
    try {
      await saveSmsSettings({ readCount: count });
      setSmsSettings(prev => ({ ...prev, readCount: count }));
      setShowSmsReadCountModal(false);
    } catch (error) {
      Alert.alert(t('common.error'), t('settings.smsReadCountSaveError'));
    }
  };

  const handleSaveSmsDateGap = async () => {
    const days = parseInt(tempDateGap, 10);
    if (isNaN(days) || days < 1 || days > 365) {
      Alert.alert(t('settings.invalidValue'), t('settings.smsDateGapInvalid'));
      return;
    }
    try {
      await saveSmsSettings({ dateGapDays: days });
      setSmsSettings(prev => ({ ...prev, dateGapDays: days }));
      setShowSmsDateGapModal(false);
    } catch (error) {
      Alert.alert(t('common.error'), t('settings.smsDateGapSaveError'));
    }
  };

  // Refresh SMS permission status when screen comes into focus
  // (e.g., when user returns from app settings)
  useFocusEffect(
    React.useCallback(() => {
      if (Platform.OS === 'android') {
        checkSmsPermissionStatus();
      }
    }, [])
  );

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
      await setFontScale(val, false); // Don't save to storage since we're loading from it
      setFontScaleState(val);
      setFontScaleLabel(String(val));
    } catch {}
  };

  const checkSmsPermissionStatus = async () => {
    if (Platform.OS !== 'android') {
      return;
    }
    setIsCheckingSmsPermission(true);
    try {
      const granted = await checkSmsPermission();
      setSmsPermissionGranted(granted);
    } catch (error) {
      console.error('Error checking SMS permission:', error);
      setSmsPermissionGranted(false);
    } finally {
      setIsCheckingSmsPermission(false);
    }
  };

  const openAppPermissionSettings = () => {
    openPermissionSettings();
  };

  const handleRequestSmsPermission = async () => {
    if (Platform.OS !== 'android') {
      Alert.alert(t('settings.smsPermissionNotAvailable'));
      return;
    }

    try {
      setIsCheckingSmsPermission(true);
      const granted = await requestSmsPermission();
      
      // Refresh permission status after request
      await checkSmsPermissionStatus();
      
      if (granted) {
        Alert.alert(
          t('settings.smsPermissionGranted'),
          t('settings.smsPermissionGrantedMessage')
        );
      } else {
        Alert.alert(
          t('settings.smsPermissionDenied'),
          t('settings.smsPermissionDeniedMessage'),
          [
            { text: t('common.cancel'), style: 'cancel' },
            {
              text: t('settings.openSettings'),
              onPress: openAppPermissionSettings,
            },
          ]
        );
      }
    } catch (error) {
      console.error('Error requesting SMS permission:', error);
      Alert.alert(
        t('settings.error'),
        error instanceof Error ? error.message : t('settings.smsPermissionError'),
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('settings.openSettings'),
            onPress: openAppPermissionSettings,
          },
        ]
      );
      // Refresh status even on error
      await checkSmsPermissionStatus();
    } finally {
      setIsCheckingSmsPermission(false);
    }
  };

  const handleFontSizeChange = () => {
    setPendingFontScale(fontScale);
    setShowFontSheet(true);
  };

  const handleSignOut = () => {
    Alert.alert(
      t('settings.signOut'),
      t('settings.signOutConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('settings.signOut'),
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut();
            } catch (error) {
              Alert.alert(t('common.error'), t('settings.signOutError'));
            }
          },
        },
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      t('settings.deleteAccount'),
      t('settings.deleteAccountConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('settings.deleteAccount'),
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteAccount();
              // Navigation will be handled by auth state change
            } catch (error: any) {
              Alert.alert(t('common.error'), error.message || t('settings.deleteAccountError'));
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
        Alert.alert(t('common.success'), t('settings.pinUpdatedSuccess'));
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
      Alert.alert(t('common.error'), error.message || t('settings.biometricUpdateError'));
      // Revert state
      setBiometricEnabled(!value);
    }
  };

  return (
    <>
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xl }}
      showsVerticalScrollIndicator={true}
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
          <Text style={styles.profileName}>{user?.displayName ?? t('settings.user')}</Text>
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
                    {t('settings.biometricAuthentication', { type: biometricType || 'Biometric' })}
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
            <Text style={styles.settingLabel}>{t('settings.language')} </Text>
            <View style={styles.settingValue}>
              <Text style={styles.settingValueText}>
                {i18n.language === 'hi' ? 'हिंदी ' : 'English '}
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingItem} onPress={handleFontSizeChange}>
            <Text style={styles.settingLabel}>{t('settings.fontSize')} </Text>
            <View style={styles.settingValue}>
              <Text style={styles.settingValueText}>AAA </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingItem}>
            <Text style={styles.settingLabel}>{t('settings.currency')}</Text>
            <View style={styles.settingValue}>
              <Text style={styles.settingValueText}>{user?.currency ?? 'INR'} </Text>
            </View>
          </TouchableOpacity>

          {/* SMS Permission - Android only */}
          {Platform.OS === 'android' && (
            <>
              <View style={styles.settingItem}>
                <View style={{ flex: 1, marginRight: spacing.sm }}>
                  <Text style={styles.settingLabel}>{t('settings.smsPermission')}</Text>
                  <Text style={[styles.settingValueText, { fontSize: typography.fontSize.xs, color: colors.text.secondary, marginTop: spacing.xs }]}>
                    {isCheckingSmsPermission
                      ? t('settings.checking')
                      : smsPermissionGranted === null
                      ? t('settings.smsPermissionNotGranted')
                      : smsPermissionGranted
                      ? t('settings.smsPermissionGranted')
                      : t('settings.smsPermissionNotGranted')}
                  </Text>
                </View>
                {(smsPermissionGranted === false || smsPermissionGranted === null) && (
                  <TouchableOpacity
                    onPress={handleRequestSmsPermission}
                    disabled={isCheckingSmsPermission}
                    style={{
                      backgroundColor: isCheckingSmsPermission ? colors.neutral[300] : colors.primary[500],
                      paddingHorizontal: spacing.md,
                      paddingVertical: spacing.xs,
                      borderRadius: 8,
                      minWidth: 80,
                      alignItems: 'center',
                    }}
                  >
                    <Text style={{ color: colors.neutral[0], fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.semiBold }}>
                      {t('settings.requestPermission')}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* SMS Read Count */}
              <TouchableOpacity
                style={styles.settingItem}
                onPress={() => {
                  setTempReadCount(smsSettings.readCount.toString());
                  setShowSmsReadCountModal(true);
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.settingLabel}>{t('settings.smsReadCount')}</Text>
                  <Text style={[styles.settingValueText, { fontSize: typography.fontSize.xs, color: colors.text.secondary, marginTop: spacing.xs }]}>
                    {t('settings.smsReadCountDescription')}
                  </Text>
                </View>
                <View style={styles.settingValue}>
                  <Text style={styles.settingValueText}>{smsSettings.readCount}</Text>
                </View>
              </TouchableOpacity>

              {/* SMS Date Gap */}
              <TouchableOpacity
                style={styles.settingItem}
                onPress={() => {
                  setTempDateGap(smsSettings.dateGapDays.toString());
                  setShowSmsDateGapModal(true);
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.settingLabel}>{t('settings.smsDateGap')}</Text>
                  <Text style={[styles.settingValueText, { fontSize: typography.fontSize.xs, color: colors.text.secondary, marginTop: spacing.xs }]}>
                    {t('settings.smsDateGapDescription')}
                  </Text>
                </View>
                <View style={styles.settingValue}>
                  <Text style={styles.settingValueText}>{smsSettings.dateGapDays} {t('settings.days')} </Text>
                </View>
              </TouchableOpacity>
            </>
          )}

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
            <Text style={styles.settingLabel}>{t('settings.version')} </Text>
            <Text style={styles.settingValueText}>1.0.0 </Text>
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
        <View style={[styles.bottomSheet, { paddingBottom: keyboardHeight > 0 ? 0 : insets.bottom }]}>
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
            <Text style={styles.sheetOptionText}>{t('languages.en')}</Text>
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
        <View style={[styles.bottomSheet, { paddingBottom: keyboardHeight > 0 ? 0 : insets.bottom }]}>
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
                await setFontScale(pendingFontScale); // This will save to AsyncStorage automatically
                setFontScaleState(pendingFontScale);
                setFontScaleLabel(String(pendingFontScale));
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

    {/* SMS Read Count Modal */}
    <Modal
      visible={showSmsReadCountModal}
      animationType="fade"
      transparent
      onRequestClose={() => setShowSmsReadCountModal(false)}
    >
      <View style={styles.bottomSheetBackdrop}>
        <TouchableOpacity
          style={styles.bottomSheetBackdropTouchable}
          activeOpacity={1}
          onPress={() => setShowSmsReadCountModal(false)}
        />
        <View style={[
          styles.bottomSheet,
          {
            paddingBottom: keyboardHeight > 0 ? 0 : insets.bottom,
            transform: keyboardHeight > 0 ? [{ translateY: -keyboardHeight }] : [],
          }
        ]}>
          <View style={styles.bottomSheetHandle} />
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowSmsReadCountModal(false)}>
              <Text style={styles.modalCancel}>{t('common.cancel')}</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{t('settings.smsReadCount')}</Text>
            <TouchableOpacity onPress={handleSaveSmsReadCount}>
              <Text style={styles.modalDone}>{t('common.save')}</Text>
            </TouchableOpacity>
          </View>
          <ScrollView
            contentContainerStyle={{ padding: spacing.base }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Text style={[styles.settingValueText, { marginBottom: spacing.sm }]}>
              {t('settings.smsReadCountDescription')}
            </Text>
            <TextInput
              style={{
                borderWidth: 1,
                borderColor: colors.border.light,
                borderRadius: borderRadius.md,
                padding: spacing.sm,
                fontSize: typography.fontSize.base,
                color: colors.text.primary,
                backgroundColor: colors.background.elevated,
              }}
              value={tempReadCount}
              onChangeText={setTempReadCount}
              keyboardType="numeric"
              placeholder={t('settings.smsReadCountPlaceholder')}
              placeholderTextColor={colors.text.tertiary}
            />
          </ScrollView>
        </View>
      </View>
    </Modal>

    {/* SMS Date Gap Modal */}
    <Modal
      visible={showSmsDateGapModal}
      animationType="fade"
      transparent
      onRequestClose={() => setShowSmsDateGapModal(false)}
    >
      <View style={styles.bottomSheetBackdrop}>
        <TouchableOpacity
          style={styles.bottomSheetBackdropTouchable}
          activeOpacity={1}
          onPress={() => setShowSmsDateGapModal(false)}
        />
        <View style={[
          styles.bottomSheet,
          {
            paddingBottom: keyboardHeight > 0 ? 0 : insets.bottom,
            transform: keyboardHeight > 0 ? [{ translateY: -keyboardHeight }] : [],
          }
        ]}>
          <View style={styles.bottomSheetHandle} />
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowSmsDateGapModal(false)}>
              <Text style={styles.modalCancel}>{t('common.cancel')}</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{t('settings.smsDateGap')}</Text>
            <TouchableOpacity onPress={handleSaveSmsDateGap}>
              <Text style={styles.modalDone}>{t('common.save')}</Text>
            </TouchableOpacity>
          </View>
          <ScrollView
            contentContainerStyle={{ padding: spacing.base }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Text style={[styles.settingValueText, { marginBottom: spacing.sm }]}>
              {t('settings.smsDateGapModalDescription')}
            </Text>
            <TextInput
              style={{
                borderWidth: 1,
                borderColor: colors.border.light,
                borderRadius: borderRadius.md,
                padding: spacing.sm,
                fontSize: typography.fontSize.base,
                color: colors.text.primary,
                backgroundColor: colors.background.elevated,
              }}
              value={tempDateGap}
              onChangeText={setTempDateGap}
              keyboardType="numeric"
              placeholder={t('settings.smsDateGapPlaceholder')}
              placeholderTextColor={colors.text.tertiary}
            />
          </ScrollView>
        </View>
      </View>
    </Modal>
    </>
  );
};


export default SettingsScreen;
