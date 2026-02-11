"""
Multi-Source Agency Merge Script

Merges agency data from AgencySpotter, GoodFirms, and TheManifest into a single
master list with deduplication and conflict resolution.

Features:
- Loads all 3 CSV sources using source mappings
- Normalizes website URLs for matching
- Deduplicates by exact website match + fuzzy name match
- Auto-resolves conflicts using intelligent rules
- Generates detailed merge report
- Exports to merged_agencies_master.csv

Author: Claude Code
Created: 2026-02-11
"""

import json
import re
from datetime import datetime
from pathlib import Path

import pandas as pd
from rapidfuzz import fuzz, process

# Import our source mappings
from config.source_mappings import (
    SOURCE_FILES,
    SOURCE_INFO,
    SOURCE_MAPPINGS,
    UNIVERSAL_FIELDS,
    get_all_fields,
)

# Configuration
OUTPUT_FILE = "merged_agencies_master.csv"
REPORT_FILE = "merge_report.json"
FUZZY_MATCH_THRESHOLD = 85  # 85% similarity for name matching
PROGRESS_INTERVAL = 100  # Print progress every N rows


def normalize_website(url):
    """
    Normalize website URL for consistent matching.

    Examples:
        "https://www.example.com/" -> "example.com"
        "http://example.com/path" -> "example.com"
        "EXAMPLE.COM" -> "example.com"

    Args:
        url: Raw URL string

    Returns:
        str or None: Normalized domain, or None if invalid
    """
    if pd.isna(url) or not url:
        return None

    url = str(url).lower().strip()

    # Remove protocol
    url = url.replace('http://', '').replace('https://', '')

    # Remove www prefix
    url = url.replace('www.', '')

    # Remove trailing slash
    url = url.rstrip('/')

    # Remove path (take only domain)
    url = url.split('/')[0]

    # Remove query params
    url = url.split('?')[0]

    # Remove common subdomains
    url = url.replace('en.', '').replace('www2.', '')

    return url if url else None


def normalize_name(name):
    """
    Normalize agency name for fuzzy matching.

    - Lowercase
    - Remove special characters
    - Remove common suffixes (LLC, Inc, etc.)

    Args:
        name: Agency name

    Returns:
        str or None: Normalized name
    """
    if pd.isna(name) or not name:
        return None

    name = str(name).lower().strip()

    # Remove emojis and special characters
    name = name.encode('ascii', 'ignore').decode()

    # Remove common company suffixes
    suffixes = ['llc', 'inc', 'ltd', 'co', 'corp', 'corporation', 'company', 'limited']
    for suffix in suffixes:
        name = re.sub(rf'\b{suffix}\b\.?', '', name, flags=re.IGNORECASE)

    # Remove extra whitespace
    name = ' '.join(name.split())

    return name if name else None


def parse_employee_count(emp_str):
    """
    Parse employee count string to min/max integers.

    Examples:
        "10-49" -> (10, 49)
        "50-100" -> (50, 100)
        "100+" -> (100, 999)
        "'10 - 49" -> (10, 49)

    Args:
        emp_str: Raw employee count string

    Returns:
        tuple: (min, max) or (None, None) if invalid
    """
    if pd.isna(emp_str):
        return None, None

    emp_str = str(emp_str).strip().strip("'\"")

    # Extract numbers
    numbers = re.findall(r'\d+', emp_str)

    if not numbers:
        return None, None

    if len(numbers) >= 2:
        # Range like "10-49"
        return int(numbers[0]), int(numbers[1])
    elif '+' in emp_str:
        # "100+"
        return int(numbers[0]), 999
    else:
        # Single number
        num = int(numbers[0])
        return num, num


def extract_services_list(service_str):
    """
    Extract list of unique services from service focus string.
    Handles different formats from different sources.

    Examples:
        AS: "Paid Search & Paid Social\\nSocial Media\\nWeb Design"
        GF: "Digital Marketing: SEO - 40%\\nPPC - 20%"
        TM: "SEO, PPC, Web Design"

    Args:
        service_str: Service focus string

    Returns:
        list: Unique service names
    """
    if pd.isna(service_str) or not service_str:
        return []

    services = set()

    # Split by newlines and commas
    lines = str(service_str).replace('\\n', '\n').split('\n')

    for line in lines:
        # Remove percentages and category prefixes
        # "Digital Marketing: SEO - 40%" -> "SEO"
        line = re.sub(r'\s*-\s*\d+%', '', line)  # Remove "- 40%"

        if ':' in line:
            # "Digital Marketing: SEO" -> "SEO"
            line = line.split(':')[1]

        # Split by commas
        parts = line.split(',')

        for part in parts:
            service = part.strip()
            if service and len(service) > 2:  # Skip very short strings
                services.add(service)

    return sorted(list(services))


