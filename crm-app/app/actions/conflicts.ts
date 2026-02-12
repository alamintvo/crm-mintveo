"use server"

import { sql } from "@/lib/db"

export type ConflictType =
  | "multiple_phones"
  | "multiple_emails"
  | "city_mismatch"
  | "state_mismatch"
  | "employee_count_mismatch"
  | "description_mismatch"

export type AgencyConflict = {
  id: number
  name: string
  websiteUrl: string | null
  conflictTypes: ConflictType[]
  conflictCount: number

  // Conflicting data
  contactEmail: string | null
  phoneNumber: string | null
  city: string | null
  state: string | null
  employeeCount: string | null
  description: string | null

  // Source data for comparison
  agencyspotterData: any
  goodfirmsData: any
  themanifestData: any
  sources: string[]
}

export async function getAgenciesWithConflicts(): Promise<{
  success: boolean
  data: AgencyConflict[]
  stats: {
    totalConflicts: number
    multiplePhones: number
    multipleEmails: number
    cityMismatch: number
    stateMismatch: number
    employeeCountMismatch: number
    descriptionMismatch: number
  }
  error?: string
}> {
  try {
    // Get agencies with potential conflicts
    const agencies = await sql`
      SELECT
        id, name, website_url as "websiteUrl",
        contact_email as "contactEmail", phone_number as "phoneNumber",
        city, state, country, employee_count as "employeeCount",
        description, sources,
        agencyspotter_data as "agencyspotterData",
        goodfirms_data as "goodfirmsData",
        themanifest_data as "themanifestData"
      FROM agencies
      WHERE source_count > 1  -- Only agencies from multiple sources
      ORDER BY source_count DESC, name ASC
      LIMIT 500
    `

    const conflicts: AgencyConflict[] = []
    const stats = {
      totalConflicts: 0,
      multiplePhones: 0,
      multipleEmails: 0,
      cityMismatch: 0,
      stateMismatch: 0,
      employeeCountMismatch: 0,
      descriptionMismatch: 0,
    }

    for (const agency of agencies) {
      const conflictTypes: ConflictType[] = []

      // Check for phone conflicts (would need phone_numbers array)
      // For now, check if different sources have different phones
      const phones = new Set<string>()
      if (agency.agencyspotterData?.["Phone Number"]) phones.add(agency.agencyspotterData["Phone Number"])
      if (agency.goodfirmsData?.["Phone Number"]) phones.add(agency.goodfirmsData["Phone Number"])
      if (agency.themanifestData?.["Phone Number"]) phones.add(agency.themanifestData["Phone Number"])
      if (phones.size > 1) {
        conflictTypes.push("multiple_phones")
        stats.multiplePhones++
      }

      // Check for email conflicts
      const emails = new Set<string>()
      if (agency.agencyspotterData?.["Contact Email"]) emails.add(agency.agencyspotterData["Contact Email"])
      if (agency.goodfirmsData?.["Contact Email"]) emails.add(agency.goodfirmsData["Contact Email"])
      if (agency.themanifestData?.["Contact Email"]) emails.add(agency.themanifestData["Contact Email"])
      if (emails.size > 1) {
        conflictTypes.push("multiple_emails")
        stats.multipleEmails++
      }

      // Check for city conflicts
      const cities = new Set<string>()
      if (agency.city) cities.add(agency.city.toLowerCase().trim())
      if (agency.agencyspotterData?.City) cities.add(agency.agencyspotterData.City.toLowerCase().trim())
      if (agency.goodfirmsData?.City) cities.add(agency.goodfirmsData.City.toLowerCase().trim())
      if (agency.themanifestData?.City) {
        const city = agency.themanifestData.City.split(',')[0].toLowerCase().trim()
        cities.add(city)
      }
      if (cities.size > 1) {
        conflictTypes.push("city_mismatch")
        stats.cityMismatch++
      }

      // Check for state conflicts
      const states = new Set<string>()
      if (agency.state) states.add(agency.state.toLowerCase().trim())
      if (agency.agencyspotterData?.State) states.add(agency.agencyspotterData.State.toLowerCase().trim())
      if (agency.goodfirmsData?.State) states.add(agency.goodfirmsData.State.toLowerCase().trim())
      if (agency.themanifestData?.State) states.add(agency.themanifestData.State.toLowerCase().trim())
      if (states.size > 1) {
        conflictTypes.push("state_mismatch")
        stats.stateMismatch++
      }

      // Check for employee count conflicts
      const employeeCounts = new Set<string>()
      if (agency.employeeCount) employeeCounts.add(agency.employeeCount.toLowerCase().trim())
      if (agency.agencyspotterData?.["Employee Count"]) {
        employeeCounts.add(String(agency.agencyspotterData["Employee Count"]).toLowerCase().trim())
      }
      if (agency.goodfirmsData?.["Employee Count"]) {
        employeeCounts.add(String(agency.goodfirmsData["Employee Count"]).toLowerCase().trim())
      }
      if (agency.themanifestData?.["Employee Count"]) {
        employeeCounts.add(String(agency.themanifestData["Employee Count"]).toLowerCase().trim())
      }
      if (employeeCounts.size > 1) {
        conflictTypes.push("employee_count_mismatch")
        stats.employeeCountMismatch++
      }

      // Check for description conflicts (significant differences)
      const descriptions = []
      if (agency.agencyspotterData?.Description) descriptions.push(agency.agencyspotterData.Description)
      if (agency.goodfirmsData?.Description) descriptions.push(agency.goodfirmsData.Description)
      if (agency.themanifestData?.Description) descriptions.push(agency.themanifestData.Description)
      if (descriptions.length > 1) {
        // Simple check: if lengths differ by more than 20%, consider it a conflict
        const lengths = descriptions.map(d => d.length)
        const maxLen = Math.max(...lengths)
        const minLen = Math.min(...lengths)
        if (maxLen - minLen > minLen * 0.2) {
          conflictTypes.push("description_mismatch")
          stats.descriptionMismatch++
        }
      }

      // Only include agencies with at least one conflict
      if (conflictTypes.length > 0) {
        conflicts.push({
          id: agency.id,
          name: agency.name,
          websiteUrl: agency.websiteUrl,
          contactEmail: agency.contactEmail,
          phoneNumber: agency.phoneNumber,
          city: agency.city,
          state: agency.state,
          employeeCount: agency.employeeCount,
          description: agency.description,
          agencyspotterData: agency.agencyspotterData,
          goodfirmsData: agency.goodfirmsData,
          themanifestData: agency.themanifestData,
          sources: agency.sources || [],
          conflictTypes,
          conflictCount: conflictTypes.length,
        })
        stats.totalConflicts++
      }
    }

    return {
      success: true,
      data: conflicts,
      stats,
    }
  } catch (error) {
    console.error("Error fetching conflicts:", error)
    const errorMessage = error instanceof Error ? error.message : "Failed to fetch conflicts"
    return {
      success: false,
      data: [],
      stats: {
        totalConflicts: 0,
        multiplePhones: 0,
        multipleEmails: 0,
        cityMismatch: 0,
        stateMismatch: 0,
        employeeCountMismatch: 0,
        descriptionMismatch: 0,
      },
      error: errorMessage,
    }
  }
}
