"use client"

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import {
  ExternalLink,
  Mail,
  Phone,
  MapPin,
  Users,
  Star,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { CONTACT_STATUSES } from "@/lib/constants"

type Agency = {
  id: number
  name: string
  websiteUrl: string | null
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
}

type AgenciesTableProps = {
  agencies: Agency[]
  pagination: {
    page: number
    pageSize: number
    totalCount: number
    totalPages: number
  }
  filterValues: {
    states: string[]
    countries: string[]
    sources: string[]
  }
}

const contactStatusColors: Record<string, string> = {
  not_contacted: "bg-gray-100 text-gray-800",
  contacted: "bg-blue-100 text-blue-800",
  in_progress: "bg-yellow-100 text-yellow-800",
  qualified: "bg-green-100 text-green-800",
  converted: "bg-purple-100 text-purple-800",
  not_interested: "bg-red-100 text-red-800",
}

export function AgenciesTable({ agencies, pagination, filterValues }: AgenciesTableProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [searchTerm, setSearchTerm] = React.useState(searchParams.get("search") || "")

  const updateFilters = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value && value !== "all") {
      params.set(key, value)
      params.set("page", "1") // Reset to first page
    } else {
      params.delete(key)
    }
    router.push(`/agencies?${params.toString()}`)
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    updateFilters("search", searchTerm)
  }

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set("page", newPage.toString())
    router.push(`/agencies?${params.toString()}`)
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>
            Filter agencies by various criteria. Showing {pagination.totalCount} agencies.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <form onSubmit={handleSearch} className="col-span-1 md:col-span-4 lg:col-span-2">
              <div className="flex gap-2">
                <Input
                  placeholder="Search by name or website..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <Button type="submit">Search</Button>
              </div>
            </form>

            <Select
              value={searchParams.get("contactStatus") || "all"}
              onValueChange={(value) => updateFilters("contactStatus", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Contact Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {CONTACT_STATUSES.map((status) => (
                  <SelectItem key={status.value} value={status.value}>
                    {status.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={searchParams.get("state") || "all"}
              onValueChange={(value) => updateFilters("state", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="State" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All States</SelectItem>
                {filterValues.states.map((state) => (
                  <SelectItem key={state} value={state}>
                    {state}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={searchParams.get("country") || "all"}
              onValueChange={(value) => updateFilters("country", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Country" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Countries</SelectItem>
                {filterValues.countries.map((country) => (
                  <SelectItem key={country} value={country}>
                    {country}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={searchParams.get("source") || "all"}
              onValueChange={(value) => updateFilters("source", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Source" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sources</SelectItem>
                {filterValues.sources.map((source) => (
                  <SelectItem key={source} value={source}>
                    {source}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Agency Name</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Employees</TableHead>
                  <TableHead>Rating</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Sources</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {agencies.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No agencies found. Try adjusting your filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  agencies.map((agency) => (
                    <TableRow
                      key={agency.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => router.push(`/agencies/${agency.id}`)}
                    >
                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-medium">{agency.name}</div>
                          {agency.websiteUrl && (
                            <a
                              href={agency.websiteUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <ExternalLink className="h-3 w-3" />
                              {new URL(agency.websiteUrl).hostname}
                            </a>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1 text-sm">
                          {agency.contactEmail && (
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <Mail className="h-3 w-3" />
                              <span className="truncate max-w-[200px]">{agency.contactEmail}</span>
                            </div>
                          )}
                          {agency.phoneNumber && (
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <Phone className="h-3 w-3" />
                              <span>{agency.phoneNumber}</span>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {agency.city || agency.state || agency.country ? (
                          <div className="flex items-center gap-1 text-sm">
                            <MapPin className="h-3 w-3 text-muted-foreground" />
                            <span>
                              {[agency.city, agency.state, agency.country]
                                .filter(Boolean)
                                .join(", ")}
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {agency.employeeCount ? (
                          <div className="flex items-center gap-1 text-sm">
                            <Users className="h-3 w-3 text-muted-foreground" />
                            <span>{agency.employeeCount}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {agency.avgRating ? (
                          <div className="flex items-center gap-1 text-sm">
                            <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                            <span>
                              {Number(agency.avgRating).toFixed(1)}
                              {agency.totalReviews && (
                                <span className="text-muted-foreground ml-1">
                                  ({agency.totalReviews})
                                </span>
                              )}
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={contactStatusColors[agency.contactStatus] || ""}
                        >
                          {CONTACT_STATUSES.find((s) => s.value === agency.contactStatus)?.label ||
                            agency.contactStatus}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 flex-wrap">
                          {agency.sources.slice(0, 2).map((source, index) => (
                            <Badge key={`${source}-${index}`} variant="secondary" className="text-xs">
                              {source}
                            </Badge>
                          ))}
                          {agency.sources.length > 2 && (
                            <Badge variant="secondary" className="text-xs">
                              +{agency.sources.length - 2}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Page {pagination.page} of {pagination.totalPages} (
            {pagination.totalCount} total agencies)
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={pagination.page <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