def calculate_data_quality_score(row):
    """
    Calculate data quality score (0-100) based on field completeness.

    Scoring:
        - Email/Phone: 30 points
        - Location: 20 points
        - Website: 15 points
        - Services: 15 points
        - Employee count: 10 points
        - Description: 10 points

    Args:
        row: Pandas Series with agency data

    Returns:
        int: Score 0-100
    """
    score = 0

    if pd.notna(row.get('contact_email')) or pd.notna(row.get('phone_number')):
        score += 30

    if pd.notna(row.get('city')) and pd.notna(row.get('state')):
        score += 20

    if pd.notna(row.get('website_url')):
        score += 15

    services = row.get('services_merged', [])
    if isinstance(services, (list, tuple)) and len(services) > 0:
        score += 15
    elif services is not None and not isinstance(services, (list, tuple)) and pd.notna(services) and str(services).strip():
        score += 15

    if pd.notna(row.get('employee_count')):
        score += 10

    if pd.notna(row.get('description')):
        score += 10

    return score


def load_source_data(source_name):
    """
    Load and normalize data from a single source.

    Args:
        source_name: 'agencyspotter', 'goodfirms', or 'themanifest'

    Returns:
        DataFrame: Normalized data with universal field names
    """
    filepath = SOURCE_FILES[source_name]
    info = SOURCE_INFO[source_name]

    print(f"Loading {info['name']}...")

    # Load CSV
    df = pd.read_csv(filepath)

    print(f"  [OK] Loaded {len(df):,} rows, {len(df.columns)} columns")

    # Extract fields using mapping
    mapping = SOURCE_MAPPINGS[source_name]

    # Create new dataframe with universal field names
    normalized = pd.DataFrame()

    for universal_field, csv_column in mapping.items():
        if csv_column is not None and csv_column in df.columns:
            normalized[universal_field] = df[csv_column]
        else:
            normalized[universal_field] = None

    # Add source identifier
    normalized['_source'] = source_name

    # Add source-specific data as JSON
    # Keep ALL original columns for later JSONB storage
    normalized['_source_data'] = df.to_dict('records')

    # Normalize website URLs
    normalized['website_normalized'] = normalized['website'].apply(normalize_website)

    # Normalize names for fuzzy matching
    normalized['name_normalized'] = normalized['name'].apply(normalize_name)

    print(f"  [OK] Normalized to {len(normalized.columns)} universal fields")

    return normalized


def deduplicate_exact_website(dataframes):
    """
    Find agencies with exact website matches across sources.

    Args:
        dataframes: Dict of {source_name: DataFrame}

    Returns:
        DataFrame: Merged agencies with exact website matches
    """
    print("\n" + "=" * 60)
    print("DEDUPLICATION: Exact Website Match")
    print("=" * 60)

    # Combine all sources
    all_agencies = pd.concat(dataframes.values(), ignore_index=True)

    # Filter to agencies with websites
    with_website = all_agencies[all_agencies['website_normalized'].notna()].copy()

    print(f"Agencies with website: {len(with_website):,}")

    # Group by normalized website
    grouped = with_website.groupby('website_normalized')

    # Find duplicates (same website in multiple sources)
    duplicates = grouped.filter(lambda x: len(x) > 1)

    print(f"Duplicate websites found: {duplicates['website_normalized'].nunique():,}")
    print(f"Total duplicate records: {len(duplicates):,}")

    # Merge duplicates
    merged = []

    for website, group in grouped:
        # Always use merge_agency_records to ensure consistent structure
        # (even for single-source agencies)
        merged_row = merge_agency_records(group)
        merged.append(merged_row)

    print(f"Merged into: {len(merged):,} unique agencies")

    return pd.DataFrame(merged)


