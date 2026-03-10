# SMS-Based Automatic Transaction Detection

## Overview

This feature automatically detects bank transactions from SMS messages and creates transaction entries in the app. It processes SMS locally on the device and only uploads structured transaction data to Firestore.

## Architecture

### Modular Design

The implementation follows clean architecture principles with separate modules:

1. **`transactionParser.ts`** - Parses SMS text to extract transaction data
2. **`smsService.ts`** - Reads SMS from Android inbox
3. **`firebaseService.ts`** - Stores transactions in Firestore with duplicate detection
4. **`smsAutoTransactionService.ts`** - Main orchestrator service

### Security & Privacy

- ✅ **Local Processing**: All SMS parsing happens on device
- ✅ **No Raw SMS Upload**: Only parsed transaction data is sent to Firestore
- ✅ **Duplicate Detection**: Prevents re-processing same SMS
- ✅ **Google Play Compliant**: Follows SMS policy for financial apps

## Setup

### 1. Android Permissions

The `READ_SMS` permission is already added to `AndroidManifest.xml`:

```xml
<uses-permission android:name="android.permission.READ_SMS"/>
```

### 2. Runtime Permission

The app requests `READ_SMS` permission at runtime (Android 6+). Users must explicitly grant this permission.

### 3. Firestore Collection

A new collection `processed_sms` is used to track processed SMS and prevent duplicates. Add this to your Firestore security rules:

```javascript
match /processed_sms/{document} {
  allow read, write: if request.auth != null && request.auth.uid == resource.data.userId;
}
```

## Usage

### Basic Usage

```typescript
import { autoDetectTransactions } from '../services/smsAutoTransactionService';

// Process recent SMS and create transactions
const result = await autoDetectTransactions({
  limit: 50, // Process last 50 SMS
});

console.log(`Processed: ${result.processedCount}`);
console.log(`Skipped: ${result.skippedCount}`);
console.log(`Errors: ${result.errorCount}`);
```

### With Custom Account Mapping

```typescript
import { autoDetectTransactions } from '../services/smsAutoTransactionService';

const result = await autoDetectTransactions({
  limit: 50,
  // For debit transactions: Expense account
  defaultDebitAccountId: 'expense_account_id',
  // For credit transactions: Income account
  defaultCreditAccountId: 'income_account_id',
  // Bank account (asset) - used for both debit and credit
  // Will use first asset account if not specified
});
```

### Process SMS Since Timestamp

```typescript
import { processSmsSince } from '../services/smsAutoTransactionService';

// Process SMS received in last 24 hours
const sinceTimestamp = Date.now() - (24 * 60 * 60 * 1000);
const result = await processSmsSince(sinceTimestamp);
```

### Process SMS from Specific Bank

```typescript
import { processSmsFromBank } from '../services/smsAutoTransactionService';

// Process only HDFC Bank SMS
const result = await processSmsFromBank('HDFCBK', {
  limit: 20,
});
```

## Supported Banks

The parser recognizes SMS from these Indian banks:

- AXISBANK (Axis Bank)
- HDFCBK (HDFC Bank)
- ICICIB (ICICI Bank)
- SBIINB (State Bank of India)
- KOTAKB (Kotak Mahindra Bank)
- PNBSMS (Punjab National Bank)
- BOISMS (Bank of India)
- UNIBAN (Union Bank)
- CANBNK (Canara Bank)
- IDFCFB (IDFC First Bank)
- YESBNK (Yes Bank)
- And more...

## Transaction Parsing

The parser extracts:

- **Amount**: INR amounts with comma support (e.g., "₹1,234.56")
- **Type**: Debit or Credit (based on keywords)
- **Date**: Multiple date formats supported
- **Merchant**: Extracted from "at MERCHANT" patterns
- **Account Last 4**: Last 4 digits of account number
- **Balance**: Available balance (if present)

### Example SMS Formats

