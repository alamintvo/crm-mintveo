"use client"

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Mail, Phone, MapPin, Star, ExternalLink, ArrowRight } from "lucide-react"
import { DuplicateAgency } from "@/app/actions/duplicates"
import { getFaviconUrl } from "@/lib/format-utils"

type DuplicateMergeCardProps = {
  agencies: DuplicateAgency[]
  normalizedName: string
  onMerge: (primaryId: number, secondaryId: number) => Promise<void>
  isMerging: boolean
}

export function DuplicateMergeCard({
  agencies,
  normalizedName,
  onMerge,
  isMerging,
}: DuplicateMergeCardProps) {
  const [primaryId, setPrimaryId] = React.useState<number>(agencies[0]?.id || 0)
  const [secondaryId, setSecondaryId] = React.useState<number>(agencies[1]?.id || 0)

  const primary = agencies.find((a) => a.id === primaryId)
  const secondary = agencies.find((a) => a.id === secondaryId)

  if (!primary || !secondary) return null

  // Calculate merged preview data
  const mergedSources = Array.from(
    new Set([...(primary.sources || []), ...(secondary.sources || [])])
  )
  const mergedRating =
    primary.avgRating && secondary.avgRating
      ? ((primary.avgRating + secondary.avgRating) / 2).toFixed(1)
      : primary.avgRating || secondary.avgRating
  const mergedReviews = (primary.totalReviews || 0) + (secondary.totalReviews || 0)

  const handleMerge = () => {
    onMerge(primaryId, secondaryId)
  }

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-slate-900 capitalize">
          {normalizedName}
          <Badge variant="outline" className="ml-3 bg-amber-50 text-amber-700 border-amber-200">
            {agencies.length} duplicates found
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Record A */}
          <div className="border rounded-lg p-4 bg-slate-50">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-700">
                Record A (ID: {primary.id})
              </h3>
              <Badge variant="secondary" className="text-xs">Primary</Badge>
            </div>
            <AgencyDetails agency={primary} />
          </div>

          {/* Record B */}
          <div className="border rounded-lg p-4 bg-slate-50">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-700">
                Record B (ID: {secondary.id})
              </h3>
              <Badge variant="outline" className="text-xs">Will be deleted</Badge>
            </div>
            <AgencyDetails agency={secondary} />
          </div>
        </div>

        {/* Merge Preview */}
        <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <h4 className="font-semibold text-green-900 mb-3 flex items-center gap-2">
            <ArrowRight className="h-4 w-4" />
            After Merge (will update Record A, delete Record B)
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-green-700 font-medium">Sources:</span>{" "}
              <span className="text-green-900">{mergedSources.join(", ")}</span>
            </div>
            <div>
              <span className="text-green-700 font-medium">Rating:</span>{" "}
              <span className="text-green-900">
                {mergedRating} ⭐ ({mergedReviews} total reviews)
              </span>
            </div>
            <div>
              <span className="text-green-700 font-medium">Emails:</span>{" "}
              <span className="text-green-900">
                Keep all unique: {[primary.contactEmail, secondary.contactEmail].filter(Boolean).join(", ")}
              </span>
            </div>
            <div>
              <span className="text-green-700 font-medium">Phones:</span>{" "}
              <span className="text-green-900">
                Keep all unique: {[primary.phoneNumber, secondary.phoneNumber].filter(Boolean).join(", ")}
              </span>
            </div>
          </div>
        </div>

        {/* Merge Button */}
        <div className="mt-6 flex justify-end">
          <Button
            onClick={handleMerge}
            disabled={isMerging}
            className="bg-green-600 hover:bg-green-700"
          >
            {isMerging ? "Merging..." : "Merge Records"}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function AgencyDetails({ agency }: { agency: DuplicateAgency }) {
  return (
    <div className="space-y-3 text-sm">
      {/* Name */}
      <div>
        <span className="font-medium text-slate-600">Name:</span>{" "}
        <span className="text-slate-900">{agency.name}</span>
      </div>

      {/* Website */}
      {agency.websiteUrl && (
        <div>
          <span className="font-medium text-slate-600">Website:</span>{" "}
          <a
            href={agency.websiteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline inline-flex items-center gap-1"
          >
            <img
              src={getFaviconUrl(agency.websiteUrl)}
              alt=""
              className="w-4 h-4 inline"
              onError={(e) => {
                e.currentTarget.style.display = "none"
              }}
            />
            {new URL(agency.websiteUrl).hostname.replace("www.", "")}
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      )}

      {/* Email */}
      {agency.contactEmail && (
        <div className="flex items-center gap-2">
          <Mail className="h-4 w-4 text-slate-500" />
          <span className="text-slate-900">{agency.contactEmail}</span>
        </div>
      )}

      {/* Phone */}
      {agency.phoneNumber && (
        <div className="flex items-center gap-2">
          <Phone className="h-4 w-4 text-slate-500" />
          <span className="text-slate-900">{agency.phoneNumber}</span>
        </div>
      )}

      {/* Location */}
      {(agency.city || agency.state) && (
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-slate-500" />
          <span className="text-slate-900">
            {[agency.city, agency.state].filter(Boolean).join(", ")}
          </span>
        </div>
      )}

      {/* Sources */}
      <div>
        <span className="font-medium text-slate-600">Sources:</span>{" "}
        <div className="flex gap-1 mt-1 flex-wrap">
          {agency.sources.map((source, idx) => (
            <Badge key={idx} variant="secondary" className="text-xs">
              {source}
            </Badge>
          ))}
        </div>
      </div>

      {/* Rating */}
      {agency.avgRating && (
        <div className="flex items-center gap-2">
          <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
          <span className="text-slate-900">
            {Number(agency.avgRating).toFixed(1)} ({agency.totalReviews} reviews)
          </span>
        </div>
      )}

      {/* Employee Count */}
      {agency.employeeCount && (
        <div>
          <span className="font-medium text-slate-600">Employees:</span>{" "}
          <span className="text-slate-900">{agency.employeeCount}</span>
        </div>
      )}
    </div>
  )
}
