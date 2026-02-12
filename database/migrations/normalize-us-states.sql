-- Migration: Normalize US State Names to Full Names
-- Purpose: Convert all US state codes to full state names for consistency
-- Date: 2026-02-12

-- Normalize all US state codes to full state names
-- This will convert "CA" -> "California", "NY" -> "New York", etc.

UPDATE agencies
SET state = CASE state
    -- Standard state codes to full names
    WHEN 'AL' THEN 'Alabama'
    WHEN 'AK' THEN 'Alaska'
    WHEN 'AZ' THEN 'Arizona'
    WHEN 'AR' THEN 'Arkansas'
    WHEN 'CA' THEN 'California'
    WHEN 'CO' THEN 'Colorado'
    WHEN 'CT' THEN 'Connecticut'
    WHEN 'DE' THEN 'Delaware'
    WHEN 'FL' THEN 'Florida'
    WHEN 'GA' THEN 'Georgia'
    WHEN 'HI' THEN 'Hawaii'
    WHEN 'ID' THEN 'Idaho'
    WHEN 'IL' THEN 'Illinois'
    WHEN 'IN' THEN 'Indiana'
    WHEN 'IA' THEN 'Iowa'
    WHEN 'KS' THEN 'Kansas'
    WHEN 'KY' THEN 'Kentucky'
    WHEN 'LA' THEN 'Louisiana'
    WHEN 'ME' THEN 'Maine'
    WHEN 'MD' THEN 'Maryland'
    WHEN 'MA' THEN 'Massachusetts'
    WHEN 'MI' THEN 'Michigan'
    WHEN 'MN' THEN 'Minnesota'
    WHEN 'MS' THEN 'Mississippi'
    WHEN 'MO' THEN 'Missouri'
    WHEN 'MT' THEN 'Montana'
    WHEN 'NE' THEN 'Nebraska'
    WHEN 'NV' THEN 'Nevada'
    WHEN 'NH' THEN 'New Hampshire'
    WHEN 'NJ' THEN 'New Jersey'
    WHEN 'NM' THEN 'New Mexico'
    WHEN 'NY' THEN 'New York'
    WHEN 'NC' THEN 'North Carolina'
    WHEN 'ND' THEN 'North Dakota'
    WHEN 'OH' THEN 'Ohio'
    WHEN 'OK' THEN 'Oklahoma'
    WHEN 'OR' THEN 'Oregon'
    WHEN 'PA' THEN 'Pennsylvania'
    WHEN 'RI' THEN 'Rhode Island'
    WHEN 'SC' THEN 'South Carolina'
    WHEN 'SD' THEN 'South Dakota'
    WHEN 'TN' THEN 'Tennessee'
    WHEN 'TX' THEN 'Texas'
    WHEN 'UT' THEN 'Utah'
    WHEN 'VT' THEN 'Vermont'
    WHEN 'VA' THEN 'Virginia'
    WHEN 'WA' THEN 'Washington'
    WHEN 'WV' THEN 'West Virginia'
    WHEN 'WI' THEN 'Wisconsin'
    WHEN 'WY' THEN 'Wyoming'
    WHEN 'DC' THEN 'District of Columbia'
    -- Keep full names as-is
    ELSE state
END
WHERE country = 'United States'
  AND state IN (
    'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
    'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
    'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
    'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
    'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY', 'DC'
  );

-- Verify the results
SELECT
  state,
  COUNT(*) as count
FROM agencies
WHERE country = 'United States' AND state IS NOT NULL
GROUP BY state
ORDER BY count DESC;