```
Debit: "INR 1,234.56 debited from A/c *1234 on 12-Jan-2024 at MERCHANT NAME. Bal: INR 50,000.00"
Credit: "INR 5,000.00 credited to A/c *5678 on 15-Jan-2024. Bal: INR 55,000.00"
```

## Duplicate Detection

Each SMS is hashed and stored in Firestore. Before processing, the system checks if the SMS was already processed:

```typescript
// Hash is generated from SMS body
const hash = hashSmsBody(smsBody);

// Check if processed
const isProcessed = await isSmsProcessed(hash, userId);

// Mark as processed after successful transaction creation
await markSmsAsProcessed(hash, userId, transactionId);
```

## Account Mapping

### Debit Transactions

- **Debit Account**: Expense account (e.g., "Groceries", "Restaurants")
- **Credit Account**: Bank account (asset)

Example: Payment at restaurant
- Debit: "Food & Dining > Restaurants"
- Credit: "Cash & Bank > Savings Account"

### Credit Transactions

- **Debit Account**: Bank account (asset)
- **Credit Account**: Income account (e.g., "Salary", "Interest")

Example: Salary received
- Debit: "Cash & Bank > Savings Account"
- Credit: "Earned Income > Salary"

## Error Handling

The service handles errors gracefully:

```typescript
const result = await autoDetectTransactions();

if (!result.success) {
  console.error('Errors:', result.errors);
} else {
  console.log(`Successfully processed ${result.processedCount} transactions`);
  console.log(`Skipped ${result.skippedCount} SMS (not bank transactions or duplicates)`);
}
```

## Google Play Compliance

### Privacy Policy

Your privacy policy must include:

1. **Purpose**: Explain that SMS is read to automatically detect bank transactions
2. **Data**: Clarify that only parsed transaction data is uploaded, not raw SMS
3. **Permission**: Explain why READ_SMS permission is needed
4. **User Control**: Users can revoke permission anytime

### Play Console Declaration

When submitting to Google Play, declare:

- **SMS Permission**: Used for automatic transaction detection
- **Category**: Financial app
- **Data Handling**: Only structured transaction data uploaded

## Performance Optimization

- Processes SMS in batches (default: 50)
- Duplicate check uses Firestore document lookup (fast)
- Parsing happens locally (no network calls)
- Only processes bank SMS (filtered by sender ID)

## Troubleshooting

### Permission Not Granted

```typescript
import { checkSmsPermission, requestSmsPermission } from '../services/smsService';

// Check permission
const hasPermission = await checkSmsPermission();
if (!hasPermission) {
  // Request permission
  const granted = await requestSmsPermission();
  if (!granted) {
    // Show error to user
  }
}
```

### No Transactions Created

1. Check if SMS is from supported bank
2. Verify SMS contains amount and transaction keywords
3. Ensure user has at least one asset account (for bank account)
4. Ensure user has expense/income accounts based on transaction type

### Duplicate Transactions

The duplicate detection uses SMS hash. If you see duplicates:

1. Check Firestore `processed_sms` collection
2. Verify hash generation is consistent
3. Check if SMS body changed (different hash = different transaction)

## Testing

### Test with Sample SMS

```typescript
import { parseTransaction } from '../services/transactionParser';

const testSms = "INR 1,234.56 debited from A/c *1234 on 12-Jan-2024 at AMAZON. Bal: INR 50,000.00";
const parsed = parseTransaction(testSms, 'AXISBANK');

console.log('Amount:', parsed?.amount); // 1234.56
console.log('Type:', parsed?.type); // 'debit'
console.log('Merchant:', parsed?.merchant); // 'AMAZON'
console.log('Account:', parsed?.accountLast4); // '1234'
```

## Future Enhancements

- [ ] Support for more bank formats
- [ ] Machine learning for better merchant extraction
- [ ] Automatic category assignment based on merchant
- [ ] Support for multiple bank accounts
- [ ] Background processing with notifications
