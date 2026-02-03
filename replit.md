# IndieWave

## Overview

IndieWave is a Spotify-inspired music platform for indie artists to upload tracks, share releases, and help listeners discover new music. The application provides artist profiles, track uploads, and a discovery-focused home page with genre browsing and trending content.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript using Vite as the build tool
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack React Query for server state management
- **Styling**: Tailwind CSS with shadcn/ui component library (New York style)
- **UI Components**: Comprehensive Radix UI primitives with custom styling
- **Animations**: Framer Motion for page transitions and micro-interactions

### Backend Architecture
- **Runtime**: Node.js with Express 5
- **Language**: TypeScript with ES modules
- **API Design**: RESTful JSON API endpoints under `/api/*`
- **Development**: Vite dev server with HMR proxied through Express

### Data Storage
- **Primary Database**: PostgreSQL with Drizzle ORM
- **Schema Location**: `shared/schema.ts` contains Zod schemas for validation
- **Fallback Storage**: JSON file-based storage in `db-data/` directory for development
- **Database Migrations**: Managed via Drizzle Kit with `drizzle.config.ts`

### Authentication
- **Current Implementation**: Client-side authentication context with localStorage persistence
- **User Session**: Simple username/password lookup against stored users
- **Session Storage**: Connect-pg-simple available for production session management

### Project Structure
```
client/           # React frontend application
  src/
    components/   # UI components (shadcn/ui library)
    contexts/     # React contexts (auth-context)
    hooks/        # Custom React hooks
    pages/        # Route page components
    lib/          # Utilities and query client
server/           # Express backend
  index.ts        # Server entry point
  routes.ts       # API route handlers
  storage.ts      # JSON file database implementation
  static.ts       # Static file serving
  vite.ts         # Vite dev middleware
shared/           # Shared code between client/server
  schema.ts       # Zod schemas and TypeScript types
db-data/          # JSON file storage for development
```

### Build System
- **Development**: `tsx` for running TypeScript directly, Vite for frontend hot reloading
- **Production**: esbuild bundles server code, Vite builds client assets
- **Output**: Combined distribution in `dist/` with server code and static public assets

## External Dependencies

### Database
- **PostgreSQL**: Primary database via `DATABASE_URL` environment variable
- **Drizzle ORM**: Database toolkit with Zod integration for type-safe queries
- **Migrations**: Drizzle Kit manages schema migrations in `migrations/` directory

### Frontend Libraries
- **TanStack Query**: Data fetching and caching
- **Radix UI**: Accessible component primitives
- **Framer Motion**: Animation library
- **React Day Picker**: Calendar component
- **Embla Carousel**: Carousel functionality

### Backend Libraries
- **Express 5**: Web framework
- **Multer**: File upload handling (for track/cover uploads)
- **UUID/Nanoid**: ID generation
- **Zod**: Runtime validation

### Development Tools
- **Replit Plugins**: Runtime error overlay, cartographer, dev banner
- **Meta Images Plugin**: Custom Vite plugin for OpenGraph image handling