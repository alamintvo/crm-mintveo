"""
Source Mapping Configuration for Multi-Source Agency Merge

This file maps column names from different data sources to universal field names.
Enables the merge script to work with different CSV schemas.

Author: Claude Code
Created: 2026-02-11
"""

# Universal field names (used in merged output)
# These are the 11 fields common to all 3 sources
UNIVERSAL_FIELDS = [
    "name",  # Agency Name
    "website",  # Website URL
    "profile_url",  # Profile URL (platform-specific)
    "description",  # Description
    "city",  # City
    "state",  # State
    "employee_count",  # Employee Count
    "rating",  # Average Rating
    "reviews",  # Review Count
    "industry_focus",  # Industry Focus
    "clients_list",  # Clients List
]

# Additional common fields (not in all sources)
COMMON_FIELDS = [
    "email",  # Contact Email (AS, GF only)
    "phone",  # Phone Number (AS, GF only)
    "linkedin",  # LinkedIn URL (AS, GF only)
    "address",  # Full Address (AS, GF only)
    "tagline",  # Tagline (AS, GF only)
    "service_focus",  # Service Focus (AS, GF only)
    "claimed_status",  # Claimed Status (AS, GF only)
]

# Source-specific field mappings
# Maps universal field name -> actual CSV column name
SOURCE_MAPPINGS = {
    "agencyspotter": {
        # === UNIVERSAL FIELDS ===
        "name": "Agency Name",
        "website": "Website URL",
        "profile_url": "Profile URL",
        "description": "Description",
        "city": "City",
        "state": "State",
        "employee_count": "Employee Count",
        "rating": "Average Rating",
        "reviews": "Review Count",
        "industry_focus": "Industry Focus",
        "clients_list": "Clients List",
        # === COMMON FIELDS (not in all sources) ===
        "email": "Contact Email",
        "phone": "Phone Number",
        "linkedin": "LinkedIn URL",
        "address": "Full Address",
        "tagline": "Tagline",
        "service_focus": "Service Focus",
        "claimed_status": "Claimed Status",
        # === AGENCYSPOTTER-SPECIFIC FIELDS ===
        # These will be stored in agencyspotter_data JSONB
        "country": "Country",
        "affiliation": "Affiliation",
        "audience_specialty": "Audience Specialty",
        "min_project_size": "Min Project Size",
        "annual_budget": "Annual Budget",
        "projects": "Projects",
        "other_social_links": "Other Social Links",
    },
    "goodfirms": {
        # === UNIVERSAL FIELDS ===
        "name": "Agency Name",
        "website": "Website URL",
        "profile_url": "Profile URL",
        "description": "Description",
        "city": "City",
        "state": "State",
        "employee_count": "Employee Count",
        "rating": "Average Rating",
        "reviews": "Review Count",
        "industry_focus": "Industry Focus",
        "clients_list": "Clients List",
        # === COMMON FIELDS ===
        "email": "Contact Email",
        "phone": "Phone Number",
        "linkedin": "LinkedIn URL",
        "address": "Full Address",
        "tagline": "Tagline",
        "service_focus": "Service Focus",
        "claimed_status": "Claimed Status",
        # === GOODFIRMS-SPECIFIC FIELDS ===
        # These will be stored in goodfirms_data JSONB
        "country": None,  # Not in GF (all USA)
        "founding_year": "Founding Year",
        "hourly_rate": "Hourly Rate",
        "client_count": "Client Count",
        "client_focus": "Client Focus",
        "client_portfolio": "Client Portfolio",
        "last_review_date": "Last Review Date",
    },
    "themanifest": {
        # === UNIVERSAL FIELDS ===
        "name": "Agency Name",
        "website": "Website URL",
        "profile_url": "Profile URL",
        "description": "Description",
        "city": "City",
        "state": "State",
        "employee_count": "Employee Count",
        "rating": "Average Rating",
        "reviews": "Review Count",
        "industry_focus": "Industry Focus",
        "clients_list": "Clients List",
        # === COMMON FIELDS (TheManifest doesn't have contact info) ===
        "email": None,  # Not in TM
        "phone": None,  # Not in TM
        "linkedin": None,  # Not in TM
        "address": None,  # Not in TM
        "tagline": None,  # Not in TM
        "service_focus": None,  # Not in TM
        "claimed_status": None,  # Not in TM
        # === THEMANIFEST-SPECIFIC FIELDS ===
        # These will be stored in themanifest_data JSONB
        "country": None,  # Not in TM (all USA)
        "min_project_size": "Min Project Size",
        "common_project_size": "Common Project Size",
        "client_size_distribution": "Client Size Distribution",
    },
}

