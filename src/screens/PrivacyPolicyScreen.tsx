import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { RootStackParamList } from '../types';
import { colors, spacing, typography, borderRadius, shadows, addFontScaleListener } from '../config/theme';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const PrivacyPolicyScreen: React.FC = () => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const [fontScaleVersion, setFontScaleVersion] = React.useState(0);
  React.useEffect(() => {
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
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.md,
      paddingBottom: spacing.md,
      backgroundColor: colors.background.primary,
      borderBottomWidth: 1,
      borderBottomColor: colors.border.light,
    },
    backButton: {
      padding: spacing.xs,
    },
    headerTitle: {
      fontSize: typography.fontSize.lg,
      fontWeight: typography.fontWeight.semiBold,
      color: colors.text.primary,
    },
    placeholder: {
      width: 32,
    },
    content: {
      flex: 1,
    },
    scrollContent: {
      padding: spacing.md,
    },
    lastUpdated: {
      fontSize: typography.fontSize.sm,
      color: colors.text.tertiary,
      marginBottom: spacing.lg,
      fontStyle: 'italic',
    },
    section: {
      marginBottom: spacing.xl,
    },
    sectionTitle: {
      fontSize: typography.fontSize.lg,
      fontWeight: typography.fontWeight.bold,
      color: colors.text.primary,
      marginBottom: spacing.sm,
    },
    subHeader: {
      fontSize: typography.fontSize.md,
      fontWeight: typography.fontWeight.semiBold,
      color: colors.text.primary,
      marginTop: spacing.md,
      marginBottom: spacing.xs,
    },
    paragraph: {
      fontSize: typography.fontSize.md,
      color: colors.text.secondary,
      lineHeight: 24,
      marginBottom: spacing.sm,
    },
    bulletPoint: {
      flexDirection: 'row',
      marginBottom: spacing.xs,
      paddingLeft: spacing.sm,
    },
    bullet: {
      fontSize: typography.fontSize.md,
      color: colors.text.secondary,
      marginRight: spacing.sm,
      lineHeight: 24,
    },
    bulletText: {
      fontSize: typography.fontSize.md,
      color: colors.text.secondary,
      lineHeight: 24,
      flex: 1,
    },
  });

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('privacyPolicy.title')}</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + spacing.xl }
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.lastUpdated}>{t('privacyPolicy.lastUpdated')}</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('privacyPolicy.sections.introduction.title')}</Text>
          <Text style={styles.paragraph}>
            {t('privacyPolicy.sections.introduction.body')}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('privacyPolicy.sections.informationCollected.title')}</Text>
          <Text style={styles.subHeader}>{t('privacyPolicy.sections.informationCollected.personalInformationTitle')}</Text>
          <Text style={styles.paragraph}>
            {t('privacyPolicy.sections.informationCollected.personalInformationBody')}
          </Text>
          <View style={styles.bulletPoint}>
            <Text style={styles.bullet}>•</Text>
            <Text style={styles.bulletText}>{t('privacyPolicy.sections.informationCollected.bullets.accountInformation')}</Text>
          </View>
          <View style={styles.bulletPoint}>
            <Text style={styles.bullet}>•</Text>
            <Text style={styles.bulletText}>{t('privacyPolicy.sections.informationCollected.bullets.transactionData')}</Text>
          </View>
          <View style={styles.bulletPoint}>
            <Text style={styles.bullet}>•</Text>
            <Text style={styles.bulletText}>{t('privacyPolicy.sections.informationCollected.bullets.smsData')}</Text>
          </View>

          <Text style={styles.subHeader}>{t('privacyPolicy.sections.informationCollected.deviceInformationTitle')}</Text>
          <Text style={styles.paragraph}>
            {t('privacyPolicy.sections.informationCollected.deviceInformationBody')}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('privacyPolicy.sections.usage.title')}</Text>
          <Text style={styles.paragraph}>
            {t('privacyPolicy.sections.usage.body')}
          </Text>
          <View style={styles.bulletPoint}>
            <Text style={styles.bullet}>•</Text>
            <Text style={styles.bulletText}>{t('privacyPolicy.sections.usage.bullets.provideServices')}</Text>
          </View>
          <View style={styles.bulletPoint}>
            <Text style={styles.bullet}>•</Text>
            <Text style={styles.bulletText}>{t('privacyPolicy.sections.usage.bullets.processTransactions')}</Text>
          </View>
          <View style={styles.bulletPoint}>
            <Text style={styles.bullet}>•</Text>
            <Text style={styles.bulletText}>{t('privacyPolicy.sections.usage.bullets.improveExperience')}</Text>
          </View>
          <View style={styles.bulletPoint}>
            <Text style={styles.bullet}>•</Text>
            <Text style={styles.bulletText}>{t('privacyPolicy.sections.usage.bullets.authenticateIdentity')}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('privacyPolicy.sections.storageSecurity.title')}</Text>
          <Text style={styles.paragraph}>
            {t('privacyPolicy.sections.storageSecurity.body')}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('privacyPolicy.sections.smsDataUsage.title')}</Text>
          <Text style={styles.paragraph}>
            {t('privacyPolicy.sections.smsDataUsage.body')}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('privacyPolicy.sections.yourRights.title')}</Text>
          <Text style={styles.paragraph}>
            {t('privacyPolicy.sections.yourRights.body')}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('privacyPolicy.sections.policyChanges.title')}</Text>
          <Text style={styles.paragraph}>
            {t('privacyPolicy.sections.policyChanges.body')}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('privacyPolicy.sections.contact.title')}</Text>
          <Text style={styles.paragraph}>
            {t('privacyPolicy.sections.contact.body')}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};

 

export default PrivacyPolicyScreen;
