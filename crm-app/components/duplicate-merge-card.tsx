"use client"

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Mail, Phone, MapPin, Star, ExternalLink, ArrowRight, X } from "lucide-react"
import { DuplicateAgency } from "@/app/actions/duplicates"
import { getFaviconUrl } from "@/lib/format-utils"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"

type DuplicateMergeCardProps = {
  agencies: DuplicateAgency[]
  normalizedName: string
  onMerge: (primaryId: number, secondaryId: number, websiteToKeep: string | null) => Promise<void>
  onSkip: (normalizedName: string) => void
  isMerging: boolean
}

export function DuplicateMergeCard({
  agencies,
  normalizedName,
  onMerge,
  onSkip,
  isMerging,
}: DuplicateMergeCardProps) {
  const [primaryId, setPrimaryId] = React.useState<number>(agencies[0]?.id || 0)
  const [secondaryId, setSecondaryId] = React.useState<number>(agencies[1]?.id || 0)
  const [selectedWebsite, setSelectedWebsite] = React.useState<"primary" | "secondary">("primary")

  const primary = agencies.find((a) => a.id === primaryId)
  const secondary = agencies.find((a) => a.id === secondaryId)

  if (!primary || !secondary) return null

  // Check if websites are different
  const differentWebsites =
    primary.websiteUrl &&
    secondary.websiteUrl &&
    primary.websiteUrl.toLowerCase().trim() !== secondary.websiteUrl.toLowerCase().trim()

  // Get profile URLs from source data
  const getPrimaryProfileUrls = () => {
    const urls = []
    if (primary.agencyspotterData?.["Profile URL"]) {
      urls.push({ source: "AgencySpotter", url: primary.agencyspotterData["Profile URL"] })
    }
    if (primary.goodfirmsData?.["Profile URL"]) {
      urls.push({ source: "GoodFirms", url: primary.goodfirmsData["Profile URL"] })
    }
    if (primary.themanifestData?.["Profile URL"]) {
      urls.push({ source: "The Manifest", url: primary.themanifestData["Profile URL"] })
    }
    return urls
  }

  const getSecondaryProfileUrls = () => {
    const urls = []
    if (secondary.agencyspotterData?.["Profile URL"]) {
      urls.push({ source: "AgencySpotter", url: secondary.agencyspotterData["Profile URL"] })
    }
    if (secondary.goodfirmsData?.["Profile URL"]) {
      urls.push({ source: "GoodFirms", url: secondary.goodfirmsData["Profile URL"] })
    }
    if (secondary.themanifestData?.["Profile URL"]) {
      urls.push({ source: "The Manifest", url: secondary.themanifestData["Profile URL"] })
    }
    return urls
  }

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
    // Determine which website to use based on selection
    const websiteToKeep = selectedWebsite === "primary" ? primary.websiteUrl : secondary.websiteUrl
    onMerge(primaryId, secondaryId, websiteToKeep)
  }

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-slate-900 capitalize">
          {normalizedName}
          <Badge variant="outline" className="ml-3 bg-amber-50 text-amber-700 border-amber-200">
            {agencies.length} duplicates found
          </Badge>
          {differentWebsites && (
            <Badge variant="outline" className="ml-2 bg-red-50 text-red-700 border-red-200">
              ⚠️ Different Websites
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Warning for different websites */}
        {differentWebsites && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-800">
              <strong>⚠️ Warning:</strong> These agencies have <strong>different websites</strong>.
              They may be separate companies with the same name. Please review carefully before merging.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Record A */}
          <div className="border rounded-lg p-4 bg-slate-50">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-700">
                Record A (ID: {primary.id})
              </h3>
              <Badge variant="secondary" className="text-xs">Primary</Badge>
            </div>
            <AgencyDetails agency={primary} profileUrls={getPrimaryProfileUrls()} />
          </div>

          {/* Record B */}
          <div className="border rounded-lg p-4 bg-slate-50">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-700">
                Record B (ID: {secondary.id})
              </h3>
              <Badge variant="outline" className="text-xs">Will be deleted</Badge>
            </div>
            <AgencyDetails agency={secondary} profileUrls={getSecondaryProfileUrls()} />
          </div>
        </div>

        {/* Merge Configuration */}
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h4 className="font-semibold text-blue-900 mb-4 flex items-center gap-2">
            <ArrowRight className="h-4 w-4" />
            Merge Configuration
          </h4>

          <div className="space-y-4">
            {/* Website Selection - ONLY manual choice */}
            {differentWebsites && (
              <div>
                <Label className="text-sm font-medium text-blue-900 mb-2 block">
                  ⚠️ Choose which Website URL to keep:
                </Label>
                <RadioGroup value={selectedWebsite} onValueChange={(v) => setSelectedWebsite(v as any)}>
                  <div className="flex items-center space-x-2 mb-2">
                    <RadioGroupItem value="primary" id="website-primary" />
                    <Label htmlFor="website-primary" className="text-sm font-normal cursor-pointer flex-1">
                      <span className="font-medium">Record A:</span> {primary.websiteUrl}
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="secondary" id="website-secondary" />
                    <Label htmlFor="website-secondary" className="text-sm font-normal cursor-pointer flex-1">
                      <span className="font-medium">Record B:</span> {secondary.websiteUrl}
                    </Label>
                  </div>
                </RadioGroup>
              </div>
            )}

            {/* Auto-merge info */}
            <div className="text-xs text-blue-700 bg-blue-100 p-3 rounded space-y-1">
              <div><strong>Auto-merged (as per PROJECT_PLAN.md):</strong></div>
              <div className="ml-2">
                • <strong>Emails & Phones:</strong> Keep ALL unique values in arrays<br />
                • <strong>Locations:</strong> City, State, Country (combined unique)<br />
                • <strong>Ratings:</strong> Averaged across sources<br />
                • <strong>Reviews:</strong> Sum of all reviews<br />
                • <strong>Services/Industries/Clients:</strong> Union of all unique values<br />
                • <strong>Source Data:</strong> All JSONB data merged
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex justify-between items-center">
          <Button
            onClick={() => onSkip(normalizedName)}
            disabled={isMerging}
            variant="outline"
            className="text-slate-600"
          >
            <X className="h-4 w-4 mr-2" />
            Skip (Keep Separate)
          </Button>
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

function AgencyDetails({
  agency,
  profileUrls
}: {
  agency: DuplicateAgency
  profileUrls: { source: string; url: string }[]
}) {
  return (
    <div className="space-y-3 text-sm">
      {/* Name */}
      <div>
        <span className="font-medium text-slate-600">Name:</span>{" "}
        <span className="text-slate-900">{agency.name}</span>
      </div>

      {/* Profile URLs */}
      {profileUrls.length > 0 && (
        <div>
          <span className="font-medium text-slate-600 block mb-1">
            Directory Profiles (click to verify):
          </span>
          <div className="space-y-1">
            {profileUrls.map((profile, idx) => (
              <a
                key={idx}
                href={profile.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline flex items-center gap-1 text-xs"
              >
                <ExternalLink className="h-3 w-3" />
                {profile.source}
              </a>
            ))}
          </div>
        </div>
      )}

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
