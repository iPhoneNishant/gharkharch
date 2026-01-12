/**
 * PIN Verification Screen for Gharkharch
 * Required on every app launch for security
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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';

import { RootStackParamList } from '../types';
import { colors, typography, spacing, borderRadius, shadows } from '../config/theme';
import { 
  verifyPin, 
  authenticateWithBiometric, 
  isBiometricEnabled,
  getBiometricType,
} from '../services/pinAuthService';
import { usePinAuthStore, useAuthStore } from '../stores';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'PinVerification'>;

interface PinVerificationScreenProps {
  navigation: NavigationProp;
  route: { params?: undefined };
}

const PinVerificationScreen: React.FC<PinVerificationScreenProps> = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const setPinVerified = usePinAuthStore(state => state.setPinVerified); // Get setPinVerified from store using selector
  const signOut = useAuthStore(state => state.signOut); // Get signOut function from auth store
  const [pin, setPin] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [errorCount, setErrorCount] = useState(0);
  const [displayErrorCount, setDisplayErrorCount] = useState(0); // Separate state for display
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [biometricType, setBiometricType] = useState<string | null>(null);
  const [biometricAttempted, setBiometricAttempted] = useState(false);
  const pinInputRef = useRef<TextInput>(null);

  useEffect(() => {
    // Check biometric status and try authentication on mount
    const initBiometric = async () => {
      const enabled = await checkBiometricStatus();
      // Try biometric authentication first if enabled
      if (enabled) {
        setBiometricAttempted(true);
        await handleBiometricAuth();
      } else {
        setBiometricAttempted(true);
      }
    };
    initBiometric();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Prevent back button on Android and iOS (gesture navigation)
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      // Prevent going back - user must verify PIN
      Alert.alert(
        'PIN Required',
        'You must verify your PIN to access the app.',
        [{ text: 'OK' }]
      );
      return true; // Prevent default back behavior
    });

    return () => backHandler.remove();
  }, []);

  // Prevent navigation back gesture on iOS/Android
  useFocusEffect(
    useCallback(() => {
      const onBeforeRemove = (e: any) => {
        // Always prevent navigation away from this screen
        // The only way to leave is through successful PIN verification
        // which updates the store and causes RootNavigator to re-render
        e.preventDefault();
        Alert.alert(
          'PIN Required',
          'You must verify your PIN to access the app.',
          [{ text: 'OK' }]
        );
      };

      const unsubscribe = navigation.addListener('beforeRemove', onBeforeRemove);

      return unsubscribe;
    }, [navigation])
  );

  const checkBiometricStatus = async (): Promise<boolean> => {
    const enabled = await isBiometricEnabled();
    setBiometricEnabled(enabled);
    if (enabled) {
      const type = await getBiometricType();
      setBiometricType(type);
    }
    return enabled;
  };

  const handleBiometricAuth = async (): Promise<boolean> => {
    setIsVerifying(true);
    try {
      const success = await authenticateWithBiometric();
      if (success) {
        setIsVerifying(false);
        await handleVerificationSuccess();
        return true;
      } else {
        setIsVerifying(false);
        setBiometricAttempted(true);
        // Focus PIN input on failure
        setTimeout(() => pinInputRef.current?.focus(), 100);
        return false;
      }
    } catch (error) {
      console.error('Biometric authentication error:', error);
      setIsVerifying(false);
      setBiometricAttempted(true);
      // Focus PIN input on error
      setTimeout(() => pinInputRef.current?.focus(), 100);
      return false;
    }
  };

  const handlePinChange = (value: string) => {
    // Only allow digits
    const digitsOnly = value.replace(/[^0-9]/g, '');
    if (digitsOnly.length <= 6) {
      setPin(digitsOnly);
      // Note: Removed auto-submit - user must click Continue button
      // Note: Don't reset error count here - it should persist across attempts
    }
  };

  const handleVerify = async () => {
    if (pin.length < 4 || pin.length > 6) {
      return;
    }

    Keyboard.dismiss();
    setIsVerifying(true);

    try {
      const isValid = await verifyPin(pin);
      if (isValid) {
        setIsVerifying(false);
        await handleVerificationSuccess();
      } else {
        const newErrorCount = errorCount + 1;
        setErrorCount(newErrorCount);
        setDisplayErrorCount(newErrorCount); // Update display count immediately
        setIsVerifying(false);
        if (newErrorCount >= 5) {
          Alert.alert(
            'Too Many Attempts',
            'You have entered an incorrect PIN too many times. For security reasons, you will be logged out.',
            [
              {
                text: 'OK',
                onPress: async () => {
                  try {
                    // Log out the user after 5 failed attempts
                    await signOut();
                    // State will be reset by signOut, which clears PIN and resets auth store
                  } catch (error) {
                    console.error('Error signing out after too many PIN attempts:', error);
                    // Even if signOut fails, reset the error counts
                    setPin('');
                    setErrorCount(0);
                    setDisplayErrorCount(0);
                  }
                },
              },
            ]
          );
        } else {
          Alert.alert('Incorrect PIN', `Please try again. ${5 - newErrorCount} attempts remaining.`, [
            {
              text: 'OK',
              onPress: () => {
                setPin('');
                setTimeout(() => pinInputRef.current?.focus(), 100);
              },
            },
          ]);
        }
      }
    } catch (error: any) {
      console.error('PIN verification error:', error);
      Alert.alert('Verification Failed', error.message || 'Failed to verify PIN. Please try again.');
      setIsVerifying(false);
      setPin('');
      setTimeout(() => pinInputRef.current?.focus(), 100);
    }
  };

  const handleVerificationSuccess = async () => {
    try {
      console.log('[PinVerificationScreen] Calling setPinVerified(true)...');
      // Reset error counts on successful verification
      setErrorCount(0);
      setDisplayErrorCount(0);
      // Update the store directly to ensure state change triggers re-render
      // The RootNavigator will automatically navigate when isPinVerified becomes true
      setPinVerified(true);
      console.log('[PinVerificationScreen] setPinVerified(true) called successfully');
    } catch (error) {
      console.error('Error in handleVerificationSuccess:', error);
      Alert.alert('Error', 'Failed to complete verification. Please try again.');
      setIsVerifying(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.logo}>₹</Text>
          <Text style={styles.title}>Gharkharch</Text>
          <Text style={styles.subtitle}>
            {biometricEnabled && !biometricAttempted
              ? `Authenticate with ${biometricType || 'Biometric'} to continue`
              : 'Enter your PIN to continue'}
          </Text>
        </View>

        {/* Show biometric loading when attempting biometric first */}
        {biometricEnabled && !biometricAttempted && isVerifying && (
          <View style={styles.biometricLoadingContainer}>
            <ActivityIndicator size="large" color={colors.primary[500]} />
            <Text style={styles.biometricLoadingText}>
              Authenticating with {biometricType || 'Biometric'}...
            </Text>
          </View>
        )}

        {/* PIN Input - Only show if biometric is not enabled, or if biometric was attempted and failed */}
        {(!biometricEnabled || biometricAttempted) && (
          <>
            <View style={styles.inputContainer}>
              <TextInput
                ref={pinInputRef}
                style={styles.pinInput}
                value={pin}
                onChangeText={handlePinChange}
                placeholder="••••"
                placeholderTextColor={colors.neutral[400]}
                keyboardType="number-pad"
                secureTextEntry
                maxLength={6}
                autoFocus={biometricAttempted}
                editable={!isVerifying}
              />
              {displayErrorCount > 0 && (
                <Text style={styles.errorText}>
                  Incorrect PIN. {5 - displayErrorCount} attempts remaining.
                </Text>
              )}
            </View>

            {/* Continue Button */}
            <TouchableOpacity
              style={[
                styles.continueButton,
                (pin.length < 4 || pin.length > 6 || isVerifying) && styles.continueButtonDisabled,
              ]}
              onPress={handleVerify}
              disabled={pin.length < 4 || pin.length > 6 || isVerifying}
            >
              {isVerifying ? (
                <ActivityIndicator color={colors.neutral[0]} />
              ) : (
                <Text style={styles.continueButtonText}>Continue</Text>
              )}
            </TouchableOpacity>
          </>
        )}

        {/* Biometric Button - Show as fallback if biometric failed */}
        {biometricEnabled && biometricAttempted && !isVerifying && (
          <TouchableOpacity
            style={styles.biometricButton}
            onPress={handleBiometricAuth}
            disabled={isVerifying}
          >
            <Text style={styles.biometricButtonText}>
              Use {biometricType || 'Biometric'} instead
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
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
  logo: {
    fontSize: 64,
    fontWeight: typography.fontWeight.bold,
    color: colors.primary[500],
    marginBottom: spacing.sm,
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
  },
  inputContainer: {
    marginBottom: spacing.xl,
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
  errorText: {
    fontSize: typography.fontSize.sm,
    color: colors.error,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  biometricButton: {
    marginTop: spacing.lg,
    padding: spacing.base,
    alignItems: 'center',
  },
  biometricButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
    color: colors.primary[500],
  },
  biometricLoadingContainer: {
    alignItems: 'center',
    marginTop: spacing.xl,
    marginBottom: spacing.xl,
  },
  biometricLoadingText: {
    fontSize: typography.fontSize.base,
    color: colors.text.secondary,
    marginTop: spacing.base,
    textAlign: 'center',
  },
  continueButton: {
    backgroundColor: colors.primary[500],
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.base,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xl,
    minHeight: 50,
    ...shadows.sm,
  },
  continueButtonDisabled: {
    backgroundColor: colors.neutral[300],
    opacity: 0.6,
  },
  continueButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.neutral[0],
  },
});

export default PinVerificationScreen;