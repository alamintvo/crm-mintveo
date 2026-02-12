/**
 * Test API Route - Verify database connection with Neon serverless driver
 */

import { NextResponse } from 'next/server'
import { sql } from '@/lib/db'

export async function GET() {
  try {
    // Test database connection and get count
    const countResult = await sql`SELECT COUNT(*) as count FROM agencies`
    const count = Number(countResult[0].count)

    // Get a sample agency
    const sampleResult = await sql`
      SELECT
        id, name, city, state, source_count as "sourceCount",
        avg_rating as "avgRating", total_reviews as "totalReviews", sources
      FROM agencies
      WHERE source_count = 3
      LIMIT 1
    `

    const sample = sampleResult.length > 0 ? {
      ...sampleResult[0],
      avgRating: sampleResult[0].avgRating ? Number(sampleResult[0].avgRating) : null,
    } : null

    return NextResponse.json({
      success: true,
      message: 'Database connection successful!',
      stats: {
        totalAgencies: count,
      },
      sample,
    })
  } catch (error) {
    console.error('Database connection error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Database connection failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
