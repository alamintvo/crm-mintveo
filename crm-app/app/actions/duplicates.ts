"use server"

import { sql } from "@/lib/db"

export type DuplicateAgency = {
  id: number
  name: string
  websiteUrl: string | null
  contactEmail: string | null
  phoneNumber: string | null
  city: string | null
  state: string | null
  country: string | null
  employeeCount: string | null
  avgRating: number | null
  totalReviews: number | null
  sources: string[]
  sourceCount: number
  agencyspotterData: any
  goodfirmsData: any
  themanifestData: any
  servicesMerged: string[] | null
  industriesMerged: string[] | null
  clientsMerged: string[] | null
  linkedinUrl: string | null
  description: string | null
  tagline: string | null
}

export type DuplicatePair = {
  normalizedName: string
  count: number
  agencies: DuplicateAgency[]
}

export async function getDuplicatePairs(): Promise<{
  success: boolean
  data: DuplicatePair[]
  error?: string
}> {
  try {
    // Get all duplicate names (case-insensitive)
    const duplicateNames = await sql`
      SELECT
        LOWER(TRIM(name)) as normalized_name,
        COUNT(*) as count
      FROM agencies
      GROUP BY LOWER(TRIM(name))
      HAVING COUNT(*) > 1
      ORDER BY count DESC, normalized_name
    `

    // For each duplicate name, fetch all agencies with that name
    const duplicatePairs: DuplicatePair[] = []

    for (const dup of duplicateNames) {
      const agencies = await sql`
        SELECT
          id, name, website_url as "websiteUrl", contact_email as "contactEmail",
          phone_number as "phoneNumber", city, state, country,
          employee_count as "employeeCount", avg_rating as "avgRating",
          total_reviews as "totalReviews", sources, source_count as "sourceCount",
          agencyspotter_data as "agencyspotterData", goodfirms_data as "goodfirmsData",
          themanifest_data as "themanifestData", services_merged as "servicesMerged",
          industries_merged as "industriesMerged", clients_merged as "clientsMerged",
          linkedin_url as "linkedinUrl", description, tagline
        FROM agencies
        WHERE LOWER(TRIM(name)) = ${dup.normalized_name}
        ORDER BY id ASC
      `

      duplicatePairs.push({
        normalizedName: dup.normalized_name as string,
        count: Number(dup.count),
        agencies: agencies.map((agency) => ({
          ...agency,
          avgRating: agency.avgRating ? Number(agency.avgRating) : null,
          sources: agency.sources || [],
          servicesMerged: agency.servicesMerged || null,
          industriesMerged: agency.industriesMerged || null,
          clientsMerged: agency.clientsMerged || null,
        })),
      })
    }

    return {
      success: true,
      data: duplicatePairs,
    }
  } catch (error) {
    console.error("Error fetching duplicate pairs:", error)
    return {
      success: false,
      data: [],
      error: "Failed to fetch duplicate pairs",
    }
  }
}

// Helper function to normalize and deduplicate emails
function uniqueEmails(emails: (string | null)[]): string[] {
  const normalized = new Map<string, string>() // normalized -> original

  for (const email of emails) {
    if (!email) continue
    const norm = email.toLowerCase().trim()
    if (!normalized.has(norm)) {
      normalized.set(norm, email.toLowerCase().trim())
    }
  }

  return Array.from(normalized.values())
}

// Helper function to normalize and deduplicate phone numbers
function uniquePhones(phones: (string | null)[]): string[] {
  const normalized = new Map<string, string>() // normalized -> original

  for (const phone of phones) {
    if (!phone) continue
    // Remove all non-digit characters for comparison
    const norm = phone.replace(/\D/g, "")
    if (!normalized.has(norm)) {
      normalized.set(norm, phone) // Keep original format
    }
  }

  return Array.from(normalized.values())
}

// Helper function to merge arrays and remove duplicates
function mergeUnique<T>(arr1: T[] | null, arr2: T[] | null): T[] {
  const combined = [...(arr1 || []), ...(arr2 || [])]
  return [...new Set(combined)]
}

// Helper function to pick longest string
function pickLongest(str1: string | null, str2: string | null): string | null {
  if (!str1 && !str2) return null
  if (!str1) return str2
  if (!str2) return str1
  return str1.length >= str2.length ? str1 : str2
}

