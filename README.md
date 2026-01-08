# Gharkharch 💰

A fintech-grade personal finance app built with **double-entry accounting** principles.

## 🎯 Core Philosophy

Every transaction has exactly **ONE debit account** and **ONE credit account**. This is the fundamental rule of double-entry accounting that ensures your books always balance.

### Account Types

| Type | Description | Balance Behavior |
|------|-------------|------------------|
| **Asset** | Things you own (bank accounts, investments, cash) | Debit ↑, Credit ↓ |
| **Liability** | Things you owe (credit cards, loans) | Debit ↓, Credit ↑ |
| **Income** | Sources of money earned | No balance stored |
| **Expense** | Categories for money spent | No balance stored |

### Transaction Examples

- **Salary received**: Debit Bank Account (asset), Credit Salary (income)
- **Rent paid**: Debit Rent (expense), Credit Bank Account (asset)
- **Credit card payment**: Debit Credit Card (liability), Credit Bank Account (asset)
- **Transfer**: Debit Destination Account (asset), Credit Source Account (asset)

## 🛠 Tech Stack

- **React Native** (Expo)
- **TypeScript**
- **React Navigation** - Native stack + bottom tabs
- **Zustand** - State management
- **Firebase Auth** - Authentication
- **Firebase Firestore** - Database (read-only from client)
- **Firebase Cloud Functions** - All write operations

## 📁 Project Structure

```
gharkharch/
├── App.tsx                 # App entry point
├── src/
│   ├── config/
│   │   ├── firebase.ts     # Firebase configuration
│   │   ├── constants.ts    # App constants & categories
│   │   └── theme.ts        # Design system
│   ├── types/
│   │   └── index.ts        # TypeScript types
│   ├── stores/
│   │   ├── authStore.ts    # Authentication state
│   │   ├── accountStore.ts # Accounts state
│   │   └── transactionStore.ts # Transactions state
│   ├── navigation/
│   │   ├── RootNavigator.tsx    # Auth flow navigation
│   │   └── MainTabNavigator.tsx # Main app tabs
│   └── screens/
│       ├── AuthScreen.tsx
│       ├── DashboardScreen.tsx
│       ├── TransactionsScreen.tsx
│       ├── AccountsScreen.tsx
│       ├── SettingsScreen.tsx
│       ├── AddTransactionScreen.tsx
│       ├── AddAccountScreen.tsx
│       ├── AccountDetailScreen.tsx
│       └── TransactionDetailScreen.tsx
├── functions/
│   └── src/
│       └── index.ts        # Cloud Functions for writes
├── firestore.rules         # Security rules
└── firestore.indexes.json  # Database indexes
```

## 🚀 Getting Started

### Prerequisites

- Node.js 20+
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)
- Firebase project

### Setup

1. **Clone and install dependencies**
   ```bash
   cd gharkharch
   npm install
   cd functions && npm install && cd ..
   ```

2. **Configure Firebase**
   
   Update `src/config/firebase.ts` with your Firebase config:
   ```typescript
   const firebaseConfig = {
     apiKey: 'YOUR_API_KEY',
     authDomain: 'YOUR_PROJECT_ID.firebaseapp.com',
     projectId: 'YOUR_PROJECT_ID',
     storageBucket: 'YOUR_PROJECT_ID.appspot.com',
     messagingSenderId: 'YOUR_MESSAGING_SENDER_ID',
     appId: 'YOUR_APP_ID',
   };
   ```

3. **Deploy Firebase resources**
   ```bash
   # Deploy Firestore rules and indexes
   firebase deploy --only firestore
   
   # Deploy Cloud Functions
   cd functions
   npm run deploy
   ```

4. **Run the app**
   ```bash
   npm start
   # or
   expo start
   ```

## 🔒 Security Model

- **Client**: Read-only access to Firestore
- **Cloud Functions**: All write operations with validation
- **Firestore Rules**: Enforce user ownership on reads

This architecture ensures:
- Accounting rules are enforced server-side
- Balance calculations are atomic and consistent
- Users can only access their own data

## 📊 Data Model

### Account
```typescript
{
  id: string
  name: string
  accountType: 'asset' | 'liability' | 'income' | 'expense'
  parentCategory: string
  subCategory: string
  openingBalance?: number  // Only for asset/liability
  currentBalance?: number  // Only for asset/liability
  userId: string
  isActive: boolean
}
```

### Transaction
```typescript
{
  id: string
  date: Date
  amount: number           // Always positive
  debitAccountId: string   // Account receiving value
  creditAccountId: string  // Account giving value
  note?: string
  userId: string
}
```

## 🎨 Design System

The app uses a cohesive design system with:
- **Primary**: Forest green (#2E7D32) - Financial trust
- **Secondary**: Warm gold (#FFB300) - Accents
- **Account colors**: Green (assets), Red (liabilities), Blue (income), Orange (expenses)

## 📝 TODO

- [ ] Implement date picker for transactions
- [ ] Add data export functionality
- [ ] Implement dark mode
- [ ] Add budget tracking
- [ ] Add recurring transactions
- [ ] Add reports and charts
- [ ] Implement currency selection
- [ ] Add biometric authentication

## 📄 License

MIT
