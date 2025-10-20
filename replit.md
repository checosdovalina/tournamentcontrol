# Padel Tournament Control System

## Overview

This project is a real-time, multi-tenant tournament management system specifically designed for padel competitions. It allows superadmins to create and manage multiple tournaments, assigning administrators and scorekeepers to each. Tournament administrators can configure tournament details, manage categories, and integrate sponsor banners and advertisements. The system supports player registration, automatic court assignment, real-time match tracking, and live score displays for participants and spectators. Key features include a Superadmin Panel, Admin Dashboard, Scorekeeper Dashboard, Live Score Capture, a Public Display, an Advertisement Module for commercial content, and a QR-based Guest Score Capture system for unauthenticated score updates.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
The frontend is built with **React** and **TypeScript** using **Vite**. It utilizes **Shadcn/ui** (based on Radix UI and Tailwind CSS) for UI components. **TanStack Query** manages server state with aggressive caching and real-time updates via WebSockets. **Wouter** handles client-side routing. A custom `useWebSocket` hook provides real-time updates by invalidating relevant query caches based on server events.

### Backend Architecture
The backend uses **Node.js** with **Express.js**. **Express-session** with **connect-pg-simple** handles session management and authentication. A standalone **WebSocket server** (using 'ws') provides real-time communication. An **Automated Timeout Processor** runs every 60 seconds to manage scheduled matches. When both pairs are absent after the 15-minute timeout, the match is automatically cancelled. When only one pair completes check-in, the system marks the match as `pendingDqf: true` and awaits manual admin approval via a DQF (Disqualification) button instead of automatically awarding the default win. **RESTful APIs** are organized by resource, with **Zod** and **drizzle-zod** used for data validation.

### Data Storage
**PostgreSQL** (via Neon serverless driver) is the primary database, managed by **Drizzle ORM**. The schema is TypeScript-first, supporting users, tournaments, categories, sponsor banners, advertisements, clubs, courts, players, pairs, matches, scheduled matches (with outcome tracking: 'normal'|'default'|'cancelled', outcomeReason, and defaultWinnerPairId), and results (with optional scheduledMatch outcome data). Multi-tenancy is achieved through tournament-specific configurations and relationships. An advanced **Advertisement System** supports various content types, text overlays, animations, and time-based scheduling with smart rotation. A `server/storage.ts` interface provides a clean data access layer.

### Authentication & Authorization
**Session-based authentication** using username/password is implemented. **Role-Based Access Control** supports `superadmin`, `admin`, `scorekeeper`, and `display` roles with varying access levels. Sessions use HTTP-only cookies and have a 24-hour expiration.

