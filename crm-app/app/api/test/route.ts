/**
 * Test API Route - Verify database connection and Prisma client
 */

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    // Test database connection
    const count = await prisma.agency.count()

    // Get a sample agency
    const sample = await prisma.agency.findFirst({
      where: {
        sourceCount: 3, // Agency found in all 3 sources
      },
      select: {
        id: true,
        name: true,
        city: true,
        state: true,
        sourceCount: true,
        avgRating: true,
        totalReviews: true,
        sources: true,
      },
    })

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
