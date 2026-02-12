/**
 * Format phone number to a readable format
 * Handles various phone number formats and adds proper spacing
 */
export function formatPhoneNumber(phone: string | null): string {
  if (!phone) return "-"

  // Remove all non-digit characters
  const cleaned = phone.replace(/\D/g, "")

  // US/Canada format (10-11 digits)
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`
  }
  if (cleaned.length === 11 && cleaned[0] === "1") {
    return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`
  }

  // International format (with country code)
  if (cleaned.length > 10) {
    const countryCode = cleaned.slice(0, cleaned.length - 10)
    const rest = cleaned.slice(-10)
    return `+${countryCode} ${rest.slice(0, 3)} ${rest.slice(3, 6)} ${rest.slice(6)}`
  }

  // Fallback: just add spaces every 3 digits
  return phone
}

/**
 * Get country flag emoji from country name
 * Uses Unicode regional indicator symbols
 */
export function getCountryFlag(country: string | null): string {
  if (!country) return ""

  const countryToCode: Record<string, string> = {
    // North America
    "United States": "US",
    "USA": "US",
    "US": "US",
    "Canada": "CA",
    "Mexico": "MX",

    // Europe
    "United Kingdom": "GB",
    "UK": "GB",
    "England": "GB",
    "Germany": "DE",
    "France": "FR",
    "Spain": "ES",
    "Italy": "IT",
    "Netherlands": "NL",
    "Belgium": "BE",
    "Switzerland": "CH",
    "Austria": "AT",
    "Poland": "PL",
    "Sweden": "SE",
    "Norway": "NO",
    "Denmark": "DK",
    "Finland": "FI",
    "Ireland": "IE",
    "Portugal": "PT",
    "Greece": "GR",

    // Asia
    "China": "CN",
    "Japan": "JP",
    "India": "IN",
    "South Korea": "KR",
    "Singapore": "SG",
    "Thailand": "TH",
    "Vietnam": "VN",
    "Philippines": "PH",
    "Indonesia": "ID",
    "Malaysia": "MY",

    // Oceania
    "Australia": "AU",
    "New Zealand": "NZ",

    // Middle East
    "United Arab Emirates": "AE",
    "UAE": "AE",
    "Israel": "IL",
    "Saudi Arabia": "SA",

    // South America
    "Brazil": "BR",
    "Argentina": "AR",
    "Chile": "CL",
    "Colombia": "CO",

    // Africa
    "South Africa": "ZA",
    "Egypt": "EG",
    "Nigeria": "NG",
  }

  const code = countryToCode[country] || countryToCode[country.toUpperCase()]
  if (!code) return ""

  // Convert country code to flag emoji
  const codePoints = code
    .toUpperCase()
    .split("")
    .map((char) => 127397 + char.charCodeAt(0))

  return String.fromCodePoint(...codePoints)
}

/**
 * Get website favicon URL from domain
 */
export function getFaviconUrl(websiteUrl: string | null): string {
  if (!websiteUrl) return ""

  try {
    const url = new URL(websiteUrl)
    // Use Google's favicon service as fallback
    return `https://www.google.com/s2/favicons?domain=${url.hostname}&sz=32`
  } catch {
    return ""
  }
}

/**
 * Format email to be more readable (truncate long emails)
 */
export function formatEmail(email: string | null, maxLength: number = 30): string {
  if (!email) return "-"

  if (email.length <= maxLength) return email

  const [local, domain] = email.split("@")
  const truncatedLocal = local.slice(0, Math.floor(maxLength / 2) - 2)
  return `${truncatedLocal}...@${domain}`
}

/**
 * Format location string with proper ordering
 */
export function formatLocation(
  city: string | null,
  state: string | null,
  country: string | null
): string {
  const parts = [city, state, country].filter(Boolean)
  return parts.join(", ") || "-"
}
