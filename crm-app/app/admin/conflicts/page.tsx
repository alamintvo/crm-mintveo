"use client"

import * as React from "react"
import { getAgenciesWithConflicts, AgencyConflict, ConflictType } from "@/app/actions/conflicts"
import { ConflictCard } from "@/components/conflict-card"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { AlertCircle, AlertTriangle, Loader2, ChevronLeft, ChevronRight, Filter } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export default function ConflictsPage() {
  const [conflicts, setConflicts] = React.useState<AgencyConflict[]>([])
  const [filteredConflicts, setFilteredConflicts] = React.useState<AgencyConflict[]>([])
  const [stats, setStats] = React.useState({
    totalConflicts: 0,
    multiplePhones: 0,
    multipleEmails: 0,
    cityMismatch: 0,
    stateMismatch: 0,
    employeeCountMismatch: 0,
    descriptionMismatch: 0,
  })
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [currentIndex, setCurrentIndex] = React.useState(0)
  const [filterType, setFilterType] = React.useState<ConflictType | "all">("all")

  React.useEffect(() => {
    loadConflicts()
  }, [])

  React.useEffect(() => {
    if (filterType === "all") {
      setFilteredConflicts(conflicts)
    } else {
      setFilteredConflicts(conflicts.filter((c) => c.conflictTypes.includes(filterType)))
    }
    setCurrentIndex(0)
  }, [filterType, conflicts])

  const loadConflicts = async () => {
    setLoading(true)
    setError(null)
    const result = await getAgenciesWithConflicts()
    if (result.success) {
      setConflicts(result.data)
      setFilteredConflicts(result.data)
      setStats(result.stats)
    } else {
      setError(result.error || "Failed to load conflicts")
    }
    setLoading(false)
  }

  const currentConflict = filteredConflicts[currentIndex]
  const hasNext = currentIndex < filteredConflicts.length - 1
  const hasPrev = currentIndex > 0

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-slate-500" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">
          Data Conflicts Resolution
        </h1>
        <p className="text-slate-600">
          Review agencies with conflicting information from different sources. These conflicts need manual review to determine the correct values.
        </p>
      </div>

      {/* Stats Dashboard */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-8">
        <Card
          className={`cursor-pointer transition-all ${filterType === "all" ? "ring-2 ring-blue-500" : ""}`}
          onClick={() => setFilterType("all")}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-slate-600">Total Conflicts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{stats.totalConflicts}</div>
          </CardContent>
        </Card>

        <Card
          className={`cursor-pointer transition-all ${filterType === "multiple_phones" ? "ring-2 ring-blue-500" : ""}`}
          onClick={() => setFilterType("multiple_phones")}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-slate-600">Multiple Phones</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.multiplePhones}</div>
          </CardContent>
        </Card>

        <Card
          className={`cursor-pointer transition-all ${filterType === "multiple_emails" ? "ring-2 ring-purple-500" : ""}`}
          onClick={() => setFilterType("multiple_emails")}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-slate-600">Multiple Emails</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{stats.multipleEmails}</div>
          </CardContent>
        </Card>

        <Card
          className={`cursor-pointer transition-all ${filterType === "city_mismatch" ? "ring-2 ring-orange-500" : ""}`}
          onClick={() => setFilterType("city_mismatch")}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-slate-600">City Mismatch</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.cityMismatch}</div>
          </CardContent>
        </Card>

        <Card
          className={`cursor-pointer transition-all ${filterType === "state_mismatch" ? "ring-2 ring-red-500" : ""}`}
          onClick={() => setFilterType("state_mismatch")}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-slate-600">State Mismatch</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.stateMismatch}</div>
          </CardContent>
        </Card>

        <Card
          className={`cursor-pointer transition-all ${filterType === "employee_count_mismatch" ? "ring-2 ring-yellow-500" : ""}`}
          onClick={() => setFilterType("employee_count_mismatch")}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-slate-600">Employee Count</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.employeeCountMismatch}</div>
          </CardContent>
        </Card>

        <Card
          className={`cursor-pointer transition-all ${filterType === "description_mismatch" ? "ring-2 ring-green-500" : ""}`}
          onClick={() => setFilterType("description_mismatch")}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-slate-600">Description</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.descriptionMismatch}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Info */}
      {filterType !== "all" && (
        <Alert className="mb-6">
          <Filter className="h-4 w-4" />
          <AlertTitle>Filtered View</AlertTitle>
          <AlertDescription>
            Showing {filteredConflicts.length} agencies with {filterType.replace(/_/g, " ")} conflicts.{" "}
            <Button variant="link" className="p-0 h-auto" onClick={() => setFilterType("all")}>
              Show all conflicts
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Navigation */}
      {filteredConflicts.length > 0 && (
        <div className="flex items-center justify-between mb-6">
          <div className="text-sm text-slate-600">
            Showing {currentIndex + 1} of {filteredConflicts.length} conflicts
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => setCurrentIndex(currentIndex - 1)}
              disabled={!hasPrev}
              variant="outline"
              size="sm"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>
            <Button
              onClick={() => setCurrentIndex(currentIndex + 1)}
              disabled={!hasNext}
              variant="outline"
              size="sm"
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* Current Conflict */}
      {filteredConflicts.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <AlertTriangle className="h-12 w-12 text-slate-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">No Conflicts Found</h3>
            <p className="text-slate-600">
              {filterType === "all"
                ? "All agencies have consistent data across sources!"
                : `No agencies found with ${filterType.replace(/_/g, " ")} conflicts.`}
            </p>
          </CardContent>
        </Card>
      ) : (
        currentConflict && <ConflictCard conflict={currentConflict} />
      )}
    </div>
  )
}
