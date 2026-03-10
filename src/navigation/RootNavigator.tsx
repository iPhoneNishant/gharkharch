/**
 * Root Navigator for Gharkharch
 * Handles authentication flow and main app navigation
 */

import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, View, StyleSheet, AppState, AppStateStatus, TouchableOpacity, Text, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useAuthStore, usePinAuthStore, useRecurringTransactionStore, useNetworkStore } from '../stores';
import { RootStackParamList } from '../types';
import { colors, addFontScaleListener, typography } from '../config/theme';
import { useTranslation } from 'react-i18next';
import { navigationRef } from './navigationRef';
import { startSmsAutoDetect, stopSmsAutoDetect } from '../services/smsAutoDetectService';

// Screens
import NoNetworkScreen from '../screens/NoNetworkScreen';
import LanguageSelectionScreen from '../screens/LanguageSelectionScreen';
import AuthScreen from '../screens/AuthScreen';
import PinSetupScreen from '../screens/PinSetupScreen';
import PinChangeScreen from '../screens/PinChangeScreen';
import PinVerificationScreen from '../screens/PinVerificationScreen';
import MainTabNavigator from './MainTabNavigator';
import AddTransactionScreen from '../screens/AddTransactionScreen';
import AddAccountScreen from '../screens/AddAccountScreen';
import AccountDetailScreen from '../screens/AccountDetailScreen';
import TransactionDetailScreen from '../screens/TransactionDetailScreen';
import ReportsScreen from '../screens/ReportsScreen';
import MonthToMonthReportScreen from '../screens/MonthToMonthReportScreen';
import DayToDayReportScreen from '../screens/DayToDayReportScreen';
import AddRecurringTransactionScreen from '../screens/AddRecurringTransactionScreen';
import RecurringTransactionsScreen from '../screens/RecurringTransactionsScreen';
import SettingsScreen from '../screens/SettingsScreen';
import SubCategoryTransactionsScreen from '../screens/SubCategoryTransactionsScreen';
import BankSmsScreen from '../screens/BankSmsScreen';
import AccountsScreen from '../screens/AccountsScreen';
import SmsAccountMappingScreen from '../screens/SmsAccountMappingScreen';
import UserGuideScreen from '../screens/UserGuideScreen';
import PrivacyPolicyScreen from '../screens/PrivacyPolicyScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

