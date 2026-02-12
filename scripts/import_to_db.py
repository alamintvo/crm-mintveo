"""
Import Merged Agencies CSV to PostgreSQL Database

Reads merged_agencies_master.csv and imports all 12,919 agencies
into the PostgreSQL database via Neon.

Features:
- Parses JSON columns (arrays and JSONB)
- Handles NULL values correctly
- Batch inserts for performance
- Progress tracking

Author: Claude Code
Created: 2026-02-12
"""

import json
import os
import pandas as pd
import psycopg2
from psycopg2.extras import execute_values
from dotenv import load_dotenv
from datetime import datetime

# Load environment variables
load_dotenv()

DATABASE_URL = os.getenv('DATABASE_URL')
CSV_FILE = '../data/processed/merged_agencies_master.csv'
BATCH_SIZE = 100  # Insert 100 agencies at a time

def parse_json_field(value):
    """Parse JSON string to Python object, return None if NaN"""
    if pd.isna(value) or value is None:
        return None
    if isinstance(value, str):
        try:
            return json.loads(value)
        except json.JSONDecodeError:
            return None
    return value

def clean_json_for_postgres(data):
    """Convert NaN values to None in nested dictionaries/lists for PostgreSQL JSON compatibility"""
    if data is None:
        return None
    if isinstance(data, dict):
        return {k: clean_json_for_postgres(v) for k, v in data.items()}
    elif isinstance(data, list):
        return [clean_json_for_postgres(item) for item in data]
    elif isinstance(data, float) and pd.isna(data):
        return None
    else:
        return data

