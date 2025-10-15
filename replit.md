# Padel Tournament Control System

## Overview

This is a real-time **multi-tenant** tournament management system for padel (paddle tennis) competitions. The system enables superadmins to create multiple tournaments and assign administrators/scorekeepers to each. Tournament administrators can configure their tournaments with logos, categories, and sponsor banners. The system handles player registration with category selection, automatic court assignment, match tracking, and real-time displays.

Built as a full-stack web application, it provides:
- **Superadmin Panel**: Create tournaments, manage users, assign roles
- **Admin Dashboard**: Configure tournaments, manage categories/banners, register players, manage advertisements
- **Scorekeeper Dashboard**: Register players, record results, capture live scores
- **Live Score Capture**: Real-time point-by-point score tracking with automatic game/set calculation
- **Public Display**: Real-time tournament information for participants and spectators with live score updates and advertisement rotation
- **Advertisement Module**: Commercial content management with time-based scheduling, automatic rotation, and multi-format support (images/videos)

Last Updated: October 15, 2025 - Added scheduled match editing functionality for non-playing/non-completed matches with loading states for pair selection; disabled check-in buttons for playing and completed matches; implemented court reassignment for active matches and waiting list with pre-selection capability during match creation. Previously: Changed display filter for scheduled matches from 4 hours to 8 hours (480 minutes); added monthly calendar view for scheduled matches with visual grid (7x6), day indicators showing match counts via badges, responsive navigation (previous/next month, today button), Sheet drawer for day details with all matches and controls, and timezone-safe date filtering using ISO strings to prevent boundary date omissions in negative offset zones

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Technology Stack**: React with TypeScript, built using Vite as the build tool and development server.

**UI Framework**: Shadcn/ui component library based on Radix UI primitives, styled with Tailwind CSS. The design system uses a custom theme with CSS variables for colors and a "new-york" style variant.

**State Management**: TanStack Query (React Query) for server state management with aggressive caching strategies. WebSocket connections provide real-time updates that trigger automatic cache invalidation and data refetching.

**Routing**: Wouter for lightweight client-side routing with three main routes:
- `/` - Dashboard (requires authentication)
- `/display` - Public display screen (no authentication)
- `/login` - Authentication page

**Real-time Updates**: WebSocket connection established through custom `useWebSocket` hook that listens for server events (match_started, match_updated, score_updated, result_recorded, pair_registered, court_updated) and invalidates relevant query caches to trigger UI updates.

### Backend Architecture

**Runtime**: Node.js with Express.js framework using ES modules.

**Session Management**: Express-session middleware with PostgreSQL session store (connect-pg-simple) for persistent session storage. Sessions store userId and userRole for authentication/authorization. Cookie configuration includes sameSite: 'lax' and secure flag in production.

**WebSocket Server**: Standalone WebSocket server (using 'ws' library) running alongside Express for real-time bidirectional communication. Implements heartbeat mechanism for connection health monitoring.

**API Design**: RESTful API endpoints organized by resource:
- Authentication: `/api/auth/*`
- Tournaments: `/api/tournaments/*`
- Courts: `/api/courts/*`
- Players: `/api/players/*`
- Pairs: `/api/pairs/*`
- Matches: `/api/matches/*`
- Results: `/api/results/*`
- Stats: `/api/stats/*`
- Advertisements: `/api/advertisements/*` (CRUD with time-based filtering)
- Object Storage: `/api/objects/upload` (presigned URL generation), `/objects/*` (file serving)

**Data Validation**: Zod schemas for runtime type validation integrated with Drizzle ORM schema definitions through drizzle-zod.

### Data Storage

**Database**: PostgreSQL via Neon serverless driver (@neondatabase/serverless) for connection pooling and edge compatibility.

