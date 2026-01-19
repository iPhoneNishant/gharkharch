/**
 * SMS parsing utilities (Android)
 *
 * NOTE:
 * - This does NOT read the SMS inbox. It parses an SMS text that the user pastes/shares.
 * - Reading the inbox requires native code + permissions and is Play-policy sensitive.
 */

export type SmsTransactionDirection = 'debit' | 'credit' | 'unknown';

export interface ParsedSmsTransaction {
  raw: string;
  amount?: number;
  currency?: 'INR' | 'UNKNOWN';
  direction: SmsTransactionDirection;
  date?: Date;
  note: string;
}

const AMOUNT_REGEXES: RegExp[] = [
  // "INR 1,234.56" / "INR1,234"
  /\bINR\s*([0-9][0-9,]*(?:\.[0-9]{1,2})?)\b/i,
  // "Rs. 1,234.56" / "Rs 1234"
  /\bRs\.?\s*([0-9][0-9,]*(?:\.[0-9]{1,2})?)\b/i,
  // "₹1,234.56"
  /₹\s*([0-9][0-9,]*(?:\.[0-9]{1,2})?)/i,
];

const DATE_REGEXES: RegExp[] = [
  // "on 12-01-2026" / "12/01/26" / "12.01.2026"
  /\b(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})\b/,
  // "on 12 Jan 2026"
  /\b(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)\s+(\d{2,4})\b/i,
    // "on 12-Jan-2026"
    /\b(\d{1,2})[\/\-.](Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[\/\-.](\d{2,4})\b/i,
];

function parseAmount(raw: string): number | undefined {
  for (const re of AMOUNT_REGEXES) {
    const m = raw.match(re);
    if (!m?.[1]) continue;
    const value = Number(m[1].replace(/,/g, ''));
    if (!Number.isFinite(value)) continue;
    return value;
  }
  return undefined;
}

function parseDate(raw: string): Date | undefined {
  for (const re of DATE_REGEXES) {
    const m = raw.match(re);
    if (!m) continue;

    // dd/mm/yyyy
    if (m.length >= 4 && /^\d+$/.test(m[1]) && /^\d+$/.test(m[2])) {
      const dd = Number(m[1]);
      const mm = Number(m[2]);
      let yyyy = Number(m[3]);
      if (yyyy < 100) yyyy = 2000 + yyyy;
      const d = new Date(yyyy, mm - 1, dd);
      if (Number.isFinite(d.getTime())) return d;
    }

    // dd Mon yyyy
    if (m.length >= 4 && /[A-Za-z]/.test(m[2])) {
      const dd = Number(m[1]);
      const mon = m[2].toLowerCase();
      let yyyy = Number(m[3]);
      if (yyyy < 100) yyyy = 2000 + yyyy;
      const monthMap: Record<string, number> = {
        jan: 0,
        feb: 1,
        mar: 2,
        apr: 3,
        may: 4,
        jun: 5,
        jul: 6,
        aug: 7,
        sep: 8,
        sept: 8,
        oct: 9,
        nov: 10,
        dec: 11,
      };
      const mm = monthMap[mon];
      if (mm === undefined) continue;
      const d = new Date(yyyy, mm, dd);
      if (Number.isFinite(d.getTime())) return d;
    }
  }
  return undefined;
}

function guessDirection(raw: string): SmsTransactionDirection {
  const t = raw.toLowerCase();

  // Common bank SMS keywords
  if (t.includes('debited') || t.includes('spent') || t.includes('withdrawn') || t.includes('dr ')) return 'debit';
  if (t.includes('credited') || t.includes('received') || t.includes('deposited') || t.includes('cr ')) return 'credit';
  return 'unknown';
}

function buildNote(raw: string): string {
  const oneLine = raw.replace(/\s+/g, ' ').trim();
  // Keep it short for UI
  return oneLine.length > 140 ? `${oneLine.slice(0, 137)}...` : oneLine;
}

export function parseBankSms(raw: string): ParsedSmsTransaction {
  const text = (raw ?? '').trim();
  const amount = parseAmount(text);
  const date = parseDate(text);
  const direction = guessDirection(text);

  return {
    raw: text,
    amount,
    currency: amount !== undefined ? 'INR' : 'UNKNOWN',
    direction,
    date,
    note: buildNote(text),
  };
}

