# Agency CRM - Multi-Source Data Management

A modern CRM application built with Next.js for managing agency data from multiple sources (AgencySpotter, GoodFirms, TheManifest).

## Features

- 📊 **Agencies Table** with advanced filtering and pagination
- 🔍 **Multi-criteria Filters**: Search, contact status, location, employee count, rating, sources
- 📱 **Expandable Details**: Click any row to view comprehensive agency information
- 🏷️ **Source-Specific Data**: Tabbed view for data from each source
- 🎯 **Contact Status Workflow**: Quick status updates with dropdown
- 📝 **CRM Notes**: Auto-saving notes field for each agency
- 🎨 **Modern UI**: Built with shadcn/ui and Tailwind CSS
- 🔄 **Real-time Updates**: Instant feedback with toast notifications

## Tech Stack

- **Framework**: Next.js 16 with App Router
- **Database**: PostgreSQL with Prisma ORM
- **UI**: shadcn/ui components + Tailwind CSS v4
- **Icons**: Lucide React
- **Notifications**: Sonner

## Getting Started

### Prerequisites
- Node.js 20.x or higher
- PostgreSQL database
- npm or pnpm

### Installation

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables (create `.env` file):
```env
DATABASE_URL="postgresql://user:password@localhost:5432/agency_crm?schema=public"
```

3. Generate Prisma client:
```bash
npx prisma generate
```

4. Start development server:
```bash
npm run dev
```

Visit http://localhost:3000

## Deployment

See [../DEPLOYMENT.md](../DEPLOYMENT.md) for detailed deployment instructions to Cloudflare Pages or Vercel.

### Quick Deploy to Vercel
1. Import from GitHub
2. Set `crm-app` as root directory
3. Add `DATABASE_URL` environment variable
4. Deploy!

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production (includes Prisma generation)
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## Project Structure

```
crm-app/
├── app/
│   ├── actions/          # Server actions
│   ├── agencies/         # Agencies page
│   ├── layout.tsx        # Root layout with sidebar
│   └── page.tsx          # Home page
├── components/
│   ├── ui/               # shadcn/ui components
│   ├── agencies-table.tsx
│   ├── agency-details-dialog.tsx
│   └── app-sidebar.tsx
└── lib/
    ├── prisma.ts
    ├── utils.ts
    └── constants.ts
```

## License

Private project
