/**
 * PIN Change Screen for Gharkharch
 * Allows users to change their existing PIN with verification
 */

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Keyboard,
  BackHandler,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';

import { useTranslation } from 'react-i18next';
import { RootStackParamList } from '../types';
import { colors, typography, spacing, borderRadius, shadows, addFontScaleListener } from '../config/theme';
import { setupPin, verifyPin } from '../services/pinAuthService';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'PinChange'>;

interface PinChangeScreenProps {
  navigation: NavigationProp;
  route: { params?: { onComplete?: () => void; allowBack?: boolean } };
}

const PinChangeScreen: React.FC<PinChangeScreenProps> = ({ navigation, route }) => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [oldPin, setOldPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [isChanging, setIsChanging] = useState(false);
  const [currentStep, setCurrentStep] = useState<'verify' | 'setup'>('verify');
  const [fontScaleVersion, setFontScaleVersion] = useState(0);

  const oldPinRef = useRef<TextInput>(null);
  const newPinRef = useRef<TextInput>(null);
  const confirmPinRef = useRef<TextInput>(null);

  const allowBack = route.params?.allowBack ?? true; // Default to true for PIN change
  const styles = useMemo(() => getStyles(), [fontScaleVersion]);

  // Handle back button on Android
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        if (!allowBack) {
          return true; // Prevent back navigation
        }
        return false; // Allow back navigation
      };

      const backHandler = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => backHandler.remove();
    }, [allowBack])
  );

  useEffect(() => {
    const unsub = addFontScaleListener(() => {
      setFontScaleVersion(v => v + 1);
    });
    return () => {
      unsub();
    };
  }, []);

  // Auto-focus old PIN input when component mounts
  useEffect(() => {
    setTimeout(() => {
      oldPinRef.current?.focus();
    }, 100);
  }, []);

  // Auto-focus next field when PIN reaches 4 digits
  useEffect(() => {
    if (oldPin.length === 4) {
      newPinRef.current?.focus();
    } else if (newPin.length === 4) {
      confirmPinRef.current?.focus();
    }
  }, [oldPin.length, newPin.length]);

  const handleVerifyAndChange = async () => {
    // Validate old PIN
    if (oldPin.length !== 4) {
      Alert.alert(t('pin.change.error'), t('pin.change.enterCurrentPin'));
      return;
    }

    // Validate new PIN
    if (newPin.length !== 4) {
      Alert.alert(t('pin.change.error'), t('pin.change.enterNewPin'));
      return;
    }

    // Validate confirm PIN
    if (confirmPin.length !== 4) {
      Alert.alert(t('pin.change.error'), t('pin.change.confirmNewPinMessage'));
      return;
    }

    // Check if new PIN matches confirm PIN
    if (newPin !== confirmPin) {
      Alert.alert(t('pin.change.error'), t('pin.change.pinsDoNotMatch'));
      return;
    }

    // Check if old PIN is different from new PIN
    if (oldPin === newPin) {
      Alert.alert(t('pin.change.error'), t('pin.change.pinMustBeDifferent'));
      return;
    }

    setIsChanging(true);
    Keyboard.dismiss();

    try {
      // First verify the old PIN
      const isOldPinValid = await verifyPin(oldPin);
      if (!isOldPinValid) {
        Alert.alert(t('pin.change.error'), t('pin.change.currentPinIncorrect'));
        setIsChanging(false);
        return;
      }

      // Set up the new PIN
      await setupPin(newPin);

      // Success
      route.params?.onComplete?.();
      navigation.goBack();

    } catch (error: any) {
      Alert.alert(t('pin.change.error'), error.message || t('pin.change.changePinFailed'));
    } finally {
      setIsChanging(false);
    }
  };

  const handleCancel = () => {
    if (allowBack) {
      navigation.goBack();
    }
  };

  const canSubmit = oldPin.length === 4 && newPin.length === 4 && confirmPin.length === 4 && !isChanging;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + spacing.xl }]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>{t('pin.change.title')}</Text>
          <Text style={styles.subtitle}>
            {t('pin.change.subtitle')}
          </Text>
        </View>

        {/* PIN Input Fields */}
        <View style={styles.form}>
          {/* Old PIN */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>{t('pin.change.currentPin')}</Text>
            <TextInput
              ref={oldPinRef}
              style={styles.pinInput}
              value={oldPin}
              onChangeText={(text) => {
                const numericText = text.replace(/[^0-9]/g, '');
                if (numericText.length <= 4) {
                  setOldPin(numericText);
                }
              }}
              placeholder="••••"
              placeholderTextColor={colors.neutral[400]}
              keyboardType="number-pad"
              secureTextEntry={true}
              maxLength={4}
              autoFocus={true}
              editable={!isChanging}
            />
          </View>

          {/* New PIN */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>{t('pin.change.newPin')}</Text>
            <TextInput
              ref={newPinRef}
              style={styles.pinInput}
              value={newPin}
              onChangeText={(text) => {
                const numericText = text.replace(/[^0-9]/g, '');
                if (numericText.length <= 4) {
                  setNewPin(numericText);
                }
              }}
              placeholder="••••"
              placeholderTextColor={colors.neutral[400]}
              keyboardType="number-pad"
              secureTextEntry={true}
              maxLength={4}
              editable={!isChanging}
            />
          </View>

          {/* Confirm PIN */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>{t('pin.change.confirmNewPin')}</Text>
            <TextInput
              ref={confirmPinRef}
              style={styles.pinInput}
              value={confirmPin}
              onChangeText={(text) => {
                const numericText = text.replace(/[^0-9]/g, '');
                if (numericText.length <= 4) {
                  setConfirmPin(numericText);
                }
              }}
              placeholder="••••"
              placeholderTextColor={colors.neutral[400]}
              keyboardType="number-pad"
              secureTextEntry={true}
              maxLength={4}
              editable={!isChanging}
            />
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          {allowBack && (
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={handleCancel}
              disabled={isChanging}
            >
              <Text style={styles.cancelButtonText}>{t('common.cancel')}</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.button, styles.changeButton, !canSubmit && styles.changeButtonDisabled]}
            onPress={handleVerifyAndChange}
            disabled={!canSubmit}
          >
            {isChanging ? (
              <ActivityIndicator color={colors.neutral[0]} size="small" />
            ) : (
              <Text style={styles.changeButtonText}>{t('pin.change.changePin')}</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.xl }]}>
          <Text style={styles.footerText}>
            {t('pin.change.pinMustBe4Digits')}
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const getStyles = () => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: typography.fontSize.base,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  form: {
    marginBottom: spacing.xl,
  },
  inputGroup: {
    marginBottom: spacing.lg,
  },
  inputLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.text.primary,
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
  },
  pinInput: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    backgroundColor: colors.background.elevated,
    borderWidth: 2,
    borderColor: colors.border.light,
    borderRadius: borderRadius.lg,
    padding: spacing.base,
    textAlign: 'center',
    letterSpacing: spacing.md,
    ...shadows.sm,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  button: {
    flex: 1,
    paddingVertical: spacing.base,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: colors.neutral[200],
  },
  cancelButtonText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.text.secondary,
  },
  changeButton: {
    backgroundColor: colors.primary[500],
  },
  changeButtonDisabled: {
    backgroundColor: colors.neutral[300],
  },
  changeButtonText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.neutral[0],
  },
  footer: {
    alignItems: 'center',
  },
  footerText: {
    fontSize: typography.fontSize.xs,
    color: colors.text.tertiary,
    textAlign: 'center',
  },
});

export default PinChangeScreen;
