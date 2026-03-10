/**
 * Enhanced Transaction Parser for Bank SMS
 * 
 * SECURITY NOTE:
 * - This parser runs LOCALLY on the device
 * - Raw SMS content is NEVER uploaded to servers
 * - Only parsed transaction data (amount, date, merchant) is sent to Firestore
 * - This ensures user privacy and Google Play compliance
 * 
 * EXTRACTION CAPABILITIES:
 * - Amount (INR with comma support)
 * - Transaction type (debit/credit)
 * - Date (multiple formats)
 * - Merchant name (after "at" keyword)
 * - Last 4 digits of account number
 * - Available balance (if present)
 */

export type TransactionType = 'debit' | 'credit';

export type TransactionCategory = 'UPI' | 'ATM' | 'POS' | 'NetBanking' | 'NEFT' | 'IMPS' | 'RTGS' | 'Card' | 'Other';

export interface ParsedTransaction {
  amount: number;
  type: TransactionType;
  date: Date;
  merchant?: string;
  accountLast4?: string;
  availableBalance?: number;
  category?: TransactionCategory; // Auto-detected transaction category
  bankName?: string; // Extracted bank name (e.g., "ICICI Bank", "HDFC Bank")
  rawSms: string;
}

/**
 * Common Indian bank sender IDs for filtering
 * These are the official sender IDs used by major Indian banks
 */
export const BANK_SENDER_IDS = [
  // Major Banks
  'AXISBANK',
  'AXISBK',
  'HDFCBK',
  'HDFCBANK',
  'ICICIB', // ICICI Bank
  'ICICIC', // ICICI Credit Card
  'ICICIBK', // ICICI Bank alternative
  'ICICIBANK', // ICICI Bank full name
  'ICICIT', // ICICI Bank/Transaction
  'SBIINB',
  'SBIN',
  'KOTAKB',
  'KOTAK',
  
  // Public Sector Banks
  'PNBSMS', // Punjab National Bank
  'PNB',
  'BOISMS', // Bank of India
  'BOI',
  'UNIBAN', // Union Bank
  'UNION',
  'CANBNK', // Canara Bank
  'CANARA',
  'INDBNK', // Indian Bank
  'INDIAN',
  'BOMBNK', // Bank of Maharashtra
  'MAHARASHTRA',
  'IOBBNK', // Indian Overseas Bank
  'IOB',
  'BANKBARODA', // Bank of Baroda
  'BARODA',
  'CENTRAL', // Central Bank
  'CENTRALBK',
  'CORPBANK', // Corporation Bank
  'ORIENTAL', // Oriental Bank
  'ORIENTALBK',
  'SYNDICATE', // Syndicate Bank
  'SYNDICATEBK',
  'UCO', // UCO Bank
  'UCOBANK',
  'VIJAYA', // Vijaya Bank
  'VIJAYABK',
  
  // Private Banks
  'IDFCFB', // IDFC First Bank
  'IDFC',
  'YESBNK', // Yes Bank
  'YES',
  'FEDERAL', // Federal Bank
  'FEDERALBK',
  'SOUTHINDIAN', // South Indian Bank
  'SOUTHINDIANBK',
  'KARURVYSYA', // Karur Vysya Bank
  'KARURVYSYABK',
  'CATHOLICSYR', // Catholic Syrian Bank
  'CSB',
  'DCB', // DCB Bank
  'DCBBANK',
  'RBL', // RBL Bank
  'RBLBANK',
  'BANDHAN', // Bandhan Bank
  'BANDHANBK',
  
  // Payment Banks & Others
  'PAYTM', // Paytm Payments Bank
  'AIRTEL', // Airtel Payments Bank
  'JIO', // Jio Payments Bank
  'FINO', // Fino Payments Bank
] as const;

/**
 * Bank keywords for flexible matching
 * These are common bank name patterns that appear in sender IDs
 */
const BANK_KEYWORDS = [
  'ICICI',
  'HDFC',
  'AXIS',
  'SBI',
  'KOTAK',
  'PNB', // Punjab National Bank
  'BOI', // Bank of India
  'UNION',
  'CANARA',
  'IDFC',
  'YES',
  'INDIAN',
  'MAHARASHTRA',
  'OVERSEAS',
  'BARODA',
  'CENTRAL',
  'CORPORATION',
  'ORIENTAL',
  'SYNDICATE',
  'UCO',
  'VIJAYA',
  'FEDERAL',
  'SOUTH',
  'KARUR',
  'CATHOLIC',
  'RBL',
  'BANDHAN',
  'PAYTM',
  'AIRTEL',
  'JIO',
  'FINO',
] as const;

/**
 * Check if sender ID matches known bank patterns
 * 
 * ICICI variations:
 * - ICICIB (bank accounts)
 * - ICICIC (credit cards)
 * - ICICIBK (alternative format)
 * - ICICIBANK (full name)
 * - ICICIT (bank/transaction)
 * 
 * Also matches by keywords: ICICI, HDFC, AXIS, SBI, etc.
 */
