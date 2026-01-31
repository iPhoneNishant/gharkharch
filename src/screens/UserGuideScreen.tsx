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

const guideData: GuideSection[] = [
  {
    title: 'Overview',
    content: 'DailyMunim (Ghar Ka Daily Hisab Kitab) is a comprehensive personal finance and expense tracking application designed for Indian users. Track your daily expenses, manage multiple accounts, set up recurring transactions, and generate detailed financial reports.',
  },
  {
    title: 'Getting Started',
    content: 'First time setup involves creating an account, setting up a secure PIN, and adding your first bank or cash account to start tracking.',
    subsections: [
      {
        title: 'Installation',
        content: '1. Download the app\n2. Install and open\n3. Sign up with email\n4. Set up PIN for security'
      },
      {
        title: 'First Time Setup',
        content: '1. Authentication: Create account\n2. PIN Setup: 4-6 digit PIN\n3. Add Account: Create your first account\n4. Start Tracking: Add transactions'
      }
    ]
  },
  {
    title: 'Account Management',
    content: 'Manage your bank accounts, cash wallets, and credit cards in one place.',
    subsections: [
      {
        title: 'Adding Accounts',
        content: 'Go to Accounts tab -> Tap + Add Account -> Choose account type -> Enter details.'
      },
      {
        title: 'Account Types',
        content: '• Bank Account: Savings, Current\n• Cash Account: Wallet, Petty Cash\n• Credit Card: Monitor spending'
      }
    ]
  },
  {
    title: 'Transaction Management',
    content: 'Record income and expenses manually or import from SMS.',
    subsections: [
      {
        title: 'Adding Transactions',
        content: 'Go to Transactions tab -> Tap + Add Transaction -> Select Income/Expense -> Enter details -> Save.'
      },
      {
        title: 'SMS Import',
        content: 'Go to More -> SMS Import -> Grant permissions -> Select bank SMS -> App automatically extracts details.'
      }
    ]
  },
  {
    title: 'Recurring Transactions',
    content: 'Set up automatic transactions for regular bills, salaries, or subscriptions.',
    subsections: [
      {
        title: 'Setting Up',
        content: 'Go to More -> Repeat Transactions -> Tap + Add Recurring -> Set amount, frequency, and dates.'
      },
      {
        title: 'Types',
        content: 'Fixed/Variable amounts for Income (Salary) or Expense (Bills).'
      }
    ]
  },
  {
    title: 'Reports & Analytics',
    content: 'Gain insights into your spending habits with detailed reports.',
    subsections: [
      {
        title: 'Dashboard',
        content: 'Overview of total balance, monthly income/expense, and recent transactions.'
      },
      {
        title: 'Detailed Reports',
        content: 'Day-to-Day summaries, Month-to-Month comparisons, and Category-wise breakdowns.'
      }
    ]
  },
  {
    title: 'Settings & Security',
    content: 'Customize your app experience and keep your data safe.',
    subsections: [
      {
        title: 'General',
        content: 'Theme (Light/Dark), Language, Currency, Date Format.'
      },
      {
        title: 'Security',
        content: 'Change PIN, Enable Biometric (Fingerprint/Face ID), Auto-lock settings.'
      }
    ]
  },
  {
    title: 'Troubleshooting',
    content: 'Common solutions for issues.',
    subsections: [
      {
        title: 'App Not Syncing',
        content: 'Check internet connection, force refresh, or restart app.'
      },
      {
        title: 'PIN Issues',
        content: 'Use account recovery if forgotten, or reset through email.'
      }
    ]
  }
];

const UserGuideScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const [expandedSection, setExpandedSection] = useState<number | null>(0);
  const [fontScaleVersion, setFontScaleVersion] = useState(0);
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
        <Text style={styles.headerTitle}>User Guide</Text>
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
