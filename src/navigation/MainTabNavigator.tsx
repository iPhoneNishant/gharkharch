/**
 * Main Tab Navigator for Gharkharch
 * Bottom tab navigation for authenticated users
 */

import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MainTabParamList } from '../types';
import { colors, typography, spacing } from '../config/theme';

// Screens
import DashboardScreen from '../screens/DashboardScreen';
import TransactionsScreen from '../screens/TransactionsScreen';
import AccountsScreen from '../screens/AccountsScreen';
import ReportsListScreen from '../screens/ReportsListScreen';
import SettingsScreen from '../screens/SettingsScreen';

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
    Settings: '⚙',
  };

  return (
    <Text style={[styles.icon, focused && styles.iconFocused]}>
      {icons[name] ?? '•'}
    </Text>
  );
};

const MainTabNavigator: React.FC = () => {
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused }) => (
          <TabIcon name={route.name} focused={focused} />
        ),
        tabBarActiveTintColor: colors.primary[500],
        tabBarInactiveTintColor: colors.neutral[500],
        tabBarStyle: {
          backgroundColor: colors.background.elevated,
          borderTopColor: colors.border.light,
          borderTopWidth: 1,
          paddingBottom: insets.bottom > 0 ? insets.bottom - 10 : spacing.sm,
          paddingTop: spacing.sm,
          height: 60 + (insets.bottom > 0 ? insets.bottom - 10 : 0),
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
      })}
    >
      <Tab.Screen 
        name="Dashboard" 
        component={DashboardScreen}
        options={{
          headerTitle: 'Gharkharch',
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
        name="Accounts" 
        component={AccountsScreen}
        options={{
          headerTitle: 'Accounts',
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
        name="Settings" 
        component={SettingsScreen}
        options={{
          headerTitle: 'Settings',
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
