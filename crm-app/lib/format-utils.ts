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
 * Get ISO country code from country name
 * Returns lowercase code for use with flag-icons CSS library
 */
export function getCountryCode(country: string | null): string | null {
  if (!country) return null

  const countryToCode: Record<string, string> = {
    // North America
    "United States": "us",
    "USA": "us",
    "US": "us",
    "Canada": "ca",
    "Mexico": "mx",

    // Europe
    "United Kingdom": "gb",
    "UK": "gb",
    "England": "gb",
    "Germany": "de",
    "France": "fr",
    "Spain": "es",
    "Italy": "it",
    "Netherlands": "nl",
    "Belgium": "be",
    "Switzerland": "ch",
    "Austria": "at",
    "Poland": "pl",
    "Sweden": "se",
    "Norway": "no",
    "Denmark": "dk",
    "Finland": "fi",
    "Ireland": "ie",
    "Portugal": "pt",
    "Greece": "gr",
    "Czech Republic": "cz",
    "Romania": "ro",
    "Hungary": "hu",
    "Croatia": "hr",
    "Ukraine": "ua",
    "Bulgaria": "bg",
    "Lithuania": "lt",
    "Latvia": "lv",
    "Estonia": "ee",
    "Slovakia": "sk",
    "Slovenia": "si",

    // Asia
    "China": "cn",
    "Japan": "jp",
    "India": "in",
    "South Korea": "kr",
    "Singapore": "sg",
    "Thailand": "th",
    "Vietnam": "vn",
    "Philippines": "ph",
    "Indonesia": "id",
    "Malaysia": "my",
    "Taiwan": "tw",
    "Hong Kong": "hk",
    "Pakistan": "pk",
    "Bangladesh": "bd",
    "Sri Lanka": "lk",

    // Oceania
    "Australia": "au",
    "New Zealand": "nz",

    // Middle East
    "United Arab Emirates": "ae",
    "UAE": "ae",
    "Israel": "il",
    "Saudi Arabia": "sa",
    "Turkey": "tr",
    "Qatar": "qa",
    "Kuwait": "kw",
    "Bahrain": "bh",
    "Jordan": "jo",
    "Lebanon": "lb",

    // South America
    "Brazil": "br",
    "Argentina": "ar",
    "Chile": "cl",
    "Colombia": "co",
    "Peru": "pe",
    "Uruguay": "uy",
    "Ecuador": "ec",

    // Africa
    "South Africa": "za",
    "Egypt": "eg",
    "Nigeria": "ng",
    "Kenya": "ke",
    "Morocco": "ma",
    "Ghana": "gh",
    "Tunisia": "tn",
  }

  return countryToCode[country] || countryToCode[country.toUpperCase()] || null
}

/**
 * @deprecated Use getCountryCode + flag-icons CSS instead (emoji flags don't work on Chrome/Windows)
 */
export function getCountryFlag(country: string | null): string {
  const code = getCountryCode(country)
  if (!code) return ""
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
