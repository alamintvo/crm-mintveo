# Multi-Source Agency Lead CRM - Master Plan

**Project Goal:** Build a mini CRM to manage agency leads from multiple directories (AgencySpotter, GoodFirms, TheManifest) with contact tracking and filtering capabilities.

---

## 📊 Current Data Sources

| Source | Rows | Columns | Status |
|--------|------|---------|--------|
| **AgencySpotter** | 1,576 | 25 | ✅ Normalized |
| **GoodFirms** | 2,355 | 24 | ✅ Normalized |
| **TheManifest** | 10,226 | 14 | ✅ Normalized |
| **Total (before dedup)** | **14,157** | - | - |
| **Expected unique** | **~8,000-10,000** | - | After deduplication |

---

## 🏗️ Architecture Overview

### Data Flow
```
┌─────────────────────────────────────────────────────────────────┐
│ Layer 1: SOURCE CSVs (Raw Data)                                 │
│ - agencies_extracted_agencyspotter_20260126_cleaned.csv         │
│ - agencies_extracted_goodfirms_20260115.csv                     │
│ - agencies_extracted_themanifest_20260126.csv                   │
└──────────────────────────┬──────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────────┐
│ Layer 2: MERGE SCRIPT (Python)                                  │
│ - Normalize website URLs for deduplication                      │
│ - Find duplicates (exact website match + fuzzy name match)      │
│ - Merge universal fields (name, email, phone, city, state)      │
│ - Keep ALL source-specific data in JSONB                        │
│ - Compute avg_rating, total_reviews, data_quality_score         │
└──────────────────────────┬──────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────────┐
│ Layer 3: MERGED CSV (Output)                                    │
│ - merged_agencies_master.csv (~8,000-10,000 unique agencies)    │
│ - Universal fields + source tracking + computed metrics + JSONB │
└──────────────────────────┬──────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────────┐
│ Layer 4: POSTGRESQL DATABASE (Neon)                             │
│ - agencies table with JSONB columns for source data             │
│ - Indexes for filtering (state, contact_status, sources)        │
│ - CRM fields (contact_status, notes, tags, last_contact_date)   │
└──────────────────────────┬──────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────────┐
│ Layer 5: NEXT.JS MINI CRM (UI)                                  │
│ - Table with filters (State, Employee Count, Contact Status)    │
│ - Expandable source details (show AS/GF/TM data side-by-side)   │
│ - Contact status pipeline (Not Contacted → Contacted → ...)     │
│ - Notes field for each agency                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📋 Column Mapping Analysis

### Common to ALL 3 Sources (11 columns)
These will be **merged** into universal fields:
- Agency Name
- Website URL
- Profile URL
- City, State
- Description
- Employee Count
- Average Rating
- Review Count
- Industry Focus
- Clients List

### Common to AS + GF Only (7 columns)
TheManifest doesn't have contact info:
- Contact Email ❌ TM
- Phone Number ❌ TM
- LinkedIn URL ❌ TM
- Full Address ❌ TM
- Tagline ❌ TM
- Service Focus ❌ TM
- Claimed Status ❌ TM

### Unique Fields (Keep in JSONB)

**AgencySpotter Only (6):**
- Country
- Affiliation
- Audience Specialty
- Annual Budget
- Other Social Links
- Projects

**GoodFirms Only (6):**
- Founding Year
- Hourly Rate
- Client Count
- Client Focus
- Client Portfolio
- Last Review Date

**TheManifest Only (2):**
- Common Project Size
- Client Size Distribution

---

## 🎯 Design Decisions: Conflict Resolution Strategy

**Decision Date:** 2026-02-11
**Decided By:** User + Claude Code
**Approach:** Smart Auto-Resolve + Conflict Logging

### Problem Statement
When the same agency appears in multiple sources (e.g., SmartSites in both AgencySpotter and GoodFirms), common fields may have different values:
- **Address:** AS says "Southfield, MI" but GF says "San Antonio, TX"
- **Employee Count:** AS says "50-100" but GF says "10-49"
- **Description:** Different descriptions on each platform

**Question:** How do we resolve conflicts in the merged dataset?

### Selected Strategy: Option A - Auto-Resolve with Transparency

**Core Principle:** Prioritize speed and completeness over perfection. Auto-resolve conflicts using intelligent rules, but keep ALL source data and log conflicts for transparency.

### Conflict Resolution Rules

**Updated:** 2026-02-12 - Added smart normalization and "keep all unique" for contact fields

| Field Type | Auto-Resolution Rule | Smart Normalization | Reasoning |
|------------|---------------------|---------------------|-----------|
| **Identity** | | | |
| - Name | Pick canonical (prefer AS) | N/A | Most complete, used for matching |
| - Website | Normalized (remove http, www) | Yes - domain only | Used for deduplication |
| **Contact Info** | | | |
| - Email | **Keep ALL unique emails** (array)<br>Primary: first one | Yes - lowercase, trim | Multiple departments may have different emails |
| - Phone | **Keep ALL unique phones** (array)<br>Primary: first one | Yes - remove formatting, country code | Multiple offices may have different numbers |
| - Address | **Keep ALL unique addresses** (array)<br>Primary: prefer AS | Yes - standardize abbreviations | Multiple office locations |
| - LinkedIn URL | **Keep ALL unique URLs** (array)<br>Primary: first one | Yes - remove protocol/www/slash | Company page vs founder's personal |
| - Social Links | **Keep ALL unique links** (array) | No - stored as-is | Different social media accounts |
| - City/State | From primary address (AS) | N/A | Follows primary address |
| **Descriptive** | | | |
| - Description | Pick **longest** (most informative)<br>Store all | No | Richer description helps qualify leads |
| - Tagline | Pick **longest** or primary<br>Store all | No | More context is better |
| **Lists/Arrays** | | | |
| - Service Focus | **Merge all unique services**<br>Store originals | No | Combined list shows full capabilities |
| - Industry Focus | **Merge unique industries** | No | Complete picture of expertise |
| - Clients List | **Merge unique clients** | No | More social proof |
| **Metrics** | | | |
| - Rating | **Average** across all sources | N/A | Overall reputation |
| - Review Count | **Sum** across all sources | N/A | Total social proof |
| - Employee Count | Pick **AgencySpotter** (newest)<br>Store all | No | AS data is most recent (2026-01-26 vs 2026-01-15) |
| **Status** | | | |
| - Claimed Status | Keep per source (source-specific) | N/A | May be claimed on AS but not GF |

#### Smart Normalization Details

**Purpose:** Detect true duplicates while preserving original formatting

**Phone Normalization:**
```
"612-799-6613"       → "6127996613" (for comparison)
"+1 612-799-6613"    → "6127996613" (detected as SAME)
"(612) 799-6613"     → "6127996613" (detected as SAME)
```
**Stored as:** Original format in array (e.g., `["612-799-6613", "(612) 555-1234"]`)

**Email Normalization:**
```
"INFO@Agency.com"    → "info@agency.com"
" info@agency.com "  → "info@agency.com"
```
**Stored as:** Lowercase format

**Address Normalization:**
```
"2521 27th ave S, Minneapolis"     → "2521 27th ave s minneapolis"
"2521 27th Ave South, Minneapolis" → "2521 27th ave s minneapolis" (detected as SAME)
```
**Stored as:** Original format in array (e.g., `["2521 27th Ave S, Minneapolis, MN"]`)

**LinkedIn URL Normalization:**
```
"https://www.linkedin.com/company/xyz/" → "linkedin.com/company/xyz"
"LinkedIn.com/company/xyz"              → "linkedin.com/company/xyz" (detected as SAME)
```
**Stored as:** Original format in array

### Conflict Logging

Generate `merge_report.json` with:
- Total agencies merged
- Conflicts detected by type (address, employee count, etc.)
- Example conflicts for spot-checking
- Recommended agencies for manual review

**Benefits:**
1. ✅ **Fast:** Merge completes in ~1 hour (no manual review bottleneck)
2. ✅ **Transparent:** See what conflicts exist via merge report
3. ✅ **Practical:** Start using CRM immediately, verify when contacting agencies
4. ✅ **Complete:** Never lose data - all source data preserved in JSONB
5. ✅ **Scalable:** Works when adding 4th, 5th source

### Alternative Approaches Considered

**Option B: Manual Review Queue** ❌ Rejected
- Create CSV of conflicts for manual verification
- **Problem:** 200+ conflicts would take days to review
- **Problem:** Blocks progress, reduces momentum

**Option C: Discard Conflicting Records** ❌ Rejected
- Only keep agencies from single source
- **Problem:** Lose valuable multi-source data
- **Problem:** Reduces dataset significantly

### Updated Design Decision: Smart Normalization + Keep All Unique Values

**Decision Date:** 2026-02-12
**Decided By:** User + Claude Code
**Approach:** Normalize for deduplication, but keep ALL unique values in arrays

**Problem Statement:**
When the same agency appears in multiple sources, contact info may have:
1. **Different formatting** (same value): `"612-799-6613"` vs `"+1 612-799-6613"`
2. **Actually different values** (legitimate multiple): Different office phone numbers, multiple email addresses

**Challenge:** How do we avoid storing duplicates (formatting variations) while preserving legitimate multiple values?

**Solution: Smart Normalization**

For each contact field:
1. **Normalize** the value (remove formatting, lowercase, etc.)
2. **Compare** normalized versions to detect true duplicates
3. **Store** original format in array (not normalized version)
4. **Deduplicate** based on normalized comparison

**Fields using this approach:**
- ✅ **Emails** - `["info@agency.com", "sales@agency.com"]` (unique after normalization)
- ✅ **Phones** - `["612-799-6613", "612-555-1234"]` (unique after normalization)
- ✅ **Addresses** - `["2521 27th Ave S, Minneapolis, MN"]` (deduplicated via normalization)
- ✅ **LinkedIn URLs** - `["https://linkedin.com/company/xyz"]` (deduplicated via normalization)
- ✅ **Social Links** - `["facebook.com/xyz", "twitter.com/xyz"]` (stored as-is)

**Benefits:**
1. ✅ **No duplicates** - `"info@agency.com"` and `"INFO@Agency.com"` stored once
2. ✅ **Preserve originals** - Users see the actual data, not normalized version
3. ✅ **Multiple contacts** - Different offices/departments can have different emails/phones
4. ✅ **Intelligent** - System is smart enough to know `"+1 612-799-6613"` = `"612-799-6613"`

**UI Impact:**
```
Contact Info:
  📧 info@agency.com, sales@agency.com (2 emails)
  📞 612-799-6613, 612-555-1234 (2 phones)
  📍 2521 27th Ave S, Minneapolis, MN
      123 Broadway, New York, NY (2 offices)
