"use client"

import * as React from "react"
import { ExternalLink, Star, Building2, Users, MapPin, Mail, Phone, Globe, Linkedin, Save, Tag, Briefcase, Target, Award, Clock } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
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
    url: "https://www.agencyspotter.com",
  },
  goodfirms: {
    label: "GoodFirms",
    color: "bg-slate-700 hover:bg-slate-800",
    url: "https://www.goodfirms.com",
  },
  themanifest: {
    label: "The Manifest",
    color: "bg-slate-700 hover:bg-slate-800",
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
                {/* Description */}
                {agency.description && (
                  <section>
                    <h3 className="text-base font-semibold text-slate-900 mb-3 flex items-center gap-2">
                      <Briefcase className="h-4 w-4 text-slate-500" />
                      About
                    </h3>
                    <p className="text-sm text-slate-700 leading-relaxed">{agency.description}</p>
                  </section>
                )}

                {/* Services & Industries */}
                <div className="grid grid-cols-2 gap-6">
                  {agency.servicesMerged && agency.servicesMerged.length > 0 && (
                    <section>
                      <h3 className="text-base font-semibold text-slate-900 mb-3 flex items-center gap-2">
                        <Target className="h-4 w-4 text-slate-500" />
                        Services ({agency.servicesMerged.length})
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {agency.servicesMerged.slice(0, 20).map((service, idx) => (
                          <Badge key={idx} variant="secondary" className="font-normal text-xs">
                            {service}
                          </Badge>
                        ))}
                        {agency.servicesMerged.length > 20 && (
                          <Badge variant="outline" className="text-xs">
                            +{agency.servicesMerged.length - 20} more
                          </Badge>
                        )}
                      </div>
                    </section>
                  )}

                  {agency.industriesMerged && agency.industriesMerged.length > 0 && (
                    <section>
                      <h3 className="text-base font-semibold text-slate-900 mb-3 flex items-center gap-2">
                        <Tag className="h-4 w-4 text-slate-500" />
                        Industries ({agency.industriesMerged.length})
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {agency.industriesMerged.slice(0, 20).map((industry, idx) => (
                          <Badge key={idx} variant="outline" className="font-normal text-xs">
                            {industry}
                          </Badge>
                        ))}
                        {agency.industriesMerged.length > 20 && (
                          <Badge variant="outline" className="text-xs">
                            +{agency.industriesMerged.length - 20} more
                          </Badge>
                        )}
                      </div>
                    </section>
                  )}
                </div>

                {/* Clients */}
                {agency.clientsMerged && agency.clientsMerged.length > 0 && (
                  <section>
                    <h3 className="text-base font-semibold text-slate-900 mb-3 flex items-center gap-2">
                      <Award className="h-4 w-4 text-slate-500" />
                      Notable Clients ({agency.clientsMerged.length})
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {agency.clientsMerged.slice(0, 30).map((client, idx) => (
                        <Badge key={idx} variant="secondary" className="font-normal text-xs">
                          {client}
                        </Badge>
                      ))}
                      {agency.clientsMerged.length > 30 && (
                        <Badge variant="outline" className="text-xs">
                          +{agency.clientsMerged.length - 30} more
                        </Badge>
                      )}
                    </div>
                  </section>
                )}

                <Separator className="my-6" />

                {/* Directory Data */}
                {availableSources.length > 0 && (
                  <section>
                    <h3 className="text-base font-semibold text-slate-900 mb-4">
                      Directory Information
                    </h3>
                    <Tabs defaultValue={availableSources[0]} className="w-full">
                      <TabsList className="mb-4">
                        {availableSources.map((source) => {
                          const config = sourceConfig[source as keyof typeof sourceConfig]
                          return (
                            <TabsTrigger key={source} value={source} className="gap-2">
                              <img
                                src={getFaviconUrl(config?.url)}
                                alt={config?.label}
                                className="w-4 h-4"
                                onError={(e) => {
                                  e.currentTarget.style.display = "none"
                                }}
                              />
                              {config?.label || source}
                            </TabsTrigger>
                          )
                        })}
                      </TabsList>

                      {availableSources.includes("agencyspotter") && agency.agencyspotterData && (
                        <TabsContent value="agencyspotter" className="mt-0">
                          <SourceDataDisplay data={agency.agencyspotterData} />
                        </TabsContent>
                      )}

                      {availableSources.includes("goodfirms") && agency.goodfirmsData && (
                        <TabsContent value="goodfirms" className="mt-0">
                          <SourceDataDisplay data={agency.goodfirmsData} />
                        </TabsContent>
                      )}

                      {availableSources.includes("themanifest") && agency.themanifestData && (
                        <TabsContent value="themanifest" className="mt-0">
                          <SourceDataDisplay data={agency.themanifestData} />
                        </TabsContent>
                      )}
                    </Tabs>
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
