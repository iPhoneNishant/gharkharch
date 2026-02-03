/**
 * Theme configuration for Gharkharch
 * A fintech-grade design system with a premium, trustworthy aesthetic
 * 
 * To customize colors, modify the values below. All colors are centralized here
 * for easy theming and future dark mode support.
 */

import i18n from '../i18n';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ============================================================================
// COLOR CUSTOMIZATION - Change these values to customize the app's appearance
// ============================================================================

// Primary brand color (main green)
const PRIMARY_COLOR = '#2E7D32';

// Secondary accent color (gold)
const SECONDARY_COLOR = '#FFB300';

// Account type colors
const ASSET_COLOR = '#2E7D32';      // Green - things you own
const LIABILITY_COLOR = '#C62828';  // Red - things you owe
const INCOME_COLOR = '#1565C0';      // Blue - money coming in
const EXPENSE_COLOR = '#F57C00';     // Orange - money going out

// Semantic colors
const SUCCESS_COLOR = '#2E7D32';
const WARNING_COLOR = '#F57C00';
const ERROR_COLOR = '#C62828';
const INFO_COLOR = '#1565C0';

// Background colors
const BACKGROUND_PRIMARY = '#FAFAFA';
const BACKGROUND_SECONDARY = '#FFFFFF';
const BACKGROUND_TERTIARY = '#F5F5F5';
const BACKGROUND_ELEVATED = '#FFFFFF';

// Text colors
const TEXT_PRIMARY = '#212121';
const TEXT_SECONDARY = '#616161';
const TEXT_TERTIARY = '#9E9E9E';
const TEXT_INVERSE = '#FFFFFF';
const TEXT_LINK = '#1565C0';

// Border colors
const BORDER_LIGHT = '#E0E0E0';
const BORDER_MEDIUM = '#BDBDBD';
const BORDER_DARK = '#9E9E9E';

// ============================================================================
// EXPORTED COLOR SYSTEM
// ============================================================================

export const colors = {
  // Primary palette - Deep forest green for financial trust
  primary: {
    50: '#E8F5E9',
    100: '#C8E6C9',
    200: '#A5D6A7',
    300: '#81C784',
    400: '#66BB6A',
    500: PRIMARY_COLOR, // Main brand color
    600: PRIMARY_COLOR,
    700: '#1B5E20',
    800: '#1B5E20',
    900: '#0D3D12',
  },
  
  // Secondary palette - Warm gold for accents
  secondary: {
    50: '#FFF8E1',
    100: '#FFECB3',
    200: '#FFE082',
    300: '#FFD54F',
    400: '#FFCA28',
    500: SECONDARY_COLOR,
    600: '#FFA000',
    700: '#FF8F00',
    800: '#FF6F00',
    900: '#E65100',
  },
  
  // Semantic colors
  success: SUCCESS_COLOR,
  warning: WARNING_COLOR,
  error: ERROR_COLOR,
  info: INFO_COLOR,
  
  // Account type colors
  asset: ASSET_COLOR,      // Green - things you own
  liability: LIABILITY_COLOR,   // Red - things you owe
  income: INCOME_COLOR,      // Blue - money coming in
  expense: EXPENSE_COLOR,     // Orange - money going out
  
  // Neutral palette
  neutral: {
    0: '#FFFFFF',
    50: '#FAFAFA',
    100: '#F5F5F5',
    200: '#EEEEEE',
    300: '#E0E0E0',
    400: '#BDBDBD',
    500: '#9E9E9E',
    600: '#757575',
    700: '#616161',
    800: '#424242',
    900: '#212121',
    1000: '#000000',
  },
  
  // Background colors
  background: {
    primary: BACKGROUND_PRIMARY,
    secondary: BACKGROUND_SECONDARY,
    tertiary: BACKGROUND_TERTIARY,
    elevated: BACKGROUND_ELEVATED,
  },
  
  // Text colors
  text: {
    primary: TEXT_PRIMARY,
    secondary: TEXT_SECONDARY,
    tertiary: TEXT_TERTIARY,
    inverse: TEXT_INVERSE,
    link: TEXT_LINK,
  },
  
  // Border colors
  border: {
    light: BORDER_LIGHT,
    medium: BORDER_MEDIUM,
    dark: BORDER_DARK,
  },
};

let BASE_FONT_SCALE = (() => {
  try {
    return i18n.language === 'hi' ? 1.12 : 1;
  } catch {
    return 1;
  }
})();

let USER_FONT_SCALE = 1;

let FONT_SCALE = BASE_FONT_SCALE * USER_FONT_SCALE;

const BASE_FONT_SIZES = {
  xs: 10,
  sm: 12,
  md: 14,
  base: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
  '3xl': 30,
  '4xl': 36,
  '5xl': 48,
};

