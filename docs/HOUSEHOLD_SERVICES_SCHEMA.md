# Household Services Module - Firestore Schema

## Overview

The Household Services module uses 5 Firestore collections to manage recurring household services like Milk, Newspaper, Maid, Cook, and Helpers.

## Collections

### 1. `householdServices`

Main collection storing service definitions.

**Document Structure:**
```typescript
{
  userId: string;              // Owner's Firebase Auth UID
  name: string;                 // e.g., "Milk", "Newspaper", "Maid"
  billingType: 'DAILY_QUANTITY' | 'DAILY_FIXED' | 'MONTHLY_SALARY';
  
  // For DAILY_QUANTITY services (Milk)
  defaultQuantity?: number;    // e.g., 2 (litres)
  unit?: string;               // e.g., "L", "kg"
  
  // For MONTHLY_SALARY services (Maid, Cook)
  monthlySalary?: number;      // e.g., 5000
  allowedLeaves?: number;      // e.g., 2 (per month)
  
  // Common fields
  isActive: boolean;
  order: number;                // For sorting in UI
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

**Indexes Required:**
- `userId` (Ascending) + `order` (Ascending)
- `userId` (Ascending) + `isActive` (Ascending)

**Example Document:**
```json
{
  "userId": "user123",
  "name": "Milk",
  "billingType": "DAILY_QUANTITY",
  "defaultQuantity": 2,
  "unit": "L",
  "isActive": true,
  "order": 1,
  "createdAt": "2026-01-01T00:00:00Z",
  "updatedAt": "2026-01-01T00:00:00Z"
}
```

---

### 2. `householdServicePriceHistory`

Stores price changes over time with effective dates.

**Document Structure:**
```typescript
{
  serviceId: string;           // Reference to householdServices document
  userId: string;
  price: number;               // Price value
  effectiveDate: Timestamp;   // Date from which this price is effective
  createdAt: Timestamp;
}
```

**Indexes Required:**
- `serviceId` (Ascending) + `effectiveDate` (Descending)
- `userId` (Ascending) + `serviceId` (Ascending)

**Example Document:**
```json
{
  "serviceId": "milk_service_id",
  "userId": "user123",
  "price": 60,
  "effectiveDate": "2026-03-01T00:00:00Z",
  "createdAt": "2026-03-01T00:00:00Z"
}
```

**Price History Example:**
- ₹60 effective from 1 Mar 2026
- ₹65 effective from 10 Mar 2026
- Older dates (before 10 Mar) will use ₹60
- Dates from 10 Mar onward will use ₹65

---

### 3. `householdServiceQuantityHistory`

Stores quantity changes over time (only for DAILY_QUANTITY services).

**Document Structure:**
```typescript
{
  serviceId: string;
  userId: string;
  quantity: number;            // Quantity value
  effectiveDate: Timestamp;   // Date from which this quantity is effective
  createdAt: Timestamp;
}
```

**Indexes Required:**
- `serviceId` (Ascending) + `effectiveDate` (Descending)
- `userId` (Ascending) + `serviceId` (Ascending)

**Example Document:**
```json
{
  "serviceId": "milk_service_id",
  "userId": "user123",
  "quantity": 2,
  "effectiveDate": "2026-03-01T00:00:00Z",
  "createdAt": "2026-03-01T00:00:00Z"
}
```

**Quantity History Example:**
- 2 litres effective from 1 Mar 2026
- 3 litres effective from 15 Mar 2026
- Older dates (before 15 Mar) will use 2 litres
- Dates from 15 Mar onward will use 3 litres

---

### 4. `householdServiceDailyOverrides`

Stores daily overrides (quantity changes, skip, leave, holiday, vacation).

**Document Structure:**
```typescript
{
  serviceId: string;
  userId: string;
  date: Timestamp;            // Date of override (YYYY-MM-DD)
  overrideType: 'quantity' | 'skip' | 'leave' | 'holiday' | 'vacation';
  quantity?: number;          // Only for quantity override
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

**Indexes Required:**
- `userId` (Ascending) + `date` (Ascending)
- `serviceId` (Ascending) + `date` (Ascending)
- `userId` (Ascending) + `serviceId` (Ascending) + `date` (Ascending)

**Example Documents:**

**Quantity Override:**
```json
{
  "serviceId": "milk_service_id",
  "userId": "user123",
  "date": "2026-03-05T00:00:00Z",
  "overrideType": "quantity",
  "quantity": 3,
  "createdAt": "2026-03-05T00:00:00Z",
  "updatedAt": "2026-03-05T00:00:00Z"
}
```

**Skip Override:**
```json
{
  "serviceId": "milk_service_id",
  "userId": "user123",
  "date": "2026-03-07T00:00:00Z",
  "overrideType": "skip",
  "createdAt": "2026-03-07T00:00:00Z",
  "updatedAt": "2026-03-07T00:00:00Z"
}
```

**Leave Override:**
```json
{
  "serviceId": "maid_service_id",
  "userId": "user123",
  "date": "2026-03-10T00:00:00Z",
  "overrideType": "leave",
  "createdAt": "2026-03-10T00:00:00Z",
  "updatedAt": "2026-03-10T00:00:00Z"
}
```

---

### 5. `householdServiceVacations`

Stores vacation periods that affect all services.

**Document Structure:**
```typescript
{
  userId: string;
  startDate: Timestamp;
  endDate: Timestamp;
  name?: string;              // Optional name for the vacation
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

**Indexes Required:**
- `userId` (Ascending) + `startDate` (Descending)

**Example Document:**
```json
{
  "userId": "user123",
  "startDate": "2026-03-20T00:00:00Z",
  "endDate": "2026-03-25T00:00:00Z",
  "name": "Summer Vacation",
  "createdAt": "2026-03-01T00:00:00Z",
  "updatedAt": "2026-03-01T00:00:00Z"
}
```

---

## Security Rules

Add these rules to `firestore.rules`:

```javascript
// Household Services
match /householdServices/{serviceId} {
  allow read: if request.auth != null && request.auth.uid == resource.data.userId;
  allow write: if false; // All writes go through Cloud Functions
}

match /householdServicePriceHistory/{entryId} {
  allow read: if request.auth != null && request.auth.uid == resource.data.userId;
  allow write: if false;
}

match /householdServiceQuantityHistory/{entryId} {
  allow read: if request.auth != null && request.auth.uid == resource.data.userId;
  allow write: if false;
}

match /householdServiceDailyOverrides/{overrideId} {
  allow read: if request.auth != null && request.auth.uid == resource.data.userId;
  allow write: if false;
}

match /householdServiceVacations/{vacationId} {
  allow read: if request.auth != null && request.auth.uid == resource.data.userId;
  allow write: if false;
}
```

---

## Firestore Indexes

Add these indexes to `firestore.indexes.json`:

```json
{
  "indexes": [
    {
      "collectionGroup": "householdServices",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "userId", "order": "ASCENDING" },
        { "fieldPath": "order", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "householdServicePriceHistory",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "serviceId", "order": "ASCENDING" },
        { "fieldPath": "effectiveDate", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "householdServiceQuantityHistory",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "serviceId", "order": "ASCENDING" },
        { "fieldPath": "effectiveDate", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "householdServiceDailyOverrides",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "userId", "order": "ASCENDING" },
        { "fieldPath": "date", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "householdServiceDailyOverrides",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "serviceId", "order": "ASCENDING" },
        { "fieldPath": "date", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "householdServiceVacations",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "userId", "order": "ASCENDING" },
        { "fieldPath": "startDate", "order": "DESCENDING" }
      ]
    }
  ]
}
```

---

## Calculation Logic

### Price Lookup
1. Filter price history entries where `effectiveDate <= targetDate`
2. Sort by `effectiveDate` descending
3. Return the most recent price

### Quantity Lookup
1. Filter quantity history entries where `effectiveDate <= targetDate`
2. Sort by `effectiveDate` descending
3. Return the most recent quantity, or use `defaultQuantity` if none found

### Daily Entry Calculation Priority
1. **Vacation** (highest priority) - Check if date falls within any vacation period
2. **Explicit Override** - Check for daily override (skip, leave, holiday, quantity)
3. **Service Rules** - Calculate based on service type and history

### Monthly Salary Calculation
1. Count leaves in the month (dates marked as 'leave' or in vacation)
2. Calculate: `extraLeaves = leavesTaken - allowedLeaves`
3. Calculate: `perDaySalary = monthlySalary / daysInMonth`
4. Calculate: `deduction = extraLeaves * perDaySalary`
5. Calculate: `finalSalary = monthlySalary - deduction`

---

## Performance Considerations

### Query Optimization
- Use composite indexes for date range queries
- Limit date range queries to current month ± 1 month
- Cache price/quantity history in memory for the current month

### Data Volume
- Price history: ~12 entries per service per year (monthly updates)
- Quantity history: ~12 entries per service per year
- Daily overrides: ~30-60 entries per month (only for exceptions)
- Vacations: ~2-4 entries per year

### Scalability
- For 10 services over 1 year:
  - Services: 10 documents
  - Price history: ~120 documents
  - Quantity history: ~120 documents
  - Daily overrides: ~360-720 documents
  - Vacations: ~20-40 documents
  - **Total: ~630-1010 documents per user per year**

- For 1000 users over 1 year:
  - **Total: ~630K - 1M documents**

This is well within Firestore's limits (millions of documents per collection).

---

## Example Data Setup

See `docs/HOUSEHOLD_SERVICES_EXAMPLES.md` for complete example data.
