"use client"

import * as React from "react"
import { ExternalLink, Star, Building2, Users, MapPin, Mail, Phone, Globe, Linkedin, Save, Briefcase, Clock } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { updateNotes } from "@/app/actions/agencies"
import { toast } from "sonner"
import { getFaviconUrl } from "@/lib/format-utils"

type AgencyDetailsProps = {
  agency: {
    id: number
    name: string
    websiteUrl: string | null
    contactEmail: string | null
    phoneNumber: string | null
    linkedinUrl: string | null
    city: string | null
    state: string | null
    country: string | null
    description: string | null
    tagline: string | null
    employeeCount: string | null
    avgRating: number | null
    totalReviews: number | null
    sources: string[]
    servicesMerged: string[]
    industriesMerged: string[]
    clientsMerged: string[]
    agencyspotterData: any
    goodfirmsData: any
    themanifestData: any
    notes: string | null
    contactStatus: string
    lastContactDate: Date | null
  }
  open: boolean
  onOpenChange: (open: boolean) => void
}

const sourceConfig = {
  agencyspotter: {
    label: "AgencySpotter",
    color: "bg-slate-700 hover:bg-slate-800",
    headerBg: "bg-blue-600",
    borderColor: "border-blue-200",
    url: "https://www.agencyspotter.com",
  },
  goodfirms: {
    label: "GoodFirms",
    color: "bg-slate-700 hover:bg-slate-800",
    headerBg: "bg-green-600",
    borderColor: "border-green-200",
    url: "https://www.goodfirms.com",
  },
  themanifest: {
    label: "The Manifest",
    color: "bg-slate-700 hover:bg-slate-800",
    headerBg: "bg-purple-600",
    borderColor: "border-purple-200",
    url: "https://themanifest.com",
  },
}