export function isBankSender(senderId: string): boolean {
  if (!senderId || typeof senderId !== 'string') {
    return false;
  }
  const normalized = senderId.toUpperCase().trim();
  
  // First check exact bank sender IDs
  const matchesExactId = BANK_SENDER_IDS.some(bankId => {
    // Direct match
    if (normalized === bankId) return true;
    // Contains match (for IDs like "ICICIB-123", "VM-ICICIB-T", "ICICIB-T")
    if (normalized.includes(bankId)) return true;
    // Reverse match (for IDs like "123-ICICIB")
    if (bankId.includes(normalized) && normalized.length >= 4) return true;
    return false;
  });
  
  if (matchesExactId) {
    return true;
  }
  
  // Also check for bank keywords (ICICI, HDFC, etc.)
  // This catches sender IDs that contain bank names but aren't in our exact list
  // Special handling for ICICI: check for "ICICI" keyword first
  if (normalized.includes('ICICI')) {
    return true;
  }
  
  return BANK_KEYWORDS.some(keyword => normalized.includes(keyword));
}

/**
 * Enhanced amount regex patterns supporting:
 * - INR 1,234.56
 * - Rs. 1,234.56
 * - ₹1,234.56
 * - 1,234.56 INR
 * - Amounts with/without decimals
 */
const AMOUNT_PATTERNS: RegExp[] = [
  // Standard formats
  /\bINR\s*([0-9][0-9,]*(?:\.[0-9]{1,2})?)\b/i,
  /\bRs\.([0-9][0-9,]*(?:\.[0-9]{1,2})?)\b/i, // "Rs.2.00" (period after Rs, no space)
  /\bRs\.?\s*([0-9][0-9,]*(?:\.[0-9]{1,2})?)\b/i, // "Rs. 2.00" or "Rs 2.00" (with space)
  /\bRs\s+([0-9][0-9,]*(?:\.[0-9]{1,2})?)\b/i, // "Rs 8,596.00" (without period)
  /₹\s*([0-9][0-9,]*(?:\.[0-9]{1,2})?)/i,
  /\b([0-9][0-9,]*(?:\.[0-9]{1,2})?)\s*INR\b/i,
  
  // Amount with colon (e.g., "credited:Rs. 560.00", "Account XX868 credited:Rs. 560.00")
  /(?:credited|debited|paid|received):\s*Rs\.?\s*([0-9][0-9,]*(?:\.[0-9]{1,2})?)/i,
  
  // Amount with period after Rs (e.g., "Rs.2.00 credited", "Rs.2.00 credited to")
  /Rs\.([0-9][0-9,]*(?:\.[0-9]{1,2})?)\s+(?:credited|debited|paid|received)/i,
  
  // Amount with "credited to" or "debited from" (e.g., "Rs.2.00 credited to HDFC Bank")
  /Rs\.?\s*([0-9][0-9,]*(?:\.[0-9]{1,2})?)\s+(?:credited\s+to|debited\s+from)/i,
  
  // Amount with "for" (e.g., "debited for Rs 10000.00", "credited for Rs 5000.00")
  /(?:credited|debited|paid|received)\s+for\s+Rs\.?\s*([0-9][0-9,]*(?:\.[0-9]{1,2})?)/i,
  
  // ICICI format: "Account XX868 credited:Rs. 560.00" or "ICICI Bank Account XX868 credited:Rs. 560.00"
  /(?:icici\s+bank\s+)?(?:account|acct|a\/c)\s+[x*]+\d+\s+(?:credited|debited):\s*Rs\.?\s*([0-9][0-9,]*(?:\.[0-9]{1,2})?)/i,
  
  // ICICI format: "ICICI Bank Acct XX868 debited for Rs 10000.00"
  /(?:icici\s+bank\s+)?(?:account|acct|a\/c)\s+[x*]+\d+\s+(?:credited|debited)\s+for\s+Rs\.?\s*([0-9][0-9,]*(?:\.[0-9]{1,2})?)/i,
  
  // Amount with equals (e.g., "Amount=Rs. 1000")
  /(?:amount|amt|value)\s*[=:]\s*Rs\.?\s*([0-9][0-9,]*(?:\.[0-9]{1,2})?)/i,
  
  // Amount in parentheses (e.g., "(Rs. 1000)")
  /\(Rs\.?\s*([0-9][0-9,]*(?:\.[0-9]{1,2})?)\)/i,
  
  // Amount without currency symbol (common in some banks)
  /\b([0-9][0-9,]*(?:\.[0-9]{1,2})?)\s*(?:debited|credited|spent|received|withdrawn|deposited|paid|transferred)\b/i,
  
  // Amount after transaction type (e.g., "Debit of 1000")
  /(?:debit|credit|payment|transfer)\s+(?:of|for|amount)\s+Rs\.?\s*([0-9][0-9,]*(?:\.[0-9]{1,2})?)/i,
  
  // Amount with "for" (e.g., "for Rs. 1000")
  /for\s+Rs\.?\s*([0-9][0-9,]*(?:\.[0-9]{1,2})?)/i,
];

