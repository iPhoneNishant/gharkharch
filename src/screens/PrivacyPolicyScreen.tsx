import React from 'react';
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
        <Text style={styles.headerTitle}>Privacy Policy</Text>
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
        <Text style={styles.lastUpdated}>Last Updated: May 20, 2024</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. Introduction</Text>
          <Text style={styles.paragraph}>
            DailyMunim ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, and safeguard your information when you use our mobile application.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. Information We Collect</Text>
          <Text style={styles.subHeader}>Personal Information</Text>
          <Text style={styles.paragraph}>
            We may collect personal information that you voluntarily provide, such as:
          </Text>
          <View style={styles.bulletPoint}>
            <Text style={styles.bullet}>•</Text>
            <Text style={styles.bulletText}>Account information (email address, name)</Text>
          </View>
          <View style={styles.bulletPoint}>
            <Text style={styles.bullet}>•</Text>
            <Text style={styles.bulletText}>Financial transaction data you enter manually</Text>
          </View>
          <View style={styles.bulletPoint}>
            <Text style={styles.bullet}>•</Text>
            <Text style={styles.bulletText}>SMS data (only with your explicit permission for the SMS import feature)</Text>
          </View>

          <Text style={styles.subHeader}>Device Information</Text>
          <Text style={styles.paragraph}>
            We may collect information about your mobile device, including device model, operating system version, and unique device identifiers.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>3. How We Use Your Information</Text>
          <Text style={styles.paragraph}>
            We use the information we collect to:
          </Text>
          <View style={styles.bulletPoint}>
            <Text style={styles.bullet}>•</Text>
            <Text style={styles.bulletText}>Provide and maintain our services</Text>
          </View>
          <View style={styles.bulletPoint}>
            <Text style={styles.bullet}>•</Text>
            <Text style={styles.bulletText}>Process your financial transactions and generate reports</Text>
          </View>
          <View style={styles.bulletPoint}>
            <Text style={styles.bullet}>•</Text>
            <Text style={styles.bulletText}>Improve user experience and app functionality</Text>
          </View>
          <View style={styles.bulletPoint}>
            <Text style={styles.bullet}>•</Text>
            <Text style={styles.bulletText}>Authenticate your identity and secure your account</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>4. Data Storage and Security</Text>
          <Text style={styles.paragraph}>
            We implement appropriate technical and organizational measures to protect your personal data. Your financial data is stored securely. We do not sell your personal data to third parties.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>5. SMS Data Usage</Text>
          <Text style={styles.paragraph}>
            If you enable the SMS Import feature, the app accesses your SMS messages solely to extract transaction details (amount, date, merchant). This processing happens locally on your device. We do not upload your raw SMS messages to our servers.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>6. Your Rights</Text>
          <Text style={styles.paragraph}>
            You have the right to access, correct, or delete your personal information. You can delete your account and all associated data directly within the app settings.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>7. Changes to This Policy</Text>
          <Text style={styles.paragraph}>
            We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>8. Contact Us</Text>
          <Text style={styles.paragraph}>
            If you have any questions about this Privacy Policy, please contact us at dailymunimorhome@gmail.com.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};

 

export default PrivacyPolicyScreen;