export function AgencyDetailsDialog({ agency, open, onOpenChange }: AgencyDetailsProps) {
  const [notes, setNotes] = React.useState(agency.notes || "")
  const [originalNotes, setOriginalNotes] = React.useState(agency.notes || "")
  const [isSaving, setIsSaving] = React.useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = React.useState(false)
  const availableSources = agency.sources.map((source) => source.toLowerCase())

  React.useEffect(() => {
    setNotes(agency.notes || "")
    setOriginalNotes(agency.notes || "")
    setHasUnsavedChanges(false)
  }, [agency.notes, agency.id])

  const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value
    setNotes(newValue)
    setHasUnsavedChanges(newValue !== originalNotes)
  }

  const handleSaveNotes = async () => {
    if (!hasUnsavedChanges || notes === originalNotes) {
      return
    }

    setIsSaving(true)
    const result = await updateNotes(agency.id, notes)
    setIsSaving(false)

    if (result.success) {
      setOriginalNotes(notes)
      setHasUnsavedChanges(false)
      toast.success("Notes saved successfully")
    } else {
      toast.error("Failed to save notes")
    }
  }

  const getProfileUrl = (source: string) => {
    const sourceLower = source.toLowerCase()
    if (sourceLower === "agencyspotter") return agency.agencyspotterData?.["Profile URL"]
    if (sourceLower === "goodfirms") return agency.goodfirmsData?.["Profile URL"]
    if (sourceLower === "themanifest") return agency.themanifestData?.["Profile URL"]
    return null
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[98vw] w-[98vw] max-h-[98vh] p-0 gap-0">
        {/* Header */}
        <div className="border-b bg-slate-50 px-8 py-6">
          <div className="flex items-start justify-between gap-6">
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-2xl font-semibold text-slate-900 mb-2 flex items-center gap-2">
                <Building2 className="h-6 w-6 text-slate-600 flex-shrink-0" />
                {agency.name}
              </DialogTitle>
              {agency.tagline && (
                <p className="text-slate-600 mb-3 text-sm">{agency.tagline}</p>
              )}
              <div className="flex items-center gap-4 flex-wrap text-sm">
                {agency.websiteUrl && (
                  <a
                    href={agency.websiteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-slate-700 hover:text-slate-900 flex items-center gap-1.5 font-medium"
                  >
                    <Globe className="h-4 w-4" />
                    {new URL(agency.websiteUrl).hostname}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
                {agency.avgRating && (
                  <div className="flex items-center gap-1.5">
                    <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                    <span className="font-semibold text-slate-900">{agency.avgRating.toFixed(1)}</span>
                    {agency.totalReviews && (
                      <span className="text-slate-500">({agency.totalReviews} reviews)</span>
                    )}
                  </div>
                )}
                {agency.employeeCount && (
                  <div className="flex items-center gap-1.5 text-slate-700">
                    <Users className="h-4 w-4" />
                    <span>{agency.employeeCount} employees</span>
                  </div>
                )}
                {(agency.city || agency.state || agency.country) && (
                  <div className="flex items-center gap-1.5 text-slate-700">
                    <MapPin className="h-4 w-4" />
                    <span>{[agency.city, agency.state, agency.country].filter(Boolean).join(", ")}</span>
                  </div>
                )}
              </div>
            </div>
            <div className="flex flex-col gap-2">
              {agency.sources.map((source) => {
                const config = sourceConfig[source.toLowerCase() as keyof typeof sourceConfig]
                const profileUrl = getProfileUrl(source)
                return profileUrl ? (
                  <a
                    key={source}
                    href={profileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-md text-white text-sm font-medium transition-colors ${config?.color}`}
                  >
                    <img
                      src={getFaviconUrl(config?.url)}
                      alt={config?.label}
                      className="w-4 h-4 opacity-90"
                      onError={(e) => {
                        e.currentTarget.style.display = "none"
                      }}
                    />
                    View on {config?.label}
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                ) : (
                  <div
                    key={source}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-slate-100 text-slate-700 text-sm font-medium"
                  >
                    {config?.label || source}
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Content */}
        <ScrollArea className="h-[calc(98vh-140px)]">
          <div className="p-8">
            <div className="grid grid-cols-12 gap-6">
              {/* Main Content - 8 columns */}
              <div className="col-span-8 space-y-6">
                {/* Directory Data - Comparison View */}
                {availableSources.length > 0 && (
                  <section>
                    <h3 className="text-base font-semibold text-slate-900 mb-4">
                      Directory Comparison
                    </h3>
                    <ComparisonView
                      sources={{
                        agencyspotter: availableSources.includes("agencyspotter") ? agency.agencyspotterData : null,
                        goodfirms: availableSources.includes("goodfirms") ? agency.goodfirmsData : null,
                        themanifest: availableSources.includes("themanifest") ? agency.themanifestData : null,
                      }}
                      sourceConfig={sourceConfig}
                    />
                  </section>
                )}
              </div>

              {/* Sidebar - 4 columns */}
              <div className="col-span-4 space-y-6">
                {/* Contact Card */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Contact Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {agency.contactEmail && (
                      <div className="flex items-start gap-3">
                        <Mail className="h-4 w-4 text-slate-400 mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-slate-500 mb-1">Email</p>
                          <a
                            href={`mailto:${agency.contactEmail}`}
                            className="text-sm text-slate-900 hover:text-slate-700 break-all"
                          >
                            {agency.contactEmail}
                          </a>
                        </div>
                      </div>
                    )}

                    {agency.phoneNumber && (
                      <div className="flex items-start gap-3">
                        <Phone className="h-4 w-4 text-slate-400 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <p className="text-xs text-slate-500 mb-1">Phone</p>
                          <a
                            href={`tel:${agency.phoneNumber}`}
                            className="text-sm text-slate-900 hover:text-slate-700"
                          >
                            {agency.phoneNumber}
                          </a>
                        </div>
                      </div>
                    )}

                    {agency.linkedinUrl && (
                      <div className="flex items-start gap-3">
                        <Linkedin className="h-4 w-4 text-[#0A66C2] mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <p className="text-xs text-slate-500 mb-1">LinkedIn</p>
                          <a
                            href={agency.linkedinUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-slate-900 hover:text-slate-700 flex items-center gap-1"
                          >
                            Company Profile
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Notes Card */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Internal Notes</CardTitle>
                    <CardDescription className="text-xs">
                      Track communications and important information
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Textarea
                      value={notes}
                      onChange={handleNotesChange}
                      placeholder="Add notes about communications, next steps, or other relevant information..."
                      className="min-h-[200px] text-sm resize-none"
                    />
                    <div className="flex items-center justify-between">
                      {hasUnsavedChanges && (
                        <p className="text-xs text-amber-600 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Unsaved changes
                        </p>
                      )}
                      <Button
                        onClick={handleSaveNotes}
                        disabled={!hasUnsavedChanges || isSaving}
                        size="sm"
                        className="ml-auto"
                      >
                        {isSaving ? (
                          <>
                            <Save className="h-3.5 w-3.5 mr-2 animate-pulse" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save className="h-3.5 w-3.5 mr-2" />
                            Save Notes
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}

function ComparisonView({
  sources,
  sourceConfig,
}: {
  sources: {
    agencyspotter: any
    goodfirms: any
    themanifest: any
  }
  sourceConfig: any
}) {
  // Collect all unique field names from all sources
  const allFields = new Set<string>()

  Object.values(sources).forEach((data) => {
    if (data && typeof data === "object") {
      Object.keys(data).forEach((key) => {
        if (key !== "Projects") { // We'll handle projects separately
          allFields.add(key)
        }
      })
    }
  })

  // Priority order for fields - most important first
  const fieldPriority = [
    "Name",
    "Agency Name",
    "Company Name",
    "Tagline",
    "Description",
    "Employees",
    "Employee Count",
    "Team Size",
    "City",
    "State",
    "Country",
    "Address",
    "Full Address",
    "Location",
    "Website",
    "Website URL",
    "Profile URL",
    "LinkedIn",
    "LinkedIn URL",
    "Phone",
    "Phone Number",
    "Email",
    "Contact Email",
    "Rating",
    "Reviews",
    "Founded",
    "Year Founded",
    "Specialties",
  ]

  const sortedFields = Array.from(allFields).sort((a, b) => {
    const aIndex = fieldPriority.findIndex(
      (p) => p.toLowerCase() === a.toLowerCase() || a.toLowerCase().includes(p.toLowerCase())
    )
    const bIndex = fieldPriority.findIndex(
      (p) => p.toLowerCase() === b.toLowerCase() || b.toLowerCase().includes(p.toLowerCase())
    )

    // If both have priority, sort by priority order
    if (aIndex !== -1 && bIndex !== -1) {
      return aIndex - bIndex
    }
    // If only a has priority, it comes first
    if (aIndex !== -1) return -1
    // If only b has priority, it comes first
    if (bIndex !== -1) return 1
    // If neither has priority, sort alphabetically
    return a.localeCompare(b)
  })

  const activeSources = Object.entries(sources).filter(([_, data]) => data !== null)

  return (
    <div className="space-y-6">
      {/* Header with source names */}
      <div className="grid gap-3" style={{ gridTemplateColumns: `200px repeat(${activeSources.length}, 1fr)` }}>
        <div className="font-semibold text-slate-700 text-sm">Field</div>
        {activeSources.map(([sourceName, _]) => {
          const config = sourceConfig[sourceName as keyof typeof sourceConfig]
          return (
            <div key={sourceName} className={`${config.headerBg} text-white px-3 py-2 rounded-md text-center`}>
              <div className="flex items-center justify-center gap-2">
                <img
                  src={getFaviconUrl(config.url)}
                  alt={config.label}
                  className="w-4 h-4 opacity-90"
                  onError={(e) => {
                    e.currentTarget.style.display = "none"
                  }}
                />
                <span className="font-semibold text-sm">{config.label}</span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Field rows */}
      <div className="space-y-2">
        {sortedFields.map((fieldName) => {
          const hasData = activeSources.some(([sourceName, data]) => {
            const value = data?.[fieldName]
            return value !== null && value !== undefined && value !== ""
          })

          if (!hasData) return null

          return (
            <div
              key={fieldName}
              className="grid gap-3 items-start border-b border-slate-100 pb-3"
              style={{ gridTemplateColumns: `200px repeat(${activeSources.length}, 1fr)` }}
            >
              <div className="text-xs font-medium text-slate-600 uppercase tracking-wide pt-2">
                {fieldName.replace(/_/g, " ")}
              </div>
              {activeSources.map(([sourceName, data]) => {
                const value = data?.[fieldName]
                const config = sourceConfig[sourceName as keyof typeof sourceConfig]

                return (
                  <div key={sourceName} className={`text-sm border-l-2 ${config.borderColor} pl-3 py-2`}>
                    {value === null || value === undefined || value === "" ? (
                      <span className="text-slate-400 italic">-</span>
                    ) : fieldName.toLowerCase().includes("url") || fieldName.toLowerCase().includes("link") ? (
                      <a
                        href={String(value)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-3 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-md transition-colors group max-w-full"
                      >
                        <img
                          src={getFaviconUrl(String(value))}
                          alt="favicon"
                          className="w-4 h-4 flex-shrink-0"
                          onError={(e) => {
                            e.currentTarget.style.display = "none"
                          }}
                        />
                        <span className="text-slate-700 group-hover:text-slate-900 text-xs font-medium truncate">
                          {(() => {
                            try {
                              const url = new URL(String(value))
                              return url.hostname.replace('www.', '')
                            } catch {
                              return String(value)
                            }
                          })()}
                        </span>
                        <ExternalLink className="h-3 w-3 text-slate-400 group-hover:text-slate-600 flex-shrink-0" />
                      </a>
                    ) : Array.isArray(value) ? (
                      <div className="flex flex-wrap gap-1">
                        {value.slice(0, 5).map((item, idx) => (
                          <Badge key={idx} variant="secondary" className="text-xs font-normal">
                            {typeof item === "object" ? JSON.stringify(item) : String(item)}
                          </Badge>
                        ))}
                        {value.length > 5 && (
                          <Badge variant="outline" className="text-xs">
                            +{value.length - 5} more
                          </Badge>
                        )}
                      </div>
                    ) : typeof value === "object" ? (
                      <pre className="text-xs bg-slate-50 p-2 rounded border overflow-auto max-h-24 font-mono">
                        {JSON.stringify(value, null, 2)}
                      </pre>
                    ) : (
                      <span className="text-slate-900">{String(value)}</span>
                    )}
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>

      {/* Projects Section - if any source has projects */}
      {(sources.agencyspotter?.Projects || sources.goodfirms?.Projects || sources.themanifest?.Projects) && (
        <div className="mt-6">
          <h4 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
            <Briefcase className="h-4 w-4 text-slate-500" />
            Projects Portfolio
          </h4>
          <div className="space-y-4">
            {activeSources.map(([sourceName, data]) => {
              let projects = null
              if (data?.Projects) {
                try {
                  projects = typeof data.Projects === "string" ? JSON.parse(data.Projects) : data.Projects
                } catch (e) {
                  console.error("Failed to parse projects:", e)
                }
              }

              if (!projects || !Array.isArray(projects) || projects.length === 0) return null

              const config = sourceConfig[sourceName as keyof typeof sourceConfig]

              return (
                <div key={sourceName}>
                  <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-md ${config.headerBg} text-white text-xs font-semibold mb-2`}>
                    <img
                      src={getFaviconUrl(config.url)}
                      alt={config.label}
                      className="w-3 h-3 opacity-90"
                      onError={(e) => {
                        e.currentTarget.style.display = "none"
                      }}
                    />
                    {config.label} ({projects.length})
                  </div>
                  <div className="grid grid-cols-2 gap-3 ml-4">
                    {projects.slice(0, 4).map((project: any, idx: number) => (
                      <Card key={idx} className={`border-l-4 ${config.borderColor}`}>
                        <CardContent className="p-3">
                          {project.title && (
                            <h5 className="font-semibold text-slate-900 text-sm mb-1">{project.title}</h5>
                          )}
                          {project.client && (
                            <p className="text-xs text-slate-500 mb-2">Client: {project.client}</p>
                          )}
                          {project.description && (
                            <p className="text-xs text-slate-700 line-clamp-2">{project.description}</p>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                  {projects.length > 4 && (
                    <p className="text-xs text-slate-500 mt-2 ml-4">+{projects.length - 4} more projects</p>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

function SourceDataDisplay({ data }: { data: any }) {
  if (!data || typeof data !== "object") {
    return <p className="text-sm text-slate-500 py-4">No additional data available</p>
  }

  // Parse Projects if it's a stringified JSON
  let projects = null
  if (data.Projects) {
    try {
      projects = typeof data.Projects === "string" ? JSON.parse(data.Projects) : data.Projects
    } catch (e) {
      console.error("Failed to parse projects:", e)
    }
  }

  const importantFields = ["profile_url", "url", "rating", "reviews", "founded", "headquarters", "employees"]
  const sortedEntries = Object.entries(data)
    .filter(([key]) => key !== "Projects") // We'll handle projects separately
    .sort((a, b) => {
      const aImportant = importantFields.includes(a[0].toLowerCase())
      const bImportant = importantFields.includes(b[0].toLowerCase())
      if (aImportant && !bImportant) return -1
      if (!aImportant && bImportant) return 1
      return 0
    })

  return (
    <div className="space-y-6">
      {/* Projects Section - Special Display */}
      {projects && Array.isArray(projects) && projects.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
            <Briefcase className="h-4 w-4 text-slate-500" />
            Projects Portfolio ({projects.length})
          </h4>
          <div className="space-y-4">
            {projects.map((project: any, idx: number) => (
              <Card key={idx} className="bg-white">
                <CardContent className="p-4">
                  <div className="space-y-3">
                    {project.title && (
                      <div>
                        <h5 className="font-semibold text-slate-900 mb-1">{project.title}</h5>
                        {project.client && (
                          <p className="text-xs text-slate-500">Client: {project.client}</p>
                        )}
                      </div>
                    )}
                    {project.description && (
                      <p className="text-sm text-slate-700 leading-relaxed">
                        {project.description}
                      </p>
                    )}
                    {project.services && (
                      <div className="flex items-center gap-2 flex-wrap">
                        {project.services.split("|").map((service: string, i: number) => (
                          <Badge key={i} variant="secondary" className="text-xs">
                            {service.trim()}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Other Data */}
      {sortedEntries.length > 0 && (
        <div className="bg-slate-50 rounded-lg border p-4">
          <dl className="space-y-3">
            {sortedEntries.map(([key, value]) => {
              if (value === null || value === undefined || value === "") return null

              return (
                <div key={key} className="grid grid-cols-3 gap-3">
                  <dt className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                    {key.replace(/_/g, " ")}
                  </dt>
                  <dd className="text-sm text-slate-900 col-span-2">
                    {key.toLowerCase().includes("url") || key.toLowerCase().includes("link") ? (
                      <a
                        href={String(value)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-slate-700 hover:text-slate-900 flex items-center gap-1 break-all"
                      >
                        {String(value)}
                        <ExternalLink className="h-3 w-3 flex-shrink-0" />
                      </a>
                    ) : Array.isArray(value) ? (
                      <div className="flex flex-wrap gap-1">
                        {value.map((item, idx) => (
                          <Badge key={idx} variant="secondary" className="text-xs font-normal">
                            {typeof item === "object" ? JSON.stringify(item) : String(item)}
                          </Badge>
                        ))}
                      </div>
                    ) : typeof value === "object" ? (
                      <pre className="text-xs bg-white p-2 rounded border overflow-auto max-h-32 font-mono">
                        {JSON.stringify(value, null, 2)}
                      </pre>
                    ) : (
                      <span>{String(value)}</span>
                    )}
                  </dd>
                </div>
              )
            })}
          </dl>
        </div>
      )}
    </div>
  )
}
