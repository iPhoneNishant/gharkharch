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

// Screens
import DashboardScreen from '../screens/DashboardScreen';
import TransactionsScreen from '../screens/TransactionsScreen';
import AccountsScreen from '../screens/AccountsScreen';
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
    Reports: '📊',
    More: '⋯',
  };

  return (
    <Text style={[styles.icon, focused && styles.iconFocused]}>
      {icons[name] ?? '•'}
    </Text>
  );
};

const MainTabNavigator: React.FC = () => {
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
      initialRouteName="Transactions"
      screenOptions={({ route }) => {
        const isTransactions = route.name === 'Transactions';
        return {
          tabBarIcon: ({ focused, color }) => (
            <TabIcon name={route.name} focused={focused} />
          ),
          tabBarActiveTintColor: colors.primary[500],
          tabBarInactiveTintColor: colors.neutral[500],
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
          tabBarLabelStyle: {
            fontSize: typography.fontSize.xs,
            fontWeight: typography.fontWeight.medium,
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
          headerTitle: 'DailyMunim',
          
        }}
      />
      <Tab.Screen 
        name="Accounts" 
        component={AccountsScreen}
        options={{
          headerTitle: 'Accounts',
        }}
      />
      <Tab.Screen 
        name="Transactions" 
        component={TransactionsScreen}
        options={{
          headerTitle: 'Transactions',
        }}
      />
      <Tab.Screen 
        name="Reports" 
        component={ReportsListScreen}
        options={{
          headerTitle: 'Reports',
        }}
      />
      <Tab.Screen 
        name="More" 
        component={MoreScreen}
        options={{
          headerTitle: 'More',
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
});

export default MainTabNavigator;
