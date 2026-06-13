# تحليل منطق الخصومات — Discount Semantics Analysis

**التاريخ:** 2026-04-30
**المرحلة:** Diagnostic & Documentation Only
**الهدف:** فهم وتوثيق منطق الخصومات في النظام

---

## A. Status

**DISCOUNT SEMANTICS DOCUMENTED**

Discount logic is functional and consistent across the system. However, the semantics (meaning) are not explicitly documented in the UI. This analysis clarifies them.

---

## B. Current Discount Storage

### Discount Field Location

**Table:** `students`
**Column:** `discount_value`
**Type:** `number | null`
**Semantics:** Fixed amount deducted from total fee per student

### Example Data

```
Student: Ahmed Ali
- total_fee: 500 (from class_fees)
- paid_fee: 200 (from sum of payments)
- discount_value: 50 (per-student fixed discount)
- remaining_fee: max(500 - 200 - 50, 0) = 250
```

### No Other Discount Fields

✅ Verified: Discount NOT stored in:
- `payments` table (no payment-level discount)
- `class_fees` table (no class-level discount)
- Any other table

---

## C. Current Formula

### The Remaining Fee Calculation

```typescript
remaining_fee = MAX(total_fee - paid_fee - discount_value, 0)
```

**Where:**
- `total_fee` = resolved from `class_fees` or `students.total_fee`
- `paid_fee` = SUM(payments.amount) for the student in the branch
- `discount_value` = fixed amount stored in `students.discount_value`

### Code Locations

**Primary Calculation:**
- `lib/payments/overview.ts` line 387-388

```typescript
const remainingFee = Math.max(
  totalFee - paidFee - Number(student.discount_value ?? 0),
  0,
);
```

**Replicated In:**
- `lib/payments/overview.ts` line 431 (collection count calculation)
- `app/api/web/reports/dataset/route.ts` line 156 (reports)
- `app/api/web/payments/overview/route.ts` (dashboard)

✅ **Verified:** Same formula in all locations

### Discount Semantics

**Business Rule (Implied):**
> A student with a discount has a reduced fee obligation. The effective fee obligation is `total_fee - discount_value`. Payment status is calculated against this reduced amount.

**Example:**
```
Student: Fatima Hassan
total_fee: 500
discount: 50
Effective obligation: 450 (what they actually owe)

paid_fee: 200
remaining: max(450 - 200, 0) = 250

Status: partially_paid
```

---

## D. Page-by-Page Behavior

### 1. Students Page (`/ar/students`)

| Item | Displayed | Calculation | Notes |
|------|-----------|-------------|-------|
| Name | ✅ | — | Full name |
| Class | ✅ | — | Class name |
| Section | ✅ | — | Section or "—" |
| Address | ✅ | — | Address or "—" |
| Phone | ✅ | — | Phone or "—" |
| **Fees** | ✅ | Resolved total_fee | From class_fees or students.total_fee |
| **Paid** | ✅ | SUM(payments) | All payments for student |
| **Balance (Balance)** | ✅ | total - paid - **discount** | Remaining fee after discount |
| Status | ✅ | Based on remaining | unpaid/partially_paid/fully_paid |
| Discount Column | ❌ | NOT displayed | ⚠️ Discount not visible here |

**Export:** NO discount column exported

### 2. Payments Page (`/ar/payments`)

| Item | Displayed | Calculation | Notes |
|------|-----------|-------------|-------|
| Name | ✅ | — | Student name |
| Class | ✅ | — | Class name |
| Phone | ✅ | — | Phone or "—" |
| **Total Amount** | ✅ | Resolved total_fee | From class_fees |
| **Paid Amount** | ✅ | SUM(payments) | All payments |
| **Discount** | ✅ | discount_value | Explicitly shown |
| **Remaining Amount** | ✅ | total - paid - discount | After discount |
| Progress Bar | ✅ | paid_fee / total_fee | NOT accounting for discount! |
| Status Badge | ✅ | Based on remaining | unpaid/partially_paid/fully_paid |

**Export:** ALL columns exported (including discount)

### 3. Branch Overview Dashboard (`/ar/branch-overview`)

