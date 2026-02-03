/**
 * Authentication Screen for Gharkharch
 * Handles sign in and sign up flows
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { useAuthStore } from '../stores';
import { colors, typography, spacing, borderRadius, shadows } from '../config/theme';

type AuthMode = 'signIn' | 'signUp' | 'forgotPassword';

const AuthScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { 
    signIn, 
    signUp, 
    resetPassword, 
    isLoading, 
    error, 
    clearError 
  } = useAuthStore();

  const [mode, setMode] = useState<AuthMode>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  const handleSubmit = async () => {
    setIsAuthenticating(true);
    if (mode === 'forgotPassword') {
      if (!email.trim()) {
        Alert.alert(t('common.error'), t('auth.enterEmail'));
        setIsAuthenticating(false);
        return;
      }

      try {
        await resetPassword(email.trim());
        setResetEmailSent(true);
        Alert.alert(
          t('auth.passwordResetEmailSent'),
          t('auth.passwordResetEmailMessage'),
          [
            {
              text: t('common.ok'),
              onPress: () => {
                setMode('signIn');
                setResetEmailSent(false);
                setEmail('');
              },
            },
          ]
        );
      } catch (err) {
        // Error is handled by the store
      } finally {
        setIsAuthenticating(false);
      }
      return;
    }

    if (!email.trim() || !password.trim()) {
      Alert.alert(t('common.error'), 'Please enter email and password');
      setIsAuthenticating(false);
      return;
    }

    if (mode === 'signUp') {
      if (password.length < 6) {
        Alert.alert(t('common.error'), 'Password must be at least 6 characters');
        setIsAuthenticating(false);
        return;
      }
      if (password !== confirmPassword) {
        Alert.alert(t('common.error'), 'Passwords do not match. Please try again.');
        setIsAuthenticating(false);
        return;
      }
    }

    try {
      if (mode === 'signIn') {
        await signIn(email.trim(), password);
      } else {
        await signUp(email.trim(), password, displayName.trim() || undefined);
      }
    } catch (err) {
      // Error is handled by the store
    } finally {
      setIsAuthenticating(false);
    }
  };

  const toggleMode = () => {
    clearError();
    setMode(mode === 'signIn' ? 'signUp' : 'signIn');
    setPassword('');
    setConfirmPassword('');
    setShowPassword(false);
    setShowConfirmPassword(false);
    setResetEmailSent(false);
  };

  const handleForgotPassword = () => {
    clearError();
    setMode('forgotPassword');
    setPassword('');
    setConfirmPassword('');
    setShowPassword(false);
    setShowConfirmPassword(false);
    setResetEmailSent(false);
  };

  const handleBackToSignIn = () => {
    clearError();
    setMode('signIn');
    setPassword('');
    setConfirmPassword('');
    setShowPassword(false);
    setShowConfirmPassword(false);
    setResetEmailSent(false);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + spacing.xl, paddingBottom: insets.bottom + spacing.xl },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.logo}>₹</Text>
          <Text style={styles.title}>DailyMunim</Text>
          <Text style={styles.tagline} numberOfLines={2} ellipsizeMode="tail">
            Ghar Ka Daily Hisab Kitab
          </Text>
          <Text 
            style={styles.subtitle}
            numberOfLines={2}
            ellipsizeMode="tail"
          >
            {mode === 'signIn' 
              ? t('auth.welcomeBack')
              : mode === 'signUp' 
              ? t('auth.createAccount')
              : t('auth.resetPassword')}
          </Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          {mode === 'signUp' && (
            <View style={styles.inputContainer}>
              <Text style={styles.label}>{t('auth.name')}</Text>
              <TextInput
                style={styles.input}
                placeholder={t('auth.enterName')}
                placeholderTextColor={colors.neutral[400]}
                value={displayName}
                onChangeText={setDisplayName}
                autoCapitalize="words"
                autoCorrect={false}
              />
            </View>
          )}

          <View style={styles.inputContainer}>
            <Text style={styles.label}>{t('auth.email')}</Text>
            <TextInput
              style={styles.input}
              placeholder={t('auth.enterEmail')}
              placeholderTextColor={colors.neutral[400]}
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                if (error) clearError();
              }}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
            />
          </View>

          {mode !== 'forgotPassword' && (
            <>
              <View style={styles.inputContainer}>
                <Text style={styles.label}>{t('auth.password')}</Text>
                <View style={styles.passwordInputWrapper}>
                  <TextInput
                    style={styles.passwordInput}
                    placeholder={t('auth.enterPassword')}
                    placeholderTextColor={colors.neutral[400]}
                    value={password}
                    onChangeText={(text) => {
                      setPassword(text);
                      if (error) clearError();
                    }}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    autoComplete="password"
                  />
                  <TouchableOpacity
                    style={styles.eyeIcon}
                    onPress={() => setShowPassword(!showPassword)}
                  >
                    <Image
                      source={showPassword ? require('../../assets/icons/hide.png') : require('../../assets/icons/show.png')}
                      style={styles.eyeIconImage}
                    />
                  </TouchableOpacity>
                </View>
              </View>
              {mode === 'signUp' && (
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>{t('auth.confirmPassword')}</Text>
                  <View style={styles.passwordInputWrapper}>
                    <TextInput
                      style={styles.passwordInput}
                      placeholder={t('auth.enterConfirmPassword')}
                      placeholderTextColor={colors.neutral[400]}
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      secureTextEntry={!showConfirmPassword}
                      autoCapitalize="none"
                      autoComplete="password"
                    />
                    <TouchableOpacity
                      style={styles.eyeIcon}
                      onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      <Image
                        source={showConfirmPassword ? require('../../assets/icons/hide.png') : require('../../assets/icons/show.png')}
                        style={styles.eyeIconImage}
                      />
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </>
          )}

          {mode === 'signIn' && (
            <TouchableOpacity 
              style={styles.forgotPasswordLink}
              onPress={handleForgotPassword}
            >
              <Text style={styles.forgotPasswordText}>{t('auth.forgotPassword')}</Text>
            </TouchableOpacity>
          )}

          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color={colors.neutral[0]} />
            ) : (
              <Text style={styles.submitButtonText}>
                {mode === 'signIn'
                  ? t('auth.signIn')
                  : mode === 'signUp'
                  ? t('auth.signUp')
                  : t('auth.sendResetEmail')}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Toggle Mode / Back to Sign In */}
        {mode === 'forgotPassword' ? (
          <View style={styles.footer}>
            <TouchableOpacity onPress={handleBackToSignIn}>
              <Text style={styles.footerLink}>{t('auth.backToSignIn')}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              {mode === 'signIn' ? t('auth.dontHaveAccount') : t('auth.alreadyHaveAccount')}
            </Text>
            <TouchableOpacity onPress={toggleMode}>
              <Text style={styles.footerLink}>
                {mode === 'signIn' ? t('auth.signUp') : t('auth.signIn')}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Loading Overlay */}
      {isAuthenticating && (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingContent}>
            <ActivityIndicator size="large" color={colors.primary[500]} />
            <Text style={styles.loadingText}>
              {mode === 'signIn'
                ? t('auth.signingIn')
                : mode === 'signUp'
                ? t('auth.creatingAccount')
                : t('auth.sendingResetEmail')}
            </Text>
          </View>
        </View>
      )}
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
    paddingHorizontal: spacing.xl,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  logo: {
    fontSize: 56,
    color: colors.primary[500],
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  tagline: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.text.secondary,
    textAlign: 'center',
    paddingHorizontal: spacing.sm,
    width: '100%',
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: typography.fontSize.base,
    color: colors.text.secondary,
    textAlign: 'center',
    flexShrink: 0,
    paddingHorizontal: spacing.sm,
    width: '100%',
  },
  form: {
    backgroundColor: colors.background.elevated,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    ...shadows.md,
  },
  inputContainer: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  input: {
    backgroundColor: colors.neutral[100],
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    fontSize: typography.fontSize.base,
    color: colors.text.primary,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  passwordInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.neutral[100],
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    fontSize: typography.fontSize.base,
    color: colors.text.primary,
  },
  eyeIcon: {
    padding: spacing.sm,
    paddingRight: spacing.base,
  },
  eyeIconText: {
    fontSize: 20,
  },
  eyeIconImage: {
    width: 20,
    height: 20,
    tintColor: colors.text.secondary,
  },
  errorContainer: {
    backgroundColor: '#FFEBEE',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  errorText: {
    color: colors.error,
    fontSize: typography.fontSize.sm,
    textAlign: 'center',
  },
  submitButton: {
    backgroundColor: colors.primary[500],
    borderRadius: borderRadius.md,
    paddingVertical: spacing.base,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: colors.neutral[0],
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semiBold,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing['2xl'],
    paddingHorizontal: spacing.base,
    flexWrap: 'wrap',
  },
  footerText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    flexShrink: 0,
    marginRight: spacing.xs,
    textAlign: 'center',
  },
  footerLink: {
    fontSize: typography.fontSize.sm,
    color: colors.primary[500],
    fontWeight: typography.fontWeight.semiBold,
  },
  forgotPasswordLink: {
    alignSelf: 'flex-end',
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
  forgotPasswordText: {
    fontSize: typography.fontSize.sm,
    color: colors.primary[500],
    fontWeight: typography.fontWeight.medium,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  loadingContent: {
    backgroundColor: colors.neutral[0],
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    minWidth: 200,
    ...shadows.lg,
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: typography.fontSize.base,
    color: colors.neutral[700],
    fontWeight: typography.fontWeight.medium,
    textAlign: 'center',
  },
});

export default AuthScreen;
