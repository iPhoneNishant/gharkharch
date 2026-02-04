/**
 * Main Tab Navigator for Gharkharch
 * Bottom tab navigation for authenticated users
 */

import React, { useEffect } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MainTabParamList } from '../types';
import { colors, typography, spacing } from '../config/theme';
import { useAuthStore, useAccountStore, useTransactionStore } from '../stores';
import { navigationRef } from './navigationRef';
import { useTranslation } from 'react-i18next';

// Screens
import DashboardScreen from '../screens/DashboardScreen';
import TransactionsScreen from '../screens/TransactionsScreen';
import AccountsScreen from '../screens/AccountsScreen';
import AddTransactionScreen from '../screens/AddTransactionScreen';
import ReportsListScreen from '../screens/ReportsListScreen';
import MoreScreen from '../screens/MoreScreen';

const Tab = createBottomTabNavigator<MainTabParamList>();

/**
 * Simple icon component using text symbols
 * TODO: Replace with proper icon library (e.g., react-native-vector-icons)
 */
const TabIcon: React.FC<{ name: string; focused: boolean }> = ({ name, focused }) => {
  const icons: Record<string, string> = {
    Dashboard: '◉',
    Transactions: '⇄',
    Accounts: '☰',
    AddTransaction: '+',
    Reports: '📊',
    More: '⋯',
  };

  const isAddTransaction = name === 'AddTransaction';

  if (isAddTransaction) {
    return (
      <View style={[styles.circleIconContainer, focused && styles.circleIconContainerFocused]}>
        <Text style={[styles.circleIcon, focused && styles.circleIconFocused]}>
          {icons[name] ?? '+'}
        </Text>
      </View>
    );
  }

  return (
    <Text style={[styles.icon, focused && styles.iconFocused]}>
      {icons[name] ?? '•'}
    </Text>
  );
};

const MainTabNavigator: React.FC = () => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const { subscribeToAccounts } = useAccountStore();
  const { subscribeToTransactions } = useTransactionStore();

  // Initialize data subscriptions when user is available
  // This ensures data is loaded regardless of which screen loads first
  useEffect(() => {
    if (user?.id) {
      const unsubAccounts = subscribeToAccounts(user.id);
      const unsubTransactions = subscribeToTransactions(user.id);
      
      return () => {
        unsubAccounts();
        unsubTransactions();
      };
    }
  }, [user?.id, subscribeToAccounts, subscribeToTransactions]);

  return (
    <Tab.Navigator
      initialRouteName="AddTransaction"
      screenOptions={({ route }) => {
        const isAddTransaction = route.name === 'AddTransaction';
        return {
          tabBarIcon: ({ focused, color }) => (
            <TabIcon name={route.name} focused={focused} />
          ),
          tabBarActiveTintColor: colors.primary[500],
          tabBarInactiveTintColor: colors.neutral[500],
          tabBarLabel: ({ focused, color }) => {
            // Hide label for AddTransaction
            if (route.name === 'AddTransaction') {
              return null;
            }
            return (
              <Text
                allowFontScaling={false}
                style={{
                  fontSize: 12,
                  fontWeight: typography.fontWeight.medium,
                  color,
                }}
              >
                {route.name}
              </Text>
            );
          },
          tabBarStyle: {
            backgroundColor: colors.background.elevated,
            borderTopColor: colors.border.light,
            borderTopWidth: 1,
            // Never subtract from safe-area bottom inset; on some Android devices this
            // causes the tab bar to sit behind the system navigation bar.
            paddingBottom: Math.max(insets.bottom, spacing.sm),
            paddingTop: spacing.sm,
            height: 60 + Math.max(insets.bottom, spacing.sm),
          },
          headerStyle: {
            backgroundColor: colors.background.elevated,
            shadowColor: 'transparent',
            elevation: 0,
          },
          headerTitleStyle: {
            color: colors.text.primary,
            fontSize: typography.fontSize.lg,
            fontWeight: typography.fontWeight.semiBold,
          },
        };
      }}
    >
      <Tab.Screen 
        name="Dashboard" 
        component={DashboardScreen}
        options={{
          headerTitle: 'Daily Munim',
          headerTitleAlign: 'center',
        }}
      />
      <Tab.Screen 
        name="Accounts" 
        component={AccountsScreen}
        options={{
          headerTitle: 'Accounts',
          headerTitleAlign: 'center',

        }}
      />
      <Tab.Screen 
        name="AddTransaction" 
        component={AddTransactionScreen}
        options={{
          headerTitle: 'Add Transaction',
          tabBarLabel: '',
          headerTitleAlign: 'center',
          headerRight: () => {
            const handleSmsImport = () => {
              if (navigationRef.isReady()) {
                (navigationRef as any).navigate('SmsImport', { returnTo: 'AddTransaction' });
              }
            };
            return (
              <TouchableOpacity
                onPress={handleSmsImport}
                style={{ marginRight: 16, padding: 4 }}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text style={{ fontSize: 12, fontWeight: typography.fontWeight.semiBold, color: colors.primary[500] }}>
                  {t('addTransaction.importFromSms')}
                </Text>
              </TouchableOpacity>
            );
          },
        }}
      />
      <Tab.Screen 
        name="Reports" 
        component={ReportsListScreen}
        options={{
          headerTitle: 'Reports',
          headerTitleAlign: 'center'
        }}
      />
      <Tab.Screen 
        name="More" 
        component={MoreScreen}
        options={{
          headerTitle: 'More',
          headerTitleAlign: 'center',
        }}
      />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  icon: {
    fontSize: 24,
    color: colors.neutral[500],
  },
  iconFocused: {
    color: colors.primary[500],
  },
  circleIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary[50],
    borderWidth: 2,
    borderColor: colors.primary[300],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
    shadowColor: colors.primary[500],
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  circleIconContainerFocused: {
    backgroundColor: colors.primary[500],
    borderColor: colors.primary[500],
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  circleIcon: {
    fontSize: 28,
    fontWeight: typography.fontWeight.bold,
    color: colors.primary[600],
  },
  circleIconFocused: {
    color: colors.neutral[0],
  },
});

export default MainTabNavigator;
