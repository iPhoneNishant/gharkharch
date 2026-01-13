# Styles Directory

This directory contains all screen-specific styles extracted from their respective screen components for better organization and maintainability.

## Structure

```
styles/
├── screens/
│   ├── AccountsScreen.styles.ts
│   ├── DashboardScreen.styles.ts
│   ├── SettingsScreen.styles.ts
│   └── TransactionsScreen.styles.ts
└── README.md
```

## Usage

Each screen imports its styles from the corresponding style file:

```typescript
import { accountsScreenStyles as styles } from '../styles/screens/AccountsScreen.styles';
```

## Customization

To customize colors and theme values, edit `/src/config/theme.ts`. All color constants are defined at the top of the file for easy customization:

- `PRIMARY_COLOR` - Main brand color
- `SECONDARY_COLOR` - Accent color
- `ASSET_COLOR`, `LIABILITY_COLOR`, `INCOME_COLOR`, `EXPENSE_COLOR` - Account type colors
- Background, text, and border colors

Simply change these constants and all screens will automatically use the new colors.

## Benefits

1. **Separation of Concerns**: Styles are separated from component logic
2. **Easy Customization**: All colors centralized in `theme.ts`
3. **Better Maintainability**: Styles are easier to find and modify
4. **Reusability**: Common styles can be shared across screens
5. **Type Safety**: TypeScript ensures style consistency