const RootNavigator: React.FC = () => {
  const { t } = useTranslation();
  const { isAuthenticated, isLoading, initialize, signOut, user, isAuthenticatedInThisSession } = useAuthStore();
  // Use individual selectors for values that trigger re-renders
  const isPinVerified = usePinAuthStore(state => state.isPinVerified);
  const isPinSetup = usePinAuthStore(state => state.isPinSetup);
  const checkPinSetup = usePinAuthStore(state => state.checkPinSetup);
  const setPinVerified = usePinAuthStore(state => state.setPinVerified);
  const { subscribeToRecurringTransactions } = useRecurringTransactionStore();
  const [isCheckingPin, setIsCheckingPin] = useState(false);
  const hasCheckedPinRef = useRef(false);
  const previousAuthRef = useRef<boolean | null>(null); // null = initial state, true/false = previous auth state
  const hasSubscribedToRecurringTransactionsRef = useRef(false);

  // Network state
  const initializeNetwork = useNetworkStore(state => state.initialize);
  const { isConnected, isInternetReachable } = useNetworkStore();
  const [fontScaleVersion, setFontScaleVersion] = useState(0);
  const [isCheckingLanguage, setIsCheckingLanguage] = useState(true);
  const [isLanguageSelected, setIsLanguageSelected] = useState(false);

  // Check if language has been selected
  const checkLanguageSelection = useCallback(async () => {
    try {
      const languageSelected = await AsyncStorage.getItem('language-selected');
      setIsLanguageSelected(languageSelected === 'true');
    } catch (error) {
      console.error('Error checking language selection:', error);
      setIsLanguageSelected(false);
    } finally {
      setIsCheckingLanguage(false);
    }
  }, []);

  useEffect(() => {
    checkLanguageSelection();
  }, [checkLanguageSelection]);

  // Re-check language selection when app comes to foreground
  useEffect(() => {
    if (isLanguageSelected) return;

    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        checkLanguageSelection();
      }
    });

    // Also check periodically while on LanguageSelection screen
    const interval = setInterval(() => {
      if (!isLanguageSelected) {
        checkLanguageSelection();
      }
    }, 500);

    return () => {
      subscription.remove();
      clearInterval(interval);
    };
  }, [isLanguageSelected, checkLanguageSelection]);

  useEffect(() => {
    const unsubscribe = initializeNetwork();
    return () => unsubscribe();
  }, [initializeNetwork]);

  useEffect(() => {
    const unsubscribe = initialize();
    return () => unsubscribe();
  }, [initialize]);
  useEffect(() => {
    const unsub = addFontScaleListener(() => {
      setFontScaleVersion(v => v + 1);
    });
    return () => {
      unsub();
    };
  }, []);

  // Start Android SMS auto-detect when user is fully inside the app
  useEffect(() => {
    if (isAuthenticated && isPinVerified) {
      startSmsAutoDetect();
      return;
    }
    stopSmsAutoDetect();
  }, [isAuthenticated, isPinVerified]);

  // Track if user authenticated in this session
  useEffect(() => {
    if (previousAuthRef.current === null) {
      previousAuthRef.current = isAuthenticated;
    } else if (isAuthenticated && !previousAuthRef.current) {
      hasCheckedPinRef.current = false;
      previousAuthRef.current = isAuthenticated;
    } else if (!isAuthenticated) {
      // User logged out - reset flag
      previousAuthRef.current = isAuthenticated;
    } else {
      // Auth state unchanged
      previousAuthRef.current = isAuthenticated;
    }
  }, [isAuthenticated]);

  // Check PIN setup when authenticated (only once per session)
  useEffect(() => {
    if (isAuthenticated && !hasCheckedPinRef.current && isPinSetup === null) {
      hasCheckedPinRef.current = true;
      setIsCheckingPin(true);
      checkPinSetup().finally(() => {
        setIsCheckingPin(false);
      });
    }
  }, [isAuthenticated, isPinSetup, checkPinSetup]);

  // Force logout if PIN is not set up and user was NOT authenticated in this session
  useEffect(() => {
    // If PIN setup screen would show but user was NOT authenticated in this session, sign out
    // This ensures PIN setup only appears after login/signup, not on app launch
    if (
      isAuthenticated && 
      !isAuthenticatedInThisSession && 
      isPinSetup === false && 
      !isCheckingPin
    ) {
      // User was already authenticated on app launch but PIN is not set up - log them out
      signOut().catch(error => {
        console.error('Error during forced logout on app launch:', error);
      });
    }
  }, [isAuthenticated, isAuthenticatedInThisSession, isPinSetup, isCheckingPin, signOut]);

  // Subscribe to recurring transactions when user is authenticated
  useEffect(() => {
    let unsubscribeRecurringTransactions: (() => void) | null = null;

    if (isAuthenticated && user?.id && !hasSubscribedToRecurringTransactionsRef.current) {
      hasSubscribedToRecurringTransactionsRef.current = true;
      unsubscribeRecurringTransactions = subscribeToRecurringTransactions(user.id);
    }

    // Reset subscription flag when user logs out
    if (!isAuthenticated) {
      hasSubscribedToRecurringTransactionsRef.current = false;
      if (unsubscribeRecurringTransactions) {
        unsubscribeRecurringTransactions();
      }
    }

    return () => {
      if (unsubscribeRecurringTransactions) {
        unsubscribeRecurringTransactions();
      }
    };
  }, [isAuthenticated, user?.id, subscribeToRecurringTransactions]);

  // Determine initial route based on language, auth and PIN state
  const currentRoute = useMemo((): keyof RootStackParamList => {
    if (!isLanguageSelected) return 'LanguageSelection';
    if (!isAuthenticated) return 'Auth';
    
    // If PIN setup is still being checked, show loading (handled above)
    if (isPinSetup === null) {
      // Only show PinSetup if authenticated in this session, otherwise show Auth
      return isAuthenticatedInThisSession ? 'PinSetup' : 'Auth';
    }
    
    // If PIN not setup:
    // - If authenticated in this session: show PIN setup screen (from login/signup)
    // - If NOT authenticated in this session (app launch): show Auth (will logout)
    if (isPinSetup === false) {
      return isAuthenticatedInThisSession ? 'PinSetup' : 'Auth';
    }
    
    // PIN is setup - check if verified
    if (!isPinVerified) return 'PinVerification';
    return 'Main';
  }, [isLanguageSelected, isAuthenticated, isPinSetup, isPinVerified, isAuthenticatedInThisSession]);

  // Memoize callbacks to prevent re-renders
  // Handle PIN setup completion - automatically verify PIN so user goes directly to app
  const handlePinSetupComplete = useCallback(() => {
    // After PIN setup, automatically verify PIN so user goes directly to app
    // This keeps authentication and PIN setup in one session
    setPinVerified(true);
    // Check PIN setup state after a brief delay to ensure it's updated
    setTimeout(() => {
      checkPinSetup();
    }, 100);
  }, [checkPinSetup, setPinVerified]);

  // Memoize initial params
  const pinSetupParams = useMemo(
    () => ({ onComplete: handlePinSetupComplete }),
    [handlePinSetupComplete]
  );

  // Navigate to the correct route when it changes
  useEffect(() => {
    if (navigationRef.isReady() && navigationRef.current?.getCurrentRoute()?.name !== currentRoute) {
      navigationRef.current?.reset({
        index: 0,
        routes: [{ name: currentRoute }],
      });
    }
  }, [currentRoute]);

  // Check for network connectivity
  // Only show offline screen if we definitely know we are offline (not null)
  const isOffline = isConnected === false || (isConnected === true && isInternetReachable === false);

  if (isOffline) {
    return <NoNetworkScreen />;
  }

  if (isCheckingLanguage || isLoading || (isAuthenticated && isCheckingPin)) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary[500]} />
      </View>
    );
  }

  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator
        initialRouteName={currentRoute}
        screenOptions={{
          headerShown: false,
          // Ensure native navigation bar is white across the app
          headerStyle: {
            backgroundColor: colors.background.elevated,
          },
          headerTitleStyle: {
            color: colors.text.primary,
            fontSize: typography.fontSize.base,
          },
          contentStyle: { backgroundColor: colors.background.primary },
        }}
      >
        {currentRoute === 'LanguageSelection' ? (
          <Stack.Screen 
            name="LanguageSelection" 
            component={LanguageSelectionScreen}
            options={{ 
              animationTypeForReplace: 'pop',
              gestureEnabled: false,
              headerBackVisible: false,
            }}
          />
        ) : currentRoute === 'Auth' ? (
          <Stack.Screen 
            name="Auth" 
            component={AuthScreen}
            options={{ animationTypeForReplace: 'pop' }}
          />
        ) : currentRoute === 'PinSetup' ? (
          <Stack.Screen 
            name="PinSetup" 
            component={PinSetupScreen}
            options={{ 
              animationTypeForReplace: 'pop',
              gestureEnabled: false,
              headerBackVisible: false,
            }}
            initialParams={pinSetupParams}
          />
        ) : currentRoute === 'PinVerification' ? (
          <Stack.Screen 
            name="PinVerification" 
            component={PinVerificationScreen}
            options={{ 
              animationTypeForReplace: 'pop', 
              gestureEnabled: false,
              headerBackVisible: false,
            }}
          />
        ) : (
          <>
            <Stack.Screen name="Main" component={MainTabNavigator} />
            <Stack.Screen 
              name="AddTransaction" 
              component={AddTransactionScreen}
              options={({ route, navigation }) => ({
                headerShown: true,
                headerBackVisible: false,
                headerTitle: (route.params as any)?.editTransactionId ? 'Edit Transaction' : 'Add Transaction',
                headerTitleAlign: 'center',
                headerTintColor: colors.primary[500],
              })}
            />
            <Stack.Screen 
              name="AddAccount" 
              component={AddAccountScreen}
              options={{
                presentation: 'modal',
                headerShown: true,
                headerTitle: 'Add Account',
                headerTintColor: colors.primary[500],
              }}
            />
            <Stack.Screen 
              name="AccountDetail" 
              component={AccountDetailScreen}
              options={{
                headerShown: true,
                headerTitle: 'Account Details',
                headerTintColor: colors.primary[500],
                headerBackTitle: 'Back',
              }}
            />
            <Stack.Screen 
              name="TransactionDetail" 
              component={TransactionDetailScreen}
              options={{
                headerShown: true,
                headerTitle: 'Transaction Details',
                headerTitleAlign: 'center',
                headerTintColor: colors.primary[500],
                headerBackTitle: 'Back',
              }}
            />
            <Stack.Screen 
              name="SummaryMonthReport" 
              component={ReportsScreen}
              options={{
                headerShown: true,
                headerTitle: t('reportsList.summaryTitle'),
                headerTintColor: colors.primary[500],
                headerBackTitle: t('common.back'),
              }}
            />
            <Stack.Screen 
              name="SummaryCustomReport" 
              component={ReportsScreen}
              options={{
                headerShown: true,
                headerTitle: t('reportsList.summaryTitle'),
                headerTintColor: colors.primary[500],
                headerBackTitle: t('common.back'),
              }}
            />
            <Stack.Screen 
              name="TransactionsMonthReport" 
              component={ReportsScreen}
              options={{
                headerShown: true,
                headerTitle: t('reportsList.transactionsTitle'),
                headerTintColor: colors.primary[500],
                headerBackTitle: t('common.back'),
              }}
            />
            <Stack.Screen 
              name="TransactionsCustomReport" 
              component={ReportsScreen}
              options={{
                headerShown: true,
                headerTitle: t('reportsList.transactionsTitle'),
                headerTintColor: colors.primary[500],
                headerBackTitle: t('common.back'),
              }}
            />
            <Stack.Screen 
              name="MonthToMonthReport" 
              component={MonthToMonthReportScreen}
              options={{
                headerShown: true,
                headerTitle: t('reportsList.monthToMonthTitle'),
                headerTintColor: colors.primary[500],
                headerBackTitle: t('common.back'),
              }}
            />
            <Stack.Screen 
              name="DayToDayReport" 
              component={DayToDayReportScreen}
              options={{
                headerShown: true,
                headerTitle: t('reportsList.dayToDayTitle'),
                headerTintColor: colors.primary[500],
                headerBackTitle: t('common.back'),
              }}
            />
            <Stack.Screen 
              name="PinSetup" 
              component={PinSetupScreen}
              options={{
                presentation: 'modal',
                headerShown: true,
                headerTitle: 'Setup PIN',
                headerTintColor: colors.primary[500],
              }}
            />
            <Stack.Screen 
              name="PinVerification" 
              component={PinVerificationScreen}
              options={{
                gestureEnabled: false,
                headerShown: false,
              }}
            />
            <Stack.Screen 
              name="AddRecurringTransaction" 
              component={AddRecurringTransactionScreen}
              options={({ route }) => ({
                presentation: 'modal',
                headerShown: true,
                headerTitle: (route.params as any)?.editRecurringTransactionId ? 'Edit Repeat Transaction' : 'Add Repeat Transaction',
                headerTintColor: colors.primary[500],
              })}
            />
            <Stack.Screen 
              name="RecurringTransactions" 
              component={RecurringTransactionsScreen}
              options={{
                headerShown: true,
                headerTitle: 'Repeat Transactions',
                headerTintColor: colors.primary[500],
                headerBackTitle: 'Back',
              }}
            />
            <Stack.Screen
              name="Settings"
              component={SettingsScreen}
              options={{
                headerShown: true,
                headerTitle: 'Settings',
                headerTintColor: colors.primary[500],
                headerBackTitle: 'Back',
              }}
            />
            <Stack.Screen
              name="PinChange"
              component={PinChangeScreen}
              options={{
                headerShown: true,
                headerTitle: 'Change PIN',
                headerTintColor: colors.primary[500],
                headerBackTitle: 'Back',
                gestureEnabled: false, // Disable swipe back gesture for security
              }}
            />
            <Stack.Screen
              name="BankSms"
              component={BankSmsScreen}
              options={{
                headerShown: true,
                headerTitle: 'Bank SMS',
                headerTintColor: colors.primary[500],
                headerBackTitle: 'Back',
              }}
            />
            <Stack.Screen
              name="Accounts"
              component={AccountsScreen}
              options={{
                headerShown: true,
                headerTitle: 'Accounts',
                headerTintColor: colors.primary[500],
                headerBackTitle: t('common.back'),
              }}
            />
            <Stack.Screen
              name="SmsAccountMapping"
              component={SmsAccountMappingScreen}
              options={{
                headerShown: true,
                headerTitle: t('more.smsAccountMapping'),
                headerTintColor: colors.primary[500],
                headerBackTitle: t('common.back'),
              }}
            />
            <Stack.Screen 
              name="SubCategoryTransactions" 
              component={SubCategoryTransactionsScreen}
              options={({ route }) => ({
                headerShown: true,
                headerTitle: (route.params as any)?.subCategory || 'Transactions',
                headerTintColor: colors.primary[500],
                headerBackTitle: 'Back',
              })}
            />
            <Stack.Screen name="UserGuide" component={UserGuideScreen} />
             <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} />
           </>
         )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background.primary,
  },
});

export default RootNavigator;
