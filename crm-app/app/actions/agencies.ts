"use server"

import { sql } from "@/lib/db"

export type AgencyFilters = {
  search?: string
  contactStatus?: string
  city?: string
  state?: string
  country?: string
  minEmployees?: number
  maxEmployees?: number
  minRating?: number
  sources?: string[]
  tags?: string[]
}

export type PaginationParams = {
  page: number
  pageSize: number
}

type Agency = {
  id: number
  name: string
  websiteUrl: string | null
  linkedinUrl: string | null
  contactEmail: string | null
  phoneNumber: string | null
  city: string | null
  state: string | null
  country: string | null
  employeeCount: string | null
  avgRating: number | null
  totalReviews: number | null
  contactStatus: string
  sources: string[]
  sourceCount: number
  tags: string[]
  lastContactDate: Date | null
  agencyspotterUrl: string | null
  goodfirmsUrl: string | null
  themanifestUrl: string | null
}

export async function getAgencies(
  filters: AgencyFilters = {},
  pagination: PaginationParams = { page: 1, pageSize: 50 }
): Promise<{
  success: boolean
  data: Agency[]
  pagination: {
    page: number
    pageSize: number
    totalCount: number
    totalPages: number
  }
  error?: string
}> {
  try {
    // Build WHERE conditions
    const conditions: string[] = []

    // Note: Neon serverless driver doesn't support parameterized queries easily,
    // but we'll sanitize inputs to prevent SQL injection

    if (filters.search) {
      const searchEscaped = filters.search.replace(/'/g, "''")
      conditions.push(`(name ILIKE '%${searchEscaped}%' OR website_url ILIKE '%${searchEscaped}%')`)
    }

    if (filters.contactStatus) {
      const statusEscaped = filters.contactStatus.replace(/'/g, "''")
      conditions.push(`contact_status = '${statusEscaped}'`)
    }

    if (filters.city) {
      const cityEscaped = filters.city.replace(/'/g, "''")
      conditions.push(`city ILIKE '%${cityEscaped}%'`)
    }

    if (filters.state) {
      const stateEscaped = filters.state.replace(/'/g, "''")
      conditions.push(`state = '${stateEscaped}'`)
    }

    if (filters.country) {
      const countryEscaped = filters.country.replace(/'/g, "''")
      conditions.push(`country = '${countryEscaped}'`)
    }

    if (filters.minEmployees !== undefined) {
      conditions.push(`employee_count_min >= ${filters.minEmployees}`)
    }

    if (filters.maxEmployees !== undefined) {
      conditions.push(`employee_count_max <= ${filters.maxEmployees}`)
    }

    if (filters.minRating !== undefined) {
      conditions.push(`avg_rating >= ${filters.minRating}`)
    }

    if (filters.sources && filters.sources.length > 0) {
      const sourcesArray = `{${filters.sources.map(s => `"${s.replace(/"/g, '\\"')}"`).join(',')}}`
      conditions.push(`sources && '${sourcesArray}'::text[]`)
    }

    if (filters.tags && filters.tags.length > 0) {
      const tagsArray = `{${filters.tags.map(t => `"${t.replace(/"/g, '\\"')}"`).join(',')}}`
      conditions.push(`tags && '${tagsArray}'::text[]`)
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

    // Calculate pagination
    const offset = (pagination.page - 1) * pagination.pageSize
    const limit = pagination.pageSize

    // Fetch agencies and total count in parallel
    const [agencies, countResult] = await Promise.all([
      sql`
        SELECT
          id, name, website_url as "websiteUrl", linkedin_url as "linkedinUrl",
          contact_email as "contactEmail", phone_number as "phoneNumber",
          city, state, country, employee_count as "employeeCount",
          avg_rating as "avgRating", total_reviews as "totalReviews", contact_status as "contactStatus",
          sources, source_count as "sourceCount", tags, last_contact_date as "lastContactDate",
          agencyspotter_data->>'Profile URL' as "agencyspotterUrl",
          goodfirms_data->>'Profile URL' as "goodfirmsUrl",
          themanifest_data->>'Profile URL' as "themanifestUrl"
        FROM agencies
        ${sql.unsafe(whereClause)}
        ORDER BY name ASC
        LIMIT ${limit} OFFSET ${offset}
      `,
      sql`SELECT COUNT(*) as count FROM agencies ${sql.unsafe(whereClause)}`
    ])

    const totalCount = Number(countResult[0].count)
    const totalPages = Math.ceil(totalCount / pagination.pageSize)

    // Convert Decimal/string to number for avgRating and ensure proper types
    const agenciesFormatted: Agency[] = agencies.map((agency) => ({
      id: agency.id,
      name: agency.name,
      websiteUrl: agency.websiteUrl,
      linkedinUrl: agency.linkedinUrl,
      contactEmail: agency.contactEmail,
      phoneNumber: agency.phoneNumber,
      city: agency.city,
      state: agency.state,
      country: agency.country,
      employeeCount: agency.employeeCount,
      avgRating: agency.avgRating ? Number(agency.avgRating) : null,
      totalReviews: agency.totalReviews,
      contactStatus: agency.contactStatus,
      sources: agency.sources || [],
      sourceCount: agency.sourceCount,
      tags: agency.tags || [],
      lastContactDate: agency.lastContactDate,
      agencyspotterUrl: agency.agencyspotterUrl,
      goodfirmsUrl: agency.goodfirmsUrl,
      themanifestUrl: agency.themanifestUrl,
    }))

    return {
      success: true,
      data: agenciesFormatted,
      pagination: {
        page: pagination.page,
        pageSize: pagination.pageSize,
        totalCount,
        totalPages,
      },
    }
  } catch (error) {
    console.error("Error fetching agencies:", error)
    return {
      success: false,
      error: "Failed to fetch agencies",
      data: [],
      pagination: {
        page: 1,
        pageSize: pagination.pageSize,
        totalCount: 0,
        totalPages: 0,
      },
    }
  }
}

export async function getAgencyById(id: number) {
  try {
    const result = await sql`
      SELECT
        id, name, website_url as "websiteUrl", contact_email as "contactEmail",
        phone_number as "phoneNumber", linkedin_url as "linkedinUrl",
        city, state, country, description, tagline, employee_count as "employeeCount",
        avg_rating as "avgRating", total_reviews as "totalReviews", sources,
        services_merged as "servicesMerged", industries_merged as "industriesMerged",
        clients_merged as "clientsMerged", agencyspotter_data as "agencyspotterData",
        goodfirms_data as "goodfirmsData", themanifest_data as "themanifestData",
        contact_status as "contactStatus", tags, notes, last_contact_date as "lastContactDate"
      FROM agencies
      WHERE id = ${id}
    `

    if (result.length === 0) {
      return {
        success: false,
        error: "Agency not found",
        data: null,
      }
    }

    const agency = result[0]

    return {
      success: true,
      data: {
        ...agency,
        avgRating: agency.avgRating ? Number(agency.avgRating) : null,
      },
    }
  } catch (error) {
    console.error("Error fetching agency:", error)
    return {
      success: false,
      error: "Failed to fetch agency",
      data: null,
    }
  }
}

export async function updateContactStatus(agencyId: number, newStatus: string) {
  try {
    const result = await sql`
      UPDATE agencies
      SET contact_status = ${newStatus}, contact_status_changed_at = NOW()
      WHERE id = ${agencyId}
      RETURNING id, contact_status as "contactStatus", contact_status_changed_at as "contactStatusChangedAt"
    `

    if (result.length === 0) {
      return {
        success: false,
        error: "Agency not found",
        data: null,
      }
    }

    return {
      success: true,
      data: result[0],
    }
  } catch (error) {
    console.error("Error updating contact status:", error)
    return {
      success: false,
      error: "Failed to update contact status",
      data: null,
    }
  }
}

export async function updateNotes(agencyId: number, notes: string) {
  try {
    const result = await sql`
      UPDATE agencies
      SET notes = ${notes}, updated_at = NOW()
      WHERE id = ${agencyId}
      RETURNING id, notes, updated_at as "updatedAt"
    `

    if (result.length === 0) {
      return {
        success: false,
        error: "Agency not found",
        data: null,
      }
    }

    return {
      success: true,
      data: result[0],
    }
  } catch (error) {
    console.error("Error updating notes:", error)
    return {
      success: false,
      error: "Failed to update notes",
      data: null,
    }
  }
}

export async function getUniqueFilterValues() {
  try {
    const [states, countries, sources] = await Promise.all([
      sql`SELECT DISTINCT state FROM agencies WHERE state IS NOT NULL ORDER BY state ASC`,
      sql`SELECT DISTINCT country FROM agencies WHERE country IS NOT NULL ORDER BY country ASC`,
      sql`SELECT DISTINCT unnest(sources) as source FROM agencies ORDER BY source ASC`,
    ])

    return {
      success: true,
      states: states.map((s) => s.state),
      countries: countries.map((c) => c.country),
      sources: sources.map((s) => s.source),
    }
  } catch (error) {
    console.error("Error fetching filter values:", error)
    return {
      success: false,
      states: [],
      countries: [],
      sources: [],
    }
  }
}
