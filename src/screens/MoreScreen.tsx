/**
 * More Screen for Gharkharch
 * Lists Settings and Repeat Transactions
 */

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

const MoreScreen: React.FC = () => {
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
    content: {
      padding: spacing.base,
    },
    section: {
      backgroundColor: colors.background.elevated,
      borderRadius: borderRadius.lg,
      marginBottom: spacing.lg,
      ...shadows.sm,
      overflow: 'hidden',
    },
    menuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: spacing.base,
      borderBottomWidth: 1,
      borderBottomColor: colors.border.light,
    },
    menuItemLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    iconContainer: {
      width: 40,
      height: 40,
      borderRadius: borderRadius.md,
      backgroundColor: colors.primary[50],
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: spacing.base,
    },
    menuItemText: {
      fontSize: typography.fontSize.base,
      fontWeight: typography.fontWeight.medium,
      color: colors.text.primary,
      flex: 1,
    },
  });

  const menuItems = [
    {
      id: 'settings',
      title: t('more.settings'),
      icon: 'settings-outline' as const,
      onPress: () => navigation.navigate('Settings'),
    },
    {
      id: 'recurring',
      title: t('more.repeatTransactions'),
      icon: 'repeat-outline' as const,
      onPress: () => navigation.navigate('RecurringTransactions'),
    },
    {
      id: 'sms-import',
      title: t('more.smsImport'),
      icon: 'chatbox-ellipses-outline' as const,
      onPress: () => navigation.navigate('SmsImport'),
    },
    {
      id: 'user-guide',
      title: t('more.userGuide'),
      icon: 'book-outline' as const,
      onPress: () => navigation.navigate('UserGuide'),
    },
  ];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        { paddingBottom: insets.bottom + spacing.xl }
      ]}
    >
      <View style={styles.section}>
        {menuItems.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={styles.menuItem}
            onPress={item.onPress}
            activeOpacity={0.7}
          >
            <View style={styles.menuItemLeft}>
              <View style={styles.iconContainer}>
                <Ionicons name={item.icon} size={24} color={colors.primary[500]} />
              </View>
              <Text style={styles.menuItemText}>{item.title}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.text.tertiary} />
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
};

 

export default MoreScreen;
