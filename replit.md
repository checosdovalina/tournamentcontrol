# Padel Tournament Control System

## Overview

This project is a real-time, multi-tenant tournament management system specifically designed for padel competitions. It allows superadmins to create and manage multiple tournaments, assigning administrators and scorekeepers to each. Tournament administrators can configure tournament details, manage categories, and integrate sponsor banners and advertisements. The system supports player registration, automatic court assignment, real-time match tracking, and live score displays for participants and spectators. Key features include a Superadmin Panel, Admin Dashboard, Scorekeeper Dashboard, Live Score Capture, a Public Display, a Streaming Display for live video broadcasting, an Advertisement Module for commercial content, and a QR-based Guest Score Capture system for unauthenticated score updates.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
The frontend is built with **React** and **TypeScript** using **Vite**. It utilizes **Shadcn/ui** (based on Radix UI and Tailwind CSS) for UI components. **TanStack Query** manages server state with aggressive caching and real-time updates via WebSockets. **Wouter** handles client-side routing. A custom `useWebSocket` hook provides real-time updates by invalidating relevant query caches based on server events.

### Backend Architecture
The backend uses **Node.js** with **Express.js**. **Express-session** with **connect-pg-simple** handles session management and authentication. A standalone **WebSocket server** (using 'ws') provides real-time communication. An **Automated Timeout Processor** runs every 60 seconds to manage scheduled matches. When both pairs are absent after the 15-minute timeout, the match is automatically cancelled. When only one pair completes check-in, the system marks the match as `pendingDqf: true` and awaits manual admin approval via a DQF (Disqualification) button instead of automatically awarding the default win. **RESTful APIs** are organized by resource, with **Zod** and **drizzle-zod** used for data validation.