```

### Validation Strategy

1. **Automated:** Merge script validates data integrity (no duplicate websites, required fields present)
2. **Spot-check:** Manually review 10-20 agencies from merge report
3. **On-demand:** Verify specific agencies when contacting them (real-world validation)

### When to Revisit This Decision

Revisit if:
- Spot-check reveals >20% auto-resolution errors
- Adding 4th source introduces new conflict patterns
- User feedback indicates systematic data quality issues

---

## 🗄️ Database Schema

### PostgreSQL Table: `agencies`

```sql
CREATE TABLE agencies (
  -- Primary Key
  id SERIAL PRIMARY KEY,

  -- === IDENTITY ===
  name VARCHAR(500) NOT NULL,
  website_url VARCHAR(500) UNIQUE,

  -- === CONTACT INFO (Primary + ALL unique values) ===
  contact_email VARCHAR(255),          -- Primary email (first one)
  contact_emails TEXT[],               -- ALL unique emails
  phone_number VARCHAR(50),            -- Primary phone (first one)
  phone_numbers TEXT[],                -- ALL unique phones
  full_address TEXT,                   -- Primary address (prefer AS)
  addresses TEXT[],                    -- ALL unique addresses
  linkedin_url VARCHAR(500),           -- Primary LinkedIn URL
  linkedin_urls TEXT[],                -- ALL unique LinkedIn URLs
  social_links TEXT[],                 -- ALL social media links (from AS)

  -- === LOCATION (from primary address) ===
  city VARCHAR(100),                   -- All 3
  state VARCHAR(50),                   -- All 3
  country VARCHAR(50),                 -- Default: United States

  -- === DESCRIPTIVE ===
  description TEXT,                    -- Longest description
  tagline TEXT,                        -- Longest tagline

  -- === METRICS ===
  employee_count VARCHAR(50),          -- Prefer AS (newest)
  employee_count_min INTEGER,          -- Parsed from "10-49" → 10
  employee_count_max INTEGER,          -- Parsed from "10-49" → 49
  avg_rating DECIMAL(3,2),             -- Average of all sources
  total_reviews INTEGER,               -- Sum of all review counts

  -- === LISTS (merged from all sources) ===
  services_merged TEXT[],              -- All unique services
  industries_merged TEXT[],            -- All unique industries
  clients_merged TEXT[],               -- All unique clients

  -- === SOURCE TRACKING ===
  sources TEXT[],                      -- e.g., {'agencyspotter', 'goodfirms', 'themanifest'}
  source_count INTEGER,                -- 1, 2, or 3
  data_quality_score INTEGER,          -- 0-100 based on field completeness

  -- === SOURCE DATA (ALL original fields as JSONB) ===
  agencyspotter_data JSONB,            -- All 25 AS columns
  goodfirms_data JSONB,                -- All 24 GF columns
  themanifest_data JSONB,              -- All 14 TM columns

  -- === CRM FIELDS ===
  contact_status VARCHAR(20) DEFAULT 'not_contacted',
  contact_status_changed_at TIMESTAMPTZ,
  notes TEXT,
  tags TEXT[],
  last_contact_date DATE,

  -- === USER PREFERENCES ===
  preferred_source VARCHAR(20),        -- User can set: 'agencyspotter', 'goodfirms', 'themanifest', or NULL (use merged)

  -- === TIMESTAMPS ===
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Performance Indexes
CREATE INDEX idx_agencies_state ON agencies(state);
CREATE INDEX idx_agencies_city ON agencies(city, state);
CREATE INDEX idx_agencies_contact_status ON agencies(contact_status);
CREATE INDEX idx_agencies_employee_range ON agencies(employee_count_min, employee_count_max);
CREATE INDEX idx_agencies_sources ON agencies USING GIN(sources);
CREATE INDEX idx_agencies_rating ON agencies(avg_rating);
CREATE INDEX idx_agencies_website ON agencies(website_url);

-- Array field indexes (for searching within arrays)
CREATE INDEX idx_agencies_contact_emails ON agencies USING GIN(contact_emails);
CREATE INDEX idx_agencies_phone_numbers ON agencies USING GIN(phone_numbers);
CREATE INDEX idx_agencies_services ON agencies USING GIN(services_merged);

-- JSONB Indexes (for querying source data)
CREATE INDEX idx_as_data ON agencies USING GIN(agencyspotter_data);
CREATE INDEX idx_gf_data ON agencies USING GIN(goodfirms_data);
CREATE INDEX idx_tm_data ON agencies USING GIN(themanifest_data);
```

---

## 🎨 UI Design

### Main Table View
```
┌──────────────────────────────────────────────────────────────────────────┐
│ FILTERS                                                                  │
│ [State ▼] [Employee Count ▼] [Contact Status ▼] [Sources: □AS □GF □TM] │
└──────────────────────────────────────────────────────────────────────────┘

┌────────────┬──────────┬─────────────┬───────────┬─────────────┬─────────┐
│ Name       │ Location │ Rating      │ Sources   │ Contact     │ Actions │
├────────────┼──────────┼─────────────┼───────────┼─────────────┼─────────┤
│ SmartSites │ Southfie │ 5.0 ⭐      │ 📊 2      │ [Dropdown]  │ [View]  │
│            │ ld, MI   │ (86 reviews)│ AS, GF    │ Not Contact │         │
│            │          │             │           │             │         │
│ 📧 ✓ 📞 ✓  │          │             │ [Expand]  │             │         │
│ 🔗 ✓       │          │             │           │             │         │
└────────────┴──────────┴─────────────┴───────────┴─────────────┴─────────┘

Legend:
📧 = Has Email
📞 = Has Phone
🔗 = Has LinkedIn
📊 2 = Found in 2 sources (click to expand)
```

### Expanded Source Details View
```
┌──────────────────────────────────────────────────────────────────────────┐
│ SmartSites - Source Details                                             │
├──────────────────────────────────────────────────────────────────────────┤
│ 🔵 AGENCYSPOTTER                                                         │
│   👁️  https://agencyspotter.com/smartsites                               │
│   ⭐  5.0 (11 reviews)                                                   │
│   📋  Services: Paid Search & Paid Social, Social Media, Web Design      │
│   💰  Min Project Size: $10,000+                                         │
│   💵  Annual Budget: $10,000+                                            │
│   📊  Affiliation: Independent                                           │
│   👥  Clients: Harvard University, BMW, Google, Amazon                   │
│                                                                          │
│ 🟢 GOODFIRMS                                                             │
│   👁️  https://goodfirms.co/company/smartsites                            │
│   ⭐  5.0 (75 reviews)                                                   │
│   📋  Services: Digital Marketing: SEO - 40%, PPC - 20%                  │
│   💵  Hourly Rate: $100 - $149                                           │
│   📅  Founded: 2011                                                      │
│   🎯  Client Focus: 80% Small Business, 20% Medium Business              │
│   👥  Clients: Vaughan Automotive, Bob Johnson Automotive                │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## 📅 IMPLEMENTATION PHASES

**Git Workflow:** Commit after each task completion with descriptive message.

---

### ✅ Phase 1: Data Merge (8-12 hours)

#### Task 1.1: Create Source Mapping Configuration
**File:** `config/source_mappings.py`

**What:** Map column names from all 3 sources to universal field names.

**Why:** Handle different column names across sources and enable generic merge script.

**Steps:**
1. Create `config/` directory
2. Write `source_mappings.py` with UNIVERSAL_FIELDS and SOURCE_MAPPINGS dict
3. Test: Import and verify mappings for all 3 sources

**Success Criteria:**
- ✅ File created: `config/source_mappings.py`
- ✅ UNIVERSAL_FIELDS list defined (11 common fields)
- ✅ SOURCE_MAPPINGS dict with all 3 sources (AS, GF, TM)
- ✅ All columns mapped correctly (no typos, match actual CSV column names)
- ✅ Can import without errors: `python -c "from config.source_mappings import SOURCE_MAPPINGS"`

**Validation:**
```python
# Run this to validate
python -c "
from config.source_mappings import SOURCE_MAPPINGS, UNIVERSAL_FIELDS
import pandas as pd

# Verify all sources present
assert 'agencyspotter' in SOURCE_MAPPINGS
assert 'goodfirms' in SOURCE_MAPPINGS
assert 'themanifest' in SOURCE_MAPPINGS

# Verify mappings match actual CSV columns
df_as = pd.read_csv('agencies_extracted_agencyspotter_20260126_cleaned.csv', nrows=1)
for field, col_name in SOURCE_MAPPINGS['agencyspotter'].items():
    if col_name:
        assert col_name in df_as.columns, f'{col_name} not in AS columns'

print('✅ All mappings valid!')
"
```

**Git Commit:** `git commit -m "feat: add source mapping configuration for 3 directories"`

**Status:** ⏳ Pending

---

#### Task 1.2: Write Generic Multi-Source Merge Script
**File:** `merge_agencies.py`

**What:**
1. Load all 3 CSVs using source mappings
2. Normalize website URLs (remove http://, www., trailing slashes)
3. Find duplicates:
   - **Pass 1:** Exact website URL match
   - **Pass 2:** Fuzzy name match (85%+ similarity) for agencies without websites
4. Merge logic:
   - **Universal fields:** Pick best value (prefer AS for contact info, longest for description)
   - **Source-specific data:** Store ALL fields in JSONB strings
   - **Computed fields:**
     - `services_merged` (union of all unique services)
     - `avg_rating` (average of all sources)
     - `total_reviews` (sum of all reviews)
     - `employee_count_min/max` (parsed from range)
5. Export to `merged_agencies_master.csv`

**Success Criteria:**
- ✅ File created: `merge_agencies.py`
- ✅ Loads all 3 CSVs without errors
- ✅ Deduplication logic implemented (website + fuzzy name)
- ✅ Merge creates ~8,000-10,000 unique agencies
- ✅ Output CSV has all required columns
- ✅ No duplicate website URLs in output
- ✅ Deduplication stats printed (how many from each source, how many matches)
- ✅ Progress bar or logging shows merge progress

**Validation:**
```bash
# Run merge script
python merge_agencies.py

# Should output:
# Loading sources...
# ✓ AgencySpotter: 1,576 agencies
# ✓ GoodFirms: 2,355 agencies
# ✓ TheManifest: 10,226 agencies
# Total: 14,157 agencies
#
# Deduplicating...
# ✓ Exact website matches: ~800-1,200
# ✓ Fuzzy name matches: ~300-500
#
# Merging...
# ✓ Merged agencies: 8,000-10,000
# ✓ Exported to: merged_agencies_master.csv
```

**Output File Check:**
```python
# Validate output
python -c "
import pandas as pd

df = pd.read_csv('merged_agencies_master.csv')

# Check row count
assert 8000 <= len(df) <= 10000, f'Expected 8K-10K, got {len(df)}'

# Check no duplicate websites
assert df['website_url'].notna().sum() == df['website_url'].nunique(), 'Duplicate websites found!'

# Check required columns exist
required = ['name', 'website_url', 'city', 'state', 'sources', 'source_count', 'avg_rating', 'total_reviews']
for col in required:
    assert col in df.columns, f'Missing column: {col}'

# Check source_count distribution
print('Source distribution:')
print(df['source_count'].value_counts())

print('✅ Output CSV valid!')
"
```

**Git Commit:** `git commit -m "feat: implement multi-source merge script with deduplication"`

**Status:** ⏳ Pending

---

#### Task 1.3: Run Merge and Validate Results
**What:**
1. Execute merge script with all 3 sources
2. Analyze deduplication statistics
3. Manually review 10-20 sample merged records
4. Validate data quality scores
5. Check for any parsing errors
6. Export deduplication report

**Success Criteria:**
- ✅ Merge script runs without errors
- ✅ Output: `merged_agencies_master.csv` created
- ✅ Total agencies: 8,000-10,000 (within expected range)
- ✅ Deduplication rate: 30-40% (14K → 8-10K)
- ✅ Source distribution looks reasonable:
  - ~20-30% from AS only
  - ~30-40% from GF only
  - ~40-50% from TM only
  - ~10-20% from 2+ sources
- ✅ No critical data loss (all source fields preserved in JSON)
- ✅ Computed fields look correct (ratings, reviews, services)
- ✅ Sample 10 agencies manually verified
- ✅ Deduplication report exported: `merge_report.json`

**Validation Steps:**

1. **Check overall stats:**
```python
python -c "
import pandas as pd
import json

df = pd.read_csv('merged_agencies_master.csv')

stats = {
    'total_agencies': len(df),
    'has_email': df['contact_email'].notna().sum(),
    'has_phone': df['phone_number'].notna().sum(),
    'has_website': df['website_url'].notna().sum(),
    'source_distribution': df['source_count'].value_counts().to_dict(),
    'avg_data_quality': df['data_quality_score'].mean(),
}

print(json.dumps(stats, indent=2))
"
```

2. **Sample 10 random agencies:**
```python
python -c "
import pandas as pd

df = pd.read_csv('merged_agencies_master.csv')
sample = df.sample(10)

for _, row in sample.iterrows():
    print(f'\n{row[\"name\"]} ({row[\"city\"]}, {row[\"state\"]})')
    print(f'  Sources: {row[\"sources\"]} (count: {row[\"source_count\"]})')
    print(f'  Rating: {row[\"avg_rating\"]} ({row[\"total_reviews\"]} reviews)')
    print(f'  Email: {row[\"contact_email\"]}')
    print(f'  Services: {row.get(\"services_merged\", \"N/A\")[:100]}...')
"
```

3. **Check for duplicates:**
```bash
# Should return 0
python -c "import pandas as pd; df = pd.read_csv('merged_agencies_master.csv'); print('Duplicate websites:', df['website_url'].duplicated().sum())"
```

**Git Commit:** `git commit -m "data: merge all 3 sources, output 8,500 unique agencies"`

**Status:** ⏳ Pending

---

### ✅ Phase 2: Database Setup (3-4 hours)

#### Task 2.1: Design and Create PostgreSQL Schema
**Files:** `prisma/schema.prisma`

**What:**
1. Create Prisma schema matching SQL schema above
2. Set up Neon PostgreSQL database
3. Push schema (`npx prisma db push`)
4. Generate Prisma client

**Status:** ⏳ Pending

---

#### Task 2.2: Import Merged CSV to PostgreSQL
**File:** `scripts/import_to_db.py`

**What:**
1. Read `merged_agencies_master.csv`
2. Parse JSON columns (agencyspotter_data_json, etc.)
3. Insert all agencies into PostgreSQL
4. Verify import success

**Validation Checklist:**
- [ ] Row count matches CSV
- [ ] JSONB fields parsed correctly
- [ ] No import errors
- [ ] Sample queries work

**Status:** ⏳ Pending

---

### ✅ Phase 3: Build Next.js Mini CRM (16-20 hours)

#### Task 3.1: Initialize Next.js Project with Prisma
**What:**
1. `npx create-next-app@latest agency-crm`
2. Install dependencies: `prisma`, `@prisma/client`, `@tanstack/react-query`, `tailwindcss`
3. Configure Prisma client
4. Set up environment variables (DATABASE_URL)
5. Test database connection

**Status:** ⏳ Pending

---

#### Task 3.2: Build Agencies Table with Filters
**Files:**
- `app/page.tsx` - Main page
- `app/components/AgenciesTable.tsx` - Table component
- `app/components/FilterPanel.tsx` - Filters
- `app/actions/agencies.ts` - Server Actions

**Features:**
- Server Action: `getAgencies(filters)` with pagination
- Filters: State dropdown, Employee Count range, Contact Status, Sources checkboxes
- Table columns: Name, Location, Rating (with total reviews), Sources badge, Contact Status
- Visual indicators: Email/Phone/LinkedIn icons
- Pagination: 50 rows per page

**Status:** ⏳ Pending

---

#### Task 3.3: Build Expandable Source Details View
**Files:**
- `app/components/SourceDetails.tsx` - Expandable details
- `app/components/SourceCard.tsx` - Individual source card

**Features:**
- Click "Sources badge" to expand
- Show tabs or accordion for each source (AS, GF, TM)
- Display all source-specific fields from JSONB
- Color-coded by source (AS=blue, GF=green, TM=purple)
- Show profile URLs, ratings, reviews, services, clients, unique fields

**Status:** ⏳ Pending

---

#### Task 3.4: Build Contact Status Workflow and Notes
**Files:**
- `app/components/ContactStatusDropdown.tsx`
- `app/components/NotesModal.tsx`
- `app/actions/agencies.ts` - Update functions

**Features:**
- Contact status dropdown in each row
- Server Actions: `updateContactStatus`, `updateNotes`
- Status pipeline: Not Contacted → Contacted → Responded → Qualified → Lost
- Timestamp tracking (contact_status_changed_at)
- Notes modal with auto-save

**Status:** ⏳ Pending

---

### ✅ Phase 4: Deploy (2-3 hours)

#### Task 4: Deploy to Cloudflare Pages
**What:**
1. Configure Cloudflare Pages deployment
2. Set up environment variables (DATABASE_URL)
3. Deploy to production
4. Test all features in production

**Status:** ⏳ Pending

---

## 🚀 Scalability: Adding 4th Source (Clutch, Upcity, etc.)

When adding a new source:

### Step 1: Normalize CSV Columns (Manual)
Update the CSV to match common column names (like you did with TheManifest).

### Step 2: Update Merge Script (5 minutes)
Add new source to the list:
```python
SOURCES = {
    'agencyspotter': 'agencies_extracted_agencyspotter_20260126_cleaned.csv',
    'goodfirms': 'agencies_extracted_goodfirms_20260115.csv',
    'themanifest': 'agencies_extracted_themanifest_20260126.csv',
    'clutch': 'agencies_extracted_clutch_20260210.csv',  # NEW
}
```

### Step 3: Update Database Schema (5 minutes)
Add new JSONB column:
```sql
ALTER TABLE agencies ADD COLUMN clutch_data JSONB;
CREATE INDEX idx_clutch_data ON agencies USING GIN(clutch_data);
```

### Step 4: Re-run Merge Script
The script will automatically:
- Load the new source
- Match against existing 8K agencies
- Add new unique agencies
- Store Clutch data in `clutch_data` JSONB

### Step 5: Update UI (10 minutes)
- Add "Clutch" to sources filter
- Add Clutch section in expandable details
- Use orange color for Clutch badge

**Total time to add 4th source: ~30 minutes** 🚀

---

## 📊 Success Metrics

### Data Quality
- [ ] Deduplication rate: 30-40% (14K → 8-10K unique)
- [ ] Data completeness: 80%+ agencies have email OR phone
- [ ] Source coverage: 60%+ agencies found in 2+ sources

### CRM Functionality
- [ ] All filters work correctly (State, Employee Count, Contact Status, Sources)
- [ ] Contact status updates persist to database
- [ ] Notes save and display correctly
- [ ] Source details expand/collapse smoothly

### Performance
- [ ] Table loads in <2 seconds (50 rows)
- [ ] Filters apply in <1 second
- [ ] Contact status update in <500ms
- [ ] Expandable details load in <500ms

---

## 📝 Notes & Decisions

### Why JSONB for Source Data?
- **Flexibility:** Easy to add new sources without schema changes
- **Preserve all data:** Never lose any field from any source
- **Query capability:** Can still query JSONB fields with PostgreSQL
- **Clean schema:** Fewer columns, easier to maintain

### Why Prefer AgencySpotter for Contact Info?
Based on data analysis:
- AS has 99%+ completeness for email, phone, website
- GF has 70-85% completeness
- TM has no contact info at all

### Why Compute avg_rating and total_reviews?
- **avg_rating:** Shows overall reputation across all platforms
- **total_reviews:** More reviews = more reliable rating
- Allows sorting by "most reviewed" or "highest rated"

---

## 🔄 Maintenance

### Re-scraping Same Directory
When you re-scrape AgencySpotter (updated data):

1. Replace the CSV file
2. Re-run merge script
3. Script will:
   - Update existing agencies (new email, new services, etc.)
   - Add new agencies
   - Preserve CRM data (notes, contact status)

### Backup Strategy
- **Weekly:** Export merged_agencies_master.csv
- **Monthly:** PostgreSQL backup via Neon
- **Before re-merge:** Backup current database

---

## ⏱️ Timeline Summary

| Phase | Tasks | Estimated Time |
|-------|-------|----------------|
| Phase 1: Data Merge | 3 tasks | 8-12 hours |
| Phase 2: Database | 2 tasks | 3-4 hours |
| Phase 3: Build CRM | 4 tasks | 16-20 hours |
| Phase 4: Deploy | 1 task | 2-3 hours |
| **TOTAL** | **10 tasks** | **29-39 hours** |

**Estimated Calendar Time:** 5-7 days (1 developer, part-time)

---

## ✅ Current Status

**Last Updated:** 2026-02-11

**Completed Tasks:** 0 / 10

**Next Task:** Phase 1.1 - Create source mapping configuration

**Blockers:** None

---

## 📞 Quick Reference

### File Locations
```
c:\Users\USER\Desktop\Mintveo\mintveo\clean_web-scraping\
├─ agencies_extracted_agencyspotter_20260126_cleaned.csv  (1,576 rows)
├─ agencies_extracted_goodfirms_20260115.csv              (2,355 rows)
├─ agencies_extracted_themanifest_20260126.csv            (10,226 rows)
├─ config/
│  └─ source_mappings.py                                  (To create)
├─ merge_agencies.py                                      (To create)
├─ merged_agencies_master.csv                             (Output)
└─ PROJECT_PLAN.md                                        (This file)
```

### Key Commands
```bash
# Merge CSVs
python merge_agencies.py

# Database setup
npx prisma db push
npx prisma generate

# Import to database
python scripts/import_to_db.py

# Run Next.js dev server
npm run dev

# Deploy to Cloudflare Pages
npm run deploy
```

---

**This plan is a living document. Update it as you progress through tasks and learn more about the data.**
