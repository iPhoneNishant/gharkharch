/**
 * Root Navigator for Gharkharch
 * Handles authentication flow and main app navigation
 */

import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, View, StyleSheet } from 'react-native';

import { useAuthStore, usePinAuthStore } from '../stores';
import { RootStackParamList } from '../types';
import { colors } from '../config/theme';

// Screens
import AuthScreen from '../screens/AuthScreen';
import PinSetupScreen from '../screens/PinSetupScreen';
import PinVerificationScreen from '../screens/PinVerificationScreen';
import MainTabNavigator from './MainTabNavigator';
import AddTransactionScreen from '../screens/AddTransactionScreen';
import AddAccountScreen from '../screens/AddAccountScreen';
import AccountDetailScreen from '../screens/AccountDetailScreen';
import TransactionDetailScreen from '../screens/TransactionDetailScreen';
import ReportsScreen from '../screens/ReportsScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

const RootNavigator: React.FC = () => {
  const { isAuthenticated, isLoading, initialize } = useAuthStore();
  // Use individual selectors for values that trigger re-renders
  const isPinVerified = usePinAuthStore(state => state.isPinVerified);
  const isPinSetup = usePinAuthStore(state => state.isPinSetup);
  const checkPinSetup = usePinAuthStore(state => state.checkPinSetup);
  const setPinVerified = usePinAuthStore(state => state.setPinVerified);
  const [isCheckingPin, setIsCheckingPin] = useState(false);
  const hasCheckedPinRef = useRef(false);
  const previousAuthRef = useRef(false);


  useEffect(() => {
    const unsubscribe = initialize();
    return () => unsubscribe();
  }, [initialize]);

  // Reset PIN check ref when authentication state changes from false to true
  useEffect(() => {
    if (isAuthenticated && !previousAuthRef.current) {
      // User just logged in - reset PIN check ref to allow new PIN setup
      hasCheckedPinRef.current = false;
    }
    previousAuthRef.current = isAuthenticated;
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

  // Determine initial route based on auth and PIN state
  const currentRoute = useMemo((): string => {
    if (!isAuthenticated) return 'Auth';
    if (isPinSetup === false) return 'PinSetup';
    if (!isPinVerified) return 'PinVerification';
    return 'Main';
  }, [isAuthenticated, isPinSetup, isPinVerified]);

  // Memoize callbacks to prevent re-renders
  const handlePinSetupComplete = useCallback(() => {
    checkPinSetup();
    setPinVerified(true);
  }, [checkPinSetup, setPinVerified]);

  // Memoize initial params
  const pinSetupParams = useMemo(
    () => ({ onComplete: handlePinSetupComplete }),
    [handlePinSetupComplete]
  );


  if (isLoading || (isAuthenticated && isCheckingPin)) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary[500]} />
      </View>
    );
  }

  return (
    <NavigationContainer key={currentRoute}>
      <Stack.Navigator
        initialRouteName={currentRoute}
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background.primary },
        }}
      >
        {!isAuthenticated ? (
          <Stack.Screen 
            name="Auth" 
            component={AuthScreen}
            options={{ animationTypeForReplace: 'pop' }}
          />
        ) : isPinSetup === false ? (
          // PIN not setup - show PIN setup screen
          <Stack.Screen 
            name="PinSetup" 
            component={PinSetupScreen}
            options={{ 
              animationTypeForReplace: 'pop',
              gestureEnabled: false, // Disable swipe back gesture
              headerBackVisible: false, // Hide back button
            }}
            initialParams={pinSetupParams}
          />
        ) : !isPinVerified ? (
          // PIN setup but not verified - show PIN verification screen
          <Stack.Screen 
            name="PinVerification" 
            component={PinVerificationScreen}
            options={{ 
              animationTypeForReplace: 'pop', 
              gestureEnabled: false, // Disable swipe back gesture
              headerBackVisible: false, // Hide back button
            }}
          />
        ) : (
          <>
            <Stack.Screen name="Main" component={MainTabNavigator} />
            <Stack.Screen 
              name="AddTransaction" 
              component={AddTransactionScreen}
              options={({ route }) => ({
                presentation: 'modal',
                headerShown: true,
                headerTitle: (route.params as any)?.editTransactionId ? 'Edit Transaction' : 'Add Transaction',
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
                headerTintColor: colors.primary[500],
                headerBackTitle: 'Back',
              }}
            />
            <Stack.Screen 
              name="SummaryMonthReport" 
              component={ReportsScreen}
              options={{
                headerShown: true,
                headerTitle: 'Summary Month Wise',
                headerTintColor: colors.primary[500],
                headerBackTitle: 'Back',
              }}
            />
            <Stack.Screen 
              name="SummaryCustomReport" 
              component={ReportsScreen}
              options={{
                headerShown: true,
                headerTitle: 'Summary Custom Range',
                headerTintColor: colors.primary[500],
                headerBackTitle: 'Back',
              }}
            />
            <Stack.Screen 
              name="TransactionsMonthReport" 
              component={ReportsScreen}
              options={{
                headerShown: true,
                headerTitle: 'Transactions Month Wise',
                headerTintColor: colors.primary[500],
                headerBackTitle: 'Back',
                headerBackTitleVisible: true,
              }}
            />
            <Stack.Screen 
              name="TransactionsCustomReport" 
              component={ReportsScreen}
              options={{
                headerShown: true,
                headerTitle: 'Transactions Custom Range',
                headerTintColor: colors.primary[500],
                headerBackTitle: 'Back',
                headerBackTitleVisible: true,
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