**ORM**: Drizzle ORM with TypeScript-first schema definitions in `shared/schema.ts`. Schema includes:
- Users (authentication and role-based access - supports superadmin, admin, scorekeeper, display roles)
- Tournaments (main event configuration with logo URLs and branding)
- Tournament Users (join table linking users to tournaments with specific roles)
- Categories (tournament categories like "Masculino A", "Femenino B", "Mixto")
- Sponsor Banners (sponsor logos and promotional banners per tournament)
- Advertisements (commercial content with scheduling: contentType [image/video/gif], contentUrl, text overlay, animationType [fade-in/fade-out/slide-in/zoom-in/zoom-out/typewriter], displayDuration, displayInterval, activeDays array, startTime/endTime)
- Clubs (venue information)
- Courts (playing surfaces with availability tracking)
- Players (individual participants)
- Pairs (team compositions with category assignments)
- Matches (game instances with court and category assignments, includes live score tracking)
- Results (match outcomes with set scores)

**Schema Strategy**: UUID primary keys using PostgreSQL's `gen_random_uuid()`. Foreign key relationships link tournaments to clubs, pairs to players, matches to pairs and courts. Multi-tenant isolation via tournament_users join table linking users to tournaments with role assignments (admin, scorekeeper, display). Timestamps track creation times across all entities.

**Multi-Tenant Features**:
- Tournament-scoped categories (e.g., "Masculino A", "Femenino B") stored in categories table
- Sponsor banners per tournament with displayOrder for carousel display
- Advertisement content per tournament with time-based scheduling (day filters and time range)
- Logo URLs (tournament, club, system) stored directly in tournaments table
- Pair-category assignment via nullable categoryId foreign key

**Advertisement System**:
- Content types: image, video, and GIF support via contentType field
- Custom text overlays: Optional text field for promotional messages displayed over media
- Animation types: fade-in, fade-out, slide-in, zoom-in, zoom-out, typewriter (text-only)
- Display timing: displayDuration (seconds to show ad), displayInterval (total rotation cycle time)
- Scheduling: activeDays array (Dom-Sáb), startTime/endTime for time range filtering
- Smart rotation: Fullscreen overlay shows ads during displayDuration, then returns to dashboard for (displayInterval - displayDuration) seconds
- Performance optimization: Time-keyed memoization prevents timer resets, stable activeAds reference for reliable rotation

**Data Access Layer**: Storage interface abstraction (`IStorage`) in `server/storage.ts` provides clean separation between business logic and data persistence, enabling potential future database swapping.

### Authentication & Authorization

**Authentication Method**: Session-based authentication using username/password credentials. Sessions persist in server memory (development) with cookie-based session IDs.

**Role-Based Access**: Four user roles defined:
- `superadmin` - Can create tournaments, manage users, and assign users to tournaments
- `admin` - Full access to assigned tournament(s), can configure tournament settings, logos, and banners
- `scorekeeper` - Can register players, record results for assigned tournament(s)
- `display` - Read-only access for display screens

**Session Security**: HTTP-only cookies with secure flag in production. 24-hour session expiration. CSRF protection through same-origin policy.

### Key Architectural Decisions

**Monorepo Structure**: Single repository with three main directories:
- `client/` - React frontend application
- `server/` - Express backend application  
- `shared/` - Shared TypeScript types and schemas

**Rationale**: Enables type safety across client-server boundary and simplifies deployment as a single unit.

**Development Server Setup**: Vite middleware mode integrated with Express in development, allowing single-server development with HMR. Production builds serve static files from Express.

**Rationale**: Simplified development workflow with single port, easier debugging, and production parity.

**Real-time Architecture Choice**: WebSocket alongside REST API rather than full GraphQL subscriptions or Server-Sent Events.

**Rationale**: WebSockets provide bidirectional communication needed for live updates while maintaining simple REST API for CRUD operations. Lower overhead than GraphQL for this use case.

**Path Aliases**: TypeScript path mapping with Vite resolution:
- `@/*` → `client/src/*`
- `@shared/*` → `shared/*`
- `@assets/*` → `attached_assets/*`

**Rationale**: Cleaner imports, easier refactoring, and better IDE support.