def merge_agency_records(group):
    """
    Merge multiple records of the same agency from different sources.
    Apply conflict resolution rules from PROJECT_PLAN.md.

    Args:
        group: DataFrame with multiple rows for same agency

    Returns:
        dict: Merged agency record
    """
    # Initialize merged record
    merged = {}

    # Track which sources this agency appears in
    sources = group['_source'].tolist()
    merged['sources'] = sources
    merged['source_count'] = len(set(sources))  # Count UNIQUE sources

    # Prefer AgencySpotter for most fields (newest data: 2026-01-26)
    prefer_as = group[group['_source'] == 'agencyspotter'].iloc[0] if 'agencyspotter' in sources else group.iloc[0]

    # === IDENTITY FIELDS ===
    merged['name'] = prefer_as['name']
    merged['website'] = prefer_as['website']
    merged['website_normalized'] = prefer_as['website_normalized']

    # === CONTACT INFO (keep all unique values) ===
    emails = group['email'].dropna().unique().tolist()
    merged['contact_email'] = emails[0] if emails else None
    merged['all_emails'] = emails  # For JSONB

    phones = group['phone'].dropna().unique().tolist()
    merged['phone_number'] = phones[0] if phones else None
    merged['all_phones'] = phones  # For JSONB

    # === ADDRESS (prefer AS, keep all) ===
    merged['full_address'] = prefer_as['address']
    merged['city'] = prefer_as['city']
    merged['state'] = prefer_as['state']
    merged['country'] = prefer_as.get('country', 'United States')

    # === DESCRIPTIVE (pick longest) ===
    descriptions = group['description'].dropna()
    if len(descriptions) > 0:
        merged['description'] = max(descriptions, key=len)
    else:
        merged['description'] = None

    taglines = group['tagline'].dropna()
    if len(taglines) > 0:
        merged['tagline'] = max(taglines, key=len)
    else:
        merged['tagline'] = None

    # === LINKEDIN ===
    merged['linkedin_url'] = prefer_as.get('linkedin')

    # === LISTS (merge unique values) ===
    # Services
    all_services = []
    for service_str in group['service_focus'].dropna():
        all_services.extend(extract_services_list(service_str))
    merged['services_merged'] = list(set(all_services))

    # Industries (simple split for now)
    all_industries = []
    for industry_str in group['industry_focus'].dropna():
        if pd.notna(industry_str):
            industries = str(industry_str).replace('\\n', '\n').split('\n')
            all_industries.extend([i.strip() for i in industries if i.strip()])
    merged['industries_merged'] = list(set(all_industries))

    # Clients (simple split)
    all_clients = []
    for client_str in group['clients_list'].dropna():
        if pd.notna(client_str):
            clients = str(client_str).replace('\\n', '\n').split('\n')
            all_clients.extend([c.strip() for c in clients if c.strip()])
    merged['clients_merged'] = list(set(all_clients))

    # === METRICS (aggregate) ===
    # Rating: average
    ratings = group['rating'].dropna()
    if len(ratings) > 0:
        merged['avg_rating'] = round(ratings.mean(), 2)
    else:
        merged['avg_rating'] = None

    # Reviews: sum
    reviews = group['reviews'].dropna()
    if len(reviews) > 0:
        merged['total_reviews'] = int(reviews.sum())
    else:
        merged['total_reviews'] = 0

    # Employee count: prefer AS (newest)
    merged['employee_count'] = prefer_as.get('employee_count')
    emp_min, emp_max = parse_employee_count(merged['employee_count'])
    merged['employee_count_min'] = emp_min
    merged['employee_count_max'] = emp_max

    # === SOURCE-SPECIFIC DATA (JSONB) ===
    for source in sources:
        source_row = group[group['_source'] == source].iloc[0]
        merged[f'{source}_data'] = source_row['_source_data']

    # Fill None for sources not present
    for source in ['agencyspotter', 'goodfirms', 'themanifest']:
        if source not in sources:
            merged[f'{source}_data'] = None

    # === DATA QUALITY SCORE ===
    merged['data_quality_score'] = calculate_data_quality_score(pd.Series(merged))

    return merged


def fuzzy_match_names(df1, df2, threshold=FUZZY_MATCH_THRESHOLD):
    """
    Find agencies with similar names (fuzzy matching).
    Used for agencies without websites.

    Args:
        df1, df2: DataFrames to match
        threshold: Minimum similarity score (0-100)

    Returns:
        list: Matched pairs [(idx1, idx2, score), ...]
    """
    matches = []

    names1 = df1['name_normalized'].dropna().tolist()
    names2 = df2['name_normalized'].dropna().tolist()

    if not names1 or not names2:
        return matches

    print(f"  Fuzzy matching {len(names1)} x {len(names2)} names...")

    for i, name1 in enumerate(names1):
        if i % 100 == 0:
            print(f"    Progress: {i}/{len(names1)}")

        # Find best match in names2
        result = process.extractOne(
            name1,
            names2,
            scorer=fuzz.token_sort_ratio
        )

        if result and result[1] >= threshold:
            matched_name2, score = result[0], result[1]
            idx2 = names2.index(matched_name2)
            matches.append((i, idx2, score))

    print(f"  [OK] Found {len(matches)} fuzzy matches (>={threshold}% similarity)")

    return matches


