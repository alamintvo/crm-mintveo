-- Migration: Clean Location Data
-- Purpose: Remove state codes from city field and standardize country data
-- Date: 2026-02-12

-- Step 1: Backup the current data (optional but recommended)
-- CREATE TABLE agencies_backup_20260212 AS SELECT * FROM agencies;

-- Step 2: Clean city field - remove everything from comma onwards
-- This will change "San Francisco, CA" to "San Francisco"
UPDATE agencies
SET city = TRIM(SPLIT_PART(city, ',', 1))
WHERE city LIKE '%,%';

-- Step 3: Set country to "United States" for records with US state codes and null country
-- Common US state codes
UPDATE agencies
SET country = 'United States'
WHERE country IS NULL
  AND state IN (
    'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
    'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
    'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
    'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
    'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY',
    'DC', -- Washington DC
    'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado',
    'Connecticut', 'Delaware', 'Florida', 'Georgia', 'Hawaii', 'Idaho',
    'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky', 'Louisiana',
    'Maine', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota',
    'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada',
    'New Hampshire', 'New Jersey', 'New Mexico', 'New York',
    'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon',
    'Pennsylvania', 'Rhode Island', 'South Carolina', 'South Dakota',
    'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington',
    'West Virginia', 'Wisconsin', 'Wyoming'
  );

-- Step 4: Verify the changes
SELECT
  'Total records' as metric,
  COUNT(*) as count
FROM agencies
UNION ALL
SELECT
  'Cities with commas (after cleaning)',
  COUNT(*)
FROM agencies
WHERE city LIKE '%,%'
UNION ALL
SELECT
  'Records with country set',
  COUNT(*)
FROM agencies
WHERE country IS NOT NULL
UNION ALL
SELECT
  'US records with country',
  COUNT(*)
FROM agencies
WHERE country = 'United States';

-- Expected results:
-- - Cities with commas should be 0
-- - Most US agencies should have country = 'United States'
