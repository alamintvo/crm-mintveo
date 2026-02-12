"use server"

import { prisma } from "@/lib/prisma"

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

export async function getAgencies(
  filters: AgencyFilters = {},
  pagination: PaginationParams = { page: 1, pageSize: 50 }
) {
  try {
    const where: any = {}

    // Search filter (name or website)
    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: "insensitive" } },
        { websiteUrl: { contains: filters.search, mode: "insensitive" } },
      ]
    }

    // Contact status filter
    if (filters.contactStatus) {
      where.contactStatus = filters.contactStatus
    }

    // Location filters
    if (filters.city) {
      where.city = { contains: filters.city, mode: "insensitive" }
    }
    if (filters.state) {
      where.state = filters.state
    }
    if (filters.country) {
      where.country = filters.country
    }

    // Employee count range
    if (filters.minEmployees !== undefined || filters.maxEmployees !== undefined) {
      where.AND = where.AND || []
      if (filters.minEmployees !== undefined) {
        where.AND.push({ employeeCountMin: { gte: filters.minEmployees } })
      }
      if (filters.maxEmployees !== undefined) {
        where.AND.push({ employeeCountMax: { lte: filters.maxEmployees } })
      }
    }

    // Rating filter
    if (filters.minRating !== undefined) {
      where.avgRating = { gte: filters.minRating }
    }

    // Sources filter
    if (filters.sources && filters.sources.length > 0) {
      where.sources = {
        hasSome: filters.sources,
      }
    }

    // Tags filter
    if (filters.tags && filters.tags.length > 0) {
      where.tags = {
        hasSome: filters.tags,
      }
    }

    // Calculate pagination
    const skip = (pagination.page - 1) * pagination.pageSize
    const take = pagination.pageSize

    // Fetch agencies and total count
    const [agenciesRaw, totalCount] = await Promise.all([
      prisma.agency.findMany({
        where,
        skip,
        take,
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          websiteUrl: true,
          contactEmail: true,
          phoneNumber: true,
          city: true,
          state: true,
          country: true,
          employeeCount: true,
          avgRating: true,
          totalReviews: true,
          contactStatus: true,
          sources: true,
          sourceCount: true,
          tags: true,
          lastContactDate: true,
        },
      }),
      prisma.agency.count({ where }),
    ])

    // Convert Decimal to number for client components
    const agencies = agenciesRaw.map((agency) => ({
      ...agency,
      avgRating: agency.avgRating ? Number(agency.avgRating) : null,
    }))

    const totalPages = Math.ceil(totalCount / pagination.pageSize)

    return {
      success: true,
      data: agencies,
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
    const agency = await prisma.agency.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        websiteUrl: true,
        contactEmail: true,
        phoneNumber: true,
        linkedinUrl: true,
        city: true,
        state: true,
        country: true,
        description: true,
        tagline: true,
        employeeCount: true,
        avgRating: true,
        totalReviews: true,
        sources: true,
        servicesMerged: true,
        industriesMerged: true,
        clientsMerged: true,
        agencyspotterData: true,
        goodfirmsData: true,
        themanifestData: true,
        contactStatus: true,
        tags: true,
        notes: true,
        lastContactDate: true,
      },
    })

    if (!agency) {
      return {
        success: false,
        error: "Agency not found",
        data: null,
      }
    }

    // Convert Decimal to number
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

export async function getUniqueFilterValues() {
  try {
    const [states, countries, sources] = await Promise.all([
      prisma.agency.findMany({
        where: { state: { not: null } },
        select: { state: true },
        distinct: ["state"],
        orderBy: { state: "asc" },
      }),
      prisma.agency.findMany({
        where: { country: { not: null } },
        select: { country: true },
        distinct: ["country"],
        orderBy: { country: "asc" },
      }),
      prisma.$queryRaw<{ source: string }[]>`
        SELECT DISTINCT unnest(sources) as source
        FROM agencies
        ORDER BY source
      `,
    ])

    return {
      success: true,
      states: states.map((s) => s.state!),
      countries: countries.map((c) => c.country!),
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