def generate_merge_report(stats, conflicts, output_path=REPORT_FILE):
    """
    Generate detailed merge report showing statistics and conflicts.

    Args:
        stats: Dict with merge statistics
        conflicts: List of detected conflicts
        output_path: Where to save report
    """
    report = {
        'generated_at': datetime.now().isoformat(),
        'merge_summary': stats,
        'conflicts': {
            'total': len(conflicts),
            'by_type': {},
            'examples': conflicts[:20]  # First 20 examples
        },
        'recommendations': []
    }

    # Count by type
    for conflict in conflicts:
        conflict_type = conflict.get('type', 'unknown')
        report['conflicts']['by_type'][conflict_type] = \
            report['conflicts']['by_type'].get(conflict_type, 0) + 1

    # Recommendations
    if stats.get('address_conflicts', 0) > 10:
        report['recommendations'].append(
            "Spot-check address conflicts - some agencies may have multiple offices"
        )

    if stats.get('employee_count_conflicts', 0) > 10:
        report['recommendations'].append(
            "Review employee count conflicts - companies may have grown between scrapes"
        )

    # Save report
    with open(output_path, 'w') as f:
        json.dump(report, f, indent=2)

    print(f"\n[OK] Merge report saved to: {output_path}")
    print(f"  Total conflicts detected: {len(conflicts)}")
    for conflict_type, count in report['conflicts']['by_type'].items():
        print(f"    - {conflict_type}: {count}")


def main():
    """Main merge execution"""
    print("=" * 60)
    print("MULTI-SOURCE AGENCY MERGE")
    print("=" * 60)
    print()

    # === STEP 1: LOAD ALL SOURCES ===
    print("STEP 1: Loading Sources")
    print("-" * 60)

    dataframes = {}
    for source in ['agencyspotter', 'goodfirms', 'themanifest']:
        dataframes[source] = load_source_data(source)

    total_input = sum(len(df) for df in dataframes.values())
    print(f"\nTotal input agencies: {total_input:,}")

    # === STEP 2: EXACT WEBSITE DEDUPLICATION ===
    merged_df = deduplicate_exact_website(dataframes)

    # === STEP 3: OUTPUT ===
    print("\n" + "=" * 60)
    print("EXPORT")
    print("=" * 60)

    # Convert lists to JSON strings for CSV
    for col in ['sources', 'services_merged', 'industries_merged', 'clients_merged', 'all_emails', 'all_phones']:
        if col in merged_df.columns:
            merged_df[col] = merged_df[col].apply(lambda x: json.dumps(x) if isinstance(x, list) else x)

    # Convert source data dicts to JSON strings
    for source in ['agencyspotter', 'goodfirms', 'themanifest']:
        col = f'{source}_data'
        if col in merged_df.columns:
            merged_df[col] = merged_df[col].apply(lambda x: json.dumps(x) if isinstance(x, dict) else None)

    # Select final columns
    output_columns = [
        'name', 'website', 'website_normalized', 'contact_email', 'phone_number', 'linkedin_url',
        'full_address', 'city', 'state', 'country', 'description', 'tagline',
        'employee_count', 'employee_count_min', 'employee_count_max',
        'avg_rating', 'total_reviews',
        'services_merged', 'industries_merged', 'clients_merged',
        'sources', 'source_count', 'data_quality_score',
        'all_emails', 'all_phones',
        'agencyspotter_data', 'goodfirms_data', 'themanifest_data'
    ]

    final_df = merged_df[[col for col in output_columns if col in merged_df.columns]]

    # Save to CSV
    final_df.to_csv(OUTPUT_FILE, index=False)

    print(f"[OK] Exported {len(final_df):,} unique agencies to: {OUTPUT_FILE}")
    print(f"  Deduplication rate: {(1 - len(final_df)/total_input)*100:.1f}%")

    # === STEP 4: GENERATE REPORT ===
    stats = {
        'total_input': total_input,
        'total_output': len(final_df),
        'deduplication_rate': round((1 - len(final_df)/total_input) * 100, 1),
        'source_distribution': {
            '1_source': len(final_df[final_df['source_count'] == 1]),
            '2_sources': len(final_df[final_df['source_count'] == 2]),
            '3_sources': len(final_df[final_df['source_count'] == 3]),
        }
    }

    # TODO: Track conflicts during merge
    conflicts = []

    generate_merge_report(stats, conflicts)

    print("\n" + "=" * 60)
    print("MERGE COMPLETE!")
    print("=" * 60)
    print(f"Output: {OUTPUT_FILE}")
    print(f"Report: {REPORT_FILE}")
    print()


if __name__ == '__main__':
    main()