/**
 * Date parsing patterns supporting:
 * - DD-MM-YYYY, DD/MM/YYYY, DD.MM.YYYY
 * - DD Mon YYYY
 * - DD-MMM-YYYY
 * - Today, Yesterday (relative dates)
 */
const DATE_PATTERNS: RegExp[] = [
  // DD-MM-YYYY, DD/MM/YYYY, DD.MM.YYYY
  /\b(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})\b/,
  
  // DD Mon YYYY (e.g., "26 Feb 2026")
  /\b(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)\s+(\d{2,4})\b/i,
  
  // DD-MMM-YYYY (e.g., "26-Feb-2026")
  /\b(\d{1,2})[\/\-](Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[\/\-](\d{2,4})\b/i,
  
  // DD-MMM-YY (e.g., "26-Feb-26" where year is 2 digits)
  /\b(\d{1,2})[\/\-](Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[\/\-](\d{2})\b/i,
  
  // DD Mon YY (e.g., "26 Feb 26")
  /\b(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)\s+(\d{2})\b/i,
  
  // DD/MM/YY (e.g., "26/02/26")
  /\b(\d{1,2})\/(\d{1,2})\/(\d{2})\b/,
  
  // DD-MM-YY (e.g., "26-02-26")
  /\b(\d{1,2})-(\d{1,2})-(\d{2})\b/,
  
  // Date with "on" prefix (e.g., "on 26-Feb-26")
  /\bon\s+(\d{1,2})[\/\-](Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[\/\-](\d{2,4})\b/i,
  
  // Date with "dated" prefix (e.g., "dated 26-Feb-26")
  /\bdated\s+(\d{1,2})[\/\-](Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[\/\-](\d{2,4})\b/i,
];

/**
 * Merchant extraction patterns
 * Looks for "at MERCHANT", "from MERCHANT", "to MERCHANT"
 */
const MERCHANT_PATTERNS: RegExp[] = [
  // UPI format: "from VPA 9971903184@pthdfc" - extract VPA number or identifier (prioritize this)
  // This should come FIRST to catch VPA identifiers before other patterns
  /(?:from|to)\s+VPA\s+([A-Za-z0-9]+)@/i,
  
  // Pattern: After semicolon, merchant name followed by "credited" (e.g., "; ANKUR SHARMA credited")
  // This should come early to catch merchant names after semicolons
  /;\s+([A-Z][A-Za-z0-9\s&.,-]{2,50}?)\s+(?:credited|debited)/i,
  
  // Pattern: "NAME credited" or "NAME debited" (e.g., "ANKUR SHARMA credited")
  // This captures the merchant/recipient name when it appears before "credited" or "debited"
  // Exclude common false positives like "Rs", "Rs.", "Rs.2", "Alert", "Credit", etc.
  /\b(?!Rs\.?|Alert|Credit|Debit|INR|₹)([A-Z][A-Za-z0-9\s&.,-]{2,50}?)\s+(?:credited|debited)\b/i,
  
  // "To MERCHANT" format (HDFC style) - must come before generic "to" pattern
  // Matches "To SALIM SO SAHID" and stops at "On" or end
  /\bTo\s+([A-Z][A-Za-z0-9\s&.,-]{2,50}?)(?:\s+On|\s+on|\s+dated|\s+for|\s+Ref|$)/i,
  
  // "From MERCHANT" format
  /\bFrom\s+([A-Z][A-Za-z0-9\s&.,-]{2,50}?)(?:\s+On|\s+on|\s+dated|\s+for|\s+To|$)/i,
  
  // Standard formats: "at MERCHANT", "via MERCHANT", "through MERCHANT"
  /\b(?:at|via|through|with)\s+([A-Z][A-Za-z0-9\s&.,-]{2,50})\b/i,
  
  // ICICI format: "at RSP*SERVICE EAS" - merchant with asterisk (must come before generic "at" pattern)
  // Pattern: "on 25-Feb-26 at RSP*SERVICE EAS"
  /\bon\s+\d{1,2}[\/\-](?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[\/\-]\d{2,4}\s+at\s+([A-Z][A-Za-z0-9]+)\*([A-Z][A-Za-z0-9\s&.,-]{2,50}?)(?:\s+Avl|\s+Lmt|\s+Limit|\.|$)/i,
  
  // ICICI format: "at RSP*SERVICE EAS" (standalone, without date prefix)
  /\bat\s+([A-Z][A-Za-z0-9]+)\*([A-Z][A-Za-z0-9\s&.,-]{2,50}?)(?:\s+Avl|\s+Lmt|\s+Limit|\.|$)/i,
  
  // "at MERCHANT NAME" format
  /\bat\s+([A-Z][A-Za-z0-9\s&.,-]{2,50}?)(?:\s+on|\s+dated|\s+for|\s+at|$)/i,
  
  // ICICI format: "on 26-Feb-26 on CK BIRLA HOSPIT" - merchant after date
  // This pattern catches merchant when there are two "on" keywords (one for date, one for merchant)
  /\bon\s+\d{1,2}[\/\-](?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[\/\-]\d{2,4}\s+on\s+([A-Z][A-Za-z0-9\s&.,-]{2,50}?)(?:\s+Avl|\s+Lmt|\s+Limit|\.|$)/i,
  
  // ICICI format: "Info ACH*MERCHANT NAME*0000000" or "Info ACH*ITC LIMITED*710692"
  // This pattern captures the merchant name between the two asterisks
  /\b(?:Info|info)\s+\w+\*([A-Z][A-Za-z0-9\s&.,-]{2,50}?)\*/i,
  
  // Generic pattern for "Info TYPE*MERCHANT*" (fallback)
  /\bInfo\s+\w+\*([^*]+)\*/i,
  
  // ICICI format: "at MERCHANT" (after date)
  /\bon\s+\d{1,2}[\/\-](?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[\/\-]\d{2,4}\s+at\s+([A-Z][A-Za-z0-9\s&.*,-]{2,50}?)(?:\s+Avl|\s+Lmt|\s+Limit|\.|$)/i,
  
  // "Merchant: NAME" format
  /(?:merchant|vendor|payee|beneficiary)[\s:]+([A-Z][A-Za-z0-9\s&.,-]{2,50})/i,
  
  // "Paid to: NAME" format
  /(?:paid\s+to|payment\s+to|transferred\s+to)[\s:]+([A-Z][A-Za-z0-9\s&.,-]{2,50})/i,
  
  // "Received from: NAME" format
  /(?:received\s+from|credit\s+from)[\s:]+([A-Z][A-Za-z0-9\s&.,-]{2,50})/i,
  
  // UPI format: "to NAME@upi" or "from NAME@upi"
  /(?:to|from)\s+([A-Za-z0-9\s&.,-]{2,50})@/i,
  
  // "Description: NAME" format
  /(?:description|desc|remarks|narration)[\s:]+([A-Z][A-Za-z0-9\s&.,-]{2,50})/i,
  
  // "Ref: NAME" or "Ref No: NAME" format
  /(?:ref|reference|ref\s+no)[\s:]+([A-Z][A-Za-z0-9\s&.,-]{2,50})/i,
  
  // Pattern: "for NAME" (when not followed by amount)
  /\bfor\s+([A-Z][A-Za-z0-9\s&.,-]{2,50}?)(?:\s+on|\s+dated|$)/i,
];

/**
 * Account number extraction (last 4 digits)
 * Patterns: "acct *1234", "a/c *1234", "account *1234", "xxxx1234"
 */
const ACCOUNT_PATTERNS: RegExp[] = [
  // Standard formats: "acct *1234", "a/c *1234", "account *1234"
  /\b(?:acct|a\/c|account|acc)\s*[x*]*(\d{4})\b/i,
  
  // Multiple X's or *'s: "xxxx1234" or "****1234"
  /\b[x*]{4,}(\d{4})\b/i,
  
  // "ending in 1234" or "ending 1234"
  /\b(?:ending|ending\s+in|ends\s+with)\s+(\d{4})\b/i,
  
  // Pattern: "1234" after account-related keywords with colon
  /\b(?:acct|a\/c|account|acc)[\s:]+[x*]*(\d{4})\b/i,
  
  // ICICI format: "Account XX868" or "Account XX1234" - extract last 3-4 digits
  /\b(?:account|acct|a\/c|acc)\s+[x*]{1,}(\d{3,4})\b/i,
  
  // ICICI Card format: "Card XX5000" or "Bank Card XX5000" - extract last 4 digits
  /\b(?:bank\s+)?card\s+[x*]{2,}(\d{4})\b/i,
  
  // Pattern: "XX868" or "XX1234" or "XX5000" - extract digits (2+ X's or *'s)
  /\b[x*]{2,}(\d{3,4})\b/i,
  
  // Pattern: "A/c No: *1234" or "A/c No: 1234"
  /\b(?:a\/c|acct|account)\s+no[:\s]+[x*]*(\d{4})\b/i,
  
  // Pattern: "Card ending 1234" or "Card *1234"
  /\b(?:card|credit\s+card|debit\s+card)\s+(?:ending|ending\s+in|[*x]+)?(\d{4})\b/i,
  
  // Pattern: "Last 4 digits: 1234"
  /\b(?:last\s+4\s+digits|last\s+four)[\s:]+(\d{4})\b/i,
  
  // Pattern: "Account number ending in 1234"
  /\b(?:account\s+number|acc\s+no)\s+(?:ending\s+in|ends\s+with)\s+(\d{4})\b/i,
  
  // Pattern: "XXXX1234" (4 X's followed by 4 digits)
  /\b[xX]{4}(\d{4})\b/,
  
  // Pattern: "****1234" (4 *'s followed by 4 digits)
  /\b[*]{4}(\d{4})\b/,
];

/**
 * Balance extraction patterns
 */
const BALANCE_PATTERNS: RegExp[] = [
  /\b(?:bal|balance|avail|available)\s*(?:is|:)?\s*(?:INR|Rs\.?|₹)?\s*([0-9][0-9,]*(?:\.[0-9]{1,2})?)\b/i,
  /\b(?:bal|balance)\s*[x*]*(\d{4,})\b/i,
  // ICICI format: "Avl Limit: INR 7,42,814.94" or "Available Limit: INR 7,42,814.94"
  /\b(?:avl\s+limit|available\s+limit|limit)\s*:?\s*(?:INR|Rs\.?|₹)?\s*([0-9][0-9,]*(?:\.[0-9]{1,2})?)\b/i,
  // ICICI format: "Avl Lmt: Rs 7,44,503.94" (abbreviated)
  /\b(?:avl\s+lmt|available\s+lmt|lmt)\s*:?\s*(?:INR|Rs\.?|Rs\s+)?\s*([0-9][0-9,]*(?:\.[0-9]{1,2})?)\b/i,
];

/**
 * Transaction type detection patterns
 */
function detectTransactionType(text: string): TransactionType {
  const lower = text.toLowerCase();
  
  // Debit indicators (expanded)
  const debitKeywords = [
    'debited',
    'debit',
    'spent',
    'spent using', // ICICI format: "spent using ICICI Bank Card"
    'spent on', // ICICI format: "spent on ICICI Bank Card"
    'withdrawn',
    'withdrawal',
    'dr ',
    'dr.',
    'dr:',
    'paid',
    'payment',
    'purchase',
    'purchased',
    'charged',
    'charge',
    'deducted',
    'deduction',
    'outgoing',
    'outward',
    'sent',
    'transferred',
    'transfer',
    'withdrawn from',
    'cash withdrawal',
    'atm withdrawal',
    'card payment',
    'online payment',
    'bill payment',
  ];
  
  // Credit indicators (expanded)
  const creditKeywords = [
    'credited',
    'credit',
    'received',
    'deposited',
    'deposit',
    'cr ',
    'cr.',
    'cr:',
    'transfer received',
    'salary',
    'salary credit',
    'incoming',
    'inward',
    'refund',
    'refunded',
    'reversal',
    'reversed',
    'cash deposit',
    'cash deposited',
    'transfer credit',
    'neft credit',
    'imps credit',
    'rtgs credit',
    'ach credit',
    'upi credit',
  ];
  
  // Check for debit first (more common)
  for (const keyword of debitKeywords) {
    if (lower.includes(keyword)) {
      return 'debit';
    }
  }
  
  // Check for credit
  for (const keyword of creditKeywords) {
    if (lower.includes(keyword)) {
      return 'credit';
    }
  }
  
  // Default to debit if amount is present but type unclear
  // (most transactions are debits)
  return 'debit';
}

/**
 * Parse amount from SMS text
 */
function parseAmount(text: string): number | undefined {
  for (const pattern of AMOUNT_PATTERNS) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const value = Number(match[1].replace(/,/g, ''));
      if (Number.isFinite(value) && value > 0) {
        return value;
      }
    }
  }
  return undefined;
}

/**
 * Parse date from SMS text
 * Returns current date if parsing fails (common for "today" transactions)
 */
function parseDate(text: string): Date {
  const now = new Date();
  
  // Check for relative dates first
  const lower = text.toLowerCase();
  if (lower.includes('today') || lower.includes('just now')) {
    return now;
  }
  if (lower.includes('yesterday')) {
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday;
  }
  
  // Try parsing absolute dates
  for (const pattern of DATE_PATTERNS) {
    const match = text.match(pattern);
    if (!match) continue;
    
    try {
      let day: number, month: number, year: number;
      
      // Numeric date format (DD-MM-YYYY)
      if (match.length >= 4 && /^\d+$/.test(match[1]) && /^\d+$/.test(match[2])) {
        day = Number(match[1]);
        month = Number(match[2]) - 1; // JavaScript months are 0-indexed
        year = Number(match[3]);
        if (year < 100) year = 2000 + year;
        
        const date = new Date(year, month, day);
        if (isValidDate(date)) {
          return date;
        }
      }
      
      // Text month format (DD Mon YYYY or DD Mon YY)
      if (match.length >= 4 && /[A-Za-z]/.test(match[2])) {
        day = Number(match[1]);
        const monthName = match[2].toLowerCase();
        year = Number(match[3]);
        
        // Handle 2-digit years (e.g., "26" -> 2026, but if > current year, assume 1926-1999)
        if (year < 100) {
          const currentYear = now.getFullYear();
          const currentYearLast2 = currentYear % 100;
          // If parsed year is greater than current year's last 2 digits, assume previous century
          // Otherwise assume current century
          year = year > currentYearLast2 ? 1900 + year : 2000 + year;
        }
        
        const monthMap: Record<string, number> = {
          jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
          jul: 6, aug: 7, sep: 8, sept: 8, oct: 9, nov: 10, dec: 11,
        };
        
        month = monthMap[monthName];
        if (month !== undefined) {
          const date = new Date(year, month, day);
          if (isValidDate(date)) {
            return date;
          }
        }
      }
    } catch (error) {
      // Continue to next pattern
      continue;
    }
  }
  
  // Default to current date if parsing fails
  return now;
}

/**
 * Parse merchant name from SMS text
 */
function parseMerchant(text: string): string | undefined {
  for (const pattern of MERCHANT_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      let merchant: string;
      
      // Handle patterns with multiple capture groups (e.g., "RSP*SERVICE EAS")
      if (match[2]) {
        // Combine both parts: "RSP SERVICE EAS"
        merchant = `${match[1].trim()} ${match[2].trim()}`;
      } else if (match[1]) {
        merchant = match[1].trim();
      } else {
        continue;
      }
      
      // Filter out common false positives
      if (merchant.length >= 2 && merchant.length <= 50) {
        // Remove common suffixes that aren't part of merchant name
        merchant = merchant
          .replace(/\s+On\s+.*$/i, '')
          .replace(/\s+on\s+.*$/i, '')
          .replace(/\s+dated\s+.*$/i, '')
          .replace(/\s+for\s+.*$/i, '')
          .replace(/\s+Ref\s+.*$/i, '')
          .replace(/\s+ref\s+.*$/i, '')
          .replace(/\s+To\s+.*$/i, '')
          .replace(/\s+to\s+.*$/i, '')
          .replace(/\s+From\s+.*$/i, '')
          .replace(/\s+from\s+.*$/i, '')
          .replace(/\s+Avl\s+.*$/i, '')
          .replace(/\s+Lmt\s+.*$/i, '')
          .replace(/\s+Limit\s+.*$/i, '')
          .trim();
        
        // Additional cleanup: remove trailing punctuation and numbers that might be part of next field
        merchant = merchant.replace(/[\s,.-]+$/, '').trim();
        
        if (merchant.length >= 2) {
          return merchant;
        }
      }
    }
  }
  return undefined;
}

/**
 * Parse last 4 digits of account number
 */
function parseAccountLast4(text: string): string | undefined {
  for (const pattern of ACCOUNT_PATTERNS) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const digits = match[1];
      // Accept 3 or 4 digits (some banks use 3 digits like "868")
      if ((digits.length === 3 || digits.length === 4) && /^\d{3,4}$/.test(digits)) {
        // Pad with leading zero if 3 digits to make it 4
        return digits.length === 3 ? `0${digits}` : digits;
      }
    }
  }
  return undefined;
}

/**
 * Parse available balance
 */
function parseBalance(text: string): number | undefined {
  for (const pattern of BALANCE_PATTERNS) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const value = Number(match[1].replace(/,/g, ''));
      if (Number.isFinite(value) && value >= 0) {
        return value;
      }
    }
  }
  return undefined;
}

