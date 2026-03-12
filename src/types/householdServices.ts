/**
 * Household Services Module Types
 * For managing recurring household services like Milk, Newspaper, Maid, Cook, etc.
 */

/**
 * Service billing types
 */
export type ServiceBillingType = 'DAILY_QUANTITY' | 'DAILY_FIXED' | 'MONTHLY_SALARY';

/**
 * Override types for daily entries
 */
export type OverrideType = 'quantity' | 'skip' | 'leave' | 'holiday';

/**
 * Service represents a household service (Milk, Newspaper, Maid, etc.)
 */
export interface HouseholdService {
  id: string;
  userId: string;
  name: string; // e.g., "Milk", "Newspaper", "Maid", "Cook"
  billingType: ServiceBillingType;
  
  // For DAILY_QUANTITY (Milk)
  defaultQuantity?: number; // e.g., 2 (litres)
  unit?: string; // e.g., "L", "kg"
  
  // For DAILY_FIXED (Newspaper)
  // No additional fields needed
  
  // For MONTHLY_SALARY (Maid, Cook, Helpers)
  monthlySalary?: number;
  allowedLeaves?: number; // per month
  
  // Common fields
  isActive: boolean;
  startDate?: Date; // Date from which service is active
  createdAt: Date;
  updatedAt: Date;
  order: number; // For sorting in UI
}

/**
 * Price history entry - tracks price changes over time
 */
export interface PriceHistoryEntry {
  id: string;
  serviceId: string;
  userId: string;
  price: number;
  effectiveDate: Date; // Date from which this price is effective
  createdAt: Date;
  updatedAt?: Date; // Optional, only present if entry was updated
}

/**
 * Quantity history entry - tracks quantity changes over time (for DAILY_QUANTITY services)
 */
export interface QuantityHistoryEntry {
  id: string;
  serviceId: string;
  userId: string;
  quantity: number;
  effectiveDate: Date; // Date from which this quantity is effective
  createdAt: Date;
  updatedAt?: Date; // Optional, only present if entry was updated
}

/**
 * Daily override - user can override a specific date
 */
export interface DailyOverride {
  id: string;
  serviceId: string;
  userId: string;
  date: Date; // YYYY-MM-DD format
  overrideType: OverrideType;
  
  // For quantity override
  quantity?: number;
  
  // For skip/leave/holiday
  // overrideType indicates the type
  
  createdAt: Date;
  updatedAt: Date;
}


/**
 * Ledger entry for a specific date and service
 */
export interface ServiceLedgerEntry {
  date: Date;
  serviceId: string;
  serviceName: string;
  
  // Calculated values
  quantity?: number;
  price?: number;
  amount: number; // Final calculated amount
  
  // Status
  status: 'active' | 'skip' | 'leave' | 'holiday' | 'inactive';
  
  // Override info
  hasOverride: boolean;
  overrideType?: OverrideType;
}

/**
 * Monthly ledger row - one row per date
 */
export interface MonthlyLedgerRow {
  date: Date;
  entries: ServiceLedgerEntry[]; // One entry per active service
  totalAmount: number; // Sum of all service amounts for this date
}

/**
 * Monthly salary calculation result
 */
export interface MonthlySalaryCalculation {
  serviceId: string;
  serviceName: string;
  month: number; // 1-12
  year: number;
  monthlySalary: number;
  daysInMonth: number;
  perDaySalary: number;
  totalWorkingDays: number; // Total days worked (excluding leaves, holidays)
  leavesTaken: number;
  allowedLeaves: number;
  extraLeaves: number; // leavesTaken - allowedLeaves
  deduction: number; // extraLeaves * perDaySalary
  finalSalary: number; // monthlySalary - deduction
  leaveDates: Date[]; // Dates marked as leave
}

/**
 * Request/Response types for API calls
 */
export interface CreateServiceRequest {
  name: string;
  billingType: ServiceBillingType;
  defaultQuantity?: number;
  unit?: string;
  monthlySalary?: number;
  allowedLeaves?: number;
  startDate?: string; // ISO date string
}

export interface UpdateServiceRequest {
  name?: string;
  defaultQuantity?: number;
  unit?: string;
  monthlySalary?: number;
  allowedLeaves?: number;
  isActive?: boolean;
  order?: number;
  startDate?: string; // ISO date string
}

export interface AddPriceHistoryRequest {
  serviceId: string;
  price: number;
  effectiveDate: string; // ISO date string
}

export interface AddQuantityHistoryRequest {
  serviceId: string;
  quantity: number;
  effectiveDate: string; // ISO date string
}

export interface AddDailyOverrideRequest {
  serviceId: string;
  date: string; // YYYY-MM-DD
  overrideType: OverrideType;
  quantity?: number;
}

