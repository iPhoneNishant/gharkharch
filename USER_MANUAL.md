# Gharkharch User Manual

## Table of Contents
1. [Getting Started](#getting-started)
2. [Using the App](#using-the-app)
   - [Creating Accounts](#creating-accounts)
   - [Making Transactions](#making-transactions)
   - [Viewing Transactions](#viewing-transactions)
   - [Viewing Summary and Reports](#viewing-summary-and-reports)
3. [PIN Authentication](#pin-authentication)
4. [Biometric Authentication](#biometric-authentication)
5. [Security Features](#security-features)
6. [Managing Your PIN](#managing-your-pin)
7. [Troubleshooting](#troubleshooting)
8. [FAQs](#faqs)

---

## Getting Started

### First Time Setup

1. **Create an Account**
   - Open the Gharkharch app
   - Tap "Sign Up" if you're a new user
   - Enter your email address and create a password
   - Complete the registration process

2. **Set Up Your PIN**
   - After logging in for the first time, you'll be prompted to set up a PIN
   - Enter a 4-6 digit PIN of your choice
   - Confirm your PIN by entering it again
   - Your PIN is now set up and will be required every time you open the app

3. **Enable Biometric Authentication (Optional)**
   - After setting up your PIN, you can enable biometric authentication
   - If your device supports Face ID, Touch ID, or Fingerprint, you'll see an option to enable it
   - Follow the on-screen prompts to complete biometric setup

---

## Using the App

### Understanding Double-Entry Accounting

Gharkharch uses **double-entry accounting**, which means every transaction affects two accounts:
- **Debit Account**: The account receiving value (money coming in)
- **Credit Account**: The account giving value (money going out)

This ensures your books always balance and provides accurate financial tracking.

### Account Types

The app supports four types of accounts:

| Type | Description | Examples |
|------|-------------|----------|
| **Asset** | Things you own | Bank accounts, Cash, Investments |
| **Liability** | Things you owe | Credit cards, Loans, Mortgages |
| **Income** | Money you earn | Salary, Freelance income, Interest |
| **Expense** | Money you spend | Rent, Groceries, Utilities, Entertainment |

---

## Creating Accounts

**Important:** You must create accounts **before** you can make transactions. Accounts are the foundation of your financial tracking.

### Step-by-Step: Creating an Account

1. **Open the Accounts Screen**
   - Tap the **"Accounts"** tab at the bottom of the screen
   - You'll see a list of your existing accounts (if any)

2. **Add a New Account**
   - Tap the **"+"** button (usually in the top right corner)
   - Or tap **"Add Account"** button

3. **Fill in Account Details**
   - **Account Name**: Enter a descriptive name (e.g., "Chase Checking", "Credit Card", "Salary")
   - **Account Type**: Select one of the four types:
     - **Asset**: For bank accounts, cash, investments
     - **Liability**: For credit cards, loans
     - **Income**: For sources of income
     - **Expense**: For spending categories
   - **Category**: Choose a parent category (e.g., "Bank Accounts", "Credit Cards", "Salary", "Housing")
   - **Subcategory**: Choose or enter a subcategory (e.g., "Checking", "Visa", "Monthly Salary", "Rent")
   - **Opening Balance** (for Asset/Liability only): Enter your current balance if you're adding an existing account

4. **Save the Account**
   - Tap **"Save"** or **"Create Account"**
   - Your account is now created and ready to use

### Account Examples

**Example 1: Bank Account (Asset)**
- Name: "Chase Checking"
- Type: Asset
- Category: Bank Accounts
- Subcategory: Checking
- Opening Balance: 5000.00

**Example 2: Credit Card (Liability)**
- Name: "Visa Credit Card"
- Type: Liability
- Category: Credit Cards
- Subcategory: Visa
- Opening Balance: 0.00

**Example 3: Salary (Income)**
- Name: "Monthly Salary"
- Type: Income
- Category: Salary
- Subcategory: Primary Job

**Example 4: Rent (Expense)**
- Name: "Monthly Rent"
- Type: Expense
- Category: Housing
- Subcategory: Rent

### Tips for Creating Accounts

- **Create accounts for all your financial sources and categories** before making transactions
- **Use clear, descriptive names** so you can easily identify accounts later
- **Set opening balances** for existing bank accounts and credit cards to reflect your current financial state
- **Organize by categories** to make it easier to find accounts when creating transactions

---

## Making Transactions

Once you have accounts set up, you can start recording transactions. This section provides detailed instructions for creating various types of transactions.

### Step-by-Step: Creating a Transaction

1. **Open the Transactions Screen**
   - Tap the **"Transactions"** tab at the bottom of the screen
   - You'll see a list of your existing transactions (if any)

2. **Add a New Transaction**
   - Tap the **"+"** button (usually in the top right corner)
   - Or tap **"Add Transaction"** button
   - The transaction form will open

3. **Fill in Transaction Details**
   - **Date**: 
     - Tap the date field to open the date picker
     - Select the date of the transaction (defaults to today)
     - You can select past dates or future dates (up to 1 year ahead)
   - **Amount**: 
     - Enter the transaction amount using the number pad
     - Amount is always positive (the system handles debits/credits)
     - Example: Enter "1500" for ₹1,500.00
   - **Debit Account**: 
     - Tap "Select Debit Account" to open the account picker
     - Choose the account **receiving** value (where money/value is going)
     - You can search for accounts by name
   - **Credit Account**: 
     - Tap "Select Credit Account" to open the account picker
     - Choose the account **giving** value (where money/value is coming from)
     - You can search for accounts by name
   - **Note** (optional): 
     - Add a description or memo for the transaction
     - This helps you remember what the transaction was for
     - Example: "Grocery shopping at Big Bazaar", "Salary for January 2024"

4. **Review and Save**
   - Review all the details before saving
   - Make sure the debit and credit accounts are correct
   - Tap **"Save"** or **"Create Transaction"**
   - The transaction is recorded and account balances are automatically updated
   - You'll be taken back to the transactions list

### Understanding Debit and Credit

**The Golden Rule:**
- **Debit Account** = Where the money/value is **going** (destination)
- **Credit Account** = Where the money/value is **coming from** (source)

**Think of it like this:**
- When you receive money → It goes **TO** your bank (Debit) **FROM** income source (Credit)
- When you spend money → It goes **TO** expense category (Debit) **FROM** your bank (Credit)
- When you transfer → It goes **TO** destination account (Debit) **FROM** source account (Credit)

### Comprehensive Transaction Examples

#### Income Transactions

**Example 1: Salary Received**
- **Scenario**: Your monthly salary of ₹50,000 is credited to your bank account
- **Date**: January 1, 2024
- **Amount**: 50000.00
- **Debit Account**: HDFC Savings Account (Asset) ← Money is going TO your bank
- **Credit Account**: Monthly Salary (Income) ← Money is coming FROM your salary
- **Note**: "January 2024 salary"
- **Result**: Your bank balance increases by ₹50,000

**Example 2: Freelance Income**
- **Scenario**: You received ₹15,000 for a freelance project
- **Date**: January 10, 2024
- **Amount**: 15000.00
- **Debit Account**: HDFC Savings Account (Asset)
- **Credit Account**: Freelance Income (Income)
- **Note**: "Website development project - Client ABC"
- **Result**: Your bank balance increases by ₹15,000

**Example 3: Interest Earned**
- **Scenario**: You earned ₹500 interest on your fixed deposit
- **Date**: January 15, 2024
- **Amount**: 500.00
- **Debit Account**: HDFC Savings Account (Asset)
- **Credit Account**: Interest Income (Income)
- **Note**: "FD interest for Q4 2023"
- **Result**: Your bank balance increases by ₹500

#### Expense Transactions

**Example 4: Rent Paid**
- **Scenario**: You paid ₹15,000 rent for your apartment
- **Date**: January 5, 2024
- **Amount**: 15000.00
- **Debit Account**: Monthly Rent (Expense) ← Money is going TO rent expense
- **Credit Account**: HDFC Savings Account (Asset) ← Money is coming FROM your bank
- **Note**: "January 2024 rent - Apartment 302"
- **Result**: Your bank balance decreases by ₹15,000, rent expense increases

**Example 5: Grocery Shopping**
- **Scenario**: You spent ₹3,500 on groceries
- **Date**: January 8, 2024
- **Amount**: 3500.00
- **Debit Account**: Groceries (Expense)
- **Credit Account**: HDFC Savings Account (Asset)
- **Note**: "Weekly groceries - Big Bazaar"
- **Result**: Your bank balance decreases by ₹3,500

**Example 6: Utility Bill Payment**
- **Scenario**: You paid ₹2,000 for electricity bill
- **Date**: January 12, 2024
- **Amount**: 2000.00
- **Debit Account**: Electricity (Expense)
- **Credit Account**: HDFC Savings Account (Asset)
- **Note**: "Electricity bill - January 2024"
- **Result**: Your bank balance decreases by ₹2,000

**Example 7: Restaurant Meal**
- **Scenario**: You spent ₹800 on dinner at a restaurant
- **Date**: January 20, 2024
- **Amount**: 800.00
- **Debit Account**: Restaurants (Expense)
- **Credit Account**: HDFC Savings Account (Asset)
- **Note**: "Dinner at Olive Garden"
- **Result**: Your bank balance decreases by ₹800

#### Credit Card Transactions

**Example 8: Credit Card Purchase**
- **Scenario**: You bought a laptop for ₹60,000 using your credit card
- **Date**: January 18, 2024
- **Amount**: 60000.00
- **Debit Account**: Electronics (Expense) ← Money going TO expense
- **Credit Account**: SBI Credit Card (Liability) ← Money coming FROM credit (you owe more)
- **Note**: "MacBook Pro purchase"
- **Result**: Your credit card debt increases by ₹60,000

**Example 9: Credit Card Payment**
- **Scenario**: You paid ₹25,000 towards your credit card bill
- **Date**: January 25, 2024
- **Amount**: 25000.00
- **Debit Account**: SBI Credit Card (Liability) ← Reducing your debt
- **Credit Account**: HDFC Savings Account (Asset) ← Money coming FROM your bank
- **Note**: "Credit card bill payment - January"
- **Result**: Your credit card debt decreases by ₹25,000, bank balance decreases

#### Transfer Transactions

**Example 10: Transfer to Savings**
- **Scenario**: You transferred ₹10,000 from checking to savings account
- **Date**: January 15, 2024
- **Amount**: 10000.00
- **Debit Account**: HDFC Savings Account (Asset) ← Money going TO savings
- **Credit Account**: HDFC Current Account (Asset) ← Money coming FROM checking
- **Note**: "Monthly savings transfer"
- **Result**: Savings balance increases, checking balance decreases (net worth unchanged)

**Example 11: Transfer Between Banks**
- **Scenario**: You transferred ₹5,000 from HDFC to ICICI bank
- **Date**: January 22, 2024
- **Amount**: 5000.00
- **Debit Account**: ICICI Savings Account (Asset)
- **Credit Account**: HDFC Savings Account (Asset)
- **Note**: "Transfer to ICICI for investment"
- **Result**: ICICI balance increases, HDFC balance decreases

#### Loan Transactions

**Example 12: Taking a Loan**
- **Scenario**: You took a personal loan of ₹2,00,000
- **Date**: January 1, 2024
- **Amount**: 200000.00
- **Debit Account**: HDFC Savings Account (Asset) ← Money coming TO you
- **Credit Account**: Personal Loan (Liability) ← Money coming FROM loan (you owe it)
- **Note**: "Personal loan from HDFC Bank"
- **Result**: Bank balance increases, loan liability increases

**Example 13: Loan EMI Payment**
- **Scenario**: You paid ₹15,000 as EMI for your home loan
- **Date**: January 5, 2024
- **Amount**: 15000.00
- **Debit Account**: Home Loan (Liability) ← Reducing your loan
- **Credit Account**: HDFC Savings Account (Asset) ← Money coming FROM bank
- **Note**: "Home loan EMI - January 2024"
- **Result**: Loan balance decreases, bank balance decreases

#### Investment Transactions

**Example 14: Buying Stocks**
- **Scenario**: You invested ₹50,000 in stocks
- **Date**: January 10, 2024
- **Amount**: 50000.00
- **Debit Account**: Stocks Investment (Asset) ← Money going TO investment
- **Credit Account**: HDFC Savings Account (Asset) ← Money coming FROM bank
- **Note**: "Stock purchase - Reliance Industries"
- **Result**: Investment value increases, bank balance decreases

**Example 15: Investment Returns**
- **Scenario**: You received ₹5,000 dividend from your investments
- **Date**: January 20, 2024
- **Amount**: 5000.00
- **Debit Account**: HDFC Savings Account (Asset)
- **Credit Account**: Dividends (Income)
- **Note**: "Dividend from mutual funds"
- **Result**: Bank balance increases

#### Refund and Return Transactions

**Example 16: Product Return/Refund**
- **Scenario**: You returned a product and got ₹3,000 refund
- **Date**: January 25, 2024
- **Amount**: 3000.00
- **Debit Account**: HDFC Savings Account (Asset) ← Money coming TO you
- **Credit Account**: Shopping (Expense) ← Reversing the expense
- **Note**: "Refund for returned product"
- **Result**: Bank balance increases, expense decreases (net effect: cancels original purchase)

### Transaction Type Quick Reference

| Transaction Type | Debit Account | Credit Account | When to Use |
|----------------|---------------|----------------|-------------|
| **Income Received** | Asset (Bank) | Income | Salary, freelance, interest, dividends |
| **Expense Paid** | Expense | Asset (Bank) | Rent, groceries, bills, shopping |
| **Credit Card Purchase** | Expense | Liability (Credit Card) | Buying something with credit card |
| **Credit Card Payment** | Liability (Credit Card) | Asset (Bank) | Paying credit card bill |
| **Transfer** | Asset (Destination) | Asset (Source) | Moving money between accounts |
| **Loan Taken** | Asset (Bank) | Liability (Loan) | Receiving loan money |
| **Loan Payment** | Liability (Loan) | Asset (Bank) | Paying loan EMI |
| **Investment Made** | Asset (Investment) | Asset (Bank) | Buying stocks, mutual funds |
| **Refund Received** | Asset (Bank) | Expense | Getting money back from purchase |

### Common Transaction Patterns

**Pattern 1: Daily Expenses**
- Debit: Specific expense category (Groceries, Restaurants, etc.)
- Credit: Your bank account or cash
- Use this for: Food, shopping, entertainment, utilities

**Pattern 2: Monthly Bills**
- Debit: Bill category (Rent, Electricity, Internet, etc.)
- Credit: Your bank account
- Use this for: Recurring monthly expenses

**Pattern 3: Income**
- Debit: Your bank account
- Credit: Income source (Salary, Freelance, etc.)
- Use this for: All money you receive

**Pattern 4: Credit Card Usage**
- Debit: Expense category
- Credit: Credit card account
- Use this for: Purchases made with credit card

**Pattern 5: Credit Card Payment**
- Debit: Credit card account
- Credit: Your bank account
- Use this for: Paying your credit card bill

**Pattern 6: Savings/Investment**
- Debit: Investment account or savings account
- Credit: Your checking/current account
- Use this for: Moving money to savings or investments

### Tips for Creating Transactions

1. **Think Before You Enter**
   - Ask yourself: "Where is the money going?" (Debit)
   - Ask yourself: "Where is the money coming from?" (Credit)

2. **Use Descriptive Notes**
   - Always add notes to remember the context
   - Include vendor names, purpose, or reference numbers
   - Example: "Amazon purchase - Electronics", "Salary - January 2024"

3. **Enter Transactions Promptly**
   - Record transactions as soon as possible
   - Don't wait days or weeks - you might forget details
   - Set a daily or weekly reminder to update transactions

4. **Double-Check Before Saving**
   - Verify the amount is correct
   - Ensure debit and credit accounts are correct
   - Check the date is accurate
   - Review the note for clarity

5. **Use Consistent Account Names**
   - Use the same account names consistently
   - This makes it easier to find accounts when creating transactions
   - Example: Always use "HDFC Savings" not "HDFC Bank" or "Savings HDFC"

6. **Categorize Expenses Properly**
   - Use specific expense categories for better reporting
   - Example: Use "Groceries" not "Food" for grocery shopping
   - Use "Restaurants" for dining out, not "Food"

7. **Handle Credit Cards Correctly**
   - When buying with credit card: Debit = Expense, Credit = Credit Card
   - When paying credit card: Debit = Credit Card, Credit = Bank Account
   - Don't mix these up!

8. **Review Balances After Transactions**
   - Check that account balances updated correctly
   - Verify your net worth makes sense
   - If something looks wrong, review the transaction

### Editing and Deleting Transactions

**To Edit a Transaction:**
1. Go to the Transactions screen
2. Tap on the transaction you want to edit
3. Tap "Edit" button
4. Make your changes
5. Tap "Save"

**To Delete a Transaction:**
1. Go to the Transactions screen
2. Tap on the transaction you want to delete
3. Tap "Delete" button
4. Confirm the deletion
5. The transaction is removed and balances are automatically adjusted

**Important Notes:**
- Editing or deleting a transaction will automatically update account balances
- Be careful when deleting transactions - this action cannot be undone
- If you delete a transaction by mistake, you'll need to recreate it manually

---

## Viewing Transactions

### All Transactions View

1. **Access Transactions Screen**
   - Tap the **"Transactions"** tab at the bottom of the screen
   - You'll see a chronological list of all your transactions

2. **Transaction List Features**
   - **Chronological Order**: Transactions are listed by date (newest first by default)
   - **Transaction Details**: Each transaction shows:
     - Date
     - Amount
     - Debit and Credit accounts
     - Note (if provided)
   - **Color Coding**: Transactions may be color-coded by account type

3. **Filtering and Searching**
   - **Search Bar**: Use the search bar at the top to find specific transactions
   - **Filter by Month**: Tap the month selector to view transactions for a specific month
   - **Filter by Year**: Select a year to view transactions for that year

4. **View Transaction Details**
   - Tap on any transaction to see full details
   - You can edit or delete transactions from the detail screen

5. **Transaction Actions**
   - **Edit**: Tap a transaction to edit its details
   - **Delete**: Delete transactions from the detail screen (balances will be automatically adjusted)

### Understanding the Transaction List

- **Date**: When the transaction occurred
- **Amount**: The transaction amount (always displayed as positive)
- **From/To**: Shows which accounts were involved
- **Balance Impact**: For asset/liability accounts, balances are automatically updated

---

## Viewing Summary and Reports

### Dashboard Overview

The **Dashboard** provides a quick financial overview:

1. **Access Dashboard**
   - Tap the **"Dashboard"** tab at the bottom of the screen
   - You'll see your financial summary at a glance

2. **Dashboard Information**
   - **Total Assets**: Sum of all your asset accounts (what you own)
   - **Total Liabilities**: Sum of all your liability accounts (what you owe)
   - **Net Worth**: Assets minus Liabilities (your overall financial position)
   - **Account Balances**: Quick view of your account balances

3. **Quick Actions**
   - From the dashboard, you can quickly:
     - Add a new transaction
     - View account details
     - Navigate to other screens

### Reports and Analytics

1. **Access Reports**
   - Tap the **"Reports"** tab at the bottom of the screen
   - You'll see various report options

2. **Available Reports**
   - **Summary Reports**: Overview of income, expenses, and balances
   - **Month-wise Reports**: View transactions and summaries by month
   - **Custom Date Range**: View reports for any date range
   - **Account Reports**: Detailed reports for specific accounts

3. **Report Types**
   - **Summary Month Wise**: Monthly overview of your finances
   - **Summary Custom Range**: Custom date range summary
   - **Transactions Month Wise**: All transactions for a specific month
   - **Transactions Custom Range**: All transactions for a custom date range

4. **Using Reports**
   - Select the report type you want to view
   - Choose a month or date range
   - View detailed breakdowns of:
     - Income vs Expenses
     - Account balances
     - Transaction categories
     - Trends over time

### Understanding Your Financial Summary

- **Assets**: Everything you own (positive value)
- **Liabilities**: Everything you owe (negative value)
- **Net Worth**: Your true financial position (Assets - Liabilities)
- **Income**: Money coming in
- **Expenses**: Money going out
- **Balance**: Current amount in each account

### Tips for Using Reports

- **Review regularly** to understand your spending patterns
- **Use month-wise reports** to track monthly trends
- **Compare periods** to see how your finances change over time
- **Export data** (if available) for external analysis

---

## PIN Authentication

### What is PIN Authentication?

PIN authentication is a security feature that requires you to enter a 4-6 digit PIN code every time you open the app. This ensures that only you can access your financial data.

### How PIN Authentication Works

1. **On App Launch**
   - When you open the app, you'll see the PIN verification screen
   - If biometric authentication is enabled, it will be attempted first automatically
   - If biometric fails or is not available, you'll be prompted to enter your PIN

2. **Entering Your PIN**
   - Enter your 4-6 digit PIN using the on-screen keypad
   - Tap "Continue" to verify your PIN
   - If correct, you'll be taken to the main app screen
   - If you've forgotten your PIN, tap **"Forgot PIN?"** below the Continue button to log out and set up a new PIN

3. **PIN Requirements**
   - PIN must be 4-6 digits long
   - Only numeric digits (0-9) are allowed
   - Choose a PIN that's easy for you to remember but hard for others to guess

### Important Notes

- **New PIN on Every Login**: For security, you'll need to set up a new PIN every time you log in with your email and password. Your previous PIN will be cleared.
- **PIN Persistence**: Once you set up a PIN, it remains active until you log out or set up a new one after logging in again.
- **Cannot Skip**: PIN setup cannot be skipped - it's required for app security.

---

## Biometric Authentication

### What is Biometric Authentication?

Biometric authentication uses your device's built-in security features (Face ID, Touch ID, or Fingerprint) to verify your identity instead of entering a PIN.

### Supported Biometric Methods

- **Face ID** (iPhone X and later)
- **Touch ID** (iPhone 6s to iPhone 8, iPad with Touch ID)
- **Fingerprint** (Android devices with fingerprint sensors)

### Enabling Biometric Authentication

1. **During PIN Setup**
   - After setting up your PIN, if your device supports biometrics, you'll see an option to enable it
   - Tap "Enable Biometric Authentication"
   - Follow your device's prompts to complete the setup

2. **From Settings**
   - Go to Settings in the app
   - Navigate to "Security" or "PIN Settings"
   - Toggle on "Biometric Authentication"
   - Follow the on-screen prompts

### How Biometric Authentication Works

1. **Automatic Attempt**
   - When you open the app, biometric authentication is attempted first automatically
   - You'll see a loading indicator while the system processes your biometric
   - If successful, you'll be taken directly to the main app screen

2. **Fallback to PIN**
   - If biometric authentication fails or is cancelled, you can use your PIN instead
   - The PIN input screen will appear automatically
   - You can also tap "Use [Biometric Type] instead" to try biometric again

### Disabling Biometric Authentication

1. Go to Settings in the app
2. Navigate to "Security" or "PIN Settings"
3. Toggle off "Biometric Authentication"
4. You'll now need to use your PIN for authentication

---

## Security Features

### Automatic Logout After Failed Attempts

For your security, the app will automatically log you out if you enter an incorrect PIN 5 times in a row.

**What Happens:**
- After 5 failed PIN attempts, you'll see an alert message
- You'll be automatically logged out of your account
- Your PIN will be cleared
- You'll need to log in again with your email and password
- You'll need to set up a new PIN after logging in

**Why This Feature Exists:**
- Protects your account from unauthorized access attempts
- Ensures your financial data remains secure
- Prevents brute-force attacks on your PIN

### Attempt Counter

- The app shows you how many attempts you have remaining
- After each failed attempt, the counter decreases
- Example: "4 attempts remaining", "3 attempts remaining", etc.
- The counter resets only after successful verification or logout

### Back Button Protection

- On the PIN setup and verification screens, the back button is disabled
- This prevents accidentally skipping security steps
- You must complete PIN setup or verification to proceed

---

## Managing Your PIN

### Changing Your PIN

1. Go to Settings in the app
2. Navigate to "Security" or "PIN Settings"
3. Tap "Change PIN"
4. Enter your current PIN to verify
5. Enter your new PIN (4-6 digits)
6. Confirm your new PIN
7. Your PIN has been successfully changed

### Resetting Your PIN

If you've forgotten your PIN, you have several options:

1. **Use "Forgot PIN?" Option (Recommended)**
   - On the PIN verification screen, tap **"Forgot PIN?"** link below the Continue button
   - Confirm that you want to log out
   - You'll be logged out and taken to the login screen
   - Log in again with your email and password
   - You'll be prompted to set up a new PIN

2. **Log Out from Settings**
   - Go to Settings (if you're already logged in)
   - Tap "Sign Out"
   - Log in again with your email and password
   - You'll be prompted to set up a new PIN

3. **After 5 Failed Attempts**
   - If you enter the wrong PIN 5 times, you'll be automatically logged out
   - Log in again and set up a new PIN

**Note:** Your PIN is stored securely on your device. If you can't remember it, logging out and back in will allow you to set a new one.

---

## Troubleshooting

### Biometric Authentication Not Working

**Problem:** Biometric authentication isn't working or not available.

**Solutions:**
1. **Check Device Support**
   - Ensure your device supports biometric authentication
   - Check if Face ID/Touch ID/Fingerprint is set up in your device settings

2. **Enable in Device Settings**
   - Go to your device's Settings
   - Set up Face ID, Touch ID, or Fingerprint if not already done
   - Return to the app and try again

3. **Use PIN Instead**
   - If biometric continues to fail, use your PIN to access the app
   - You can try enabling biometric again later from Settings

### PIN Not Working

**Problem:** Your PIN isn't being accepted even though you're sure it's correct.

**Solutions:**
1. **Check for Typos**
   - Make sure you're entering the correct PIN
   - Double-check each digit as you type

2. **Recent Login**
   - If you recently logged in, remember that a new PIN is required
   - Your old PIN was cleared when you logged in

3. **Log Out and Set New PIN**
   - If you're certain about your PIN but it's not working, log out
   - Log back in and set up a new PIN

### App Asking for PIN Setup Again

**Problem:** The app keeps asking you to set up a PIN even though you already did.

**Possible Causes:**
1. **You Logged Out**
   - If you signed out, your PIN was cleared for security
   - This is normal behavior - set up a new PIN after logging in

2. **App Restart**
   - If you killed the app and reopened it, your PIN should still work
   - If it's asking for setup, you may have been logged out

3. **After 5 Failed Attempts**
   - If you entered the wrong PIN 5 times, you were logged out
   - Log back in and set up a new PIN

### Can't Access App

**Problem:** You're locked out of the app.

**Solutions:**
1. **Try Your PIN**
   - Make sure you're entering the correct PIN
   - Check the attempt counter to see how many tries you have left

2. **Wait After Failed Attempts**
   - If you've had multiple failed attempts, wait a moment before trying again
   - The app may need a moment to process

3. **Log Out and Log Back In**
   - If you're completely locked out, you may need to log out
   - However, you'll need to enter your PIN correctly first, or wait for automatic logout after 5 failed attempts
   - Then log back in with your email and password

---

## FAQs

### Q: Why do I need to set up a PIN every time I log in?

**A:** This is a security feature. When you log in with your email and password, your previous PIN is cleared for security reasons. You'll need to set up a new PIN each time you log in. However, if you just close and reopen the app (without logging out), your PIN will still work.

### Q: Can I use the same PIN every time?

**A:** Yes, you can choose to use the same PIN each time you set it up. The app doesn't remember your previous PIN, but you can manually enter the same PIN when setting it up again.

### Q: What happens if I forget my PIN?

**A:** If you forget your PIN, you can use the "Forgot PIN?" option on the PIN verification screen:
1. On the PIN verification screen, tap **"Forgot PIN?"** link below the Continue button
2. Confirm that you want to log out
3. You'll be logged out and taken to the login screen
4. Log back in with your email and password
5. Set up a new PIN when prompted

**Alternative methods:**
- Enter the wrong PIN 5 times to trigger automatic logout, then log back in and set a new PIN
- If you're already logged in, go to Settings and sign out, then log back in to set a new PIN

### Q: Can I disable PIN authentication?

**A:** No, PIN authentication is required for security. It cannot be disabled. This ensures your financial data is always protected.

### Q: Why is biometric authentication attempted first?

**A:** Biometric authentication is faster and more convenient than entering a PIN. The app tries it first automatically. If it fails or is not available, you can use your PIN instead.

### Q: What if my device doesn't support biometrics?

**A:** That's perfectly fine! You can still use the app with PIN authentication. Biometric authentication is optional and only available on devices that support it.

### Q: Is my PIN stored securely?

**A:** Yes, your PIN is stored securely on your device using encrypted storage. It's never transmitted over the network or stored on servers.

### Q: Can someone else access my app if they have my device?

**A:** No, they would need either:
- Your biometric (Face ID, Touch ID, or Fingerprint), OR
- Your PIN code

Without one of these, they cannot access the app, even if they have your device.

### Q: What happens if I uninstall the app?

**A:** If you uninstall the app, all local data including your PIN will be deleted. When you reinstall and log in, you'll need to set up a new PIN.

### Q: Can I use the app offline?

**A:** Yes, the app works offline. However, you'll still need to verify your PIN or use biometric authentication to access the app, even when offline.

---

## Best Practices

### Choosing a Secure PIN

1. **Don't Use Obvious Numbers**
   - Avoid: 1234, 0000, 1111, your birth year, etc.
   - Use a combination that's meaningful to you but not obvious to others

2. **Don't Share Your PIN**
   - Never share your PIN with anyone
   - Don't write it down where others can see it

3. **Change It Regularly**
   - Consider changing your PIN periodically for added security
   - You can do this from Settings

### Using Biometric Authentication

1. **Keep It Enabled**
   - Biometric authentication is more convenient than PIN
   - It's also secure and fast

2. **Have a Backup Plan**
   - Remember your PIN in case biometric fails
   - Your device's biometric might not work if your hands are wet, you're wearing a mask, etc.

3. **Device Security**
   - Make sure your device's biometric settings are secure
   - Don't allow others to register their biometrics on your device

---

## Support

If you continue to experience issues with PIN or biometric authentication:

1. Check this manual for troubleshooting steps
2. Ensure your app is updated to the latest version
3. Restart your device and try again
4. Contact support if problems persist

---

**Last Updated:** 2024
**App Version:** 1.0.0