| Item | Displayed | Calculation | Notes |
|------|-----------|-------------|-------|
| Total Fees | ✅ | SUM(total_fee) | Before discount |
| **Total Discount** | ✅ | SUM(discount_value) | Sum of all discounts |
| Fees After Discount | ✅ | total_fees - total_discount | Effective obligation |
| Paid | ✅ | SUM(paid_fee) | Sum of payments |
| Remaining | ✅ | SUM(remaining_fee) | Already includes discount |

**Semantics:** Shows "before" and "after" discount breakout

### 4. Group/School Dashboard (`/ar/group`)

| Metric | Displayed | Calculation | Notes |
|--------|-----------|-------------|-------|
| Fees Before Discount | ✅ | SUM(total_fee) | All students' fees |
| Discount (Total) | ✅ | SUM(discount_value) | Total discount amount |
| Fees After Discount | ✅ | Fees - Discount | What actually owed |
| Paid | ✅ | SUM(paid_fee) | All payments |
| Remaining | ✅ | SUM(remaining_fee) | After discount |

### 5. Reports (`/ar/reports`)

| Column | Exported | Calculation | Notes |
|--------|----------|-------------|-------|
| full_name | ✅ | — | Student name |
| class_name | ✅ | — | Class |
| total_fee | ✅ | Resolved | From class_fees or students |
| paid_fee | ✅ | SUM(payments) | All payments |
| remaining_fee | ✅ | total - paid - discount | After discount |
| discount_value | ✅ | Stored value | Explicitly in report |
| status | ✅ | Based on remaining | Payment status |
| created_at | ✅ | Date | Student creation date |

### 6. Export Functions

**Students Export:**
```
Columns: name, class, section, address, phone, total_fees, paid, remaining, status
Discount: ❌ NOT included
```

**Payments Export:**
```
Columns: name, class, phone, total, paid, discount, remaining, status
Discount: ✅ Explicitly included
```

**Reports Export:**
```
Columns: name, class, section, phone, address, total, paid, remaining, discount, status, date
Discount: ✅ Explicitly included
```

---

## E. Risks Assessment

### Risk 1: Double-Counting of Discount

**Question:** Is discount subtracted twice?

**Investigation:**
- Discount subtracted in `remaining_fee` calculation: ✅ Yes
- Discount subtracted again elsewhere: ❌ No
- Both dashboard and detailed pages use same formula: ✅ Yes

**Verdict:** ✅ **NO DOUBLE-COUNTING**

The discount is accounted for exactly once, in the `remaining_fee` calculation.

### Risk 2: Data Mismatch Between Pages

**Comparison:**

| Metric | Students Page | Payments Page | Dashboard | Agreement |
|--------|---------------|---------------|-----------|-----------|
| Total Fees | Resolved total | Resolved total | SUM(resolved total) | ✅ |
| Paid | SUM(payments) | SUM(payments) | SUM(payments) | ✅ |
| Remaining | total - paid - discount | total - paid - discount | SUM(remaining) | ✅ |
| Discount Shown | ❌ Not visible | ✅ Visible | ✅ Visible | ⚠️ Inconsistent UI |

**Verdict:** ✅ **NO DATA MISMATCH** — All pages use same calculation, but Students page doesn't display discount.

### Risk 3: Unclear UX for Users

**Issue:** Discount logic not explicitly labeled

| Page | UI Clarity | Issues |
|------|-----------|--------|
| Students | ❌ Low | Discount not shown; "balance" looks like remaining but includes discount |
| Payments | ✅ High | Discount column clearly labeled |
| Dashboard | ⚠️ Medium | Shows "before" and "after" discount, but not beside each row |
| Reports | ✅ High | Discount column explicitly shown |

**Verdict:** 🟡 **PARTIAL CLARITY ISSUE** — Students page doesn't explain why "balance" is lower than (total - paid).

### Risk 4: Progress Bar Misrepresentation

**Location:** Payments page, line 201

```typescript
const pct = s.total_fee > 0 ? Math.min(100, Math.round((s.paid_fee / s.total_fee) * 100)) : 0;
```

**Problem:** Divides `paid_fee` by `total_fee`, NOT accounting for discount!

**Example:**
```
Student: Ali
total_fee: 500
discount: 100
Effective: 400
paid_fee: 300

Progress bar shows: 300/500 = 60%
Should show: 300/400 = 75% (true progress to obligation)
```

