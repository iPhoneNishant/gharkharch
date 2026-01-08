"use strict";
/**
 * Firebase Cloud Functions for Gharkharch
 *
 * DOUBLE-ENTRY ACCOUNTING RULES:
 * - Every transaction has exactly ONE debit account and ONE credit account
 * - Income and Expense accounts NEVER store balances
 * - Asset and Liability accounts ALWAYS store balances
 *
 * Balance updates:
 * - Asset accounts: Debit increases balance, Credit decreases balance
 * - Liability accounts: Credit increases balance, Debit decreases balance
 * - Income/Expense accounts: No balance updates (they're just categories)
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteTransaction = exports.updateTransaction = exports.createTransaction = exports.deleteAccount = exports.updateAccount = exports.createAccount = void 0;
const admin = __importStar(require("firebase-admin"));
const https_1 = require("firebase-functions/v2/https");
// Initialize Firebase Admin
admin.initializeApp();
const db = admin.firestore();
// Helper functions
/**
 * Check if an account type stores a balance
 */
function hasBalance(accountType) {
    return accountType === 'asset' || accountType === 'liability';
}
/**
 * Calculate balance change for an account based on debit/credit
 *
 * ACCOUNTING RULES:
 * - Asset accounts: Debit (+), Credit (-)
 * - Liability accounts: Debit (-), Credit (+)
 */
function calculateBalanceChange(accountType, amount, isDebit) {
    if (!hasBalance(accountType)) {
        return 0;
    }
    if (accountType === 'asset') {
        return isDebit ? amount : -amount;
    }
    else {
        // Liability
        return isDebit ? -amount : amount;
    }
}
/**
 * Verify the user is authenticated
 * Note: This is now handled inline in each function for React Native compatibility
 * @deprecated Use manual token verification instead
 */
// function requireAuth(request: CallableRequest): string {
//   if (!request.auth) {
//     throw new HttpsError('unauthenticated', 'User must be authenticated');
//   }
//   return request.auth.uid;
// }
/**
 * Validate account type
 */
function validateAccountType(type) {
    const validTypes = ['asset', 'liability', 'income', 'expense'];
    if (!validTypes.includes(type)) {
        throw new https_1.HttpsError('invalid-argument', `Invalid account type: ${type}`);
    }
    return type;
}
// Cloud Functions
/**
 * Create a new account
 *
 * Note: Cloud Functions v2 callable functions automatically handle authentication
 * The auth token is passed from the client and available in request.auth
 */
exports.createAccount = (0, https_1.onCall)({
    // Ensure CORS is enabled
    cors: true,
    // Temporarily allow unauthenticated calls as workaround for React Native
    // We'll verify the token manually from the request data
    enforceAppCheck: false,
}, async (request) => {
    // Workaround for React Native: manually verify token if passed in data
    let userId;
    if (request.auth) {
        // Normal path: auth token was passed correctly
        userId = request.auth.uid;
    }
    else if (request.data.idToken) {
        // React Native workaround: verify token manually
        try {
            const decodedToken = await admin.auth().verifyIdToken(request.data.idToken);
            userId = decodedToken.uid;
        }
        catch (error) {
            throw new https_1.HttpsError('unauthenticated', 'Invalid authentication token');
        }
    }
    else {
        throw new https_1.HttpsError('unauthenticated', 'User must be authenticated');
    }
    // Remove idToken from data before processing (it was only for auth verification)
    const { idToken, ...data } = request.data;
    // Validate required fields
    if (!data.name?.trim()) {
        throw new https_1.HttpsError('invalid-argument', 'Account name is required');
    }
    if (!data.parentCategory?.trim()) {
        throw new https_1.HttpsError('invalid-argument', 'Parent category is required');
    }
    if (!data.subCategory?.trim()) {
        throw new https_1.HttpsError('invalid-argument', 'Sub-category is required');
    }
    const accountType = validateAccountType(data.accountType);
    // Validate opening balance for asset/liability accounts
    let openingBalance;
    if (hasBalance(accountType)) {
        openingBalance = data.openingBalance ?? 0;
        if (openingBalance < 0) {
            throw new https_1.HttpsError('invalid-argument', 'Opening balance cannot be negative');
        }
    }
    // Create the account
    const accountRef = db.collection('accounts').doc();
    const now = admin.firestore.Timestamp.now();
    // Build account object, only including defined values (Firestore doesn't allow undefined)
    const account = {
        name: data.name.trim(),
        accountType,
        parentCategory: data.parentCategory.trim(),
        subCategory: data.subCategory.trim(),
        userId,
        createdAt: now,
        updatedAt: now,
        isActive: true,
    };
    // Only include balance fields for asset/liability accounts (Firestore doesn't allow undefined)
    if (hasBalance(accountType)) {
        account.openingBalance = openingBalance ?? 0;
        account.currentBalance = openingBalance ?? 0;
    }
    // Only add optional fields if they're defined
    if (data.icon && data.icon.trim() !== '') {
        account.icon = data.icon.trim();
    }
    if (data.color && data.color.trim() !== '') {
        account.color = data.color.trim();
    }
    await accountRef.set(account);
    return {
        success: true,
        data: { accountId: accountRef.id },
    };
});
/**
 * Update an existing account
 * Note: Cannot change account type or categories after creation
 */
