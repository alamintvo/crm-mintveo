"use client"

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ChevronLeft, ChevronRight } from "lucide-react"

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
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { DataTable } from "@/components/ui/data-table"
import { createColumns, type Agency } from "@/components/agencies-table-columns"
import { CONTACT_STATUSES } from "@/lib/constants"
import { AgencyDetailsDialog } from "@/components/agency-details-dialog"
import { getAgencyById, updateContactStatus } from "@/app/actions/agencies"

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

export function AgenciesTable({ agencies, pagination, filterValues }: AgenciesTableProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [searchTerm, setSearchTerm] = React.useState(searchParams.get("search") || "")
  const [selectedAgency, setSelectedAgency] = React.useState<any | null>(null)
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [isLoading, setIsLoading] = React.useState(false)

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

  const handleAgencyClick = async (agencyId: number) => {
    setIsLoading(true)
    const result = await getAgencyById(agencyId)
    setIsLoading(false)

    if (result.success && result.data) {
      setSelectedAgency(result.data)
      setDialogOpen(true)
    } else {
      console.error("Failed to load agency details")
    }
  }

  const handleStatusChange = async (agencyId: number, newStatus: string) => {
    const result = await updateContactStatus(agencyId, newStatus)
    if (result.success) {
      router.refresh()
    }
  }

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set("page", newPage.toString())
    router.push(`/agencies?${params.toString()}`)
  }

  // Create columns with callbacks
  const columns = React.useMemo(
    () => createColumns(handleStatusChange, handleAgencyClick),
    [router]
  )

  // Track visible row count for pagination display
  const [visibleRowCount, setVisibleRowCount] = React.useState(agencies.length)

  return (
    <div className="space-y-6">
      {/* Enhanced Filter Section */}
      <Card className="border-primary/10 shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg font-semibold">Filters</CardTitle>
              <CardDescription className="mt-1">
                Filter agencies by various criteria
              </CardDescription>
            </div>
            <Badge variant="secondary" className="text-base font-semibold px-3 py-1">
              {pagination.totalCount.toLocaleString()} agencies
            </Badge>
          </div>
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

      {/* Enhanced Data Table with Sorting */}
      <Card className="shadow-sm">
        <CardContent className="p-6">
          <DataTable
            columns={columns}
            data={agencies}
            searchKey="name"
            searchPlaceholder="Search agencies..."
            onRowClick={(agency) => handleAgencyClick(agency.id)}
            onVisibleRowsChange={setVisibleRowCount}
          />
        </CardContent>
      </Card>

      {/* Server-Side Pagination */}
      {pagination.totalPages > 1 && (
        <Card className="shadow-sm">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground font-medium">
                Page <span className="text-foreground font-semibold">{pagination.page}</span> of{" "}
                <span className="text-foreground font-semibold">{pagination.totalPages}</span>
                <span className="mx-2">•</span>
                Showing <span className="text-foreground font-semibold">{visibleRowCount}</span> of{" "}
                <span className="text-foreground font-semibold">{pagination.totalCount.toLocaleString()}</span> total agencies
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page <= 1}
                  className="gap-1"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page >= pagination.totalPages}
                  className="gap-1"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {selectedAgency && (
        <AgencyDetailsDialog
          agency={selectedAgency}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
        />
      )}
    </div>
  )
}