/**
 * Bank name mapping from keywords to full names
 */
const BANK_NAME_MAP: Record<string, string> = {
  'ICICI': 'ICICI Bank',
  'HDFC': 'HDFC Bank',
  'AXIS': 'Axis Bank',
  'SBI': 'State Bank of India',
  'KOTAK': 'Kotak Mahindra Bank',
  'PNB': 'Punjab National Bank',
  'BOI': 'Bank of India',
  'UNION': 'Union Bank of India',
  'CANARA': 'Canara Bank',
  'IDFC': 'IDFC First Bank',
  'YES': 'Yes Bank',
  'INDIAN': 'Indian Bank',
  'MAHARASHTRA': 'Bank of Maharashtra',
  'OVERSEAS': 'Indian Overseas Bank',
  'BARODA': 'Bank of Baroda',
  'CENTRAL': 'Central Bank of India',
  'CORPORATION': 'Corporation Bank',
  'ORIENTAL': 'Oriental Bank of Commerce',
  'SYNDICATE': 'Syndicate Bank',
  'UCO': 'UCO Bank',
  'VIJAYA': 'Vijaya Bank',
  'FEDERAL': 'Federal Bank',
  'SOUTH': 'South Indian Bank',
  'KARUR': 'Karur Vysya Bank',
  'CATHOLIC': 'Catholic Syrian Bank',
  'RBL': 'RBL Bank',
  'BANDHAN': 'Bandhan Bank',
  'PAYTM': 'Paytm Payments Bank',
  'AIRTEL': 'Airtel Payments Bank',
  'JIO': 'Jio Payments Bank',
  'FINO': 'Fino Payments Bank',
};