exports.updateAccount = (0, https_1.onCall)({
    cors: true,
    enforceAppCheck: false,
}, async (request) => {
    // Workaround for React Native: manually verify token if passed in data
    let userId;
    if (request.auth) {
        userId = request.auth.uid;
    }
    else if (request.data.idToken) {
        try {
            const decodedToken = await admin.auth().verifyIdToken(request.data.idToken);
            userId = decodedToken.uid;
        }
        catch (error) {
            throw new https_1.HttpsError('unauthenticated', 'Invalid authentication token');
        }
    }
    else {
        throw new https_1.HttpsError('unauthenticated', 'User must be authenticated');
    }
    // Remove idToken from data (idToken was only for auth verification)
    const { idToken: _, ...data } = request.data;
    if (!data.accountId) {
        throw new https_1.HttpsError('invalid-argument', 'Account ID is required');
    }
    // Get the account
    const accountRef = db.collection('accounts').doc(data.accountId);
    const accountDoc = await accountRef.get();
    if (!accountDoc.exists) {
        throw new https_1.HttpsError('not-found', 'Account not found');
    }
    const account = accountDoc.data();
    // Verify ownership
    if (account.userId !== userId) {
        throw new https_1.HttpsError('permission-denied', 'You do not own this account');
    }
    // Build update object
    const updates = {
        updatedAt: admin.firestore.Timestamp.now(),
    };
    if (data.name !== undefined) {
        if (!data.name.trim()) {
            throw new https_1.HttpsError('invalid-argument', 'Account name cannot be empty');
        }
        updates.name = data.name.trim();
    }
    // Only include icon/color if they have values (not undefined or empty)
    if (data.icon !== undefined && data.icon !== null && data.icon !== '') {
        updates.icon = data.icon;
    }
    if (data.color !== undefined && data.color !== null && data.color !== '') {
        updates.color = data.color;
    }
    if (data.isActive !== undefined) {
        updates.isActive = data.isActive;
    }
    await accountRef.update(updates);
    return { success: true };
});
/**
 * Delete (deactivate) an account
 * Accounts are soft-deleted to preserve transaction history
 */
exports.deleteAccount = (0, https_1.onCall)({
    cors: true,
    enforceAppCheck: false,
}, async (request) => {
    // Workaround for React Native: manually verify token if passed in data
    let userId;
    if (request.auth) {
        userId = request.auth.uid;
    }
    else if (request.data.idToken) {
        try {
            const decodedToken = await admin.auth().verifyIdToken(request.data.idToken);
            userId = decodedToken.uid;
        }
        catch (error) {
            throw new https_1.HttpsError('unauthenticated', 'Invalid authentication token');
        }
    }
    else {
        throw new https_1.HttpsError('unauthenticated', 'User must be authenticated');
    }
    const { idToken: _, accountId } = request.data;
    if (!accountId) {
        throw new https_1.HttpsError('invalid-argument', 'Account ID is required');
    }
    // Get the account
    const accountRef = db.collection('accounts').doc(accountId);
    const accountDoc = await accountRef.get();
    if (!accountDoc.exists) {
        throw new https_1.HttpsError('not-found', 'Account not found');
    }
    const account = accountDoc.data();
    // Verify ownership
    if (account.userId !== userId) {
        throw new https_1.HttpsError('permission-denied', 'You do not own this account');
    }
    // Soft delete
    await accountRef.update({
        isActive: false,
        updatedAt: admin.firestore.Timestamp.now(),
    });
    return { success: true };
});
/**
 * Create a new transaction
 *
 * DOUBLE-ENTRY RULE:
 * - Validates both accounts exist and belong to user
 * - Updates balances for asset/liability accounts
 */
