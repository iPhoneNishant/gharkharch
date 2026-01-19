/**
 * Settings Screen for Gharkharch
 * User profile and app settings
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Switch,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';

import { useAuthStore } from '../stores';
import { RootStackParamList } from '../types';
import { colors, spacing } from '../config/theme';
import { settingsScreenStyles as styles } from '../styles/screens/SettingsScreen.styles';
import {
  isPinSetup,
  isBiometricEnabled,
  isBiometricAvailable,
  getBiometricType,
  enableBiometric,
  disableBiometric,
} from '../services/pinAuthService';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const SettingsScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const { user, signOut, isLoading } = useAuthStore();
  
  const [pinSetup, setPinSetup] = useState<boolean | null>(null);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricType, setBiometricType] = useState<string | null>(null);
  const [isLoadingPin, setIsLoadingPin] = useState(false);


  useEffect(() => {
    checkPinStatus();
  }, []);

  const checkPinStatus = async () => {
    setIsLoadingPin(true);
    try {
      const setup = await isPinSetup();
      setPinSetup(setup);
      
      if (setup) {
        const enabled = await isBiometricEnabled();
        setBiometricEnabled(enabled);
      }
      
      const available = await isBiometricAvailable();
      setBiometricAvailable(available);
      if (available) {
        const type = await getBiometricType();
        setBiometricType(type);
      }
    } catch (error) {
      console.error('Error checking PIN status:', error);
    } finally {
      setIsLoadingPin(false);
    }
  };

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut();
            } catch (error) {
              Alert.alert('Error', 'Failed to sign out. Please try again.');
            }
          },
        },
      ]
    );
  };

  const handleChangePin = () => {
    navigation.navigate('PinChange', {
      onComplete: () => {
        checkPinStatus();
        Alert.alert('Success', 'PIN has been updated successfully.');
      },
      allowBack: true, // Allow back when accessed from Settings
    });
  };


  const handleSetupPin = () => {
    navigation.navigate('PinSetup', {
      onComplete: () => {
        checkPinStatus();
      },
      allowBack: true, // Allow back when accessed from Settings
    });
  };


  const handleBiometricToggle = async (value: boolean) => {
    try {
      if (value) {
        await enableBiometric();
      } else {
        await disableBiometric();
      }
      setBiometricEnabled(value);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update biometric settings.');
      // Revert state
      setBiometricEnabled(!value);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: insets.bottom + spacing.lg }}
    >
      {/* User Profile Card */}
      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {user?.displayName?.charAt(0).toUpperCase() ??
              user?.email?.charAt(0).toUpperCase() ??
              '?'}
          </Text>
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.profileName}>{user?.displayName ?? 'User'}</Text>
          <Text style={styles.profileEmail}>{user?.email ?? ''}</Text>
        </View>
      </View>

      {/* Security Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Security</Text>
        <View style={styles.settingsList}>
          {pinSetup ? (
            <>
              <TouchableOpacity style={styles.settingItem} onPress={handleChangePin}>
                <Text style={styles.settingLabel}>Change PIN</Text>
                <Text style={styles.chevron}>›</Text>
              </TouchableOpacity>

              {biometricAvailable && (
                <View style={styles.settingItem}>
                  <Text style={styles.settingLabel}>
                    {biometricType || 'Biometric'} Authentication
                  </Text>
                  <Switch
                    value={biometricEnabled}
                    onValueChange={handleBiometricToggle}
                    trackColor={{ false: colors.neutral[300], true: colors.primary[300] }}
                    thumbColor={biometricEnabled ? colors.primary[500] : colors.neutral[500]}
                  />
                </View>
              )}
            </>
          ) : (
            <TouchableOpacity style={styles.settingItem} onPress={handleSetupPin}>
              <Text style={styles.settingLabel}>Setup PIN</Text>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Settings Sections */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Preferences</Text>
        <View style={styles.settingsList}>
          <TouchableOpacity style={styles.settingItem}>
            <Text style={styles.settingLabel}>Currency</Text>
            <View style={styles.settingValue}>
              <Text style={styles.settingValueText}>{user?.currency ?? 'INR'}</Text>
              <Text style={styles.chevron}>›</Text>
            </View>
          </TouchableOpacity>

          {/* TODO: Implement currency selection */}
          {/* TODO: Implement theme selection (dark/light mode) */}
          {/* TODO: Implement notification preferences */}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Data</Text>
        <View style={styles.settingsList}>
          <TouchableOpacity style={styles.settingItem}>
            <Text style={styles.settingLabel}>Export Data</Text>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>

          {/* TODO: Implement data export functionality */}
          {/* TODO: Implement data import functionality */}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About</Text>
        <View style={styles.settingsList}>
          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>Version</Text>
            <Text style={styles.settingValueText}>1.0.0</Text>
          </View>

          <TouchableOpacity style={styles.settingItem}>
            <Text style={styles.settingLabel}>Privacy Policy</Text>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingItem}>
            <Text style={styles.settingLabel}>Terms of Service</Text>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Sign Out Button */}
      <TouchableOpacity
        style={styles.signOutButton}
        onPress={handleSignOut}
        disabled={isLoading}
      >
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>

      {/* App Info */}
      <View style={styles.appInfo}>
        <Text style={styles.appName}>DailyMunim</Text>
        <Text style={styles.appTagline}>Ghar Ka Daily Hisab Kitab</Text>
      </View>
    </ScrollView>
  );
};


export default SettingsScreen;