### Key Architectural Decisions
-   **Monorepo Structure**: `client/`, `server/`, and `shared/` directories for type safety and simplified deployment.
-   **Development Server Setup**: Vite middleware integrated with Express for a single development server with HMR.
-   **Real-time Architecture**: WebSockets for bidirectional communication alongside a REST API.
-   **Path Aliases**: TypeScript path mapping for cleaner imports.
-   **Query Strategy**: Aggressive `staleTime` with manual cache invalidation via WebSocket events for optimal performance.
-   **Scheduled Matches Calendar Optimization**: Client-side filtering of all tournament matches to optimize performance and prevent timezone issues.
-   **Auto-Assignment Logic**: Server-side FIFO algorithm for fair court allocation.
-   **Tournament Timezone Support**: Each tournament has a configurable timezone field (IANA format: "America/Mexico_City", "America/Santiago", etc.) set during tournament creation/editing. All time calculations respect this timezone to prevent premature timeouts when server and user are in different timezones.
-   **Timeout Processor Timezone Handling**: Uses `combineDateTimeInTimezone()` utility to create match datetimes in the tournament's timezone, combining `match.day` (date) with `match.plannedTime` (HH:MM string). The 15-minute timeout threshold is calculated from this timezone-aware datetime. Logs include timezone information for debugging. This prevents matches from being cancelled at incorrect times when server timezone differs from tournament location.
-   **Timeout Processor Retroactive Protection**: Skips matches created AFTER their timeout period to prevent immediate cancellation of retroactively scheduled matches. The timeout (15 minutes after planned time) only applies to matches that existed BEFORE the timeout expired. This allows scheduling past matches without auto-cancellation.
-   **Admin-Controlled DQF System**: When the timeout processor (15 minutes after planned time) detects that only one pair has completed check-in (both players present), instead of automatically awarding a default win, it marks the scheduled match with `pendingDqf: true` and stores the present pair in `defaultWinnerPairId`. Admin users see a DQF button in the programming calendar view, allowing them to manually decide whether to disqualify the absent pair. This provides human oversight for potentially contentious disqualification decisions. When both pairs are absent, the match is still automatically cancelled without admin intervention.
-   **Court Pre-Assignment System**: When a court has been occupied for 40+ minutes, the next match can be pre-assigned to that court. The pre-assigned match cannot start until the current match completes, preventing conflicts while optimizing court utilization. The display shows "Pre-asignada" status, and the programming view disables the "Iniciar Partido" button until the court is freed. Upon match completion, the pre-assigned match is automatically enabled and ready to start.
-   **Automatic Match Starting with Manual Override**: Matches auto-start when all conditions are met (all 4 players confirmed + court assigned + categoryId exists + not pre-assigned + no pending DQF). Auto-start triggers during: (1) court assignment to a ready match, (2) last player check-in on a match with assigned court. For edge cases where auto-start doesn't trigger (e.g., court assigned before all players confirmed, or vice versa), a **Manual Start Button** appears in the programming calendar for admin/scorekeeper users, allowing them to manually start matches that are fully ready but stuck in "assigned" status. The manual start endpoint (`POST /api/scheduled-matches/:id/start-match`) validates all readiness conditions and requires admin or scorekeeper authorization for the tournament.
-   **Display Rotative Responsive Design**: Cards are fully responsive with scroll support (`overflow-y-auto`) and dynamic sizing (`h-fit`). Uses flexbox layouts to prevent content clipping on any screen size. Shows court assignment status (assigned/pre-assigned/waiting) for upcoming matches. Match data structure: scores accessed via `match.score.sets` (array format `[pair1Score, pair2Score]`), results accessed via `result.match.pair1/pair2` (nested structure), player names via `pair.player1.name / pair.player2.name`.

## External Dependencies

### Core Framework Dependencies
-   React 18+
-   Express.js
-   Vite
-   TypeScript

### Database & ORM
-   @neondatabase/serverless
-   Drizzle ORM, drizzle-kit, drizzle-zod

### UI Component Libraries
-   Radix UI
-   Shadcn/ui
-   Tailwind CSS
-   Lucide React

### State & Data Fetching
-   TanStack Query
-   WebSocket (ws)

### Form & Validation
-   React Hook Form
-   Zod
-   @hookform/resolvers

### Session Management
-   express-session
-   connect-pg-simple

### Utilities
-   date-fns
-   nanoid
-   class-variance-authority, clsx, tailwind-merge
-   cmdk
-   embla-carousel-react
-   wouter

### File Upload & Storage
-   @uppy/core, @uppy/react, @uppy/dashboard, @uppy/aws-s3
-   @google-cloud/storage (client for Google Cloud Storage)

### External Services
-   **Neon Database**: Serverless PostgreSQL hosting
-   **Replit Object Storage**: For file uploads

### Environment Variables (Required for Deployment)
-   `DATABASE_URL`
-   `SESSION_SECRET` - **CRITICAL**: Must be set to a strong, random value in production. The application falls back to 'default-secret-key' in development, but this is insecure for production use and will compromise session security.
-   `DEFAULT_OBJECT_STORAGE_BUCKET_ID`
-   `PUBLIC_OBJECT_SEARCH_PATHS`
-   `PRIVATE_OBJECT_DIR`

## Security Considerations

### Session Secret
The application uses `SESSION_SECRET` environment variable to sign session cookies. In `server/index.ts`, the code falls back to `'default-secret-key'` if this variable is not set:

```javascript
secret: process.env.SESSION_SECRET || 'default-secret-key'
```

**⚠️ Production Warning**: The default value is only suitable for development. In production:
1. Set a strong, random `SESSION_SECRET` (minimum 32 characters, use cryptographically secure random generation)
2. Never commit the secret to version control
3. Rotate the secret periodically
4. Keep it confidential

Without a proper session secret, attackers can forge session cookies and impersonate users.