exports.createTransaction = (0, https_1.onCall)({
    cors: true,
    enforceAppCheck: false,
}, async (request) => {
    // Workaround for React Native: manually verify token if passed in data
    let userId;
    if (request.auth) {
        userId = request.auth.uid;
    }
    else if (request.data.idToken) {
        try {
            const decodedToken = await admin.auth().verifyIdToken(request.data.idToken);
            userId = decodedToken.uid;
        }
        catch (error) {
            throw new https_1.HttpsError('unauthenticated', 'Invalid authentication token');
        }
    }
    else {
        throw new https_1.HttpsError('unauthenticated', 'User must be authenticated');
    }
    // Remove idToken from data (idToken was only for auth verification)
    const { idToken: _, ...data } = request.data;
    // Validate required fields
    if (!data.date) {
        throw new https_1.HttpsError('invalid-argument', 'Transaction date is required');
    }
    if (!data.amount || data.amount <= 0) {
        throw new https_1.HttpsError('invalid-argument', 'Amount must be a positive number');
    }
    if (!data.debitAccountId) {
        throw new https_1.HttpsError('invalid-argument', 'Debit account is required');
    }
    if (!data.creditAccountId) {
        throw new https_1.HttpsError('invalid-argument', 'Credit account is required');
    }
    if (data.debitAccountId === data.creditAccountId) {
        throw new https_1.HttpsError('invalid-argument', 'Debit and credit accounts must be different');
    }
    // Parse and validate date
    if (!data.date || data.date.trim() === '') {
        throw new https_1.HttpsError('invalid-argument', 'Transaction date is required');
    }
    const transactionDate = new Date(data.date);
    if (isNaN(transactionDate.getTime())) {
        throw new https_1.HttpsError('invalid-argument', 'Invalid date format');
    }
    // Allow dates up to 1 year in the future for planned transactions
    const maxDate = new Date();
    maxDate.setFullYear(maxDate.getFullYear() + 1);
    if (transactionDate > maxDate) {
        throw new https_1.HttpsError('invalid-argument', 'Transaction date cannot be more than 1 year in the future');
    }
    // Get both accounts
    const [debitAccountDoc, creditAccountDoc] = await Promise.all([
        db.collection('accounts').doc(data.debitAccountId).get(),
        db.collection('accounts').doc(data.creditAccountId).get(),
    ]);
    if (!debitAccountDoc.exists) {
        throw new https_1.HttpsError('not-found', 'Debit account not found');
    }
    if (!creditAccountDoc.exists) {
        throw new https_1.HttpsError('not-found', 'Credit account not found');
    }
    const debitAccount = debitAccountDoc.data();
    const creditAccount = creditAccountDoc.data();
    // Verify ownership
    if (debitAccount.userId !== userId) {
        throw new https_1.HttpsError('permission-denied', 'You do not own the debit account');
    }
    if (creditAccount.userId !== userId) {
        throw new https_1.HttpsError('permission-denied', 'You do not own the credit account');
    }
    // Verify accounts are active
    if (!debitAccount.isActive) {
        throw new https_1.HttpsError('failed-precondition', 'Debit account is inactive');
    }
    if (!creditAccount.isActive) {
        throw new https_1.HttpsError('failed-precondition', 'Credit account is inactive');
    }
    // Calculate balance changes
    const debitBalanceChange = calculateBalanceChange(debitAccount.accountType, data.amount, true);
    const creditBalanceChange = calculateBalanceChange(creditAccount.accountType, data.amount, false);
    // Create transaction and update balances in a batch
    const batch = db.batch();
    const now = admin.firestore.Timestamp.now();
    // Create transaction (only include defined values)
    const transactionRef = db.collection('transactions').doc();
    const transaction = {
        date: admin.firestore.Timestamp.fromDate(transactionDate),
        amount: data.amount,
        debitAccountId: data.debitAccountId,
        creditAccountId: data.creditAccountId,
        userId,
        createdAt: now,
        updatedAt: now,
    };
    // Only add optional fields if they're defined
    if (data.note?.trim()) {
        transaction.note = data.note.trim();
    }
    if (data.tags && data.tags.length > 0) {
        transaction.tags = data.tags;
    }
    batch.set(transactionRef, transaction);
    // Update debit account balance (if applicable)
    if (debitBalanceChange !== 0) {
        batch.update(db.collection('accounts').doc(data.debitAccountId), {
            currentBalance: admin.firestore.FieldValue.increment(debitBalanceChange),
            updatedAt: now,
        });
    }
    // Update credit account balance (if applicable)
    if (creditBalanceChange !== 0) {
        batch.update(db.collection('accounts').doc(data.creditAccountId), {
            currentBalance: admin.firestore.FieldValue.increment(creditBalanceChange),
            updatedAt: now,
        });
    }
    await batch.commit();
    return {
        success: true,
        data: { transactionId: transactionRef.id },
    };
});
/**
 * Update an existing transaction
 *
 * This is complex because we need to:
 * 1. Reverse the original transaction's balance effects
 * 2. Apply the new transaction's balance effects
 */
