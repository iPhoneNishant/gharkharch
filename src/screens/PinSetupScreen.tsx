/**
 * PIN Setup Screen for Gharkharch
 * Allows users to set up their MPIN (4 digits only)
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
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

import { RootStackParamList } from '../types';
import { colors, typography, spacing, borderRadius, shadows } from '../config/theme';
import { setupPin, isBiometricAvailable, enableBiometric, getBiometricType } from '../services/pinAuthService';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'PinSetup'>;

interface PinSetupScreenProps {
  navigation: NavigationProp;
  route: { params?: { onComplete?: () => void; allowBack?: boolean } };
}

const PinSetupScreen: React.FC<PinSetupScreenProps> = ({ navigation, route }) => {
  const insets = useSafeAreaInsets(); 
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [isSettingUp, setIsSettingUp] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricType, setBiometricType] = useState<string | null>(null);
  const [enableBiometricOption, setEnableBiometricOption] = useState(false);

  const confirmPinRef = useRef<TextInput>(null);
  const hasCheckedBiometricRef = useRef(false);
  const allowBack = route.params?.allowBack ?? false; // Default to false (required setup)

  useEffect(() => {
    if (!hasCheckedBiometricRef.current) {
      hasCheckedBiometricRef.current = true;
      checkBiometricAvailability();
    }
  }, []);

  // Prevent back button on Android and iOS (gesture navigation) if setup is required
  useEffect(() => {
    if (!allowBack) {
      const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
        Alert.alert(
          'Setup Required',
          'You must set up a PIN to secure your app. This cannot be skipped.',
          [{ text: 'OK' }]
        );
        return true; // Prevent default back behavior
      });

      return () => backHandler.remove();
    }
  }, [allowBack]);

  // Prevent navigation back gesture if setup is required
  useFocusEffect(
    useCallback(() => {
      if (allowBack) {
        // Allow back if accessed from Settings
        return;
      }

      const onBeforeRemove = (e: any) => {
        // Check if this is a back action (not a programmatic navigation)
        if (e.data?.action?.type === 'GO_BACK' || e.data?.action?.type === 'POP') {
          // Prevent navigation away if PIN setup is required
          e.preventDefault();
          Alert.alert(
            'Setup Required',
            'You must set up a PIN to secure your app. This cannot be skipped.',
            [{ text: 'OK' }]
          );
        }
      };

      const unsubscribe = navigation.addListener('beforeRemove', onBeforeRemove);

      return unsubscribe;
    }, [navigation, allowBack])
  );

  const checkBiometricAvailability = async () => {
    const available = await isBiometricAvailable();
    setBiometricAvailable(available);
    if (available) {
      const type = await getBiometricType();
      setBiometricType(type);
    }
  };

  const handlePinChange = (value: string) => {
    // Only allow digits
    const digitsOnly = value.replace(/[^0-9]/g, '');
    if (digitsOnly.length <= 6) {
      setPin(digitsOnly);
      // Auto-focus confirm PIN when PIN is 4 digits
      if (digitsOnly.length === 4) {
        setTimeout(() => confirmPinRef.current?.focus(), 100);
      }
    }
  };

  const handleConfirmPinChange = (value: string) => {
    // Only allow digits
    const digitsOnly = value.replace(/[^0-9]/g, '');
    if (digitsOnly.length <= 6) {
      setConfirmPin(digitsOnly);
    }
  };

  const handleSetup = async () => {
    if (pin.length !== 4) {
      Alert.alert('Invalid PIN', 'PIN must be exactly 4 digits');
      return;
    }

    if (pin !== confirmPin) {
      Alert.alert('PIN Mismatch', 'PINs do not match. Please try again.');
      setConfirmPin('');
      return;
    }

    Keyboard.dismiss();
    setIsSettingUp(true);

    try {
      await setupPin(pin);
      
      // Enable biometric if user opted in
      if (enableBiometricOption && biometricAvailable) {
        try {
          await enableBiometric();
        } catch (error) {
          console.error('Failed to enable biometric:', error);
          // Continue even if biometric setup fails
        }
      }

      Alert.alert(
        'PIN Setup Complete',
        'Your PIN has been set up successfully.',
        [
          {
            text: 'OK',
            onPress: () => {
              route.params?.onComplete?.();
              navigation.goBack();
            },
          },
        ]
      );
    } catch (error: any) {
      Alert.alert('Setup Failed', error.message || 'Failed to setup PIN. Please try again.');
      setIsSettingUp(false);
    }
  };

  const canSubmit = pin.length === 4 && confirmPin.length === 4 && pin === confirmPin;

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Setup MPIN</Text>
            <Text style={styles.subtitle}>
              Enter a 4 digit PIN to secure your app
            </Text>
          </View>

          {/* PIN Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Enter PIN</Text>
            <TextInput
              style={styles.pinInput}
              value={pin}
              onChangeText={handlePinChange}
              placeholder="••••"
              placeholderTextColor={colors.neutral[400]}
              keyboardType="number-pad"
              secureTextEntry
              maxLength={4}
              autoFocus
              editable={!isSettingUp}
            />
          </View>

          {/* Confirm PIN Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Confirm PIN</Text>
            <TextInput
              ref={confirmPinRef}
              style={styles.pinInput}
              value={confirmPin}
              onChangeText={handleConfirmPinChange}
              placeholder="••••"
              placeholderTextColor={colors.neutral[400]}
              keyboardType="number-pad"
              secureTextEntry
              maxLength={4}
              editable={!isSettingUp}
            />
            {confirmPin.length > 0 && pin !== confirmPin && (
              <Text style={styles.errorText}>PINs do not match</Text>
            )}
          </View>

          {/* Biometric Option */}
          {biometricAvailable && (
            <TouchableOpacity
              style={styles.biometricOption}
              onPress={() => setEnableBiometricOption(!enableBiometricOption)}
              disabled={isSettingUp}
            >
              <View style={styles.checkbox}>
                {enableBiometricOption && <View style={styles.checkboxChecked} />}
              </View>
              <Text style={styles.biometricText}>
                Enable {biometricType || 'Biometric'} authentication
              </Text>
            </TouchableOpacity>
          )}

          {/* Setup Button */}
          <TouchableOpacity
            style={[styles.button, !canSubmit && styles.buttonDisabled]}
            onPress={handleSetup}
            disabled={!canSubmit || isSettingUp}
          >
            {isSettingUp ? (
              <ActivityIndicator color={colors.neutral[0]} />
            ) : (
              <Text style={styles.buttonText}>Setup PIN</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: spacing.xl,
  },
  content: {
    flex: 1,
    padding: spacing.lg,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing['2xl'],
  },
  title: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: typography.fontSize.base,
    color: colors.text.secondary,
    textAlign: 'center',
    paddingHorizontal: spacing.base,
  },
  inputContainer: {
    marginBottom: spacing.xl,
  },
  label: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.primary,
    marginBottom: spacing.sm,
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
  hint: {
    fontSize: typography.fontSize.sm,
    color: colors.text.tertiary,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  errorText: {
    fontSize: typography.fontSize.sm,
    color: colors.error,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  biometricOption: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xl,
    padding: spacing.base,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: colors.primary[500],
    borderRadius: borderRadius.sm,
    marginRight: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    width: 14,
    height: 14,
    backgroundColor: colors.primary[500],
    borderRadius: borderRadius.xs,
  },
  biometricText: {
    fontSize: typography.fontSize.base,
    color: colors.text.primary,
    flex: 1,
  },
  button: {
    backgroundColor: colors.primary[500],
    borderRadius: borderRadius.lg,
    padding: spacing.base,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
    ...shadows.md,
  },
  buttonDisabled: {
    backgroundColor: colors.neutral[300],
    opacity: 0.6,
  },
  buttonText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.neutral[0],
  },
});

export default PinSetupScreen;