/**
 * Parse bank name from SMS text or sender ID
 */
function parseBankName(text: string, senderId?: string): string | undefined {
  const upperText = text.toUpperCase();
  
  // Priority 1: Try to extract full bank name including "Card" if present
  // Pattern: "ICICI Bank Card", "HDFC Bank Card", etc.
  const bankCardPattern = /\b(ICICI|HDFC|AXIS|SBI|KOTAK|PNB|BOI|UNION|CANARA|IDFC|YES|INDIAN|MAHARASHTRA|OVERSEAS|BARODA|CENTRAL|CORPORATION|ORIENTAL|SYNDICATE|UCO|VIJAYA|FEDERAL|SOUTH|KARUR|CATHOLIC|RBL|BANDHAN|PAYTM|AIRTEL|JIO|FINO)\s+BANK\s+CARD\b/i;
  const cardMatch = text.match(bankCardPattern);
  if (cardMatch && cardMatch[1]) {
    const bankKey = cardMatch[1].toUpperCase();
    const baseName = BANK_NAME_MAP[bankKey] || `${cardMatch[1]} Bank`;
    return `${baseName} Card`;
  }
  
  // Priority 2: Try to extract bank name from SMS text
  // Pattern: "ICICI Bank", "HDFC Bank", "Axis Bank", etc.
  const bankNamePatterns = [
    /\b(ICICI|HDFC|AXIS|SBI|KOTAK|PNB|BOI|UNION|CANARA|IDFC|YES|INDIAN|MAHARASHTRA|OVERSEAS|BARODA|CENTRAL|CORPORATION|ORIENTAL|SYNDICATE|UCO|VIJAYA|FEDERAL|SOUTH|KARUR|CATHOLIC|RBL|BANDHAN|PAYTM|AIRTEL|JIO|FINO)\s+BANK\s+ACCOUNT\b/i,
    /\b(ICICI|HDFC|AXIS|SBI|KOTAK|PNB|BOI|UNION|CANARA|IDFC|YES|INDIAN|MAHARASHTRA|OVERSEAS|BARODA|CENTRAL|CORPORATION|ORIENTAL|SYNDICATE|UCO|VIJAYA|FEDERAL|SOUTH|KARUR|CATHOLIC|RBL|BANDHAN|PAYTM|AIRTEL|JIO|FINO)\s+BANK\b/i,
  ];
  
  for (const pattern of bankNamePatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const bankKey = match[1].toUpperCase();
      return BANK_NAME_MAP[bankKey] || `${match[1]} Bank`;
    }
  }
  
  // Priority 3: Try to find bank keyword in text
  for (const keyword of BANK_KEYWORDS) {
    if (upperText.includes(keyword)) {
      return BANK_NAME_MAP[keyword] || `${keyword} Bank`;
    }
  }
  
  // Priority 4: Fallback to sender ID
  if (senderId) {
    const upperSenderId = senderId.toUpperCase();
    for (const keyword of BANK_KEYWORDS) {
      if (upperSenderId.includes(keyword)) {
        return BANK_NAME_MAP[keyword] || `${keyword} Bank`;
      }
    }
    
    // Check exact sender ID matches
    for (const [key, value] of Object.entries(BANK_NAME_MAP)) {
      if (upperSenderId.includes(key)) {
        return value;
      }
    }
  }
  
  return undefined;
}