exports.updateTransaction = (0, https_1.onCall)({
    cors: true,
    enforceAppCheck: false,
}, async (request) => {
    // Workaround for React Native: manually verify token if passed in data
    let userId;
    if (request.auth) {
        userId = request.auth.uid;
    }
    else if (request.data.idToken) {
        try {
            const decodedToken = await admin.auth().verifyIdToken(request.data.idToken);
            userId = decodedToken.uid;
        }
        catch (error) {
            throw new https_1.HttpsError('unauthenticated', 'Invalid authentication token');
        }
    }
    else {
        throw new https_1.HttpsError('unauthenticated', 'User must be authenticated');
    }
    // Remove idToken from data (idToken was only for auth verification)
    const { idToken: _, ...data } = request.data;
    if (!data.transactionId) {
        throw new https_1.HttpsError('invalid-argument', 'Transaction ID is required');
    }
    // Get the existing transaction
    const transactionRef = db.collection('transactions').doc(data.transactionId);
    const transactionDoc = await transactionRef.get();
    if (!transactionDoc.exists) {
        throw new https_1.HttpsError('not-found', 'Transaction not found');
    }
    const existingTransaction = transactionDoc.data();
    // Verify ownership
    if (existingTransaction.userId !== userId) {
        throw new https_1.HttpsError('permission-denied', 'You do not own this transaction');
    }
    // Determine new values
    const newDebitAccountId = data.debitAccountId ?? existingTransaction.debitAccountId;
    const newCreditAccountId = data.creditAccountId ?? existingTransaction.creditAccountId;
    const newAmount = data.amount ?? existingTransaction.amount;
    if (newDebitAccountId === newCreditAccountId) {
        throw new https_1.HttpsError('invalid-argument', 'Debit and credit accounts must be different');
    }
    if (newAmount <= 0) {
        throw new https_1.HttpsError('invalid-argument', 'Amount must be a positive number');
    }
    // Get all involved accounts (old and new)
    const accountIds = new Set([
        existingTransaction.debitAccountId,
        existingTransaction.creditAccountId,
        newDebitAccountId,
        newCreditAccountId,
    ]);
    const accountDocs = await Promise.all(Array.from(accountIds).map(id => db.collection('accounts').doc(id).get()));
    const accounts = new Map();
    for (const doc of accountDocs) {
        if (!doc.exists) {
            throw new https_1.HttpsError('not-found', `Account ${doc.id} not found`);
        }
        const account = doc.data();
        if (account.userId !== userId) {
            throw new https_1.HttpsError('permission-denied', `You do not own account ${doc.id}`);
        }
        accounts.set(doc.id, account);
    }
    // Calculate balance adjustments
    const balanceAdjustments = new Map();
    // Reverse old transaction effects
    const oldDebitAccount = accounts.get(existingTransaction.debitAccountId);
    const oldCreditAccount = accounts.get(existingTransaction.creditAccountId);
    const oldDebitReversal = -calculateBalanceChange(oldDebitAccount.accountType, existingTransaction.amount, true);
    const oldCreditReversal = -calculateBalanceChange(oldCreditAccount.accountType, existingTransaction.amount, false);
    if (oldDebitReversal !== 0) {
        balanceAdjustments.set(existingTransaction.debitAccountId, (balanceAdjustments.get(existingTransaction.debitAccountId) ?? 0) + oldDebitReversal);
    }
    if (oldCreditReversal !== 0) {
        balanceAdjustments.set(existingTransaction.creditAccountId, (balanceAdjustments.get(existingTransaction.creditAccountId) ?? 0) + oldCreditReversal);
    }
    // Apply new transaction effects
    const newDebitAccount = accounts.get(newDebitAccountId);
    const newCreditAccount = accounts.get(newCreditAccountId);
    const newDebitChange = calculateBalanceChange(newDebitAccount.accountType, newAmount, true);
    const newCreditChange = calculateBalanceChange(newCreditAccount.accountType, newAmount, false);
    if (newDebitChange !== 0) {
        balanceAdjustments.set(newDebitAccountId, (balanceAdjustments.get(newDebitAccountId) ?? 0) + newDebitChange);
    }
    if (newCreditChange !== 0) {
        balanceAdjustments.set(newCreditAccountId, (balanceAdjustments.get(newCreditAccountId) ?? 0) + newCreditChange);
    }
    // Build batch update
    const batch = db.batch();
    const now = admin.firestore.Timestamp.now();
    // Update transaction
    const transactionUpdates = {
        debitAccountId: newDebitAccountId,
        creditAccountId: newCreditAccountId,
        amount: newAmount,
        updatedAt: now,
    };
    // Handle date update - allow date changes when editing
    if (data.date !== undefined) {
        if (data.date === null || data.date === '') {
            throw new https_1.HttpsError('invalid-argument', 'Transaction date is required');
        }
        const newDate = new Date(data.date);
        if (isNaN(newDate.getTime())) {
            throw new https_1.HttpsError('invalid-argument', 'Invalid date format');
        }
        // Allow dates up to 1 year in the future for planned transactions
        const maxDate = new Date();
        maxDate.setFullYear(maxDate.getFullYear() + 1);
        if (newDate > maxDate) {
            throw new https_1.HttpsError('invalid-argument', 'Transaction date cannot be more than 1 year in the future');
        }
        transactionUpdates.date = admin.firestore.Timestamp.fromDate(newDate);
    }
    // Handle note update - allow clearing note by passing empty string or null
    if (data.note !== undefined) {
        if (data.note === null || (typeof data.note === 'string' && data.note.trim() === '')) {
            // Set to null to clear the note field (Firestore allows null)
            transactionUpdates.note = null;
        }
        else {
            transactionUpdates.note = data.note.trim();
        }
    }
    if (data.tags !== undefined && data.tags !== null && data.tags.length > 0) {
        transactionUpdates.tags = data.tags;
    }
    batch.update(transactionRef, transactionUpdates);
    // Update account balances
    for (const [accountId, adjustment] of balanceAdjustments) {
        if (adjustment !== 0) {
            batch.update(db.collection('accounts').doc(accountId), {
                currentBalance: admin.firestore.FieldValue.increment(adjustment),
                updatedAt: now,
            });
        }
    }
    await batch.commit();
    return { success: true };
});
/**
 * Delete a transaction
 *
 * Reverses the balance effects on accounts
 */