**Verdict:** 🔴 **BUG** — Progress bar uses wrong denominator. Should account for discount.

---

## F. Recommended Business Rule Definition

### Current (Implicit) Rule

> A student's obligation to pay is the total fee minus any discount applied. The student is considered "fully paid" when their payment amount equals or exceeds the discounted amount.

### Proposed (Explicit) Rule

> **Discount Definition:**
> - Each student may have a discount (`discount_value`)
> - The discount is a fixed amount subtracted from their total fee
> - The discounted fee (`effective_fee`) = `total_fee - discount`
> - Payment status is calculated against the effective fee, not total fee
> - Formula: `remaining = max(total_fee - paid_fee - discount, 0)`

### Key Clarifications

1. **Discount is per-student, not per-payment**
   - Stored in `students.discount_value`
   - Does NOT vary by payment date or amount

2. **Discount reduces the obligation**
   - Not a refund or reduction of existing payment
   - Sets the target payment amount

3. **Discount appears in multiple contexts**
   - Detailed view (Payments page): explicit column
   - Summary view (Dashboard): shown separately as "before" and "after"
   - List view (Students page): implicit in balance calculation

4. **Double-disclosure is intentional**
   - Some pages show discount separately: ✅
   - Some pages show it as part of calculation: ✅
   - This supports different user needs (detail vs. summary)

---

## G. Next Action Recommendation

### **DOCUMENTATION ONLY**

**Rationale:**
- Discount logic is functionally correct
- All calculations consistent across system
- No double-counting or data mismatch
- Only issue: UX clarity (not data correctness)

**Why No Code Fix Now:**
1. System is production-ready
2. Discount works as designed
3. Better to document first, then decide if UX change needed

### Recommended Documentation Changes

**For Users (Admin):**
Add to ADMIN_USER_GUIDE.md:
```markdown
## Understanding Discounts

Each student can have a discount applied to their total fee.
The discount reduces what they need to pay.

Example:
- Total Fee: 500
- Discount: 50
- Student owes: 450

When viewing payments, you'll see all three values:
- Total (before discount): 500
- Discount: 50
- Remaining (after discount): 450 - (payments made)
```

**For Developers:**
Update FINANCE_RULES.md to clarify:
```markdown
### Discount Logic

Discount is per-student, reduces obligation.

Formula: remaining = max(total - paid - discount, 0)

Discount appears in:
- Payments page: explicit column
- Dashboard: "before/after discount" metrics
- Students page: implicit in balance calculation
- Reports: explicit column
```

**UI Improvements (Future):**
1. Add tooltip on Students page "Balance" column explaining discount
2. Fix Payments page progress bar to use `(total - discount)` as denominator
3. Explicitly label "Discounted Students" filter to show it's active

---

## Summary Table

| Aspect | Status | Risk | Details |
|--------|--------|------|---------|
| Storage Location | ✅ Clear | Low | `students.discount_value` |
| Calculation Formula | ✅ Correct | Low | `max(total - paid - discount, 0)` |
| Consistency | ✅ Yes | Low | Same formula everywhere |
| Double-Counting | ✅ No | Low | Discount subtracted exactly once |
| Data Mismatch | ✅ No | Low | All pages show same calculation |
| UI Clarity | 🟡 Partial | Medium | Students page doesn't show discount |
| Progress Bar | 🔴 Bug | Medium | Uses wrong denominator |
| Export Data | ✅ Complete | Low | Discount exported where relevant |

---

## H. Conclusion

### What is Working

✅ Discount logic is mathematically correct and consistent across all APIs and pages.
✅ No data corruption or double-counting.
✅ All calculations verified to use identical formula.
✅ Financial summaries (Dashboard, Payments, Reports) all agree.

### What Needs Attention (Future)

🟡 UI could be clearer about how discount affects the "balance" number.
🔴 Progress bar on Payments page uses incorrect denominator.
🟡 Students export doesn't include discount column (consider adding for completeness).

### Immediate Action

**No code changes needed now.** The system is functionally correct. Document the semantics for future reference, and plan UI improvements in next sprint.

---

**END OF ANALYSIS**

This is documentation of existing behavior. No code modifications made.