export async function mergeDuplicates(
  primaryId: number,
  secondaryId: number,
  websiteToKeep?: string | null
): Promise<{
  success: boolean
  mergedId?: number
  error?: string
}> {
  try {
    // Fetch both agencies
    const [primary, secondary] = await Promise.all([
      sql`SELECT * FROM agencies WHERE id = ${primaryId}`,
      sql`SELECT * FROM agencies WHERE id = ${secondaryId}`,
    ])

    if (primary.length === 0 || secondary.length === 0) {
      return {
        success: false,
        error: "One or both agencies not found",
      }
    }

    const p = primary[0]
    const s = secondary[0]

    // Apply merge logic following PROJECT_PLAN.md
    const mergedData = {
      // Identity - prefer primary
      name: p.name || s.name,
      website_url: websiteToKeep || p.website_url || s.website_url, // Use user's choice

      // Contact Info - Keep ALL unique values
      contact_email: p.contact_email || s.contact_email, // Primary email (first one)
      phone_number: p.phone_number || s.phone_number, // Primary phone (first one)

      // Location - prefer primary
      city: p.city || s.city,
      state: p.state || s.state,
      country: p.country || s.country,

      // Descriptive - pick longest
      description: pickLongest(p.description, s.description),
      tagline: pickLongest(p.tagline, s.tagline),

      // Metrics - aggregate
      avg_rating:
        p.avg_rating && s.avg_rating
          ? ((Number(p.avg_rating) + Number(s.avg_rating)) / 2).toFixed(2)
          : p.avg_rating || s.avg_rating,
      total_reviews: (Number(p.total_reviews || 0) + Number(s.total_reviews || 0)),
      employee_count: p.employee_count || s.employee_count,
      employee_count_min: p.employee_count_min || s.employee_count_min,
      employee_count_max: p.employee_count_max || s.employee_count_max,

      // Lists - merge all unique
      services_merged: mergeUnique(p.services_merged, s.services_merged),
      industries_merged: mergeUnique(p.industries_merged, s.industries_merged),
      clients_merged: mergeUnique(p.clients_merged, s.clients_merged),

      // Sources - combine
      sources: mergeUnique(p.sources, s.sources),
      source_count: mergeUnique(p.sources, s.sources).length,

      // JSONB - MERGE all data from both sources (not just pick one!)
      agencyspotter_data: {
        ...(s.agencyspotter_data || {}),
        ...(p.agencyspotter_data || {}),
      },
      goodfirms_data: {
        ...(s.goodfirms_data || {}),
        ...(p.goodfirms_data || {}),
      },
      themanifest_data: {
        ...(s.themanifest_data || {}),
        ...(p.themanifest_data || {}),
      },

      // LinkedIn - prefer primary
      linkedin_url: p.linkedin_url || s.linkedin_url,

      // CRM fields - prefer primary, merge tags
      contact_status: p.contact_status,
      notes: p.notes || s.notes,
      tags: mergeUnique(p.tags, s.tags),
      last_contact_date: p.last_contact_date || s.last_contact_date,

      // Data quality
      data_quality_score: Math.max(
        Number(p.data_quality_score || 0),
        Number(s.data_quality_score || 0)
      ),
    }

    // IMPORTANT: Delete secondary record FIRST to avoid unique constraint violation
    // (in case user selected secondary's website URL to keep)
    await sql`DELETE FROM agencies WHERE id = ${secondaryId}`

    // Now update primary record with merged data
    await sql`
      UPDATE agencies
      SET
        name = ${mergedData.name},
        website_url = ${mergedData.website_url},
        contact_email = ${mergedData.contact_email},
        phone_number = ${mergedData.phone_number},
        city = ${mergedData.city},
        state = ${mergedData.state},
        country = ${mergedData.country},
        description = ${mergedData.description},
        tagline = ${mergedData.tagline},
        avg_rating = ${mergedData.avg_rating},
        total_reviews = ${mergedData.total_reviews},
        employee_count = ${mergedData.employee_count},
        employee_count_min = ${mergedData.employee_count_min},
        employee_count_max = ${mergedData.employee_count_max},
        services_merged = ${mergedData.services_merged},
        industries_merged = ${mergedData.industries_merged},
        clients_merged = ${mergedData.clients_merged},
        sources = ${mergedData.sources},
        source_count = ${mergedData.source_count},
        agencyspotter_data = ${mergedData.agencyspotter_data},
        goodfirms_data = ${mergedData.goodfirms_data},
        themanifest_data = ${mergedData.themanifest_data},
        linkedin_url = ${mergedData.linkedin_url},
        notes = ${mergedData.notes},
        tags = ${mergedData.tags},
        last_contact_date = ${mergedData.last_contact_date},
        data_quality_score = ${mergedData.data_quality_score},
        updated_at = NOW()
      WHERE id = ${primaryId}
    `

    return {
      success: true,
      mergedId: primaryId,
    }
  } catch (error) {
    console.error("Error merging duplicates:", error)
    const errorMessage = error instanceof Error ? error.message : "Failed to merge duplicates"
    return {
      success: false,
      error: `Failed to merge: ${errorMessage}`,
    }
  }
}