exports.deleteTransaction = (0, https_1.onCall)({
    cors: true,
    enforceAppCheck: false,
}, async (request) => {
    // Workaround for React Native: manually verify token if passed in data
    let userId;
    if (request.auth) {
        userId = request.auth.uid;
    }
    else if (request.data.idToken) {
        try {
            const decodedToken = await admin.auth().verifyIdToken(request.data.idToken);
            userId = decodedToken.uid;
        }
        catch (error) {
            throw new https_1.HttpsError('unauthenticated', 'Invalid authentication token');
        }
    }
    else {
        throw new https_1.HttpsError('unauthenticated', 'User must be authenticated');
    }
    const { idToken: _, transactionId } = request.data;
    if (!transactionId) {
        throw new https_1.HttpsError('invalid-argument', 'Transaction ID is required');
    }
    // Get the transaction
    const transactionRef = db.collection('transactions').doc(transactionId);
    const transactionDoc = await transactionRef.get();
    if (!transactionDoc.exists) {
        throw new https_1.HttpsError('not-found', 'Transaction not found');
    }
    const transaction = transactionDoc.data();
    // Verify ownership
    if (transaction.userId !== userId) {
        throw new https_1.HttpsError('permission-denied', 'You do not own this transaction');
    }
    // Get both accounts
    const [debitAccountDoc, creditAccountDoc] = await Promise.all([
        db.collection('accounts').doc(transaction.debitAccountId).get(),
        db.collection('accounts').doc(transaction.creditAccountId).get(),
    ]);
    const debitAccount = debitAccountDoc.exists ? debitAccountDoc.data() : null;
    const creditAccount = creditAccountDoc.exists ? creditAccountDoc.data() : null;
    // Calculate balance reversals
    const batch = db.batch();
    const now = admin.firestore.Timestamp.now();
    // Delete transaction
    batch.delete(transactionRef);
    // Reverse debit account balance
    if (debitAccount && hasBalance(debitAccount.accountType)) {
        const reversal = -calculateBalanceChange(debitAccount.accountType, transaction.amount, true);
        batch.update(db.collection('accounts').doc(transaction.debitAccountId), {
            currentBalance: admin.firestore.FieldValue.increment(reversal),
            updatedAt: now,
        });
    }
    // Reverse credit account balance
    if (creditAccount && hasBalance(creditAccount.accountType)) {
        const reversal = -calculateBalanceChange(creditAccount.accountType, transaction.amount, false);
        batch.update(db.collection('accounts').doc(transaction.creditAccountId), {
            currentBalance: admin.firestore.FieldValue.increment(reversal),
            updatedAt: now,
        });
    }
    await batch.commit();
    return { success: true };
});
//# sourceMappingURL=index.js.map