### Data Storage
**PostgreSQL** (via standard `pg` driver) is the primary database, managed by **Drizzle ORM**. The schema is TypeScript-first, supporting users, tournaments, categories, sponsor banners, advertisements, clubs, courts, players, pairs, matches, scheduled matches (with outcome tracking: 'normal'|'default'|'cancelled', outcomeReason, and defaultWinnerPairId), and results (with optional scheduledMatch outcome data). Multi-tenancy is achieved through tournament-specific configurations and relationships. An advanced **Advertisement System** supports various content types, text overlays, animations, and time-based scheduling with smart rotation. A `server/storage.ts` interface provides a clean data access layer. **File uploads** are handled via local filesystem storage in `public/uploads/` directory.

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
-   **Timeout Processor Timezone Handling**: Uses `combineDateTimeInTimezone()` utility to create match datetimes in the tournament's timezone, combining `match.day` (date) with `match.plannedTime` (HH:MM string). The utility extracts only the date portion from `match.day` (ignoring any time component) to prevent inconsistencies from Excel imports or database operations. The 15-minute timeout threshold is calculated from this timezone-aware datetime. This prevents matches from being cancelled at incorrect times when server timezone differs from tournament location.
-   **Timeout Processor Retroactive Protection**: Completely skips ALL matches created after their timeout period (createdAt >= timeoutThreshold). This prevents any timeout processing (DQF marking, cancellation) for retroactively scheduled past matches, regardless of how long ago they were created. Only matches that existed BEFORE the 15-minute timeout expires are eligible for timeout processing.
-   **Admin-Controlled DQF System**: When the timeout processor (15 minutes after planned time) detects that only one pair has completed check-in (both players present), instead of automatically awarding a default win, it marks the scheduled match with `pendingDqf: true` and stores the present pair in `defaultWinnerPairId`. Admin users see a DQF button in the programming calendar view, allowing them to manually decide whether to disqualify the absent pair. This provides human oversight for potentially contentious disqualification decisions. When both pairs are absent, the match is still automatically cancelled without admin intervention.
-   **Court Pre-Assignment System**: When a court has been occupied for 40+ minutes, the next match can be pre-assigned to that court. The pre-assigned match cannot start until the current match completes, preventing conflicts while optimizing court utilization. The display shows "Pre-asignada" status, and the programming view disables the "Iniciar Partido" button until the court is freed. Upon match completion, the pre-assigned match is automatically enabled and ready to start.
-   **Fully Automatic Match Starting**: All match starts are completely automatic. When a scheduled match meets all conditions (all 4 players confirmed + court assigned + categoryId exists + not pre-assigned), the match auto-starts immediately. This happens in two scenarios: (1) when court is assigned to a ready match (waiting list assignment), (2) when the last player confirms check-in on a match with assigned court. No manual "Iniciar Partido" buttons exist anywhere in the system.
-   **Court Conflict Detection**: Court assignment conflict detection only blocks assignments when a court is actively in use by a non-completed match (`matchId` set AND status !== 'completed') or pre-assigned to another match (`preAssignedAt` is not null). Completed matches are excluded from the blocking logic, preventing old finished matches from blocking court assignments.
-   **Display Rotative Responsive Design**: Cards are fully responsive with scroll support (`overflow-y-auto`) and dynamic sizing (`h-fit`). Uses flexbox layouts to prevent content clipping on any screen size. Shows court assignment status (assigned/pre-assigned/waiting) for upcoming matches. Match data structure: scores accessed via `match.score.sets` (array format `[pair1Score, pair2Score]`), results accessed via `result.match.pair1/pair2` (nested structure), player names via `pair.player1.name / pair.player2.name`.
-   **Waiting List Time Filter**: The waiting list displays only matches with check-in times from the last 8 hours (480 minutes). Matches older than this are automatically hidden to maintain relevance and prevent clutter from stale entries.
-   **Display Timezone-Aware Date Calculation**: Display screens (normal and rotative) calculate "today" using the tournament's configured timezone via `getTodayInTimezone()` utility instead of the browser's timezone. This ensures upcoming matches are filtered based on the tournament location's current date, preventing display issues when viewers are in different timezones than the tournament. Uses `Intl.DateTimeFormat` to convert server time to tournament timezone reliably.
-   **Upcoming Matches Scroll Animation Speed**: Set to 180 seconds per cycle (3 minutes) for comfortable readability without rushing content, allowing viewers to properly read all upcoming match details.
-   **Display Wake Lock System**: Implements Wake Lock API to prevent screens from going to sleep during tournament display. Includes fallback mechanism using invisible video for browsers without Wake Lock support. Auto-recovers when tab regains visibility.
-   **Intelligent Ready Queue System**: Manages matches where all 4 players have confirmed attendance. When the 4th player checks in, the match status changes to "ready" and a `readySince` timestamp is set **only on the first transition to ready state**. If a player later checks out and then checks back in, the original `readySince` timestamp is preserved, ensuring fair queue positioning based on the first time all players were ready. The ready queue displays matches ordered first by `plannedTime` (scheduled time), then by `readySince` (FIFO within same time slot). This ensures fair allocation: matches at earlier scheduled times get priority, and among matches with the same planned time, those that became ready first are assigned courts first. The system provides real-time queue position, wait time tracking, and automatic updates via WebSocket invalidation for instant UI refresh without polling dependency.
-   **Streaming Display System**: Each court can be configured with a stream URL (stored in `streamUrl` field) for live video broadcasting. The `/display-stream/:courtId` public page embeds the video stream via iframe, displays sponsor banners with rotation, shows targeted advertisements based on time/day scheduling, and overlays real-time match information (players, scores, category) fetched from `/api/matches/current/:tournamentId` endpoint filtered by courtId. The display integrates tournament branding (logos), implements Wake Lock API to prevent screen sleep, and provides a dedicated "Ver Stream" button in the court management modal for quick access. Real-time updates are achieved through TanStack Query with 2-second polling interval and WebSocket-driven cache invalidation.

## External Dependencies

### Core Framework Dependencies
-   React 18+
-   Express.js
-   Vite
-   TypeScript

### Database & ORM
-   pg (node-postgres)
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
-   multer (native multipart/form-data handling)
-   Local filesystem storage in `public/uploads/`

### Environment Variables (Required for Deployment)
-   `DATABASE_URL` - PostgreSQL connection string
-   `SESSION_SECRET` - Session encryption key
-   `NODE_ENV` - Environment mode (development/production)

### Build & Deployment
-   **Build Process**: TypeScript compilation without bundling (`tsc`) for server code, Vite bundling for client code
-   **Production Server**: Compiled JavaScript from `dist/server/index.js` with `pg` as runtime dependency
-   **VPS Deployment**: Nginx reverse proxy → Node.js (PM2) → PostgreSQL (local instance)