export const typography = {
  // Font families - using system fonts for optimal performance
  fontFamily: {
    regular: 'System',
    medium: 'System',
    semiBold: 'System',
    bold: 'System',
  },
  
  // Font sizes
  fontSize: {
    xs: Math.round(BASE_FONT_SIZES.xs * FONT_SCALE),
    sm: Math.round(BASE_FONT_SIZES.sm * FONT_SCALE),
    md: Math.round(BASE_FONT_SIZES.md * FONT_SCALE),
    base: Math.round(BASE_FONT_SIZES.base * FONT_SCALE),
    lg: Math.round(BASE_FONT_SIZES.lg * FONT_SCALE),
    xl: Math.round(BASE_FONT_SIZES.xl * FONT_SCALE),
    '2xl': Math.round(BASE_FONT_SIZES['2xl'] * FONT_SCALE),
    '3xl': Math.round(BASE_FONT_SIZES['3xl'] * FONT_SCALE),
    '4xl': Math.round(BASE_FONT_SIZES['4xl'] * FONT_SCALE),
    '5xl': Math.round(BASE_FONT_SIZES['5xl'] * FONT_SCALE),
  },
  
  // Line heights
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
  },
  
  // Font weights
  fontWeight: {
    regular: '400' as const,
    medium: '500' as const,
    semiBold: '600' as const,
    bold: '700' as const,
  },
};

const fontScaleListeners = new Set<() => void>();

const recalcTypography = () => {
  FONT_SCALE = BASE_FONT_SCALE * USER_FONT_SCALE;
  typography.fontSize.xs = Math.round(BASE_FONT_SIZES.xs * FONT_SCALE);
  typography.fontSize.sm = Math.round(BASE_FONT_SIZES.sm * FONT_SCALE);
  typography.fontSize.md = Math.round(BASE_FONT_SIZES.md * FONT_SCALE);
  typography.fontSize.base = Math.round(BASE_FONT_SIZES.base * FONT_SCALE);
  typography.fontSize.lg = Math.round(BASE_FONT_SIZES.lg * FONT_SCALE);
  typography.fontSize.xl = Math.round(BASE_FONT_SIZES.xl * FONT_SCALE);
  typography.fontSize['2xl'] = Math.round(BASE_FONT_SIZES['2xl'] * FONT_SCALE);
  typography.fontSize['3xl'] = Math.round(BASE_FONT_SIZES['3xl'] * FONT_SCALE);
  typography.fontSize['4xl'] = Math.round(BASE_FONT_SIZES['4xl'] * FONT_SCALE);
  typography.fontSize['5xl'] = Math.round(BASE_FONT_SIZES['5xl'] * FONT_SCALE);
};

export const setFontScale = async (scale: number, saveToStorage: boolean = true) => {
  const clamped = Math.max(0.8, Math.min(scale, 1.5));
  USER_FONT_SCALE = clamped;
  recalcTypography();
  fontScaleListeners.forEach(fn => fn());
  
  // Save to AsyncStorage if requested (default: true)
  if (saveToStorage) {
    try {
      await AsyncStorage.setItem('user-font-scale', String(clamped));
    } catch (error) {
      console.error('Error saving font scale to AsyncStorage:', error);
    }
  }
};

export const getFontScale = () => USER_FONT_SCALE;

/**
 * Initialize font scale from AsyncStorage
 * Should be called at app startup to load saved font scale
 */
export const initializeFontScale = async (): Promise<void> => {
  try {
    const stored = await AsyncStorage.getItem('user-font-scale');
    if (stored) {
      const val = parseFloat(stored);
      if (!isNaN(val) && val >= 0.8 && val <= 1.5) {
        // Don't save to storage since we're loading from it
        await setFontScale(val, false);
      }
    }
  } catch (error) {
    console.error('Error loading font scale from AsyncStorage:', error);
  }
};

export const addFontScaleListener = (fn: () => void) => {
  fontScaleListeners.add(fn);
  return () => fontScaleListeners.delete(fn);
};
export const removeFontScaleListener = (fn: () => void) => {
  fontScaleListeners.delete(fn);
};

i18n.on('languageChanged', (lang) => {
  BASE_FONT_SCALE = lang === 'hi' ? 1.12 : 1;
  recalcTypography();
  fontScaleListeners.forEach(fn => fn());
});

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  '2xl': 32,
  '3xl': 40,
  '4xl': 48,
  '5xl': 64,
};

export const borderRadius = {
  none: 0,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  '2xl': 24,
  full: 9999,
};

export const shadows = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
};

/**
 * Get color for account type
 */
export const getAccountTypeColor = (accountType: 'asset' | 'liability' | 'income' | 'expense'): string => {
  return colors[accountType];
};

/**
 * Get background color for account type (lighter shade)
 * These are light tints of the account type colors
 */
export const getAccountTypeBgColor = (accountType: 'asset' | 'liability' | 'income' | 'expense'): string => {
  const bgColors = {
    asset: colors.primary[50],      // Light green
    liability: '#FFEBEE',            // Light red
    income: '#E3F2FD',               // Light blue
    expense: '#FFF3E0',              // Light orange
  };
  return bgColors[accountType];
};

export const theme = {
  colors,
  typography,
  spacing,
  borderRadius,
  shadows,
};

export type Theme = typeof theme;