/**
 * Transaction category detection patterns
 * Detects: UPI, ATM, POS, NetBanking, NEFT, IMPS, RTGS, Card
 */
function detectTransactionCategory(text: string): TransactionCategory | undefined {
  const lower = text.toLowerCase();
  
  // UPI patterns
  if (lower.includes('upi') || 
      lower.includes('unified payments interface') ||
      lower.includes('paytm') ||
      lower.includes('phonepe') ||
      lower.includes('google pay') ||
      lower.includes('gpay') ||
      lower.includes('bhim') ||
      (lower.includes('@') && (lower.includes('pay') || lower.includes('upi')))) {
    return 'UPI';
  }
  
  // ATM patterns
  if (lower.includes('atm') ||
      lower.includes('cash withdrawal') ||
      lower.includes('withdrawn from atm') ||
      lower.includes('atm withdrawal') ||
      (lower.includes('withdrawn') && lower.includes('atm'))) {
    return 'ATM';
  }
  
  // POS patterns (Point of Sale)
  if (lower.includes('pos') ||
      lower.includes('point of sale') ||
      lower.includes('card swipe') ||
      lower.includes('swiped') ||
      (lower.includes('purchase') && lower.includes('card'))) {
    return 'POS';
  }
  
  // NetBanking patterns
  if (lower.includes('netbanking') ||
      lower.includes('net banking') ||
      lower.includes('internet banking') ||
      lower.includes('online banking') ||
      lower.includes('netbank') ||
      (lower.includes('online') && lower.includes('payment'))) {
    return 'NetBanking';
  }
  
  // NEFT patterns
  if (lower.includes('neft') ||
      lower.includes('national electronic funds transfer')) {
    return 'NEFT';
  }
  
  // IMPS patterns
  if (lower.includes('imps') ||
      lower.includes('immediate payment service')) {
    return 'IMPS';
  }
  
  // RTGS patterns
  if (lower.includes('rtgs') ||
      lower.includes('real time gross settlement')) {
    return 'RTGS';
  }
  
  // Card patterns (generic card transaction)
  // Check for "spent using ... Card" first (ICICI format)
  if (lower.includes('spent using') && lower.includes('card')) {
    return 'Card';
  }
  
  if (lower.includes('card') ||
      lower.includes('credit card') ||
      lower.includes('debit card') ||
      lower.includes('card payment') ||
      lower.includes('card transaction') ||
      lower.includes('card swipe') ||
      lower.includes('card purchase') ||
      lower.includes('card used') ||
      lower.includes('bank card')) {
    return 'Card';
  }
  
  // Cheque patterns
  if (lower.includes('cheque') ||
      lower.includes('cheque cleared') ||
      lower.includes('cheque payment')) {
    return 'Other';
  }
  
  // Standing Instruction / Auto Debit
  if (lower.includes('standing instruction') ||
      lower.includes('auto debit') ||
      lower.includes('auto-debit') ||
      lower.includes('si') ||
      lower.includes('e-mandate')) {
    return 'NetBanking';
  }
  
  // Bill Payment
  if (lower.includes('bill payment') ||
      lower.includes('billpay') ||
      lower.includes('utility payment')) {
    return 'NetBanking';
  }
  
  return undefined;
}

