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

## 🗄️ Database Schema

### PostgreSQL Table: `agencies`

```sql
CREATE TABLE agencies (
  -- Primary Key
  id SERIAL PRIMARY KEY,

  -- === UNIVERSAL FIELDS (merged best value from all sources) ===
  name VARCHAR(500) NOT NULL,
  website_url VARCHAR(500) UNIQUE,
  contact_email VARCHAR(255),          -- AS, GF only
  phone_number VARCHAR(50),            -- AS, GF only
  linkedin_url VARCHAR(500),           -- AS, GF only
  full_address TEXT,                   -- AS, GF only
  city VARCHAR(100),                   -- All 3
  state VARCHAR(50),                   -- All 3
  country VARCHAR(50),                 -- AS only (default: USA)
  description TEXT,                    -- All 3
  tagline TEXT,                        -- AS, GF only
  employee_count VARCHAR(50),          -- All 3

  -- === SOURCE TRACKING ===
  sources TEXT[],                      -- e.g., {'agencyspotter', 'goodfirms', 'themanifest'}
  source_count INTEGER,                -- 1, 2, or 3

  -- === COMPUTED METRICS ===
  avg_rating DECIMAL(3,2),             -- Average of all sources
  total_reviews INTEGER,               -- Sum of all review counts
  employee_count_min INTEGER,          -- Parsed from "10-49" → 10
  employee_count_max INTEGER,          -- Parsed from "10-49" → 49
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

### ✅ Phase 1: Data Merge (8-12 hours)

#### Task 1.1: Create Source Mapping Configuration
**File:** `config/source_mappings.py`

**What:** Map column names from all 3 sources to universal field names.

**Why:** Handle different column names across sources (e.g., "City" vs "Headquarters city").

**Status:** ⏳ Pending

---

#### Task 1.2: Write Generic Multi-Source Merge Script
**File:** `merge_agencies.py`

**What:**
1. Load all 3 CSVs
2. Normalize website URLs (remove http://, www., trailing slashes)
3. Find duplicates:
   - **Pass 1:** Exact website URL match
   - **Pass 2:** Fuzzy name match (85%+ similarity) for agencies without websites
4. Merge logic:
   - **Universal fields:** Pick best value (prefer AS for contact info)
   - **Source-specific data:** Store ALL fields in JSONB
   - **Computed fields:** avg_rating (average of all sources), total_reviews (sum)
5. Export to `merged_agencies_master.csv`

**Expected Output:**
- ~8,000-10,000 unique agencies
- Deduplication report (how many matches per source)

**Status:** ⏳ Pending

---

#### Task 1.3: Run Merge and Validate Results
**What:**
1. Execute merge script
2. Validate deduplication stats
3. Review sample merged records
4. Check data quality scores
5. Export deduplication report

**Validation Checklist:**
- [ ] Total unique agencies in expected range (8K-10K)
- [ ] No duplicate website URLs
- [ ] All source data preserved in JSONB
- [ ] Computed fields correct (avg_rating, total_reviews)
- [ ] Sample 10 agencies manually

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
