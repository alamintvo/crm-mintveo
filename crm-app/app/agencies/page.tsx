import { Suspense } from "react"
import { getAgencies, getUniqueFilterValues, type AgencyFilters } from "@/app/actions/agencies"
import { AgenciesTable } from "@/components/agencies-table"
import { Skeleton } from "@/components/ui/skeleton"

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>

async function AgenciesContent({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams

  // Build filters from search params
  const filters: AgencyFilters = {
    search: typeof params.search === "string" ? params.search : undefined,
    contactStatus: typeof params.contactStatus === "string" ? params.contactStatus : undefined,
    city: typeof params.city === "string" ? params.city : undefined,
    state: typeof params.state === "string" ? params.state : undefined,
    country: typeof params.country === "string" ? params.country : undefined,
    minRating: params.minRating ? Number(params.minRating) : undefined,
  }

  // Handle sources array
  if (params.source) {
    filters.sources = Array.isArray(params.source) ? params.source : [params.source]
  }

  // Pagination
  const page = params.page ? Number(params.page) : 1
  const pageSize = params.pageSize ? Number(params.pageSize) : 50

  // Fetch data
  const [agenciesResult, filterValuesResult] = await Promise.all([
    getAgencies(filters, { page, pageSize }),
    getUniqueFilterValues(),
  ])

  if (!agenciesResult.success) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-destructive">Error loading agencies. Please try again.</p>
      </div>
    )
  }

  return (
    <AgenciesTable
      agencies={agenciesResult.data}
      pagination={agenciesResult.pagination}
      filterValues={{
        states: filterValuesResult.states,
        countries: filterValuesResult.countries,
        sources: filterValuesResult.sources,
      }}
    />
  )
}

function AgenciesLoading() {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    </div>
  )
}

export default async function AgenciesPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Agencies</h1>
        <p className="text-muted-foreground mt-2">
          Browse and filter agencies from multiple data sources
        </p>
      </div>

      <Suspense fallback={<AgenciesLoading />}>
        <AgenciesContent searchParams={searchParams} />
      </Suspense>
    </div>
  )
}
