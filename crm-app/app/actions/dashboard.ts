"use server"

import { sql } from "@/lib/db"

export async function getDashboardStats() {
  try {
    const [totalResult, sourceDistribution, contactStatusDist] = await Promise.all([
      // Total agencies
      sql`SELECT COUNT(*) as total FROM agencies`,

      // Source count distribution
      sql`
        SELECT
          source_count,
          COUNT(*) as count
        FROM agencies
        GROUP BY source_count
        ORDER BY source_count ASC
      `,

      // Contact status distribution
      sql`
        SELECT
          contact_status,
          COUNT(*) as count
        FROM agencies
        GROUP BY contact_status
        ORDER BY count DESC
      `
    ])

    return {
      success: true,
      totalAgencies: Number(totalResult[0].total),
      sourceDistribution: sourceDistribution.map((row) => ({
        sourceCount: Number(row.source_count),
        count: Number(row.count),
      })),
      contactStatusDistribution: contactStatusDist.map((row) => ({
        status: row.contact_status as string,
        count: Number(row.count),
      })),
    }
  } catch (error) {
    console.error("Error fetching dashboard stats:", error)
    return {
      success: false,
      totalAgencies: 0,
      sourceDistribution: [],
      contactStatusDistribution: [],
    }
  }
}
