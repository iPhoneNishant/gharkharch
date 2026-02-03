/**
 * Language Selection Screen for Gharkharch
 * Shown on first app launch to let users select their preferred language
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { RootStackParamList } from '../types';
import { colors, typography, spacing, borderRadius, shadows, addFontScaleListener } from '../config/theme';
import i18n from '../i18n';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'LanguageSelection'>;

interface LanguageSelectionScreenProps {
  navigation: NavigationProp;
  route: { params?: undefined };
}

const LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिंदी' },
];

const LanguageSelectionScreen: React.FC<LanguageSelectionScreenProps> = ({ navigation }) => {
  const { t, i18n: i18nInstance } = useTranslation();
  const insets = useSafeAreaInsets();
  const [selectedLanguage, setSelectedLanguage] = useState<string>(i18nInstance.language || 'en');
  const [fontScaleVersion, setFontScaleVersion] = useState(0);

  useEffect(() => {
    const unsub = addFontScaleListener(() => {
      setFontScaleVersion(v => v + 1);
    });
    return () => {
      unsub();
    };
  }, []);

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background.primary,
    },
    scrollContent: {
      flexGrow: 1,
      paddingHorizontal: spacing.xl,
      paddingTop: insets.top + spacing['2xl'],
      paddingBottom: insets.bottom + spacing.xl,
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
      textAlign: 'center',
    },
    subtitle: {
      fontSize: typography.fontSize.base,
      color: colors.text.secondary,
      textAlign: 'center',
      paddingHorizontal: spacing.base,
    },
    languageList: {
      marginTop: spacing.xl,
    },
    languageItem: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.background.elevated,
      borderRadius: borderRadius.lg,
      padding: spacing.lg,
      marginBottom: spacing.md,
      borderWidth: 2,
      borderColor: colors.border.light,
      ...shadows.sm,
    },
    languageItemSelected: {
      borderColor: colors.primary[500],
      backgroundColor: colors.primary[50],
    },
    languageContent: {
      flex: 1,
    },
    languageName: {
      fontSize: typography.fontSize.lg,
      fontWeight: typography.fontWeight.semiBold,
      color: colors.text.primary,
    },
    selectedIndicator: {
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: colors.primary[500],
      alignItems: 'center',
      justifyContent: 'center',
      marginLeft: spacing.md,
    },
    selectedIndicatorInner: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: colors.neutral[0],
    },
    continueButton: {
      backgroundColor: colors.primary[500],
      borderRadius: borderRadius.lg,
      padding: spacing.base,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: spacing.xl,
      minHeight: 50,
      ...shadows.md,
    },
    continueButtonText: {
      fontSize: typography.fontSize.base,
      fontWeight: typography.fontWeight.semiBold,
      color: colors.neutral[0],
    },
  });

  const handleLanguageSelect = (languageCode: string) => {
    setSelectedLanguage(languageCode);
    // Change language immediately for preview
    i18nInstance.changeLanguage(languageCode);
  };

  const handleContinue = async () => {
    try {
      // Save selected language
      await AsyncStorage.setItem('user-language', selectedLanguage);
      await AsyncStorage.setItem('language-selected', 'true');
      
      // Change language
      await i18nInstance.changeLanguage(selectedLanguage);
      
      // Navigate to next screen (will be determined by RootNavigator)
      // The navigation will happen automatically when language is set
    } catch (error) {
      console.error('Error saving language:', error);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.logo}>₹</Text>
          <Text style={styles.title}>{t('languageSelection.title')}</Text>
          <Text style={styles.subtitle}>
            {t('languageSelection.subtitle')}
          </Text>
        </View>

        {/* Language List */}
        <View style={styles.languageList}>
          {LANGUAGES.map((language) => {
            const isSelected = selectedLanguage === language.code;
            return (
              <TouchableOpacity
                key={language.code}
                style={[
                  styles.languageItem,
                  isSelected && styles.languageItemSelected,
                ]}
                onPress={() => handleLanguageSelect(language.code)}
                activeOpacity={0.7}
              >
                <View style={styles.languageContent}>
                  <Text style={styles.languageName}>{language.nativeName}</Text>
                </View>
                {isSelected && (
                  <View style={styles.selectedIndicator}>
                    <View style={styles.selectedIndicatorInner} />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Continue Button */}
        <TouchableOpacity
          style={styles.continueButton}
          onPress={handleContinue}
          activeOpacity={0.8}
        >
          <Text style={styles.continueButtonText}>
            {t('languageSelection.continue')}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default LanguageSelectionScreen;