**Query Strategy**: Aggressive staleTime (Infinity) with manual invalidation via WebSocket events rather than automatic refetching.

**Rationale**: Reduces unnecessary network requests while ensuring data freshness through event-driven updates. Better performance for real-time tournament scenarios.

**Scheduled Matches Calendar Optimization**: Monthly calendar view fetches all tournament matches with a single API call (`/api/scheduled-matches/:tournamentId`), then filters client-side by month using ISO string comparison (`match.day.toString().slice(0, 10)`) to avoid timezone-induced date shifts that would omit boundary matches (1st/31st).

**Rationale**: Single HTTP request with memoized client-side filtering provides optimal performance while timezone-safe string comparison ensures accurate match display regardless of user's local timezone offset.

**Auto-Assignment Logic**: Server-side automatic court assignment algorithm that matches waiting pairs to available courts based on FIFO queue.

**Rationale**: Centralized business logic prevents race conditions and ensures fair court allocation in multi-user scenarios.

## External Dependencies

### Core Framework Dependencies
- **React 18+** - UI rendering with hooks-based architecture
- **Express.js** - Backend HTTP server framework
- **Vite** - Frontend build tool and development server
- **TypeScript** - Type safety across the stack

### Database & ORM
- **@neondatabase/serverless** - Serverless PostgreSQL driver
- **Drizzle ORM** - TypeScript ORM with type inference
- **drizzle-kit** - Schema migration tooling
- **drizzle-zod** - Runtime validation from ORM schemas

### UI Component Libraries
- **Radix UI** - Headless accessible component primitives (accordion, dialog, dropdown, select, etc.)
- **Shadcn/ui** - Pre-styled Radix components with Tailwind
- **Tailwind CSS** - Utility-first CSS framework
- **Lucide React** - Icon library

### State & Data Fetching
- **TanStack Query** - Server state management and caching
- **WebSocket (ws)** - Real-time bidirectional communication

### Form & Validation
- **React Hook Form** - Form state management
- **Zod** - Schema validation library
- **@hookform/resolvers** - Zod integration for React Hook Form

### Session Management
- **express-session** - Session middleware for Express
- **connect-pg-simple** - PostgreSQL session store (configured but storage may be in-memory)

### Development Tools
- **@replit/vite-plugin-runtime-error-modal** - Enhanced error overlay for Replit
- **@replit/vite-plugin-cartographer** - Development tooling
- **tsx** - TypeScript execution for development server
- **esbuild** - Production bundling for server code

### Utilities
- **date-fns** - Date manipulation and formatting
- **nanoid** - Unique ID generation
- **class-variance-authority** - Component variant management
- **clsx** / **tailwind-merge** - Conditional class name utilities
- **cmdk** - Command menu component
- **embla-carousel-react** - Carousel functionality
- **wouter** - Lightweight routing library

### File Upload & Storage
- **@uppy/core** - Core file upload functionality
- **@uppy/react** - React components for Uppy
- **@uppy/dashboard** - Dashboard UI for file uploads
- **@uppy/aws-s3** - S3-compatible upload adapter
- **@google-cloud/storage** - Google Cloud Storage client

### External Services
- **Neon Database** - Serverless PostgreSQL hosting (requires DATABASE_URL environment variable)
- **Session Secret** - Configured via SESSION_SECRET environment variable (defaults to 'default-secret-key' in development)

### Build & Deployment Requirements
- **Node.js** - Runtime environment (ES modules required)
- **Environment Variables**:
  - `DATABASE_URL` - PostgreSQL connection string (required)
  - `SESSION_SECRET` - Session encryption key (optional, has default)
  - `NODE_ENV` - Environment mode (development/production)
  - `DEFAULT_OBJECT_STORAGE_BUCKET_ID` - Replit Object Storage bucket ID
  - `PUBLIC_OBJECT_SEARCH_PATHS` - Comma-separated paths for public object search
  - `PRIVATE_OBJECT_DIR` - Directory for private uploaded files