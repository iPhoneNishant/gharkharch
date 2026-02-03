import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { useTranslation } from 'react-i18next';
import { RootStackParamList } from '../types';
import { colors, spacing, typography, borderRadius, shadows, addFontScaleListener } from '../config/theme';

if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface GuideSection {
  title: string;
  content: string;
  subsections?: { title: string; content: string }[];
}

const UserGuideScreen: React.FC = () => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const [expandedSection, setExpandedSection] = useState<number | null>(0);
  const [fontScaleVersion, setFontScaleVersion] = useState(0);

  // Get guide data from translations
  const guideData: GuideSection[] = [
    {
      title: t('userGuide.sections.overview.title'),
      content: t('userGuide.sections.overview.content'),
    },
    {
      title: t('userGuide.sections.gettingStarted.title'),
      content: t('userGuide.sections.gettingStarted.content'),
      subsections: [
        {
          title: t('userGuide.sections.gettingStarted.subsections.installation.title'),
          content: t('userGuide.sections.gettingStarted.subsections.installation.content')
        },
        {
          title: t('userGuide.sections.gettingStarted.subsections.firstTimeSetup.title'),
          content: t('userGuide.sections.gettingStarted.subsections.firstTimeSetup.content')
        }
      ]
    },
    {
      title: t('userGuide.sections.accountManagement.title'),
      content: t('userGuide.sections.accountManagement.content'),
      subsections: [
        {
          title: t('userGuide.sections.accountManagement.subsections.addingAccounts.title'),
          content: t('userGuide.sections.accountManagement.subsections.addingAccounts.content')
        },
        {
          title: t('userGuide.sections.accountManagement.subsections.accountTypes.title'),
          content: t('userGuide.sections.accountManagement.subsections.accountTypes.content')
        }
      ]
    },
    {
      title: t('userGuide.sections.transactionManagement.title'),
      content: t('userGuide.sections.transactionManagement.content'),
      subsections: [
        {
          title: t('userGuide.sections.transactionManagement.subsections.addingTransactions.title'),
          content: t('userGuide.sections.transactionManagement.subsections.addingTransactions.content')
        },
        {
          title: t('userGuide.sections.transactionManagement.subsections.smsImport.title'),
          content: t('userGuide.sections.transactionManagement.subsections.smsImport.content')
        }
      ]
    },
    {
      title: t('userGuide.sections.recurringTransactions.title'),
      content: t('userGuide.sections.recurringTransactions.content'),
      subsections: [
        {
          title: t('userGuide.sections.recurringTransactions.subsections.settingUp.title'),
          content: t('userGuide.sections.recurringTransactions.subsections.settingUp.content')
        },
        {
          title: t('userGuide.sections.recurringTransactions.subsections.types.title'),
          content: t('userGuide.sections.recurringTransactions.subsections.types.content')
        }
      ]
    },
    {
      title: t('userGuide.sections.reportsAnalytics.title'),
      content: t('userGuide.sections.reportsAnalytics.content'),
      subsections: [
        {
          title: t('userGuide.sections.reportsAnalytics.subsections.dashboard.title'),
          content: t('userGuide.sections.reportsAnalytics.subsections.dashboard.content')
        },
        {
          title: t('userGuide.sections.reportsAnalytics.subsections.detailedReports.title'),
          content: t('userGuide.sections.reportsAnalytics.subsections.detailedReports.content')
        }
      ]
    },
    {
      title: t('userGuide.sections.settingsSecurity.title'),
      content: t('userGuide.sections.settingsSecurity.content'),
      subsections: [
        {
          title: t('userGuide.sections.settingsSecurity.subsections.general.title'),
          content: t('userGuide.sections.settingsSecurity.subsections.general.content')
        },
        {
          title: t('userGuide.sections.settingsSecurity.subsections.security.title'),
          content: t('userGuide.sections.settingsSecurity.subsections.security.content')
        }
      ]
    },
    {
      title: t('userGuide.sections.troubleshooting.title'),
      content: t('userGuide.sections.troubleshooting.content'),
      subsections: [
        {
          title: t('userGuide.sections.troubleshooting.subsections.appNotSyncing.title'),
          content: t('userGuide.sections.troubleshooting.subsections.appNotSyncing.content')
        },
        {
          title: t('userGuide.sections.troubleshooting.subsections.pinIssues.title'),
          content: t('userGuide.sections.troubleshooting.subsections.pinIssues.content')
        }
      ]
    }
  ];
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
    sectionContainer: {
      backgroundColor: colors.background.elevated,
      borderRadius: borderRadius.lg,
      marginBottom: spacing.md,
      ...shadows.sm,
      overflow: 'hidden',
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: spacing.md,
    },
    sectionTitle: {
      fontSize: typography.fontSize.md,
      fontWeight: typography.fontWeight.medium,
      color: colors.text.primary,
      flex: 1,
    },
    sectionTitleActive: {
      color: colors.primary[500],
      fontWeight: typography.fontWeight.semiBold,
    },
    sectionBody: {
      paddingHorizontal: spacing.md,
      paddingBottom: spacing.md,
      borderTopWidth: 1,
      borderTopColor: colors.border.light,
      paddingTop: spacing.md,
    },
    sectionContent: {
      fontSize: typography.fontSize.sm,
      color: colors.text.secondary,
      lineHeight: 20,
      marginBottom: spacing.sm,
    },
    subSection: {
      marginTop: spacing.md,
      backgroundColor: colors.background.primary,
      padding: spacing.sm,
      borderRadius: borderRadius.md,
    },
    subSectionTitle: {
      fontSize: typography.fontSize.sm,
      fontWeight: typography.fontWeight.semiBold,
      color: colors.text.primary,
      marginBottom: spacing.xs,
    },
    subSectionContent: {
      fontSize: typography.fontSize.sm,
      color: colors.text.secondary,
      lineHeight: 20,
    },
  });

  const toggleSection = (index: number) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedSection(expandedSection === index ? null : index);
  };

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
        <Text style={styles.headerTitle}>{t('userGuide.title')}</Text>
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
        {guideData.map((section, index) => {
          const isExpanded = expandedSection === index;
          return (
            <View key={index} style={styles.sectionContainer}>
              <TouchableOpacity
                style={styles.sectionHeader}
                onPress={() => toggleSection(index)}
                activeOpacity={0.7}
              >
                <Text style={[
                  styles.sectionTitle,
                  isExpanded && styles.sectionTitleActive
                ]}>
                  {section.title}
                </Text>
                <Ionicons
                  name={isExpanded ? "chevron-up" : "chevron-down"}
                  size={20}
                  color={isExpanded ? colors.primary[500] : colors.text.tertiary}
                />
              </TouchableOpacity>
              
              {isExpanded && (
                <View style={styles.sectionBody}>
                  <Text style={styles.sectionContent}>{section.content}</Text>
                  
                  {section.subsections?.map((sub, subIndex) => (
                    <View key={subIndex} style={styles.subSection}>
                      <Text style={styles.subSectionTitle}>{sub.title}</Text>
                      <Text style={styles.subSectionContent}>{sub.content}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
};

 

export default UserGuideScreen;
