# Board Meeting - Replit Agent Guide

## Overview

Board Meeting is a social mobile-first web application for surfers to connect with each other, check surf conditions, and plan trips together. The app features a Tinder-style buddy matching system, surf report viewing, trip planning, and a social feed. Built as a full-stack TypeScript application with React frontend and Express backend, using PostgreSQL for data persistence.

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Updates (February 2026)
- Surf Alerts (Premium): Users can create alerts per spot with minimum wave height and swell direction filters, toggle on/off, and auto-block calendar when conditions match
- Auto Calendar Block (Premium): When enabled on a surf alert, user's availability calendar auto-blocks when forecast meets their criteria
- Surf Alerts & Auto Calendar advertised on surf report page with premium upsell for free users ($5/mo pricing)
- AI-powered surf guide and photographer finder: uses OpenAI to generate location-specific recommendations with search/social links
- Trip checklist: Mexico-specific links (immigration docs, FMM permit, CBX Cross Border, Volaris, VivaAerobus, Aeromexico) auto-show for Mexico trips
- Trip checklist: Social media (Instagram, Facebook) and surf forum (Reddit, Surfline) search links for guides and photographers
- Trip Itinerary Checklist: 8 categories (flights, car rental, house/hostel, chef, surfboards, photographer, guide, other) with booking links, inline details (date, time, reference number), only visible to trip participants
- New user onboarding: first login redirects to Profile, any edit marks as registered, subsequent logins go to Home
- Premium features now clearly labeled with $5/mo pricing everywhere they appear
- Buddy swipe limit reduced from 10 to 5 per day for free users (unlimited for premium)
- Added gender and age filters to buddy swipes (premium-only feature)
- Trip broadcasting prominently labeled as premium-required in create trip dialog and trip itinerary
- Surf forecast: 2 days free, 7 days for premium (was 14 days), upgrade prompts show $5/mo pricing
- Added Swell Model as 3rd tab in surf report page (Surf Report / Wind / Swell) using Windy swell1 overlay
- Surf report location preferences now persist to user profile in database (savedSurfSpots field)
- Marketplace photo upload bug fixed (corrected upload endpoint and object path tracking)

## Updates (January 2026)
- Integrated Spitcast API for accurate California surf forecasts (matches Surfline data)
- Massively expanded surf spot database from ~382 to 600+ worldwide locations
- Added 40+ Hawaii spots across all islands (North Shore, South Shore, Maui, Kauai, Big Island)
- Added 50+ East Coast USA spots (New Jersey, New York, North Carolina, South Carolina, Florida, Massachusetts, Rhode Island, Virginia, Maryland)
- Added extensive international coverage: Europe (30+ spots), Indonesia (30+ spots), Australia (25+ spots), plus more in Asia, Africa, Oceania, and Caribbean
- Verified Southern California already had comprehensive coverage matching Surfline.com
- Texas Gulf, Pacific Northwest, and global surf destinations now fully represented

### Surf Data Sources (Priority Order)
1. **Spitcast** (California only) - Most accurate for CA spots, free API
2. **Stormglass** (worldwide) - Professional surf/marine data, requires API key
3. **Open-Meteo** (fallback) - General marine data for spots not in other sources

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

### New User Flow
- **Auto-profile creation**: When users sign in, a profile is auto-created with their full name (firstName + lastName) and profile picture from Replit
- **No separate onboarding**: New users go directly to /profile with `isIncompleteProfile: true`
- **Visual field highlighting**: Missing required fields (Name, Photo, About) are highlighted with dashed borders and primary color
- **Welcome banner**: New users see a "Welcome to Board Meeting!" banner showing which fields they need to complete
- **Auto-save**: All profile fields save automatically with 1-second debounce - no need to click Save buttons
- **Inline editing**: Users can tap on their name, location, or skill level to edit them directly on the profile page
- **Search visibility**: Incomplete profiles ARE visible in searches (no filtering out new users)
- **Search fields**: displayName, firstName, lastName, email, and full name combinations

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
- `stripe`: Stripe payment processing
- `stripe-replit-sync`: Webhook management and Stripe data sync

### Stripe Integration
- **Provider**: Stripe via Replit Connector integration
- **Library**: stripe-replit-sync for automatic webhook management
- **Subscription Model**: $5/month premium subscription
- **Key Files**:
  - `server/stripeClient.ts` - Stripe client and StripeSync setup
  - `server/stripeService.ts` - Checkout and portal session creation
  - `server/webhookHandlers.ts` - Webhook processing and premium status sync
  - `server/index.ts` - Stripe initialization (runs before routes)
- **API Endpoints**:
  - `POST /api/checkout/premium` - Creates Stripe checkout session
  - `POST /api/stripe/portal` - Creates customer portal session
  - `POST /api/stripe/webhook` - Receives Stripe webhooks (registered BEFORE express.json)
- **Database Fields** (profiles table):
  - `stripeCustomerId` - Stripe customer ID
  - `stripeSubscriptionId` - Active subscription ID
  - `isPremium` - Premium status (updated via webhooks)
- **Required Config**:
  - `STRIPE_PREMIUM_PRICE_ID` - Price ID for the $5/month subscription (live: price_1Spi6gEGnhrnnleQBcfxR4km)
  - Stripe connector configured via Replit integration (supports both env vars and connector)

### iOS App Store (Capacitor)
- **Framework**: Capacitor for wrapping web app as native iOS
- **App ID**: `app.boardmeeting.mobile`
- **Key Files**:
  - `capacitor.config.ts` - Capacitor configuration
  - `ios/` - Native iOS project folder (open in Xcode)
- **Build Commands** (run from shell):
  - `npm run build && npx cap sync ios` - Build web app and sync to iOS
  - `npx cap open ios` - Open project in Xcode (requires Mac)
- **App Store Submission Steps**:
  1. Get an Apple Developer account ($99/year at developer.apple.com)
  2. Download this project to a Mac with Xcode installed
  3. Run `npm install` and `npm run build && npx cap sync ios`
  4. Open `ios/App/App.xcworkspace` in Xcode
  5. Configure signing with your Apple Developer account
  6. Generate app icons using the logo (attached_assets/IMG_3950_1769110363136.jpeg)
  7. Archive and upload to App Store Connect
  8. Complete App Store listing (screenshots, description, etc.)
  9. Submit for Apple review (typically 1-2 days)