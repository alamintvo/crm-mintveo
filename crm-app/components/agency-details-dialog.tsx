"use client"

import * as React from "react"
import { ExternalLink, Star, Building2, Users, MapPin, Mail, Phone, Globe, Linkedin, Save } from "lucide-react"
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
import { updateNotes } from "@/app/actions/agencies"
import { toast } from "sonner"

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
    color: "bg-blue-500",
    textColor: "text-blue-700",
    bgColor: "bg-blue-50",
  },
  goodfirms: {
    label: "GoodFirms",
    color: "bg-green-500",
    textColor: "text-green-700",
    bgColor: "bg-green-50",
  },
  themanifest: {
    label: "The Manifest",
    color: "bg-purple-500",
    textColor: "text-purple-700",
    bgColor: "bg-purple-50",
  },
}

export function AgencyDetailsDialog({ agency, open, onOpenChange }: AgencyDetailsProps) {
  const [notes, setNotes] = React.useState(agency.notes || "")
  const [originalNotes, setOriginalNotes] = React.useState(agency.notes || "")
  const [isSaving, setIsSaving] = React.useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = React.useState(false)
  const availableSources = agency.sources.map((source) => source.toLowerCase())

  // Update notes state when agency changes
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

  const handleNotesBlur = async () => {
    // Only save if there are actual changes
    if (!hasUnsavedChanges || notes === originalNotes) {
      return
    }

    setIsSaving(true)
    const result = await updateNotes(agency.id, notes)
    setIsSaving(false)

    if (result.success) {
      setOriginalNotes(notes) // Update the original to the new saved value
      setHasUnsavedChanges(false)
      toast.success("Notes saved successfully")
    } else {
      toast.error("Failed to save notes. Please try again.")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            <Building2 className="h-6 w-6" />
            {agency.name}
          </DialogTitle>
          <DialogDescription className="flex items-center gap-4 flex-wrap mt-2">
            {agency.websiteUrl && (
              <a
                href={agency.websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline flex items-center gap-1"
              >
                <Globe className="h-4 w-4" />
                {new URL(agency.websiteUrl).hostname}
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
            {agency.avgRating && (
              <div className="flex items-center gap-1">
                <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                <span className="font-semibold">{agency.avgRating.toFixed(1)}</span>
                {agency.totalReviews && (
                  <span className="text-muted-foreground">({agency.totalReviews} reviews)</span>
                )}
              </div>
            )}
            <div className="flex gap-1">
              {agency.sources.map((source) => (
                <Badge
                  key={source}
                  className={sourceConfig[source.toLowerCase() as keyof typeof sourceConfig]?.color}
                >
                  {sourceConfig[source.toLowerCase() as keyof typeof sourceConfig]?.label || source}
                </Badge>
              ))}
            </div>
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-120px)] pr-4">
          <div className="space-y-6">
            {/* General Information */}
            <Card>
              <CardHeader>
                <CardTitle>General Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {agency.tagline && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Tagline</p>
                    <p className="text-sm">{agency.tagline}</p>
                  </div>
                )}
                {agency.description && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Description</p>
                    <p className="text-sm">{agency.description}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  {agency.employeeCount && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        Employees
                      </p>
                      <p className="text-sm">{agency.employeeCount}</p>
                    </div>
                  )}
                  {(agency.city || agency.state || agency.country) && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        Location
                      </p>
                      <p className="text-sm">
                        {[agency.city, agency.state, agency.country].filter(Boolean).join(", ")}
                      </p>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-3">
                  {agency.contactEmail && (
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <a href={`mailto:${agency.contactEmail}`} className="hover:underline">
                        {agency.contactEmail}
                      </a>
                    </div>
                  )}
                  {agency.phoneNumber && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <a href={`tel:${agency.phoneNumber}`} className="hover:underline">
                        {agency.phoneNumber}
                      </a>
                    </div>
                  )}
                  {agency.linkedinUrl && (
                    <div className="flex items-center gap-2 text-sm">
                      <Linkedin className="h-4 w-4 text-muted-foreground" />
                      <a
                        href={agency.linkedinUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:underline flex items-center gap-1"
                      >
                        LinkedIn Profile
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  )}
                </div>

                {agency.servicesMerged && agency.servicesMerged.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">Services</p>
                    <div className="flex flex-wrap gap-1">
                      {agency.servicesMerged.slice(0, 10).map((service, idx) => (
                        <Badge key={idx} variant="secondary">
                          {service}
                        </Badge>
                      ))}
                      {agency.servicesMerged.length > 10 && (
                        <Badge variant="secondary">+{agency.servicesMerged.length - 10} more</Badge>
                      )}
                    </div>
                  </div>
                )}

                {agency.industriesMerged && agency.industriesMerged.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">Industries</p>
                    <div className="flex flex-wrap gap-1">
                      {agency.industriesMerged.slice(0, 10).map((industry, idx) => (
                        <Badge key={idx} variant="outline">
                          {industry}
                        </Badge>
                      ))}
                      {agency.industriesMerged.length > 10 && (
                        <Badge variant="outline">+{agency.industriesMerged.length - 10} more</Badge>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Notes Section */}
            <Card>
              <CardHeader>
                <CardTitle>CRM Notes</CardTitle>
                <CardDescription>
                  Add notes about this agency. Changes are saved automatically.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={notes}
                  onChange={handleNotesChange}
                  onBlur={handleNotesBlur}
                  placeholder="Add notes about this agency, contact history, or other important information..."
                  className="min-h-[120px]"
                />
                <div className="flex items-center justify-between mt-2">
                  {isSaving && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Save className="h-4 w-4 animate-pulse" />
                      Saving...
                    </div>
                  )}
                  {hasUnsavedChanges && !isSaving && (
                    <div className="text-sm text-amber-600">
                      Unsaved changes
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Source-Specific Data */}
            {availableSources.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Source Data</CardTitle>
                  <CardDescription>
                    Data from {availableSources.length} source
                    {availableSources.length > 1 ? "s" : ""}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue={availableSources[0]} className="w-full">
                    <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${availableSources.length}, 1fr)` }}>
                      {availableSources.map((source) => (
                        <TabsTrigger key={source} value={source}>
                          {sourceConfig[source as keyof typeof sourceConfig]?.label || source}
                        </TabsTrigger>
                      ))}
                    </TabsList>

                    {availableSources.includes("agencyspotter") && agency.agencyspotterData && (
                      <TabsContent value="agencyspotter" className="space-y-4">
                        <SourceDataDisplay
                          data={agency.agencyspotterData}
                          sourceConfig={sourceConfig.agencyspotter}
                        />
                      </TabsContent>
                    )}

                    {availableSources.includes("goodfirms") && agency.goodfirmsData && (
                      <TabsContent value="goodfirms" className="space-y-4">
                        <SourceDataDisplay
                          data={agency.goodfirmsData}
                          sourceConfig={sourceConfig.goodfirms}
                        />
                      </TabsContent>
                    )}

                    {availableSources.includes("themanifest") && agency.themanifestData && (
                      <TabsContent value="themanifest" className="space-y-4">
                        <SourceDataDisplay
                          data={agency.themanifestData}
                          sourceConfig={sourceConfig.themanifest}
                        />
                      </TabsContent>
                    )}
                  </Tabs>
                </CardContent>
              </Card>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}

function SourceDataDisplay({ data, sourceConfig }: { data: any; sourceConfig: any }) {
  if (!data || typeof data !== "object") {
    return <p className="text-sm text-muted-foreground">No data available</p>
  }

  return (
    <div className={`rounded-lg p-4 ${sourceConfig.bgColor}`}>
      <dl className="space-y-3">
        {Object.entries(data).map(([key, value]) => {
          if (value === null || value === undefined || value === "") return null

          return (
            <div key={key} className="grid grid-cols-3 gap-2">
              <dt className="text-sm font-medium text-muted-foreground capitalize">
                {key.replace(/_/g, " ")}
              </dt>
              <dd className="text-sm col-span-2">
                {Array.isArray(value) ? (
                  <div className="flex flex-wrap gap-1">
                    {value.map((item, idx) => (
                      <Badge key={idx} variant="secondary" className="text-xs">
                        {typeof item === "object" ? JSON.stringify(item) : String(item)}
                      </Badge>
                    ))}
                  </div>
                ) : typeof value === "object" ? (
                  <pre className="text-xs bg-white/50 p-2 rounded overflow-auto max-h-32">
                    {JSON.stringify(value, null, 2)}
                  </pre>
                ) : (
                  String(value)
                )}
              </dd>
            </div>
          )
        })}
      </dl>
    </div>
  )
}
