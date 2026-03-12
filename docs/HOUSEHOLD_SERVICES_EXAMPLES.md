# Household Services - Example Data

## Complete Example Setup

### Services

#### 1. Milk (DAILY_QUANTITY)
```json
{
  "id": "milk_service_001",
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

#### 2. Newspaper (DAILY_FIXED)
```json
{
  "id": "newspaper_service_001",
  "userId": "user123",
  "name": "Newspaper",
  "billingType": "DAILY_FIXED",
  "isActive": true,
  "order": 2,
  "createdAt": "2026-01-01T00:00:00Z",
  "updatedAt": "2026-01-01T00:00:00Z"
}
```

#### 3. Maid (MONTHLY_SALARY)
```json
{
  "id": "maid_service_001",
  "userId": "user123",
  "name": "Maid",
  "billingType": "MONTHLY_SALARY",
  "monthlySalary": 5000,
  "allowedLeaves": 2,
  "isActive": true,
  "order": 3,
  "createdAt": "2026-01-01T00:00:00Z",
  "updatedAt": "2026-01-01T00:00:00Z"
}
```

---

### Price History

#### Milk Price History
```json
[
  {
    "id": "milk_price_001",
    "serviceId": "milk_service_001",
    "userId": "user123",
    "price": 60,
    "effectiveDate": "2026-03-01T00:00:00Z",
    "createdAt": "2026-03-01T00:00:00Z"
  },
  {
    "id": "milk_price_002",
    "serviceId": "milk_service_001",
    "userId": "user123",
    "price": 65,
    "effectiveDate": "2026-03-10T00:00:00Z",
    "createdAt": "2026-03-10T00:00:00Z"
  }
]
```

**Result:**
- Dates 1-9 Mar: ₹60 per litre
- Dates 10 Mar onward: ₹65 per litre

#### Newspaper Price History
```json
[
  {
    "id": "newspaper_price_001",
    "serviceId": "newspaper_service_001",
    "userId": "user123",
    "price": 5,
    "effectiveDate": "2026-03-01T00:00:00Z",
    "createdAt": "2026-03-01T00:00:00Z"
  }
]
```

---

### Quantity History

#### Milk Quantity History
```json
[
  {
    "id": "milk_qty_001",
    "serviceId": "milk_service_001",
    "userId": "user123",
    "quantity": 2,
    "effectiveDate": "2026-03-01T00:00:00Z",
    "createdAt": "2026-03-01T00:00:00Z"
  },
  {
    "id": "milk_qty_002",
    "serviceId": "milk_service_001",
    "userId": "user123",
    "quantity": 3,
    "effectiveDate": "2026-03-15T00:00:00Z",
    "createdAt": "2026-03-15T00:00:00Z"
  }
]
```

**Result:**
- Dates 1-14 Mar: 2 litres
- Dates 15 Mar onward: 3 litres

---

### Daily Overrides

#### Example Overrides for March 2026
```json
[
  {
    "id": "override_001",
    "serviceId": "milk_service_001",
    "userId": "user123",
    "date": "2026-03-05T00:00:00Z",
    "overrideType": "quantity",
    "quantity": 3,
    "createdAt": "2026-03-05T00:00:00Z",
    "updatedAt": "2026-03-05T00:00:00Z"
  },
  {
    "id": "override_002",
    "serviceId": "milk_service_001",
    "userId": "user123",
    "date": "2026-03-07T00:00:00Z",
    "overrideType": "skip",
    "createdAt": "2026-03-07T00:00:00Z",
    "updatedAt": "2026-03-07T00:00:00Z"
  },
  {
    "id": "override_003",
    "serviceId": "maid_service_001",
    "userId": "user123",
    "date": "2026-03-10T00:00:00Z",
    "overrideType": "leave",
    "createdAt": "2026-03-10T00:00:00Z",
    "updatedAt": "2026-03-10T00:00:00Z"
  }
]
```

---

### Vacations

```json
[
  {
    "id": "vacation_001",
    "userId": "user123",
    "startDate": "2026-03-20T00:00:00Z",
    "endDate": "2026-03-25T00:00:00Z",
    "name": "Summer Vacation",
    "createdAt": "2026-03-01T00:00:00Z",
    "updatedAt": "2026-03-01T00:00:00Z"
  }
]
```

---

## Expected Ledger Output for March 2026

| Date | Milk | Newspaper | Maid |
|------|------|-----------|------|
| 1 Mar | 2L ₹120 | ₹5 | ✓ |
| 2 Mar | 2L ₹120 | ₹5 | ✓ |
| 3 Mar | 2L ₹120 | ₹5 | ✓ |
| 4 Mar | 2L ₹120 | ₹5 | ✓ |
| 5 Mar | 3L ₹180 | ₹5 | ✓ |
| 6 Mar | 2L ₹120 | ₹5 | ✓ |
| 7 Mar | Skip | ₹5 | ✓ |
| 8 Mar | 2L ₹120 | ₹5 | ✓ |
| 9 Mar | 2L ₹120 | ₹5 | ✓ |
| 10 Mar | 2L ₹130 | ₹5 | Leave |
| 11 Mar | 2L ₹130 | ₹5 | ✓ |
| ... | ... | ... | ... |
| 15 Mar | 3L ₹195 | ₹5 | ✓ |
| ... | ... | ... | ... |
| 20-25 Mar | Vacation | Vacation | Vacation |
| ... | ... | ... | ... |
| 31 Mar | 3L ₹195 | ₹5 | ✓ |

**Notes:**
- 5 Mar: Quantity override to 3L (price still ₹60)
- 7 Mar: Skip override
- 10 Mar: Price changes to ₹65, Maid on leave
- 15 Mar: Quantity changes to 3L (price ₹65)
- 20-25 Mar: Vacation period (all services affected)

---

## Monthly Salary Calculation Example

**Maid Service:**
- Monthly Salary: ₹5000
- Allowed Leaves: 2
- Days in March: 31
- Per Day Salary: ₹5000 / 31 = ₹161.29

**Leaves Taken:**
- 10 Mar: Leave
- 20-25 Mar: Vacation (6 days)
- Total: 7 days

**Calculation:**
- Leaves Taken: 7
- Allowed Leaves: 2
- Extra Leaves: 7 - 2 = 5
- Deduction: 5 × ₹161.29 = ₹806.45
- Final Salary: ₹5000 - ₹806.45 = ₹4193.55

---

## Testing Scenarios

### Scenario 1: Price Change Mid-Month
- Service: Milk
- Price before 10 Mar: ₹60
- Price from 10 Mar: ₹65
- **Expected:** All dates before 10 Mar use ₹60, dates from 10 Mar use ₹65

### Scenario 2: Quantity Change Mid-Month
- Service: Milk
- Quantity before 15 Mar: 2L
- Quantity from 15 Mar: 3L
- **Expected:** All dates before 15 Mar use 2L, dates from 15 Mar use 3L

### Scenario 3: Override Priority
- Service: Milk
- Date: 5 Mar
- Override: Quantity = 3L
- **Expected:** 5 Mar uses 3L (override), not 2L (default)

### Scenario 4: Vacation Override
- Vacation: 20-25 Mar
- **Expected:** All services show "Vacation" status for these dates

### Scenario 5: Monthly Salary with Leaves
- Service: Maid
- Leaves: 7 days
- Allowed: 2 days
- **Expected:** Deduction for 5 extra days
