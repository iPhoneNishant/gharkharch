# Household Services Module - Implementation Guide

## Overview

The Household Services module is a comprehensive system for managing recurring household services like Milk, Newspaper, Maid, Cook, and Helpers. It provides:

- **Three billing types**: DAILY_QUANTITY, DAILY_FIXED, MONTHLY_SALARY
- **Price history**: Track price changes with effective dates
- **Quantity history**: Track quantity changes for milk-type services
- **Daily overrides**: Override specific dates (quantity, skip, leave, holiday, vacation)
- **Monthly ledger**: Dynamic calculation of daily entries
- **Monthly salary calculation**: Automatic leave deduction for salary-based services

## Architecture

### File Structure

```
src/
├── types/
│   └── householdServices.ts          # TypeScript types and interfaces
├── services/
│   └── householdServices/
│       ├── calculationEngine.ts      # Core calculation logic
│       └── householdServicesService.ts # Firestore CRUD operations
└── screens/
    └── HouseholdServicesLedgerScreen.tsx # Main ledger UI
```

### Key Components

1. **Type Definitions** (`src/types/householdServices.ts`)
   - All TypeScript interfaces
   - Request/Response types
   - Ledger entry types

2. **Calculation Engine** (`src/services/householdServices/calculationEngine.ts`)
   - `getPriceForDate()` - Get price for a specific date
   - `getQuantityForDate()` - Get quantity for a specific date
   - `getServiceEntryForDate()` - Calculate complete entry for a date
   - `calculateMonthlySalary()` - Calculate monthly salary with leave deduction
   - `generateMonthlyLedger()` - Generate all ledger rows for a month

3. **Firestore Service** (`src/services/householdServices/householdServicesService.ts`)
   - CRUD operations for all collections
   - Real-time subscriptions
   - Data conversion helpers

4. **Ledger Screen** (`src/screens/HouseholdServicesLedgerScreen.tsx`)
   - Monthly table view
   - Entry editing
   - Override management

## Setup Instructions

### 1. Deploy Firestore Schema

Add the collections and indexes as documented in `HOUSEHOLD_SERVICES_SCHEMA.md`:

```bash
# Update firestore.indexes.json with new indexes
# Update firestore.rules with new security rules

# Deploy
firebase deploy --only firestore
```

### 2. Add to Navigation

Add the ledger screen to your navigation:

```typescript
// In RootStackParamList or MainTabNavigator
import HouseholdServicesLedgerScreen from './screens/HouseholdServicesLedgerScreen';

// Add route
<Stack.Screen 
  name="HouseholdServicesLedger" 
  component={HouseholdServicesLedgerScreen} 
/>
```

### 3. Create Service Management Screen (Optional)

You may want to create a separate screen for managing services (CRUD operations). Use the service functions:

```typescript
import {
  createService,
  updateService,
  deleteService,
  addPriceHistory,
  addQuantityHistory,
} from '../services/householdServices/householdServicesService';
```

## Usage Examples

### Creating a Service

```typescript
import { createService } from '../services/householdServices/householdServicesService';

// Create Milk service
const milkServiceId = await createService({
  name: 'Milk',
  billingType: 'DAILY_QUANTITY',
  defaultQuantity: 2,
  unit: 'L',
});

// Add initial price
await addPriceHistory({
  serviceId: milkServiceId,
  price: 60,
  effectiveDate: '2026-03-01',
});
```

### Adding Price History

```typescript
// Price increases from ₹60 to ₹65 on 10 Mar
await addPriceHistory({
  serviceId: milkServiceId,
  price: 65,
  effectiveDate: '2026-03-10',
});
```

### Adding Daily Override

```typescript
import { addDailyOverride } from '../services/householdServices/householdServicesService';

// Skip delivery on 7 Mar
await addDailyOverride({
  serviceId: milkServiceId,
  date: '2026-03-07',
  overrideType: 'skip',
});

// Change quantity on 5 Mar
await addDailyOverride({
  serviceId: milkServiceId,
  date: '2026-03-05',
  overrideType: 'quantity',
  quantity: 3,
});
```