/**
 * Validate date is reasonable (not in future, not too old)
 */
function isValidDate(date: Date): boolean {
  if (!date || !Number.isFinite(date.getTime())) {
    return false;
  }
  
  const now = new Date();
  const oneYearAgo = new Date(now);
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  
  // Date should be between 1 year ago and today
  return date >= oneYearAgo && date <= now;
}

/**
 * Main parsing function
 * 
 * @param smsText - Raw SMS message text
 * @param senderId - SMS sender ID (optional, for filtering)
 * @returns Parsed transaction data or null if parsing fails
 */
export function parseTransaction(
  smsText: string,
  senderId?: string
): ParsedTransaction | null {
  if (!smsText || typeof smsText !== 'string') {
    return null;
  }
  
  const text = smsText.trim();
  if (text.length === 0) {
    return null;
  }
  
  // Skip password/OTP/PIN related messages - these are not transaction messages
  const lower = text.toLowerCase();
  
  // Check for password-related keywords (more specific patterns to avoid false positives)
  const passwordPatterns = [
    /\bpassword\b/i,
    /\bis\s+password\b/i,
    /\byour\s+password\b/i,
    /\blogin\s+password\b/i,
    /\breset\s+password\b/i,
    /\bchange\s+password\b/i,
    /\btransaction\s+password\b/i,
    /\bnet\s+banking\s+password\b/i,
    /\bbanking\s+password\b/i,
    /\batm\s+password\b/i,
    /\bmpin\b/i,
    /\bm-pin\b/i,
    /\batm\s+pin\b/i,
    /\bcard\s+pin\b/i,
    /\bpin\s+is\b/i, // "PIN is 1234"
    /\bpin\s+code\b/i,
    /\botp\b/i,
    /\bone\s+time\s+password\b/i,
    /\bverification\s+code\b/i,
    /\bverification\s+otp\b/i,
    /\blogin\s+otp\b/i,
    /\btransaction\s+otp\b/i,
    /\bauthentication\s+code\b/i,
    /\bsecurity\s+code\b/i,
    /\baccess\s+code\b/i,
  ];
  
  // Check if message matches any password-related pattern
  if (passwordPatterns.some(pattern => pattern.test(text))) {
    return null;
  }
  
  // Filter by sender ID if provided
  // Be lenient - check if text contains bank keywords even if sender ID doesn't match
  const upperText = text.toUpperCase();
  const hasBankKeyword = BANK_KEYWORDS.some(keyword => upperText.includes(keyword));
  
  if (senderId) {
    const isBankSenderId = isBankSender(senderId);
    // Allow if sender ID matches OR text contains bank keywords
    if (!isBankSenderId && !hasBankKeyword) {
      return null;
    }
  } else {
    // If no sender ID provided, check if text contains bank keywords
    if (!hasBankKeyword) {
      return null;
    }
  }
  
  // Extract amount (required)
  const amount = parseAmount(text);
  if (!amount || amount <= 0) {
    return null;
  }
  
  // Extract other fields
  const type = detectTransactionType(text);
  const date = parseDate(text);
  const merchant = parseMerchant(text);
  const accountLast4 = parseAccountLast4(text);
  const availableBalance = parseBalance(text);
  const category = detectTransactionCategory(text);
  const bankName = parseBankName(text, senderId);
  
  const parsedResult: ParsedTransaction = {
    amount,
    type,
    date,
    merchant,
    accountLast4,
    availableBalance,
    category,
    bankName,
    rawSms: text,
  };

  return parsedResult;
}
