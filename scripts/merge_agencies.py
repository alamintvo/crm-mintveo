"""
Multi-Source Agency Merge Script

Merges agency data from AgencySpotter, GoodFirms, and TheManifest into a single
master list with deduplication and conflict resolution.

Features:
- Loads all 3 CSV sources using source mappings
- Normalizes website URLs for matching
- Deduplicates by exact website match + fuzzy name match
- Smart normalization for emails, phones, addresses, LinkedIn URLs
- Keeps ALL unique values for contact info (multiple offices/contacts)
- Auto-resolves conflicts using intelligent rules
- Generates detailed merge report
- Exports to merged_agencies_master.csv

New in this version:
- Phone normalization: removes formatting, detects true duplicates
- Email normalization: lowercase, trim whitespace
- Address normalization: standardize abbreviations
- LinkedIn URL normalization: remove protocol/www/trailing slash
- Arrays for: contact_emails, phone_numbers, addresses, linkedin_urls, social_links

Author: Claude Code
Created: 2026-02-11
Updated: 2026-02-12 (Smart normalization + keep all unique values)
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
OUTPUT_FILE = "../data/processed/merged_agencies_master.csv"
REPORT_FILE = "../data/processed/merge_report.json"
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


def normalize_phone(phone):
    """
    Normalize phone number for deduplication.

    Removes all non-digit characters and country code for US numbers.

    Examples:
        "612-799-6613" -> "6127996613"
        "+1 612-799-6613" -> "6127996613"
        "(612) 799-6613" -> "6127996613"

    Args:
        phone: Raw phone string

    Returns:
        str or None: Normalized phone (digits only), or None if invalid
    """
    if pd.isna(phone) or not phone:
        return None

    # Remove all non-digit characters
    digits_only = re.sub(r'\D', '', str(phone))

    # Remove +1 country code for US numbers
    if digits_only.startswith('1') and len(digits_only) == 11:
        digits_only = digits_only[1:]  # Remove leading 1

    # Must be 10 digits for valid US phone
    if len(digits_only) != 10:
        return None

    return digits_only


def normalize_email(email):
    """
    Normalize email for deduplication.

    Lowercase and trim whitespace.

    Examples:
        "INFO@Agency.com" -> "info@agency.com"
        " info@agency.com " -> "info@agency.com"

    Args:
        email: Raw email string

    Returns:
        str or None: Normalized email, or None if invalid
    """
    if pd.isna(email) or not email:
        return None

    email = str(email).strip().lower()

    # Basic validation
    if '@' not in email:
        return None

    return email


def normalize_address(address):
    """
    Normalize address for deduplication.

    Standardizes abbreviations, removes extra spaces, lowercase.

    Examples:
        "2521 27th ave S, Minneapolis, MN" -> "2521 27th ave s minneapolis mn"
        "2521 27th Ave S, Minneapolis, Minnesota" -> "2521 27th ave s minneapolis minnesota"

    Args:
        address: Raw address string

    Returns:
        str or None: Normalized address, or None if invalid
    """
    if pd.isna(address) or not address:
        return None

    addr = str(address).lower().strip()

    # Standardize common abbreviations
    replacements = {
        ' avenue ': ' ave ',
        ' street ': ' st ',
        ' road ': ' rd ',
        ' drive ': ' dr ',
        ' boulevard ': ' blvd ',
        ' south ': ' s ',
        ' north ': ' n ',
        ' east ': ' e ',
        ' west ': ' w ',
    }

    for old, new in replacements.items():
        addr = addr.replace(old, new)

    # Remove extra spaces
    addr = re.sub(r'\s+', ' ', addr)

    # Remove trailing punctuation and commas
    addr = addr.rstrip('.,')

    return addr


def normalize_linkedin(url):
    """
    Normalize LinkedIn URL for deduplication.

    Removes protocol, www, trailing slash, lowercase.

    Examples:
        "https://www.linkedin.com/company/xyz/" -> "linkedin.com/company/xyz"
        "LinkedIn.com/company/xyz" -> "linkedin.com/company/xyz"

    Args:
        url: Raw LinkedIn URL

    Returns:
        str or None: Normalized URL, or None if invalid
    """
    if pd.isna(url) or not url:
        return None

    url = str(url).lower().strip()

    # Remove protocol
    url = re.sub(r'^https?://', '', url)

    # Remove www.
    url = re.sub(r'^www\.', '', url)

    # Remove trailing slash
    url = url.rstrip('/')

    return url if url else None


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
        tuple: (DataFrame of merged agencies, list of all conflicts)
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

    # Merge duplicates and collect conflicts
    merged = []
    all_conflicts = []

    for website, group in grouped:
        # Always use merge_agency_records to ensure consistent structure
        # (even for single-source agencies)
        merged_row, conflicts = merge_agency_records(group)
        merged.append(merged_row)
        all_conflicts.extend(conflicts)  # Collect conflicts from this agency

    print(f"Merged into: {len(merged):,} unique agencies")
    print(f"Conflicts detected: {len(all_conflicts):,}")

    return pd.DataFrame(merged), all_conflicts


def merge_agency_records(group):
    """
    Merge multiple records of the same agency from different sources.
    Apply conflict resolution rules from PROJECT_PLAN.md.

    Args:
        group: DataFrame with multiple rows for same agency

    Returns:
        tuple: (merged_dict, conflicts_list)
    """
    # Initialize merged record
    merged = {}
    conflicts = []  # Track conflicts for this agency

    # Track which sources this agency appears in
    sources = group['_source'].tolist()
    merged['sources'] = sources
    merged['source_count'] = len(set(sources))  # Count UNIQUE sources

    # Prefer AgencySpotter for most fields (newest data: 2026-01-26)
    prefer_as = group[group['_source'] == 'agencyspotter'].iloc[0] if 'agencyspotter' in sources else group.iloc[0]

    agency_name = group.iloc[0]['name']  # For conflict logging

    # === IDENTITY FIELDS ===
    merged['name'] = prefer_as['name']
    merged['website'] = prefer_as['website']
    merged['website_normalized'] = prefer_as['website_normalized']

    # === CONTACT INFO: Keep ALL unique values (with smart normalization) ===

    # Emails - normalize and deduplicate
    all_emails_normalized = []
    all_emails_original = []
    email_sources = {}  # Track which source has which email
    for _, row in group.iterrows():
        email = row['email']
        source = row['_source']
        if pd.notna(email):
            email_norm = normalize_email(email)
            if email_norm:
                if email_norm not in email_sources:
                    email_sources[email_norm] = []
                email_sources[email_norm].append(source)
                if email_norm not in all_emails_normalized:
                    all_emails_normalized.append(email_norm)
                    all_emails_original.append(email)

    merged['contact_emails'] = all_emails_original  # Array of all unique emails
    merged['contact_email'] = all_emails_original[0] if all_emails_original else None  # Primary

    # Log conflict if multiple different emails exist
    if len(all_emails_original) > 1 and merged['source_count'] > 1:
        conflicts.append({
            'agency': agency_name,
            'field': 'contact_email',
            'type': 'multiple_emails',
            'count': len(all_emails_original),
            'values': all_emails_original,
            'resolution': 'kept_all_unique'
        })

    # Phone numbers - normalize and deduplicate
    all_phones_normalized = []
    all_phones_original = []
    phone_sources = {}  # Track which source has which phone
    for _, row in group.iterrows():
        phone = row['phone']
        source = row['_source']
        if pd.notna(phone):
            phone_norm = normalize_phone(phone)
            if phone_norm:
                if phone_norm not in phone_sources:
                    phone_sources[phone_norm] = []
                phone_sources[phone_norm].append(source)
                if phone_norm not in all_phones_normalized:
                    all_phones_normalized.append(phone_norm)
                    all_phones_original.append(phone)

    merged['phone_numbers'] = all_phones_original  # Array of all unique phones
    merged['phone_number'] = all_phones_original[0] if all_phones_original else None  # Primary

    # Log conflict if multiple different phone numbers exist
    if len(all_phones_original) > 1 and merged['source_count'] > 1:
        conflicts.append({
            'agency': agency_name,
            'field': 'phone_number',
            'type': 'multiple_phones',
            'count': len(all_phones_original),
            'values': all_phones_original,
            'resolution': 'kept_all_unique'
        })

    # Addresses - normalize and deduplicate
    all_addresses_normalized = []
    all_addresses_original = []
    address_sources = {}
    for _, row in group.iterrows():
        addr = row['address']
        source = row['_source']
        if pd.notna(addr):
            addr_norm = normalize_address(addr)
            if addr_norm:
                if addr_norm not in address_sources:
                    address_sources[addr_norm] = []
                address_sources[addr_norm].append(source)
                if addr_norm not in all_addresses_normalized:
                    all_addresses_normalized.append(addr_norm)
                    all_addresses_original.append(addr)

    merged['addresses'] = all_addresses_original  # Array of all unique addresses
    merged['full_address'] = all_addresses_original[0] if all_addresses_original else None  # Primary

    # Log conflict if multiple different addresses exist (possible multiple offices)
    if len(all_addresses_original) > 1 and merged['source_count'] > 1:
        conflicts.append({
            'agency': agency_name,
            'field': 'address',
            'type': 'multiple_locations',
            'count': len(all_addresses_original),
            'values': all_addresses_original,
            'resolution': 'kept_all_unique'
        })

    # City/State/Country from primary address (prefer AS)
    merged['city'] = prefer_as['city']
    merged['state'] = prefer_as['state']
    merged['country'] = prefer_as.get('country', 'United States')

    # === DESCRIPTIVE (pick longest) ===
    descriptions = group['description'].dropna()
    if len(descriptions) > 0:
        merged['description'] = max(descriptions, key=len)
        # Log conflict if multiple different descriptions exist
        if len(descriptions) > 1 and descriptions.nunique() > 1 and merged['source_count'] > 1:
            desc_by_source = {}
            for _, row in group.iterrows():
                if pd.notna(row['description']):
                    desc_preview = str(row['description'])[:50] + '...'
                    desc_by_source[row['_source']] = desc_preview
            conflicts.append({
                'agency': agency_name,
                'field': 'description',
                'type': 'different_descriptions',
                'values': desc_by_source,
                'resolution': 'picked_longest'
            })
    else:
        merged['description'] = None

    taglines = group['tagline'].dropna()
    if len(taglines) > 0:
        merged['tagline'] = max(taglines, key=len)
    else:
        merged['tagline'] = None

    # === LINKEDIN URLs: Keep ALL unique (with normalization) ===
    all_linkedin_normalized = []
    all_linkedin_original = []
    for li_url in group['linkedin'].dropna():
        li_norm = normalize_linkedin(li_url)
        if li_norm and li_norm not in all_linkedin_normalized:
            all_linkedin_normalized.append(li_norm)
            all_linkedin_original.append(li_url)
    merged['linkedin_urls'] = all_linkedin_original  # Array of all unique LinkedIn URLs
    merged['linkedin_url'] = all_linkedin_original[0] if all_linkedin_original else None  # Primary

    # === SOCIAL LINKS: Keep ALL unique from all sources ===
    # Note: Only AgencySpotter has "Other Social Links" field
    all_social_links = []
    for social_str in group['_source_data']:
        # Access the original source data dict
        if isinstance(social_str, dict) and 'Other Social Links' in social_str:
            social = social_str['Other Social Links']
            if pd.notna(social) and social:
                # Split by newlines or commas
                links = str(social).replace('\\n', '\n').split('\n')
                for link in links:
                    link = link.strip()
                    if link and link not in all_social_links:
                        all_social_links.append(link)
    merged['social_links'] = all_social_links if all_social_links else None

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
        # Log conflict if ratings differ across sources
        if len(ratings) > 1 and ratings.nunique() > 1 and merged['source_count'] > 1:
            rating_by_source = {}
            for _, row in group.iterrows():
                if pd.notna(row['rating']):
                    rating_by_source[row['_source']] = float(row['rating'])
            conflicts.append({
                'agency': agency_name,
                'field': 'rating',
                'type': 'different_ratings',
                'values': rating_by_source,
                'resolution': f'averaged_to_{merged["avg_rating"]}'
            })
    else:
        merged['avg_rating'] = None

    # Reviews: sum
    reviews = group['reviews'].dropna()
    if len(reviews) > 0:
        merged['total_reviews'] = int(reviews.sum())
    else:
        merged['total_reviews'] = 0

    # Employee count: prefer AS (newest)
    emp_counts = {}
    for _, row in group.iterrows():
        if pd.notna(row.get('employee_count')):
            emp_counts[row['_source']] = row['employee_count']

    merged['employee_count'] = prefer_as.get('employee_count')
    emp_min, emp_max = parse_employee_count(merged['employee_count'])
    merged['employee_count_min'] = emp_min
    merged['employee_count_max'] = emp_max

    # Log conflict if employee counts differ across sources
    if len(emp_counts) > 1 and len(set(str(v) for v in emp_counts.values())) > 1:
        conflicts.append({
            'agency': agency_name,
            'field': 'employee_count',
            'type': 'different_employee_counts',
            'values': emp_counts,
            'resolution': f'preferred_agencyspotter_{merged["employee_count"]}'
        })

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

    return merged, conflicts


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
    # Count conflicts by type and field
    by_type = {}
    by_field = {}

    for conflict in conflicts:
        conflict_type = conflict.get('type', 'unknown')
        field = conflict.get('field', 'unknown')

        by_type[conflict_type] = by_type.get(conflict_type, 0) + 1
        by_field[field] = by_field.get(field, 0) + 1

    # Generate recommendations
    recommendations = []

    if by_type.get('multiple_locations', 0) > 10:
        recommendations.append(
            f"Found {by_type['multiple_locations']} agencies with multiple addresses - these may have multiple office locations"
        )

    if by_type.get('multiple_phones', 0) > 20:
        recommendations.append(
            f"Found {by_type['multiple_phones']} agencies with multiple phone numbers - verify these are legitimate different numbers"
        )

    if by_type.get('different_employee_counts', 0) > 10:
        recommendations.append(
            f"Found {by_type['different_employee_counts']} agencies with conflicting employee counts - companies may have grown or data may be outdated"
        )

    if by_type.get('different_ratings', 0) > 50:
        recommendations.append(
            f"Found {by_type['different_ratings']} agencies with different ratings across sources - averaged for overall reputation"
        )

    # Build report
    report = {
        'generated_at': datetime.now().isoformat(),
        'merge_summary': stats,
        'conflicts': {
            'total': len(conflicts),
            'unique_agencies_affected': len(set(c['agency'] for c in conflicts)),
            'by_type': by_type,
            'by_field': by_field,
            'all_conflicts': conflicts  # ALL conflicts, not just examples
        },
        'recommendations': recommendations
    }

    # Save report
    with open(output_path, 'w') as f:
        json.dump(report, f, indent=2)

    print(f"\n[OK] Merge report saved to: {output_path}")
    print(f"  Total conflicts detected: {len(conflicts)}")
    print(f"  Agencies with conflicts: {report['conflicts']['unique_agencies_affected']}")
    print(f"\n  Conflicts by type:")
    for conflict_type, count in sorted(by_type.items(), key=lambda x: x[1], reverse=True):
        print(f"    - {conflict_type}: {count}")
    print(f"\n  Conflicts by field:")
    for field, count in sorted(by_field.items(), key=lambda x: x[1], reverse=True):
        print(f"    - {field}: {count}")


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
    merged_df, conflicts = deduplicate_exact_website(dataframes)

    # === STEP 3: OUTPUT ===
    print("\n" + "=" * 60)
    print("EXPORT")
    print("=" * 60)

    # Convert lists to JSON strings for CSV
    list_columns = [
        'sources', 'services_merged', 'industries_merged', 'clients_merged',
        'contact_emails', 'phone_numbers', 'addresses', 'linkedin_urls', 'social_links'
    ]
    for col in list_columns:
        if col in merged_df.columns:
            merged_df[col] = merged_df[col].apply(lambda x: json.dumps(x) if isinstance(x, list) else x)

    # Convert source data dicts to JSON strings
    for source in ['agencyspotter', 'goodfirms', 'themanifest']:
        col = f'{source}_data'
        if col in merged_df.columns:
            merged_df[col] = merged_df[col].apply(lambda x: json.dumps(x) if isinstance(x, dict) else None)

    # Select final columns
    output_columns = [
        # Identity
        'name', 'website', 'website_normalized',
        # Contact info (primary + all arrays)
        'contact_email', 'contact_emails',
        'phone_number', 'phone_numbers',
        'full_address', 'addresses',
        'linkedin_url', 'linkedin_urls',
        'social_links',
        # Location
        'city', 'state', 'country',
        # Descriptive
        'description', 'tagline',
        # Metrics
        'employee_count', 'employee_count_min', 'employee_count_max',
        'avg_rating', 'total_reviews',
        # Lists
        'services_merged', 'industries_merged', 'clients_merged',
        # Source tracking
        'sources', 'source_count', 'data_quality_score',
        # Source-specific JSONB data
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
        },
        'agencies_with_conflicts': len(set(c['agency'] for c in conflicts)),
        'total_conflicts': len(conflicts)
    }

    generate_merge_report(stats, conflicts)

    print("\n" + "=" * 60)
    print("MERGE COMPLETE!")
    print("=" * 60)
    print(f"Output: {OUTPUT_FILE}")
    print(f"Report: {REPORT_FILE}")
    print()


if __name__ == '__main__':
    main()
