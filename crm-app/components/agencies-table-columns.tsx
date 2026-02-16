"use client"

import * as React from "react"
import { ColumnDef } from "@tanstack/react-table"
import {
  ExternalLink,
  Mail,
  Phone,
  MapPin,
  Users,
  Linkedin,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { CONTACT_STATUSES } from "@/lib/constants"
import {
  formatPhoneNumber,
  getCountryCode,
  getFaviconUrl,
  formatEmail,
} from "@/lib/format-utils"

export type Agency = {
  id: number
  name: string
  websiteUrl: string | null
  linkedinUrl: string | null
  contactEmail: string | null
  phoneNumber: string | null
  city: string | null
  state: string | null
  country: string | null
  employeeCount: string | null
  avgRating: number | null
  totalReviews: number | null
  contactStatus: string
  sources: string[]
  sourceCount: number
  tags: string[]
  lastContactDate: Date | null
  agencyspotterUrl: string | null
  goodfirmsUrl: string | null
  themanifestUrl: string | null
}

const contactStatusColors: Record<string, string> = {
  not_contacted: "bg-gray-100 text-gray-800",
  contacted: "bg-blue-100 text-blue-800",
  in_progress: "bg-yellow-100 text-yellow-800",
  qualified: "bg-green-100 text-green-800",
  converted: "bg-purple-100 text-purple-800",
  not_interested: "bg-red-100 text-red-800",
}

const sourceConfig: Record<string, { name: string; color: string; url: string }> = {
  agencyspotter: {
    name: "AgencySpotter",
    color: "bg-blue-50 text-blue-700 border border-blue-200",
    url: "https://www.agencyspotter.com"
  },
  goodfirms: {
    name: "GoodFirms",
    color: "bg-emerald-50 text-emerald-700 border border-emerald-200",
    url: "https://www.goodfirms.com"
  },
  themanifest: {
    name: "The Manifest",
    color: "bg-purple-50 text-purple-700 border border-purple-200",
    url: "https://themanifest.com"
  }
}

// Helper component for sortable headers
function SortableHeader({ column, children }: { column: any; children: React.ReactNode }) {
  return (
    <Button
      variant="ghost"
      onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      className="h-auto p-0 hover:bg-transparent font-semibold"
    >
      {children}
      {column.getIsSorted() === "asc" ? (
        <ArrowUp className="ml-2 h-4 w-4" />
      ) : column.getIsSorted() === "desc" ? (
        <ArrowDown className="ml-2 h-4 w-4" />
      ) : (
        <ArrowUpDown className="ml-2 h-4 w-4 opacity-50" />
      )}
    </Button>
  )
}

export const createColumns = (
  onStatusChange: (agencyId: number, newStatus: string) => Promise<void>,
  onAgencyClick: (agencyId: number) => Promise<void>
): ColumnDef<Agency>[] => [
  {
    accessorKey: "name",
    header: ({ column }) => <SortableHeader column={column}>Agency Name</SortableHeader>,
    cell: ({ row }) => (
      <div className="font-semibold text-base text-foreground min-w-[200px]">
        {row.getValue("name")}
      </div>
    ),
    enableSorting: true,
    enableHiding: false,
  },
  {
    accessorKey: "websiteUrl",
    header: "Website",
    cell: ({ row }) => {
      const websiteUrl = row.getValue("websiteUrl") as string | null
      return websiteUrl ? (
        <a
          href={websiteUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-sm text-primary hover:underline hover:text-primary/80 transition-colors group min-w-[150px]"
          onClick={(e) => e.stopPropagation()}
        >
          <img
            src={getFaviconUrl(websiteUrl)}
            alt=""
            className="w-4 h-4 rounded flex-shrink-0"
            onError={(e) => {
              e.currentTarget.style.display = "none"
            }}
          />
          <span className="truncate max-w-[150px]">
            {new URL(websiteUrl).hostname.replace("www.", "")}
          </span>
          <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
        </a>
      ) : (
        <span className="text-muted-foreground text-sm">-</span>
      )
    },
    enableSorting: false,
  },
  {
    accessorKey: "linkedinUrl",
    header: "LinkedIn",
    cell: ({ row }) => {
      const linkedinUrl = row.getValue("linkedinUrl") as string | null
      return linkedinUrl ? (
        <a
          href={linkedinUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors group min-w-[120px]"
          onClick={(e) => e.stopPropagation()}
        >
          <Linkedin className="h-4 w-4 text-[#0A66C2] flex-shrink-0" />
          <span className="text-xs text-muted-foreground group-hover:text-primary transition-colors">
            View Profile
          </span>
          <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
        </a>
      ) : (
        <span className="text-muted-foreground text-sm">-</span>
      )
    },
    enableSorting: false,
  },
  {
    accessorKey: "contactEmail",
    header: "Email",
    cell: ({ row }) => {
      const email = row.getValue("contactEmail") as string | null
      return email ? (
        <a
          href={`mailto:${email}`}
          className="flex items-center gap-2 text-sm text-foreground hover:text-primary transition-colors min-w-[180px]"
          onClick={(e) => e.stopPropagation()}
        >
          <Mail className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
          <span className="truncate max-w-[170px]" title={email}>
            {formatEmail(email, 25)}
          </span>
        </a>
      ) : (
        <span className="text-muted-foreground text-sm">-</span>
      )
    },
    enableSorting: false,
  },
  {
    accessorKey: "phoneNumber",
    header: "Phone",
    cell: ({ row }) => {
      const phone = row.getValue("phoneNumber") as string | null
      return phone ? (
        <a
          href={`tel:${phone}`}
          className="flex items-center gap-2 text-sm text-foreground hover:text-primary transition-colors min-w-[130px]"
          onClick={(e) => e.stopPropagation()}
        >
          <Phone className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
          <span className="font-mono text-xs">
            {formatPhoneNumber(phone)}
          </span>
        </a>
      ) : (
        <span className="text-muted-foreground text-sm">-</span>
      )
    },
    enableSorting: false,
  },
  {
    accessorKey: "city",
    header: ({ column }) => <SortableHeader column={column}>City</SortableHeader>,
    cell: ({ row }) => {
      const city = row.getValue("city") as string | null
      return city ? (
        <div className="flex items-center gap-1.5 text-sm min-w-[120px]">
          <MapPin className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
          <span className="truncate" title={city}>
            {city}
          </span>
        </div>
      ) : (
        <span className="text-muted-foreground text-sm">-</span>
      )
    },
    enableSorting: true,
  },
  {
    accessorKey: "state",
    header: ({ column }) => <SortableHeader column={column}>State</SortableHeader>,
    cell: ({ row }) => {
      const state = row.getValue("state") as string | null
      return state ? (
        <span className="text-sm truncate min-w-[120px]" title={state}>
          {state}
        </span>
      ) : (
        <span className="text-muted-foreground text-sm">-</span>
      )
    },
    enableSorting: true,
  },
  {
    accessorKey: "country",
    header: ({ column }) => <SortableHeader column={column}>Country</SortableHeader>,
    cell: ({ row }) => {
      const country = row.getValue("country") as string | null
      const code = getCountryCode(country)
      return country ? (
        <div className="flex items-center gap-2 text-sm min-w-[140px]">
          {code ? (
            <span className={`fi fi-${code} flex-shrink-0`} title={country} />
          ) : null}
          <span className="truncate" title={country}>
            {country}
          </span>
        </div>
      ) : (
        <span className="text-muted-foreground text-sm">-</span>
      )
    },
    enableSorting: true,
  },
  {
    accessorKey: "employeeCount",
    header: ({ column }) => <SortableHeader column={column}>Employees</SortableHeader>,
    cell: ({ row }) => {
      const count = row.getValue("employeeCount") as string | null
      return (
        <div className="min-w-[90px]">
          {count ? (
            <div className="flex items-center gap-1.5 text-sm">
              <Users className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="font-medium">{count}</span>
            </div>
          ) : (
            <span className="text-muted-foreground text-sm">-</span>
          )}
        </div>
      )
    },
    enableSorting: true,
  },
  {
    accessorKey: "contactStatus",
    header: "Status",
    cell: ({ row }) => {
      const status = row.getValue("contactStatus") as string
      const agencyId = row.original.id

      return (
        <div className="min-w-[130px]" onClick={(e) => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Badge
                variant="outline"
                className={`cursor-pointer hover:opacity-80 transition-opacity ${contactStatusColors[status] || ""}`}
              >
                {CONTACT_STATUSES.find((s) => s.value === status)?.label || status}
              </Badge>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" onClick={(e) => e.stopPropagation()}>
              {CONTACT_STATUSES.map((s) => (
                <DropdownMenuItem
                  key={s.value}
                  onClick={() => onStatusChange(agencyId, s.value)}
                  className={status === s.value ? "bg-muted" : ""}
                >
                  {s.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )
    },
    enableSorting: true,
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id))
    },
  },
  {
    accessorKey: "sources",
    header: "Sources",
    cell: ({ row }) => {
      const sources = row.getValue("sources") as string[]
      const agency = row.original

      // Map source names to their profile URLs
      const getSourceUrl = (source: string): string | null => {
        const sourceLower = source.toLowerCase()
        if (sourceLower === "agencyspotter") return agency.agencyspotterUrl
        if (sourceLower === "goodfirms") return agency.goodfirmsUrl
        if (sourceLower === "themanifest") return agency.themanifestUrl
        return null
      }

      return (
        <div
          className="flex gap-1.5 flex-wrap items-center min-w-[150px]"
          onClick={(e) => e.stopPropagation()}
        >
          {sources.map((source, index) => {
            const config = sourceConfig[source.toLowerCase()] || {
              name: source,
              color: "bg-gray-50 text-gray-700 border border-gray-200",
              url: ""
            }
            const profileUrl = getSourceUrl(source)

            const badgeContent = (
              <>
                {config.url && (
                  <img
                    src={getFaviconUrl(config.url)}
                    alt={config.name}
                    className="w-4 h-4 rounded flex-shrink-0"
                    onError={(e) => {
                      e.currentTarget.style.display = "none"
                    }}
                  />
                )}
                <span className="font-semibold whitespace-nowrap">{config.name}</span>
              </>
            )

            return profileUrl ? (
              <a
                key={`${source}-${index}`}
                href={profileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={`inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium ${config.color} shadow-sm hover:shadow-md transition-all cursor-pointer hover:scale-105`}
                title={`View profile on ${config.name}`}
              >
                {badgeContent}
              </a>
            ) : (
              <div
                key={`${source}-${index}`}
                className={`inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium ${config.color} shadow-sm`}
                title={`Source: ${config.name}`}
              >
                {badgeContent}
              </div>
            )
          })}
        </div>
      )
    },
    enableSorting: false,
    filterFn: (row, id, value) => {
      const sources = row.getValue(id) as string[]
      return value.some((v: string) => sources.includes(v))
    },
  },
]
