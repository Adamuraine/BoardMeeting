# Surf Buddy - Replit Agent Guide

## Overview

Surf Buddy is a social mobile-first web application for surfers to connect with each other, check surf conditions, and plan trips together. The app features a Tinder-style buddy matching system, surf report viewing, trip planning, and a social feed. Built as a full-stack TypeScript application with React frontend and Express backend, using PostgreSQL for data persistence.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript, using Vite as the build tool
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack React Query for server state management and caching
- **Styling**: Tailwind CSS with shadcn/ui component library (New York style)
- **Animations**: Framer Motion for swipe animations and transitions
- **Form Handling**: React Hook Form with Zod validation via @hookform/resolvers

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript (ESM modules)
- **API Design**: RESTful endpoints defined in `shared/routes.ts` with Zod schemas for type-safe validation
- **Build**: Custom build script using esbuild for server bundling and Vite for client

### Data Storage
- **Database**: PostgreSQL with Drizzle ORM
- **Schema Location**: `shared/schema.ts` contains all database table definitions
- **Migrations**: Drizzle Kit for schema migrations (`drizzle-kit push`)
- **Session Storage**: PostgreSQL-backed sessions via connect-pg-simple

### Authentication
- **Provider**: Replit Auth using OpenID Connect
- **Session Management**: Express sessions stored in PostgreSQL `sessions` table
- **User Storage**: Users table in `shared/models/auth.ts` is mandatory for Replit Auth
- **Protected Routes**: `isAuthenticated` middleware guards API endpoints

### Project Structure
```
client/           # React frontend
  src/
    components/   # UI components (shadcn/ui based)
    pages/        # Route pages
    hooks/        # Custom React hooks for data fetching
    lib/          # Utilities (queryClient, auth helpers)
server/           # Express backend
  routes.ts       # API route definitions
  storage.ts      # Database access layer
  db.ts           # Database connection
  replit_integrations/auth/  # Replit Auth setup
shared/           # Shared code between client/server
  schema.ts       # Drizzle database schemas
  routes.ts       # API route definitions with Zod schemas
  models/auth.ts  # Auth-related models (users, sessions)
```

### Key Design Patterns
- **Shared Type Safety**: Zod schemas in `shared/routes.ts` provide runtime validation and TypeScript types used by both client and server
- **Storage Interface**: `IStorage` interface in `server/storage.ts` abstracts database operations
- **Query Hooks**: Each data domain has dedicated hooks in `client/src/hooks/` that wrap React Query

## External Dependencies

### Database
- **PostgreSQL**: Primary database, connection via `DATABASE_URL` environment variable
- **Drizzle ORM**: Type-safe database queries and schema management

### Authentication
- **Replit Auth**: OAuth/OIDC provider for user authentication
- Required environment variables: `ISSUER_URL`, `REPL_ID`, `SESSION_SECRET`, `DATABASE_URL`

### UI Framework
- **shadcn/ui**: Pre-built accessible components based on Radix UI primitives
- **Radix UI**: Underlying headless component library
- **Tailwind CSS**: Utility-first CSS framework

### Development Tools
- **Vite**: Frontend dev server with HMR
- **Replit Plugins**: `@replit/vite-plugin-runtime-error-modal`, `@replit/vite-plugin-cartographer` for enhanced development experience

### Key NPM Packages
- `@tanstack/react-query`: Server state management
- `framer-motion`: Animation library
- `date-fns`: Date formatting
- `lucide-react`: Icon library
- `wouter`: Lightweight router
- `zod`: Schema validation