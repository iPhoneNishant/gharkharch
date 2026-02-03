/**
 * Simple store to pass SMS import data back to AddTransaction screen
 */

interface SmsImportData {
  amount: number;
  note?: string;
  date: string; // ISO string
  timestamp: number;
}

let smsImportData: SmsImportData | null = null;

export const setSmsImportData = (data: Omit<SmsImportData, 'timestamp'>) => {
  smsImportData = {
    ...data,
    timestamp: Date.now(),
  };
};

export const getSmsImportData = (): SmsImportData | null => {
  return smsImportData;
};

export const clearSmsImportData = () => {
  smsImportData = null;
};
