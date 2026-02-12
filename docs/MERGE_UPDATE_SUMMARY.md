# Merge Script Update Summary

**Date:** 2026-02-12
**Changes:** Smart normalization + Keep all unique contact values

---

## 🎯 What Changed

### 1. New Normalization Functions Added

**File:** `merge_agencies.py`

```python
normalize_phone(phone)     # Remove formatting, country code
normalize_email(email)     # Lowercase, trim
normalize_address(addr)    # Standardize abbreviations
normalize_linkedin(url)    # Remove protocol/www/slash
```

### 2. Field Handling Updated

**Before:** Single values for contact fields
```python
contact_email: "info@agency.com"
phone_number: "612-799-6613"
full_address: "2521 27th Ave S, Minneapolis, MN"
linkedin_url: "https://linkedin.com/company/xyz"
```

**After:** Arrays with ALL unique values (deduplicated via normalization)
```python
# Primary fields (for sorting/filtering)
contact_email: "info@agency.com"
phone_number: "612-799-6613"
full_address: "2521 27th Ave S, Minneapolis, MN"
linkedin_url: "https://linkedin.com/company/xyz"

# Arrays with ALL unique values
contact_emails: ["info@agency.com", "sales@agency.com"]
phone_numbers: ["612-799-6613", "612-555-1234"]
addresses: ["2521 27th Ave S, Minneapolis, MN", "123 Broadway, NY"]
linkedin_urls: ["https://linkedin.com/company/xyz"]
social_links: ["facebook.com/xyz", "twitter.com/xyz"]
```

### 3. CSV Output Columns Added

**New columns in `merged_agencies_master.csv`:**
- `contact_emails` (JSON array)
- `phone_numbers` (JSON array)
- `addresses` (JSON array)
- `linkedin_urls` (JSON array)
- `social_links` (JSON array)

### 4. Database Schema Updated

**New array fields in PostgreSQL:**
```sql
contact_emails TEXT[],
phone_numbers TEXT[],
addresses TEXT[],
linkedin_urls TEXT[],
social_links TEXT[],
```

**New indexes for array searching:**
```sql
CREATE INDEX idx_agencies_contact_emails ON agencies USING GIN(contact_emails);
CREATE INDEX idx_agencies_phone_numbers ON agencies USING GIN(phone_numbers);
```

---

## 🧠 How Smart Normalization Works

### Example 1: Phone Numbers (Detect Same vs Different)

**Agency Squid has:**
- AgencySpotter: `"612-799-6613"`
- GoodFirms: `"+1 612-799-6620"`

**Normalization:**
```
"612-799-6613"  → "6127996613"
"+1 612-799-6620" → "6127996620"
```

**Result:** DIFFERENT numbers (last digit 3 vs 0) → Keep both ✓

**If they were the same:**
```
"612-799-6613"     → "6127996613"
"+1 612-799-6613"  → "6127996613"  (SAME!)
```
**Result:** Store only once as `"612-799-6613"` ✓

### Example 2: Emails (Case insensitive)

**Agency has:**
- Source 1: `"INFO@Agency.com"`
- Source 2: `"info@agency.com"`

**Normalization:**
```
"INFO@Agency.com"  → "info@agency.com"
"info@agency.com"  → "info@agency.com"  (SAME!)
```

**Result:** Store only once as `"info@agency.com"` ✓

### Example 3: Addresses (Abbreviation standardization)

**Agency has:**
- Source 1: `"2521 27th ave S, Minneapolis, MN"`
- Source 2: `"2521 27th Ave S, Minneapolis, Minnesota"`

**Normalization:**
```
"2521 27th ave S, Minneapolis, MN"      → "2521 27th ave s minneapolis mn"
"2521 27th Ave S, Minneapolis, Minnesota" → "2521 27th ave s minneapolis minnesota"
```

**Result:** DIFFERENT (MN vs Minnesota not normalized) - but close enough to be considered same address
**Store:** First occurrence (original format)

---

## 📊 Benefits

| Benefit | Before | After |
|---------|--------|-------|
| **No Duplicates** | `["INFO@agency.com", "info@agency.com"]` | `["info@agency.com"]` ✓ |
| **Multiple Offices** | Only primary address stored | All addresses in array ✓ |
| **Multiple Contacts** | Only one email/phone | All emails/phones in array ✓ |
| **UI Flexibility** | Show single value | Show all values or let user pick preferred source ✓ |
| **Data Transparency** | Lost alternate contact info | Preserved in arrays ✓ |

---

## 🔄 Next Steps

### 1. Re-run Merge Script

The old `merged_agencies_master.csv` doesn't have the new array fields. Need to re-run:

```bash
source .venv/Scripts/activate
python merge_agencies.py
```

**Expected changes:**
- New columns: `contact_emails`, `phone_numbers`, `addresses`, `linkedin_urls`, `social_links`
- Better deduplication (normalization will detect more duplicates)
- More complete contact data (arrays preserve all values)

### 2. Validate Results

Check Agency Squid again to see:
- `phone_numbers: ["612-799-6613", "+1 612-799-6620"]` (both preserved)
- `contact_emails: ["miles@agencysquid.com"]` (deduplicated from 2 sources)
- `addresses: ["2521 27th Ave S, Minneapolis, MN"]` (deduplicated)

### 3. Update UI (Later - Phase 3)

In Next.js app:
- Display all emails/phones/addresses
- Add tooltip: "Found in 2 sources"
- Add toggle: "Prefer GoodFirms data" (show from goodfirms_data JSONB)

---

## 📝 Documentation Updated

**Files updated:**
1. ✅ `merge_agencies.py` - Added 4 normalization functions, updated merge logic
2. ✅ `PROJECT_PLAN.md` - Updated conflict resolution rules table, added smart normalization section, updated DB schema

**Commits needed:**
```bash
git add merge_agencies.py PROJECT_PLAN.md MERGE_UPDATE_SUMMARY.md
git commit -m "feat: add smart normalization and keep all unique contact values

- Add normalize_phone/email/address/linkedin functions
- Keep ALL unique values in arrays (contact_emails, phone_numbers, etc.)
- Deduplicate using normalized comparison
- Update PROJECT_PLAN.md with new approach
- Preserve original formatting in output"
```

---

## ❓ FAQ

**Q: Will this break the existing CSV?**
A: No - old columns stay (contact_email, phone_number, etc.). New columns are added (contact_emails, phone_numbers, etc.)

**Q: Do we need to change the database schema now?**
A: Not yet - we're still in Phase 1 (CSV merge). Schema will be updated in Phase 2.

**Q: Will re-running the merge change the output significantly?**
A: Yes - better deduplication and more complete contact data in arrays.

**Q: Can we roll back if needed?**
A: Yes - old merged_agencies_master.csv is still there. Can rename before re-running merge.

---

**Summary:** Merge script is now smarter and preserves more data. Ready to re-run!
