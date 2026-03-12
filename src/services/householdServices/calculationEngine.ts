/**
 * Calculation Engine for Household Services
 * Dynamically calculates service entries based on rules, history, and overrides
 */

import {
  HouseholdService,
  PriceHistoryEntry,
  QuantityHistoryEntry,
  DailyOverride,
  ServiceLedgerEntry,
  MonthlySalaryCalculation,
} from '../../types/householdServices';
import { setMidnightInTimezoneSync } from '../timezoneService';

/**
 * Get price for a specific date based on price history
 * Returns the most recent price that is effective on or before the given date
 */
export function getPriceForDate(
  date: Date,
  priceHistory: PriceHistoryEntry[]
): number | null {
  if (!priceHistory || priceHistory.length === 0) {
    return null;
  }

  // Normalize the target date to midnight for comparison
  const dateOnly = setMidnightInTimezoneSync(new Date(date));

  // Filter prices effective on or before the date
  const applicablePrices = priceHistory.filter(entry => {
    const entryDate = setMidnightInTimezoneSync(new Date(entry.effectiveDate));
    return entryDate <= dateOnly;
  });

  if (applicablePrices.length === 0) {
    return null;
  }

  // Sort by effective date descending (most recent first)
  applicablePrices.sort((a, b) => {
    const dateA = setMidnightInTimezoneSync(new Date(a.effectiveDate));
    const dateB = setMidnightInTimezoneSync(new Date(b.effectiveDate));
    return dateB.getTime() - dateA.getTime();
  });

  return applicablePrices[0].price;
}

/**
 * Get quantity for a specific date based on quantity history
 * Returns the most recent quantity that is effective on or before the given date
 */
export function getQuantityForDate(
  date: Date,
  quantityHistory: QuantityHistoryEntry[]
): number | null {
  if (!quantityHistory || quantityHistory.length === 0) {
    return null;
  }

  // Normalize the target date to midnight for comparison
  const dateOnly = setMidnightInTimezoneSync(new Date(date));

  // Filter quantities effective on or before the date
  const applicableQuantities = quantityHistory.filter(entry => {
    const entryDate = setMidnightInTimezoneSync(new Date(entry.effectiveDate));
    return entryDate <= dateOnly;
  });

  if (applicableQuantities.length === 0) {
    return null;
  }

  // Sort by effective date descending (most recent first)
  applicableQuantities.sort((a, b) => {
    const dateA = setMidnightInTimezoneSync(new Date(a.effectiveDate));
    const dateB = setMidnightInTimezoneSync(new Date(b.effectiveDate));
    return dateB.getTime() - dateA.getTime();
  });

  return applicableQuantities[0].quantity;
}


/**
 * Get override for a specific date and service
 */
export function getOverrideForDate(
  date: Date,
  serviceId: string,
  overrides: DailyOverride[]
): DailyOverride | null {
  if (!overrides || overrides.length === 0) {
    return null;
  }

  const dateStr = formatDateForComparison(date);
  
  return overrides.find(
    override => 
      override.serviceId === serviceId && 
      formatDateForComparison(override.date) === dateStr
  ) || null;
}

/**
 * Format date as YYYY-MM-DD for comparison
 */
