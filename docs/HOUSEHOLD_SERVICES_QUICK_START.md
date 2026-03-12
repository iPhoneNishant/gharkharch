# Household Services - Quick Start Guide

## How to Make Entries for Household Services

### Step 1: Access Household Services

1. Open the app
2. Go to **More** tab
3. Tap **"Household Services"**

### Step 2: Create a Service

1. In the ledger screen, tap the **⚙️ Settings icon** (top right)
2. Tap **"+ Add New Service"**
3. Fill in the details:

#### For Milk (DAILY_QUANTITY):
- **Name**: Milk
- **Type**: Daily Quantity
- **Default Quantity**: 2
- **Unit**: L (litres)
- Tap **Save**

#### For Newspaper (DAILY_FIXED):
- **Name**: Newspaper
- **Type**: Daily Fixed
- Tap **Save**

#### For Maid/Cook (MONTHLY_SALARY):
- **Name**: Maid (or Cook)
- **Type**: Monthly Salary
- **Monthly Salary**: 5000
- **Allowed Leaves**: 2
- Tap **Save**

### Step 3: Add Price History

1. In the management screen, find your service (e.g., Milk)
2. Tap **"Add Price"**
3. Enter:
   - **Price**: 60 (₹60 per litre)
   - **Effective Date**: 1 Mar 2026
4. Tap **Save**

**To update price later:**
- Add another price entry with a new effective date
- Example: Add ₹65 effective from 10 Mar 2026
- Old dates will use ₹60, new dates will use ₹65

### Step 4: Add Quantity History (for Milk only)

1. Find your Milk service
2. Tap **"Add Quantity"**
3. Enter:
   - **Quantity**: 3 (litres)
   - **Effective Date**: 15 Mar 2026
4. Tap **Save**

**Result:**
- Dates before 15 Mar: 2 litres (default)
- Dates from 15 Mar: 3 litres

### Step 5: View Ledger

1. Go back to the ledger screen
2. You'll see a monthly table with all services
3. Each day shows calculated entries based on:
   - Price history
   - Quantity history
   - Daily overrides (if any)

### Step 6: Add Daily Overrides (Optional)

1. In the ledger screen, tap any cell
2. For Milk: Change quantity or mark as Skip
3. For Maid: Mark as Leave
4. Tap **Save**

## Example Setup

### Complete Milk Setup:

1. **Create Service:**
   - Name: Milk
   - Type: Daily Quantity
   - Default Quantity: 2
   - Unit: L

2. **Add Price:**
   - Price: ₹60
   - Effective Date: 1 Mar 2026

3. **Update Price:**
   - Price: ₹65
   - Effective Date: 10 Mar 2026

4. **Update Quantity:**
   - Quantity: 3
   - Effective Date: 15 Mar 2026

**Result in Ledger:**
- 1-9 Mar: 2L × ₹60 = ₹120
- 10-14 Mar: 2L × ₹65 = ₹130
- 15 Mar onward: 3L × ₹65 = ₹195

### Complete Maid Setup:

1. **Create Service:**
   - Name: Maid
   - Type: Monthly Salary
   - Monthly Salary: ₹5000
   - Allowed Leaves: 2

2. **Mark Leaves:**
   - Tap a date in ledger
   - Mark as "Leave"

**Result:**
- At month end, system calculates:
  - Leaves taken: Count of leave days
  - Extra leaves: Leaves taken - 2 (allowed)
  - Deduction: Extra leaves × (₹5000 / days in month)
  - Final Salary: ₹5000 - Deduction

## Tips

1. **Price Changes**: Always add new price with effective date, don't edit old prices
2. **Quantity Changes**: Same for quantity - add new entry with date
3. **Daily Overrides**: Use for exceptions (skip delivery, change quantity for one day)
4. **Monthly Salary**: System automatically calculates leave deductions at month end
5. **Vacations**: Can be added to affect all services (coming soon)

## Troubleshooting

**Q: Why is my service not showing in ledger?**
- Make sure service is **Active** (check in management screen)

**Q: Why is price showing as ₹0?**
- Add a price history entry with an effective date

**Q: How to change price for past dates?**
- You can't change past prices. Add a new price with a future effective date.

**Q: How to delete a service?**
- Go to management screen → Tap service → Tap "Delete"