def main():
    print("=" * 70)
    print("IMPORT MERGED AGENCIES TO POSTGRESQL")
    print("=" * 70)
    print()

    # === STEP 1: Load CSV ===
    print("STEP 1: Loading CSV")
    print("-" * 70)

    df = pd.read_csv(CSV_FILE)
    print(f"[OK] Loaded {len(df):,} agencies from {CSV_FILE}")

    # === STEP 2: Connect to Database ===
    print("\nSTEP 2: Connecting to PostgreSQL")
    print("-" * 70)

    if not DATABASE_URL:
        print("[ERROR] ERROR: DATABASE_URL not found in .env file")
        return

    try:
        conn = psycopg2.connect(DATABASE_URL)
        cursor = conn.cursor()
        print(f"[OK] Connected to PostgreSQL")
    except Exception as e:
        print(f"[ERROR] Connection failed: {e}")
        return

    # === STEP 3: Clear existing data (optional) ===
    print("\nSTEP 3: Preparing Database")
    print("-" * 70)

    cursor.execute("SELECT COUNT(*) FROM agencies")
    existing_count = cursor.fetchone()[0]

    if existing_count > 0:
        print(f"[WARN] Found {existing_count} existing agencies in database")
        print("  Truncating table to start fresh...")
        cursor.execute("TRUNCATE TABLE agencies RESTART IDENTITY CASCADE")
        conn.commit()
        print("[OK] Table cleared")
    else:
        print("[OK] Table is empty, ready for import")

    # === STEP 4: Prepare Data ===
    print("\nSTEP 4: Preparing Data")
    print("-" * 70)

    records = []

    for idx, row in df.iterrows():
        # Parse JSON fields
        contact_emails = parse_json_field(row.get('contact_emails'))
        phone_numbers = parse_json_field(row.get('phone_numbers'))
        addresses = parse_json_field(row.get('addresses'))
        linkedin_urls = parse_json_field(row.get('linkedin_urls'))
        social_links = parse_json_field(row.get('social_links'))
        services_merged = parse_json_field(row.get('services_merged'))
        industries_merged = parse_json_field(row.get('industries_merged'))
        clients_merged = parse_json_field(row.get('clients_merged'))
        sources = parse_json_field(row.get('sources'))

        # Parse source JSONB data
        agencyspotter_data = parse_json_field(row.get('agencyspotter_data'))
        goodfirms_data = parse_json_field(row.get('goodfirms_data'))
        themanifest_data = parse_json_field(row.get('themanifest_data'))

        # Prepare record tuple
        record = (
            # Identity
            row.get('name'),
            row.get('website') if pd.notna(row.get('website')) else None,

            # Contact info
            row.get('contact_email') if pd.notna(row.get('contact_email')) else None,
            contact_emails or [],
            row.get('phone_number') if pd.notna(row.get('phone_number')) else None,
            phone_numbers or [],
            row.get('full_address') if pd.notna(row.get('full_address')) else None,
            addresses or [],
            row.get('linkedin_url') if pd.notna(row.get('linkedin_url')) else None,
            linkedin_urls or [],
            social_links or [],

            # Location
            row.get('city') if pd.notna(row.get('city')) else None,
            row.get('state') if pd.notna(row.get('state')) else None,
            row.get('country') if pd.notna(row.get('country')) else None,

            # Descriptive
            row.get('description') if pd.notna(row.get('description')) else None,
            row.get('tagline') if pd.notna(row.get('tagline')) else None,

            # Metrics
            row.get('employee_count') if pd.notna(row.get('employee_count')) else None,
            int(row.get('employee_count_min')) if pd.notna(row.get('employee_count_min')) else None,
            int(row.get('employee_count_max')) if pd.notna(row.get('employee_count_max')) else None,
            float(row.get('avg_rating')) if pd.notna(row.get('avg_rating')) else None,
            int(row.get('total_reviews')) if pd.notna(row.get('total_reviews')) else 0,

            # Lists
            services_merged or [],
            industries_merged or [],
            clients_merged or [],

            # Source tracking
            sources or [],
            int(row.get('source_count')) if pd.notna(row.get('source_count')) else 0,
            int(row.get('data_quality_score')) if pd.notna(row.get('data_quality_score')) else None,

            # Source JSONB data (clean NaN values before serializing)
            json.dumps(clean_json_for_postgres(agencyspotter_data)) if agencyspotter_data else None,
            json.dumps(clean_json_for_postgres(goodfirms_data)) if goodfirms_data else None,
            json.dumps(clean_json_for_postgres(themanifest_data)) if themanifest_data else None,
        )

        records.append(record)

        if (idx + 1) % 1000 == 0:
            print(f"  Prepared {idx + 1:,} / {len(df):,} records...")

    print(f"[OK] Prepared {len(records):,} records for import")

    # === STEP 5: Batch Insert ===
    print("\nSTEP 5: Importing to PostgreSQL")
    print("-" * 70)

    insert_query = """
    INSERT INTO agencies (
        name, website_url,
        contact_email, contact_emails, phone_number, phone_numbers,
        full_address, addresses, linkedin_url, linkedin_urls, social_links,
        city, state, country,
        description, tagline,
        employee_count, employee_count_min, employee_count_max,
        avg_rating, total_reviews,
        services_merged, industries_merged, clients_merged,
        sources, source_count, data_quality_score,
        agencyspotter_data, goodfirms_data, themanifest_data
    ) VALUES %s
    """

    try:
        # Batch insert for performance
        for i in range(0, len(records), BATCH_SIZE):
            batch = records[i:i + BATCH_SIZE]
            execute_values(cursor, insert_query, batch)
            conn.commit()
            print(f"  Inserted {min(i + BATCH_SIZE, len(records)):,} / {len(records):,} agencies...")

        print(f"[OK] Successfully imported {len(records):,} agencies")

    except Exception as e:
        print(f"[ERROR] Import failed: {e}")
        conn.rollback()
        return

    # === STEP 6: Verify Import ===
    print("\nSTEP 6: Verifying Import")
    print("-" * 70)

    cursor.execute("SELECT COUNT(*) FROM agencies")
    final_count = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM agencies WHERE source_count > 1")
    multi_source_count = cursor.fetchone()[0]

    cursor.execute("SELECT AVG(data_quality_score)::NUMERIC(10,2) FROM agencies WHERE data_quality_score IS NOT NULL")
    avg_quality = cursor.fetchone()[0]

    print(f"[OK] Total agencies in database: {final_count:,}")
    print(f"[OK] Multi-source agencies: {multi_source_count:,}")
    print(f"[OK] Average data quality score: {avg_quality}")

    # Sample query
    cursor.execute("""
        SELECT name, city, state, source_count, avg_rating, total_reviews
        FROM agencies
        WHERE source_count = 3
        LIMIT 5
    """)

    print("\n[OK] Sample agencies found in all 3 sources:")
    for row in cursor.fetchall():
        print(f"  - {row[0]} ({row[1]}, {row[2]}) | Sources: {row[3]} | Rating: {row[4]} ({row[5]} reviews)")

    # Close connection
    cursor.close()
    conn.close()

    print("\n" + "=" * 70)
    print("IMPORT COMPLETE!")
    print("=" * 70)
    print(f"[OK] Imported: {final_count:,} agencies")
    print(f"[OK] Database: PostgreSQL (Neon)")
    print()

if __name__ == '__main__':
    main()
