import Link from "next/link"
import { Building2, Users, BarChart3, FileText, ArrowRight } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

const features = [
  {
    title: "Agencies",
    description: "Browse and manage agency data from multiple sources",
    icon: Building2,
    href: "/agencies",
    color: "text-blue-600",
  },
  {
    title: "Contacts",
    description: "Track contact status and communication history",
    icon: Users,
    href: "/contacts",
    color: "text-green-600",
  },
  {
    title: "Reports",
    description: "Analyze data and generate insights",
    icon: BarChart3,
    href: "/reports",
    color: "text-purple-600",
  },
  {
    title: "Documents",
    description: "Store and organize important documents",
    icon: FileText,
    href: "/documents",
    color: "text-orange-600",
  },
]

export default function Home() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Welcome to Agency CRM</h1>
        <p className="text-muted-foreground mt-2">
          Multi-source agency data management system
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {features.map((feature) => (
          <Card key={feature.title} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-center gap-3">
                <feature.icon className={`h-8 w-8 ${feature.color}`} />
                <CardTitle className="text-xl">{feature.title}</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription className="mb-4">{feature.description}</CardDescription>
              <Button asChild variant="ghost" className="w-full">
                <Link href={feature.href}>
                  View {feature.title}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quick Stats</CardTitle>
          <CardDescription>Overview of your CRM data</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">
            Click on &quot;Agencies&quot; to start browsing your multi-source agency database with advanced
            filtering and pagination.
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
