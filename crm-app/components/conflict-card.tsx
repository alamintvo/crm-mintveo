"use client"

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AgencyConflict, ConflictType } from "@/app/actions/conflicts"
import { AlertTriangle, Mail, Phone, MapPin, Users, FileText, ExternalLink } from "lucide-react"

const conflictLabels: Record<ConflictType, { label: string; icon: any; color: string }> = {
  multiple_phones: {
    label: "Multiple Phones",
    icon: Phone,
    color: "bg-blue-100 text-blue-800 border-blue-200",
  },
  multiple_emails: {
    label: "Multiple Emails",
    icon: Mail,
    color: "bg-purple-100 text-purple-800 border-purple-200",
  },
  city_mismatch: {
    label: "City Mismatch",
    icon: MapPin,
    color: "bg-orange-100 text-orange-800 border-orange-200",
  },
  state_mismatch: {
    label: "State Mismatch",
    icon: MapPin,
    color: "bg-red-100 text-red-800 border-red-200",
  },
  employee_count_mismatch: {
    label: "Employee Count Mismatch",
    icon: Users,
    color: "bg-yellow-100 text-yellow-800 border-yellow-200",
  },
  description_mismatch: {
    label: "Description Mismatch",
    icon: FileText,
    color: "bg-green-100 text-green-800 border-green-200",
  },
}

type ConflictCardProps = {
  conflict: AgencyConflict
}

export function ConflictCard({ conflict }: ConflictCardProps) {
  return (
    <Card className="mb-4">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg font-semibold text-slate-900">
              {conflict.name}
              <Badge variant="outline" className="ml-3 bg-red-50 text-red-700 border-red-200">
                <AlertTriangle className="h-3 w-3 mr-1" />
                {conflict.conflictCount} conflict{conflict.conflictCount > 1 ? "s" : ""}
              </Badge>
            </CardTitle>
            {conflict.websiteUrl && (
              <a
                href={conflict.websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:underline inline-flex items-center gap-1 mt-1"
              >
                {new URL(conflict.websiteUrl).hostname.replace("www.", "")}
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
          <div className="flex flex-wrap gap-1">
            {conflict.sources.map((source, idx) => (
              <Badge key={idx} variant="secondary" className="text-xs">
                {source}
              </Badge>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Conflict Badges */}
        <div className="flex flex-wrap gap-2 mb-4">
          {conflict.conflictTypes.map((type) => {
            const config = conflictLabels[type]
            const Icon = config.icon
            return (
              <Badge key={type} variant="outline" className={`${config.color} text-xs`}>
                <Icon className="h-3 w-3 mr-1" />
                {config.label}
              </Badge>
            )
          })}
        </div>

        {/* Conflict Details */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* AgencySpotter */}
          {conflict.agencyspotterData && (
            <div className="border rounded-lg p-3 bg-blue-50">
              <h4 className="font-semibold text-sm text-blue-900 mb-2">AgencySpotter</h4>
              <SourceData data={conflict.agencyspotterData} conflictTypes={conflict.conflictTypes} />
            </div>
          )}

          {/* GoodFirms */}
          {conflict.goodfirmsData && (
            <div className="border rounded-lg p-3 bg-emerald-50">
              <h4 className="font-semibold text-sm text-emerald-900 mb-2">GoodFirms</h4>
              <SourceData data={conflict.goodfirmsData} conflictTypes={conflict.conflictTypes} />
            </div>
          )}

          {/* The Manifest */}
          {conflict.themanifestData && (
            <div className="border rounded-lg p-3 bg-purple-50">
              <h4 className="font-semibold text-sm text-purple-900 mb-2">The Manifest</h4>
              <SourceData data={conflict.themanifestData} conflictTypes={conflict.conflictTypes} />
            </div>
          )}
        </div>

        {/* Current Merged Values */}
        <div className="mt-4 p-3 bg-slate-100 rounded-lg">
          <h4 className="font-semibold text-sm text-slate-900 mb-2">Current Merged Values</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
            {conflict.contactEmail && (
              <div>
                <span className="text-slate-600">Email:</span>
                <div className="font-medium text-slate-900">{conflict.contactEmail}</div>
              </div>
            )}
            {conflict.phoneNumber && (
              <div>
                <span className="text-slate-600">Phone:</span>
                <div className="font-medium text-slate-900">{conflict.phoneNumber}</div>
              </div>
            )}
            {conflict.city && (
              <div>
                <span className="text-slate-600">City:</span>
                <div className="font-medium text-slate-900">{conflict.city}</div>
              </div>
            )}
            {conflict.state && (
              <div>
                <span className="text-slate-600">State:</span>
                <div className="font-medium text-slate-900">{conflict.state}</div>
              </div>
            )}
            {conflict.employeeCount && (
              <div>
                <span className="text-slate-600">Employees:</span>
                <div className="font-medium text-slate-900">{conflict.employeeCount}</div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function SourceData({ data, conflictTypes }: { data: any; conflictTypes: ConflictType[] }) {
  const hasPhoneConflict = conflictTypes.includes("multiple_phones")
  const hasEmailConflict = conflictTypes.includes("multiple_emails")
  const hasCityConflict = conflictTypes.includes("city_mismatch")
  const hasStateConflict = conflictTypes.includes("state_mismatch")
  const hasEmployeeConflict = conflictTypes.includes("employee_count_mismatch")
  const hasDescriptionConflict = conflictTypes.includes("description_mismatch")

  return (
    <div className="space-y-2 text-xs">
      {data["Contact Email"] && (
        <div className={hasEmailConflict ? "font-bold text-red-700" : ""}>
          <span className="text-slate-600">Email:</span>
          <div className="break-all">{data["Contact Email"]}</div>
        </div>
      )}
      {data["Phone Number"] && (
        <div className={hasPhoneConflict ? "font-bold text-red-700" : ""}>
          <span className="text-slate-600">Phone:</span>
          <div>{data["Phone Number"]}</div>
        </div>
      )}
      {data.City && (
        <div className={hasCityConflict ? "font-bold text-red-700" : ""}>
          <span className="text-slate-600">City:</span>
          <div>{data.City}</div>
        </div>
      )}
      {data.State && (
        <div className={hasStateConflict ? "font-bold text-red-700" : ""}>
          <span className="text-slate-600">State:</span>
          <div>{data.State}</div>
        </div>
      )}
      {data["Employee Count"] && (
        <div className={hasEmployeeConflict ? "font-bold text-red-700" : ""}>
          <span className="text-slate-600">Employees:</span>
          <div>{String(data["Employee Count"])}</div>
        </div>
      )}
      {data.Description && hasDescriptionConflict && (
        <div className="font-bold text-red-700">
          <span className="text-slate-600">Description:</span>
          <div className="line-clamp-2">{data.Description}</div>
        </div>
      )}
    </div>
  )
}