### Calculating Monthly Salary

```typescript
import { calculateMonthlySalary } from '../services/householdServices/calculationEngine';

const calculation = calculateMonthlySalary(
  3, // March
  2026,
  maidService,
  overrides,
  vacations
);

console.log(`Final Salary: ₹${calculation.finalSalary}`);
```

## Performance Optimization

### 1. Data Loading Strategy

**Current Implementation:**
- Loads all price/quantity history on mount
- Subscribes to real-time updates
- Generates ledger rows on-demand

**Optimization Tips:**

1. **Cache History Data**
   ```typescript
   // Cache price/quantity history in memory
   const [priceHistoryCache, setPriceHistoryCache] = useState<Map<string, PriceHistoryEntry[]>>(new Map());
   ```

2. **Lazy Load History**
   ```typescript
   // Only load history for active services
   const activeServiceIds = services.filter(s => s.isActive).map(s => s.id);
   ```

3. **Limit Date Range**
   ```typescript
   // Only load overrides for current month ± 1 month
   const startDate = new Date(year, month - 2, 1);
   const endDate = new Date(year, month + 1, 0);
   ```

### 2. Calculation Optimization

**Memoization:**
```typescript
// Memoize ledger rows
const ledgerRows = useMemo(() => {
  return generateMonthlyLedger(month, year, services, ...);
}, [month, year, services, priceHistory, quantityHistory, overrides, vacations]);
```

**Batch Calculations:**
```typescript
// Calculate all entries in a single pass
const entries = services.map(service => 
  getServiceEntryForDate(date, service, ...)
);
```

### 3. Query Optimization

**Use Composite Indexes:**
- All date range queries use composite indexes
- Indexes are defined in `firestore.indexes.json`

**Limit Query Scope:**
```typescript
// Only query current month
const startDate = new Date(year, month - 1, 1);
const endDate = new Date(year, month, 0);
```

## Testing

### Unit Tests

Test calculation engine functions:

```typescript
describe('getPriceForDate', () => {
  it('should return most recent price before date', () => {
    const history = [
      { price: 60, effectiveDate: new Date('2026-03-01') },
      { price: 65, effectiveDate: new Date('2026-03-10') },
    ];
    
    const price = getPriceForDate(new Date('2026-03-15'), history);
    expect(price).toBe(65);
  });
});
```

### Integration Tests

Test complete ledger generation:

```typescript
describe('generateMonthlyLedger', () => {
  it('should generate correct entries for March', () => {
    const rows = generateMonthlyLedger(3, 2026, services, ...);
    expect(rows.length).toBe(31); // 31 days in March
  });
});
```

## Troubleshooting

### Issue: Ledger entries not calculating correctly

**Check:**
1. Price/quantity history has correct effective dates
2. Overrides are in the correct date range
3. Service billing type matches expected calculation

### Issue: Monthly salary calculation incorrect

**Check:**
1. Leaves are marked with `overrideType: 'leave'`
2. Vacations are properly defined
3. `allowedLeaves` is set correctly

### Issue: Performance issues with large datasets

**Solutions:**
1. Implement caching for price/quantity history
2. Limit date range queries
3. Use pagination for large months
4. Consider server-side calculation for very large datasets

## Future Enhancements

1. **Service Templates**: Pre-defined service templates
2. **Bulk Operations**: Bulk override for date ranges
3. **Export/Import**: Export ledger to CSV/Excel
4. **Analytics**: Monthly/yearly summaries and trends
5. **Notifications**: Reminders for price changes, leaves, etc.
6. **Multi-Currency**: Support for different currencies
7. **Service Groups**: Group related services together

## Support

For issues or questions:
1. Check the schema documentation: `HOUSEHOLD_SERVICES_SCHEMA.md`
2. Review example data: `HOUSEHOLD_SERVICES_EXAMPLES.md`
3. Check calculation logic in `calculationEngine.ts`
