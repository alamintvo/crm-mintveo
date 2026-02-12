# Multi-Source Agency Lead CRM

A comprehensive system for merging agency data from multiple directories (AgencySpotter, GoodFirms, TheManifest) and managing them in a Next.js CRM application.

## 📁 Project Structure

```
clean_web-scraping/
├── data/                          # All data files
│   ├── raw/                       # Original CSVs from scraping
│   │   ├── agencies_extracted_agencyspotter_20260126_cleaned.csv (1,576 agencies)
│   │   ├── agencies_extracted_goodfirms_20260115.csv (2,355 agencies)
│   │   └── agencies_extracted_themanifest_20260126.csv (10,226 agencies)
│   └── processed/                 # Merged data and reports
│       ├── merged_agencies_master.csv (12,919 unique agencies)
│       └── merge_report.json (conflict tracking, 1,529 conflicts)
│
├── scripts/                       # Python merge & import scripts
│   ├── merge_agencies.py          # Main merge script (smart normalization)
│   ├── import_to_db.py            # CSV to PostgreSQL import
│   ├── config/
│   │   └── source_mappings.py     # Column mapping configuration
│   └── clean_website_urls.py      # Utility script
│
├── database/                      # Database schema (Prisma 7)
│   ├── prisma/
│   │   └── schema.prisma          # PostgreSQL schema definition
│   ├── prisma.config.ts           # Prisma 7 configuration
│   ├── package.json
│   └── generated/                 # Generated Prisma client
│
├── crm-app/                       # Next.js Mini CRM (Coming soon)
│   └── ...                        # Phase 3
│
├── docs/                          # Documentation
│   ├── PROJECT_PLAN.md            # Complete project plan
│   └── MERGE_UPDATE_SUMMARY.md    # Smart normalization guide
│
├── .venv/                         # Python virtual environment
├── .env                           # Environment variables (DATABASE_URL)
├── .gitignore
└── pyproject.toml                 # Python dependencies (uv)
```

## 🚀 Quick Start

### Prerequisites
- Python 3.11+ with `uv` package manager
- Node.js 20+ for Prisma and Next.js
- PostgreSQL database (Neon recommended)

### Phase 1: Data Merge (✅ Complete)

```bash
# Activate Python environment
source .venv/Scripts/activate  # Windows
source .venv/bin/activate      # Mac/Linux

# Run merge script (from root directory)
cd scripts
python merge_agencies.py
```

**Output:**
- `data/processed/merged_agencies_master.csv` - 12,919 unique agencies
- `data/processed/merge_report.json` - Conflict tracking report

**Features:**
- Smart normalization (phones, emails, addresses, LinkedIn)
- Deduplication via website URL + fuzzy name matching
- Conflict detection and auto-resolution
- Keeps ALL unique contact values in arrays

### Phase 2: Database Setup (✅ Complete)

```bash
# Setup database schema
cd database
npm install
npx prisma generate
npx prisma db push

# Import data (from root)
cd scripts
python import_to_db.py
```

**Database:** Neon PostgreSQL (serverless)
**Records:** 12,919 agencies imported
**Schema:** Prisma 7 with array fields and JSONB

### Phase 3: Next.js CRM (🚧 In Progress)

Coming soon...

## 📊 Data Statistics

| Metric | Value |
|--------|-------|
| **Total Input** | 14,157 agencies |
| **Total Output** | 12,919 unique agencies |
| **Deduplication Rate** | 8.7% |
| **Multi-Source Agencies** | 844 (6.5%) |
| **Conflicts Detected** | 1,529 |
| **Average Data Quality** | 51.68 / 100 |

### Source Distribution
- Single source: 12,075 agencies (93.5%)
- Two sources: 788 agencies (6.1%)
- Three sources: 56 agencies (0.4%)

## 🔧 Key Features

### Smart Normalization
- **Phone numbers:** Detects `"612-799-6613"` = `"+1 612-799-6613"`
- **Emails:** Case-insensitive deduplication
- **Addresses:** Standardizes abbreviations (Ave/Avenue, St/Street)
- **LinkedIn URLs:** Removes protocol/www/trailing slash

### Conflict Resolution
- **Multiple phones/emails/addresses:** Keep ALL unique values
- **Different employee counts:** Prefer AgencySpotter (newest data)
- **Different descriptions:** Pick longest
- **Different ratings:** Average across sources
- **Reviews:** Sum across all sources

### Data Preservation
- All original source data preserved in JSONB columns
- Full transparency via `merge_report.json`
- No data loss during merge

## 📝 Running Scripts

**Important:** All scripts should be run from their respective directories with relative paths.

```bash
# Merge data
cd scripts
python merge_agencies.py

# Import to database
cd scripts
python import_to_db.py

# Prisma operations
cd database
npx prisma studio  # View data in browser
npx prisma db push # Update schema
```

## 🎯 Next Steps

- [ ] Phase 3.1: Initialize Next.js project with Prisma
- [ ] Phase 3.2: Build agencies table with filters
- [ ] Phase 3.3: Build expandable source details view
- [ ] Phase 3.4: Build contact status workflow and notes
- [ ] Phase 4: Deploy to Cloudflare Pages

## 📚 Documentation

See `docs/PROJECT_PLAN.md` for complete project documentation including:
- Architecture overview
- Design decisions
- Conflict resolution strategy
- Database schema
- UI mockups
- Implementation phases

## 🔐 Environment Variables

Create a `.env` file in the root directory:

```env
DATABASE_URL="postgresql://username:password@host.neon.tech/database?sslmode=require"
```

## 🤝 Contributing

This project uses:
- **Python:** uv package manager
- **Node.js:** npm
- **Database:** Prisma 7 + PostgreSQL
- **Frontend:** Next.js 15 (coming soon)

---

**Last Updated:** 2026-02-12
**Status:** Phase 2 Complete, Phase 3 Starting