# CSV file paths
SOURCE_FILES = {
    "agencyspotter": "../data/raw/agencies_extracted_agencyspotter_20260126_cleaned.csv",
    "goodfirms": "../data/raw/agencies_extracted_goodfirms_20260115.csv",
    "themanifest": "../data/raw/agencies_extracted_themanifest_20260126.csv",
}

# Source metadata (for reference)
SOURCE_INFO = {
    "agencyspotter": {
        "name": "AgencySpotter",
        "rows": 1576,
        "columns": 25,
        "has_contact_info": True,
        "country_coverage": "Global (63 countries)",
        "color": "blue",  # For UI
    },
    "goodfirms": {
        "name": "GoodFirms",
        "rows": 2355,
        "columns": 24,
        "has_contact_info": True,
        "country_coverage": "USA only",
        "color": "green",  # For UI
    },
    "themanifest": {
        "name": "TheManifest",
        "rows": 10226,
        "columns": 14,
        "has_contact_info": False,
        "country_coverage": "USA only",
        "color": "purple",  # For UI
    },
}


def get_field_mapping(source, field):
    """
    Get the actual CSV column name for a universal field name.

    Args:
        source: Source name ('agencyspotter', 'goodfirms', 'themanifest')
        field: Universal field name ('name', 'website', etc.)

    Returns:
        str or None: Actual CSV column name, or None if not available in this source

    Example:
        >>> get_field_mapping('agencyspotter', 'name')
        'Agency Name'
        >>> get_field_mapping('themanifest', 'email')
        None
    """
    if source not in SOURCE_MAPPINGS:
        raise ValueError(
            f"Unknown source: {source}. Available: {list(SOURCE_MAPPINGS.keys())}"
        )

    return SOURCE_MAPPINGS[source].get(field)


def get_all_fields(source):
    """
    Get all field mappings for a source (excluding None values).

    Args:
        source: Source name

    Returns:
        dict: {universal_field: csv_column} for all available fields

    Example:
        >>> fields = get_all_fields('agencyspotter')
        >>> 'Agency Name' in fields.values()
        True
    """
    if source not in SOURCE_MAPPINGS:
        raise ValueError(f"Unknown source: {source}")

    return {k: v for k, v in SOURCE_MAPPINGS[source].items() if v is not None}


def validate_mappings():
    """
    Validate that all mappings point to existing CSV columns.
    Should be run before merge to catch typos.

    Raises:
        AssertionError: If any mapping is invalid
    """
    import os

    import pandas as pd

    for source, filepath in SOURCE_FILES.items():
        if not os.path.exists(filepath):
            raise FileNotFoundError(f"CSV not found: {filepath}")

        # Read just the header
        df = pd.read_csv(filepath, nrows=0)
        actual_columns = set(df.columns)

        # Check each mapping
        for field, column in SOURCE_MAPPINGS[source].items():
            if column is not None:
                if column not in actual_columns:
                    raise AssertionError(
                        f"Invalid mapping for {source}.{field}: "
                        f"Column '{column}' not found in CSV. "
                        f"Available columns: {sorted(actual_columns)}"
                    )

        print(
            f"[OK] {source.upper()}: All {len(get_all_fields(source))} mappings valid"
        )

    print("\n[SUCCESS] All source mappings validated successfully!")


if __name__ == "__main__":
    """Run validation when executed directly"""
    print("=" * 60)
    print("SOURCE MAPPING VALIDATION")
    print("=" * 60)
    print()

    # Show summary
    print("SOURCES:")
    for source, info in SOURCE_INFO.items():
        print(
            f"  {info['name']:15s} - {info['rows']:,} rows, {info['columns']} columns"
        )

    print()
    print("UNIVERSAL FIELDS (common to all 3):")
    for field in UNIVERSAL_FIELDS:
        print(f"  - {field}")

    print()
    print("VALIDATING MAPPINGS...")
    print()

    try:
        validate_mappings()
    except Exception as e:
        print(f"\n[ERROR] Validation failed: {e}")
        exit(1)
