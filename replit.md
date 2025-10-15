# Padel Tournament Control System

## Overview

This project is a real-time, multi-tenant tournament management system specifically designed for padel competitions. It allows superadmins to create and manage multiple tournaments, assigning administrators and scorekeepers to each. Tournament administrators can configure tournament details, manage categories, and integrate sponsor banners and advertisements. The system supports player registration, automatic court assignment, real-time match tracking, and live score displays for participants and spectators. Key features include a Superadmin Panel, Admin Dashboard, Scorekeeper Dashboard, Live Score Capture, a Public Display, an Advertisement Module for commercial content, and a QR-based Guest Score Capture system for unauthenticated score updates.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
The frontend is built with **React** and **TypeScript** using **Vite**. It utilizes **Shadcn/ui** (based on Radix UI and Tailwind CSS) for UI components. **TanStack Query** manages server state with aggressive caching and real-time updates via WebSockets. **Wouter** handles client-side routing. A custom `useWebSocket` hook provides real-time updates by invalidating relevant query caches based on server events.

### Backend Architecture
The backend uses **Node.js** with **Express.js**. **Express-session** with **connect-pg-simple** handles session management and authentication. A standalone **WebSocket server** (using 'ws') provides real-time communication. An **Automated Timeout Processor** runs every 60 seconds to manage scheduled matches, awarding default wins or cancelling matches based on check-in status and liberating courts. **RESTful APIs** are organized by resource, with **Zod** and **drizzle-zod** used for data validation.

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
-   **Timeout Processor Date Handling**: Uses timezone-safe date calculation by extracting date components (getFullYear, getMonth, getDate) from match.day and combining with plannedTime to create local Date objects, preventing premature timeout evaluation caused by UTC/local timezone offsets.
-   **Timeout Processor Retroactive Protection**: Skips matches created AFTER their timeout period to prevent immediate cancellation of retroactively scheduled matches. The timeout (15 minutes after planned time) only applies to matches that existed BEFORE the timeout expired. This allows scheduling past matches without auto-cancellation.

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
-   `SESSION_SECRET`
-   `DEFAULT_OBJECT_STORAGE_BUCKET_ID`
-   `PUBLIC_OBJECT_SEARCH_PATHS`
-   `PRIVATE_OBJECT_DIR`