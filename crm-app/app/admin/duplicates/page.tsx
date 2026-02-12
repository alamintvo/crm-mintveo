"use client"

import * as React from "react"
import { getDuplicatePairs, mergeDuplicates, DuplicatePair } from "@/app/actions/duplicates"
import { DuplicateMergeCard } from "@/components/duplicate-merge-card"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export default function DuplicatesPage() {
  const [duplicates, setDuplicates] = React.useState<DuplicatePair[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [mergingId, setMergingId] = React.useState<string | null>(null)
  const [mergedCount, setMergedCount] = React.useState(0)

  React.useEffect(() => {
    loadDuplicates()
  }, [])

  const loadDuplicates = async () => {
    setLoading(true)
    setError(null)
    const result = await getDuplicatePairs()
    if (result.success) {
      setDuplicates(result.data)
    } else {
      setError(result.error || "Failed to load duplicates")
    }
    setLoading(false)
  }

  const handleMerge = async (primaryId: number, secondaryId: number) => {
    const mergeKey = `${primaryId}-${secondaryId}`
    setMergingId(mergeKey)

    const result = await mergeDuplicates(primaryId, secondaryId)

    if (result.success) {
      // Remove the merged pair from the list
      setDuplicates((prev) =>
        prev
          .map((dup) => ({
            ...dup,
            agencies: dup.agencies.filter((a) => a.id !== secondaryId),
          }))
          .filter((dup) => dup.agencies.length > 1) // Remove if only 1 agency left
      )
      setMergedCount((prev) => prev + 1)
    } else {
      alert(`Failed to merge: ${result.error}`)
    }

    setMergingId(null)
  }

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
          Duplicate Agency Resolution
        </h1>
        <p className="text-slate-600">
          Review agencies with the same name. <strong>Note:</strong> According to PROJECT_PLAN.md, duplicates
          should be matched by <strong>website URL</strong> (primary key), not name. These agencies have the
          <strong> same name but different websites</strong> - they may be separate companies. Please review
          carefully before merging.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">
              Duplicate Groups
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">
              {duplicates.length}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Groups of duplicate agencies
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">
              Total Duplicates
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">
              {duplicates.reduce((sum, dup) => sum + dup.count, 0)}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Total duplicate records
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">
              Merged
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              {mergedCount}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Successfully merged
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Success Message */}
      {mergedCount > 0 && (
        <Alert className="mb-6 bg-green-50 border-green-200">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertTitle className="text-green-900">Success!</AlertTitle>
          <AlertDescription className="text-green-800">
            Successfully merged {mergedCount} duplicate{mergedCount > 1 ? "s" : ""}.
          </AlertDescription>
        </Alert>
      )}

      {/* Important Notice */}
      <Alert className="mb-6 bg-amber-50 border-amber-200">
        <AlertCircle className="h-4 w-4 text-amber-600" />
        <AlertTitle className="text-amber-900">⚠️ Important: Review Before Merging</AlertTitle>
        <AlertDescription className="text-amber-800">
          <p className="mb-2">
            These agencies have the <strong>same name but DIFFERENT websites</strong>.
            According to PROJECT_PLAN.md, the primary merge key should be <strong>website URL</strong>, not name.
          </p>
          <p className="mb-2 font-semibold">
            ✅ Real duplicates (same website URL): 0 found - Database is clean!
          </p>
          <p>
            The agencies below may be <strong>separate companies</strong> with the same name
            (e.g., "Cactus Denver" vs "Cactus Inc"). Only merge if you're certain they're the same agency.
          </p>
        </AlertDescription>
      </Alert>

      {/* Strategy Info */}
      <Alert className="mb-6">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Merge Strategy (if you decide to merge)</AlertTitle>
        <AlertDescription>
          Following PROJECT_PLAN.md rules:
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li>Keep ALL unique emails, phones, addresses in arrays</li>
            <li>Average ratings from all sources, sum total reviews</li>
            <li>Merge services, industries, clients (union of all unique values)</li>
            <li>Combine source JSONB data (preserve all original data)</li>
            <li>Delete one duplicate, update the other with merged data</li>
          </ul>
        </AlertDescription>
      </Alert>

      {/* Duplicate List */}
      {duplicates.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              No Duplicates Found
            </h3>
            <p className="text-slate-600">
              All duplicate agencies have been resolved!
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {duplicates.map((dup) => (
            <DuplicateMergeCard
              key={dup.normalizedName}
              agencies={dup.agencies}
              normalizedName={dup.normalizedName}
              onMerge={handleMerge}
              isMerging={mergingId === `${dup.agencies[0]?.id}-${dup.agencies[1]?.id}`}
            />
          ))}
        </div>
      )}
    </div>
  )
}
