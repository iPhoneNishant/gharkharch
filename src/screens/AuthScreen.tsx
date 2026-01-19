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

import { useAuthStore } from '../stores';
import { colors, typography, spacing, borderRadius, shadows } from '../config/theme';

type AuthMode = 'signIn' | 'signUp' | 'forgotPassword';

const AuthScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { signIn, signUp, resetPassword, isLoading, error, clearError } = useAuthStore();

  const [mode, setMode] = useState<AuthMode>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleSubmit = async () => {
    if (mode === 'forgotPassword') {
      if (!email.trim()) {
        Alert.alert('Error', 'Please enter your email address');
        return;
      }

      try {
        await resetPassword(email.trim());
        setResetEmailSent(true);
        Alert.alert(
          'Password Reset Email Sent',
          'Please check your email for instructions to reset your password.',
          [
            {
              text: 'OK',
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
      }
      return;
    }

    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please enter email and password');
      return;
    }

    if (mode === 'signUp') {
      if (password.length < 6) {
        Alert.alert('Error', 'Password must be at least 6 characters');
        return;
      }
      if (password !== confirmPassword) {
        Alert.alert('Error', 'Passwords do not match. Please try again.');
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
              ? 'Welcome back!' 
              : mode === 'signUp' 
              ? 'Create your account' 
              : 'Reset your password'}
          </Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          {mode === 'signUp' && (
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Name</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your name"
                placeholderTextColor={colors.neutral[400]}
                value={displayName}
                onChangeText={setDisplayName}
                autoCapitalize="words"
                autoCorrect={false}
              />
            </View>
          )}

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your email"
              placeholderTextColor={colors.neutral[400]}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
            />
          </View>

          {mode !== 'forgotPassword' && (
            <>
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Password</Text>
                <View style={styles.passwordInputWrapper}>
                  <TextInput
                    style={styles.passwordInput}
                    placeholder="Enter your password"
                    placeholderTextColor={colors.neutral[400]}
                    value={password}
                    onChangeText={setPassword}
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
                  <Text style={styles.label}>Confirm Password</Text>
                  <View style={styles.passwordInputWrapper}>
                    <TextInput
                      style={styles.passwordInput}
                      placeholder="Confirm your password"
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
              <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
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
                  ? 'Sign In' 
                  : mode === 'signUp' 
                  ? 'Create Account' 
                  : 'Send Reset Email'}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Toggle Mode / Back to Sign In */}
        {mode === 'forgotPassword' ? (
          <View style={styles.footer}>
            <TouchableOpacity onPress={handleBackToSignIn}>
              <Text style={styles.footerLink}>Back to Sign In</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              {mode === 'signIn' ? "Don't have an account?  " : 'Already have an account?  '}
            </Text>
            <TouchableOpacity onPress={toggleMode}>
              <Text style={styles.footerLink}>
                {mode === 'signIn' ? 'Sign Up' : 'Sign In'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
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
});

export default AuthScreen;
