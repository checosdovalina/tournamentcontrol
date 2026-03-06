# Padel Tournament Control System

## Overview

This project is a real-time, multi-tenant tournament management system for padel competitions. It enables superadmins to create and oversee tournaments, assign roles (admins, scorekeepers), and integrate sponsor content. Key capabilities include player registration, automated court assignment, live match tracking, and real-time score displays for participants and spectators. The system features dedicated panels for superadmins, admins, and scorekeepers, supports live score capture, public and streaming displays, an advertisement module, and QR-based guest score entry.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
The frontend is built with **React** and **TypeScript** using **Vite**, leveraging **Shadcn/ui** (Radix UI and Tailwind CSS) for components. **TanStack Query** manages server state with aggressive caching and real-time updates via WebSockets. **Wouter** handles client-side routing.

### Backend Architecture
The backend uses **Node.js** with **Express.js**. Session management and authentication are handled by **Express-session** with **connect-pg-simple**. A standalone **WebSocket server** provides real-time communication. An **Automated Timeout Processor** manages scheduled matches, automatically canceling matches if both pairs are absent, or marking them `pendingDqf: true` for admin approval if only one pair is absent. **RESTful APIs** are organized by resource, with **Zod** and **drizzle-zod** for data validation.

### Data Storage
**PostgreSQL** is the primary database, managed by **Drizzle ORM**. The schema supports users, tournaments, categories, sponsor banners, advertisements, clubs, courts, players, pairs, matches, scheduled matches, and results. Multi-tenancy is achieved through tournament-specific configurations. An advanced **Advertisement System** supports various content types and time-based scheduling. File uploads are stored locally in `public/uploads/`.

### Authentication & Authorization
**Session-based authentication** with username/password is implemented. **Role-Based Access Control** supports `superadmin`, `admin`, `scorekeeper`, and `display` roles.

### Key Architectural Decisions
-   **Monorepo Structure**: `client/`, `server/`, and `shared/` directories for type safety and simplified deployment.
-   **Real-time Architecture**: WebSockets for bidirectional communication alongside a REST API.
-   **Query Strategy**: Aggressive `staleTime` with manual cache invalidation via WebSocket events.
-   **Tournament Timezone Support**: Each tournament has a configurable IANA timezone, ensuring all time calculations (e.g., match timeouts) respect the tournament's local time.
-   **Admin-Controlled DQF System**: Provides human oversight for disqualification decisions when one pair is absent after timeout.
-   **Court Pre-Assignment System**: Optimizes court utilization by pre-assigning upcoming matches to courts that will soon become free.
-   **Fully Automatic Match Starting**: Matches auto-start when all conditions (players checked in, court assigned, etc.) are met, removing manual intervention.
-   **Intelligent Ready Queue System**: Manages matches where all players are ready, prioritizing by planned time and then by `readySince` timestamp for fair court allocation.
-   **Player Photo Upload System**: Allows admins/scorekeepers to upload player photos for display.
-   **Display Estelar**: A full-screen, cinematic display for featured matches with player photos, scores, and branding.
-   **Streaming Display System**: Allows courts to embed live video streams with overlaid real-time match info and smart advertisement rotation during score changes.
-   **Multi-Tournament Session System**: Users can manage multiple tournaments, with access based on assigned roles.

## External Dependencies

### Core Framework Dependencies
-   React
-   Express.js
-   Vite
-   TypeScript

### Database & ORM
-   pg (node-postgres)
-   Drizzle ORM

### UI Component Libraries
-   Radix UI
-   Shadcn/ui
-   Tailwind CSS

### State & Data Fetching
-   TanStack Query
-   WebSocket (`ws`)

### Form & Validation
-   React Hook Form
-   Zod

### Session Management
-   express-session
-   connect-pg-simple

### Utilities
-   date-fns
-   nanoid
-   wouter

### File Upload & Storage
-   multer
-   Local filesystem storage (`public/uploads/`)