export function formatDateForComparison(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Get service ledger entry for a specific date
 * This is the core calculation function that combines all rules
 */
export function getServiceEntryForDate(
  date: Date,
  service: HouseholdService,
  priceHistory: PriceHistoryEntry[],
  quantityHistory: QuantityHistoryEntry[],
  overrides: DailyOverride[]
): ServiceLedgerEntry {
  // Check if date is before service start date
  if (service.startDate) {
    const serviceStartDate = setMidnightInTimezoneSync(new Date(service.startDate));
    const dateOnly = setMidnightInTimezoneSync(new Date(date));
    
    if (dateOnly < serviceStartDate) {
      return {
        date,
        serviceId: service.id,
        serviceName: service.name,
        amount: 0,
        status: 'inactive',
        hasOverride: false,
      };
    }
  }
  
  const override = getOverrideForDate(date, service.id, overrides);

  // Check for explicit override
  if (override) {
    switch (override.overrideType) {
      case 'skip':
        return {
          date,
          serviceId: service.id,
          serviceName: service.name,
          amount: 0,
          status: 'skip',
          hasOverride: true,
          overrideType: 'skip',
        };

      case 'leave':
        return {
          date,
          serviceId: service.id,
          serviceName: service.name,
          amount: 0,
          status: 'leave',
          hasOverride: true,
          overrideType: 'leave',
        };

      case 'holiday':
        return {
          date,
          serviceId: service.id,
          serviceName: service.name,
          amount: 0,
          status: 'holiday',
          hasOverride: true,
          overrideType: 'holiday',
        };

      case 'quantity':
        // Quantity override - calculate with overridden quantity
        if (service.billingType === 'DAILY_QUANTITY') {
          const price = getPriceForDate(date, priceHistory);
          if (price === null) {
            return {
              date,
              serviceId: service.id,
              serviceName: service.name,
              amount: 0,
              status: 'active',
              hasOverride: true,
              overrideType: 'quantity',
              quantity: override.quantity,
            };
          }
          const amount = (override.quantity || 0) * price;
          return {
            date,
            serviceId: service.id,
            serviceName: service.name,
            quantity: override.quantity,
            price,
            amount,
            status: 'active',
            hasOverride: true,
            overrideType: 'quantity',
          };
        }
        break;
    }
  }

  // No override - calculate based on service type
  switch (service.billingType) {
    case 'DAILY_QUANTITY': {
      // Get quantity (from history or default)
      let quantity = getQuantityForDate(date, quantityHistory);
      if (quantity === null) {
        quantity = service.defaultQuantity || 0;
      }

      // Get price (from history)
      const price = getPriceForDate(date, priceHistory);
      if (price === null) {
        return {
          date,
          serviceId: service.id,
          serviceName: service.name,
          amount: 0,
          status: 'active',
          hasOverride: false,
          quantity,
        };
      }

      const amount = quantity * price;
      return {
        date,
        serviceId: service.id,
        serviceName: service.name,
        quantity,
        price,
        amount,
        status: 'active',
        hasOverride: false,
      };
    }

    case 'DAILY_FIXED': {
      // Get price (from history)
      const price = getPriceForDate(date, priceHistory);
      if (price === null) {
        return {
          date,
          serviceId: service.id,
          serviceName: service.name,
          amount: 0,
          status: 'active',
          hasOverride: false,
        };
      }

      return {
        date,
        serviceId: service.id,
        serviceName: service.name,
        price,
        amount: price,
        status: 'active',
        hasOverride: false,
      };
    }

    case 'MONTHLY_SALARY': {
      // Monthly salary services are not calculated daily
      // They are calculated at month end
      return {
        date,
        serviceId: service.id,
        serviceName: service.name,
        amount: 0,
        status: 'active',
        hasOverride: false,
      };
    }

    default:
      return {
        date,
        serviceId: service.id,
        serviceName: service.name,
        amount: 0,
        status: 'active',
        hasOverride: false,
      };
  }
}

/**
 * Calculate monthly salary for a service
 * This handles the leave deduction logic
 * @param endDate Optional end date to calculate till (defaults to end of month)
 */
export function calculateMonthlySalary(
  month: number, // 1-12
  year: number,
  service: HouseholdService,
  overrides: DailyOverride[],
  endDate?: Date // Optional: calculate till this date (defaults to end of month)
): MonthlySalaryCalculation {
  if (service.billingType !== 'MONTHLY_SALARY') {
    throw new Error('Service must be of type MONTHLY_SALARY');
  }

  const monthlySalary = service.monthlySalary || 0;
  const allowedLeaves = service.allowedLeaves || 0;

  // Get all dates in the month
  const daysInMonth = new Date(year, month, 0).getDate();
  
  // Determine the last day to calculate (till today or end of month)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 0);
  
  // Use provided endDate, or today if in current month, or month end if past month
  const calculationEndDate = endDate || (month === today.getMonth() + 1 && year === today.getFullYear() 
    ? today 
    : monthEnd);
  
  const lastDayToCalculate = Math.min(
    calculationEndDate.getDate(),
    daysInMonth
  );
  
  // Check service start date
  const serviceStartDate = service.startDate 
    ? new Date(service.startDate.getFullYear(), service.startDate.getMonth(), service.startDate.getDate())
    : null;
  
  // Determine the first day to calculate (start date or month start)
  const firstDayToCalculate = serviceStartDate && serviceStartDate > monthStart
    ? serviceStartDate.getDate()
    : 1;
  
  const leaveDates: Date[] = [];
  let daysBeforeStart = 0;

  // Count leaves and days before start date till the calculation end date
  for (let day = 1; day <= lastDayToCalculate; day++) {
    const date = new Date(year, month - 1, day);
    
    // Check if date is before service start date
    if (serviceStartDate && date < serviceStartDate) {
      daysBeforeStart++;
      continue; // Don't count this day in leaves or working days
    }
    
    const override = getOverrideForDate(date, service.id, overrides);

    // Check if this date is marked as leave
    if (override?.overrideType === 'leave') {
      leaveDates.push(date);
    }
  }

  const leavesTaken = leaveDates.length;
  const extraLeaves = Math.max(0, leavesTaken - allowedLeaves);
  const perDaySalary = monthlySalary / daysInMonth;
  const deduction = extraLeaves * perDaySalary;
  
  // Calculate pro-rated salary if calculating till today
  // Exclude days before start date from total working days
  const totalWorkingDays = (lastDayToCalculate - daysBeforeStart) - leavesTaken;
  const proRatedSalary = (monthlySalary / daysInMonth) * totalWorkingDays;
  const finalSalary = Math.max(0, proRatedSalary - deduction);

  return {
    serviceId: service.id,
    serviceName: service.name,
    month,
    year,
    monthlySalary,
    daysInMonth,
    perDaySalary,
    totalWorkingDays,
    leavesTaken,
    allowedLeaves,
    extraLeaves,
    deduction,
    finalSalary,
    leaveDates,
  };
}

/**
 * Generate monthly ledger rows for all services
 */
export function generateMonthlyLedger(
  month: number, // 1-12
  year: number,
  services: HouseholdService[],
  priceHistory: PriceHistoryEntry[],
  quantityHistory: QuantityHistoryEntry[],
  overrides: DailyOverride[]
): ServiceLedgerEntry[][] {
  const daysInMonth = new Date(year, month, 0).getDate();
  const rows: ServiceLedgerEntry[][] = [];

  // Filter active services
  const activeServices = services.filter(s => s.isActive);

  // Generate entries for each day
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month - 1, day);
    const dayEntries: ServiceLedgerEntry[] = [];

    // Calculate entry for each active service
    for (const service of activeServices) {
      // Check if service has a start date and if current date is before it
      const serviceStartDate = service.startDate 
        ? new Date(service.startDate.getFullYear(), service.startDate.getMonth(), service.startDate.getDate())
        : null;
      
      if (serviceStartDate && date < serviceStartDate) {
        // Service hasn't started yet
        dayEntries.push({
          date,
          serviceId: service.id,
          serviceName: service.name,
          amount: 0,
          status: 'inactive',
          hasOverride: false,
        });
        continue;
      }
      
      const entry = getServiceEntryForDate(
        date,
        service,
        priceHistory.filter(p => p.serviceId === service.id),
        quantityHistory.filter(q => q.serviceId === service.id),
        overrides.filter(o => o.serviceId === service.id)
      );
      dayEntries.push(entry);
    }

    rows.push(dayEntries);
  }

  return rows;
}
