"use client"

import * as React from "react"
import Link from "next/link"
import { Building2, Database, Copy, AlertTriangle, ArrowRight, Loader2 } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { getDashboardStats } from "./actions/dashboard"

export default function Home() {
  const [stats, setStats] = React.useState<{
    totalAgencies: number
    sourceDistribution: { sourceCount: number; count: number }[]
    contactStatusDistribution: { status: string; count: number }[]
  } | null>(null)
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    async function loadStats() {
      const result = await getDashboardStats()
      if (result.success) {
        setStats({
          totalAgencies: result.totalAgencies,
          sourceDistribution: result.sourceDistribution,
          contactStatusDistribution: result.contactStatusDistribution,
        })
      }
      setLoading(false)
    }
    loadStats()
  }, [])

  const getSourceLabel = (count: number) => {
    if (count === 1) return "Single Source"
    if (count === 2) return "Two Sources"
    if (count === 3) return "Three Sources"
    return `${count} Sources`
  }

  const getSourceDescription = (count: number) => {
    const sources = ["AgencySpotter", "GoodFirms", "The Manifest"]
    return `Found in ${count} of 3 directories`
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Agency CRM Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Multi-source agency data management system
        </p>
      </div>

      {/* Main Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Agencies
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            ) : (
              <div className="text-3xl font-bold">{stats?.totalAgencies.toLocaleString()}</div>
            )}
          </CardContent>
        </Card>

        {!loading && stats?.sourceDistribution.map((item) => (
          <Card key={item.sourceCount}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {getSourceLabel(item.sourceCount)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{item.count.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {getSourceDescription(item.sourceCount)}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <div className="flex items-center gap-3">
              <Building2 className="h-8 w-8 text-blue-600" />
              <CardTitle className="text-xl">Agencies</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <CardDescription className="mb-4">
              Browse and manage agency data from multiple sources
            </CardDescription>
            <Button asChild variant="ghost" className="w-full">
              <Link href="/agencies">
                View Agencies
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <div className="flex items-center gap-3">
              <Copy className="h-8 w-8 text-orange-600" />
              <CardTitle className="text-xl">Duplicates</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <CardDescription className="mb-4">
              Review and merge agencies with the same name
            </CardDescription>
            <Button asChild variant="ghost" className="w-full">
              <Link href="/admin/duplicates">
                View Duplicates
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-8 w-8 text-red-600" />
              <CardTitle className="text-xl">Conflicts</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <CardDescription className="mb-4">
              Resolve conflicting data from different sources
            </CardDescription>
            <Button asChild variant="ghost" className="w-full">
              <Link href="/admin/conflicts">
                View Conflicts
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <div className="flex items-center gap-3">
              <Database className="h-8 w-8 text-green-600" />
              <CardTitle className="text-xl">Data Quality</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <CardDescription className="mb-4">
              Check data completeness and quality metrics
            </CardDescription>
            <Button variant="ghost" className="w-full" disabled>
              Coming Soon
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Contact Status Distribution */}
      {!loading && stats && stats.contactStatusDistribution.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Contact Status Overview</CardTitle>
            <CardDescription>Distribution of agencies by contact status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {stats.contactStatusDistribution.map((item) => (
                <div key={item.status} className="text-center">
                  <div className="text-2xl font-bold">{item.count}</div>
                  <div className="text-xs text-muted-foreground capitalize">
                    {item.status.replace(/_/g, " ")}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
