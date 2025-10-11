# Design Guidelines: Padel Tournament Management & Advertising System

## Design Approach
**Hybrid System**: Material Design foundation for tournament management + Custom motion-forward design for advertising module. Drawing inspiration from sports platforms (LiveScore, ESPN) combined with premium digital signage aesthetics (stadium displays, Nike retail).

**Key Principle**: Professional sports event experience - clean data presentation meets bold advertising impact.

---

## Core Design Elements

### A. Color Palette

**Light Mode:**
- Primary: 142 76% 36% (Padel court green)
- Secondary: 220 13% 18% (Charcoal for data/text)
- Accent: 32 95% 55% (Vibrant orange for CTAs/highlights)
- Background: 0 0% 98%
- Surface: 0 0% 100%
- Border: 220 13% 91%

**Dark Mode:**
- Primary: 142 70% 45%
- Secondary: 220 13% 91%
- Accent: 32 100% 60%
- Background: 222 47% 11%
- Surface: 217 33% 17%
- Border: 217 33% 23%

**Ad Display System:**
- Dynamic overlay: rgba(0,0,0,0.85) for video/image backdrops
- Text contrast guarantee: White text on dark, dark text on light with automatic detection

### B. Typography

**Fonts (via Google Fonts CDN):**
- Primary: 'Inter' - Tournament data, UI text (400, 500, 600, 700)
- Display: 'Bebas Neue' - Ad headlines, tournament titles (400, 700)
- Mono: 'JetBrains Mono' - Scores, timers, stats (400, 600)

**Scale:**
- Hero/Ad Headlines: text-7xl to text-9xl (Bebas Neue)
- Section Headers: text-3xl to text-4xl (Inter 700)
- Body: text-base to text-lg (Inter 400)
- Scores/Stats: text-5xl to text-6xl (JetBrains Mono 600)
- Captions: text-sm (Inter 500)

### C. Layout System

**Spacing Primitives:** Tailwind units of 2, 4, 8, 12, 16, 24
- Micro spacing: p-2, gap-2
- Component spacing: p-4, p-8, gap-4
- Section spacing: py-12, py-16, py-24
- Macro layout: Container max-w-7xl with px-4

**Grid Structure:**
- Tournament lists: grid-cols-1 md:grid-cols-2 lg:grid-cols-3
- Match cards: grid-cols-1 lg:grid-cols-2
- Admin dashboard: 2-column split (navigation + content)

### D. Component Library

**Tournament Management:**
- Match Cards: Elevated surface (shadow-lg), rounded-2xl, score display with JetBrains Mono, team names in Inter 600, status badges (Live/Upcoming/Completed)
- Tournament Brackets: SVG-based bracket visualization, responsive collapse on mobile, hover states showing match details
- Leaderboard Table: Sticky header, alternating row colors (surface/background), rank indicators with accent color
- Quick Stats: Dashboard cards with large numbers (JetBrains Mono), descriptive labels, subtle icons from Material Icons

**Advertising Display Module:**
- Fullscreen Canvas: Fixed position, z-50, transition-all duration-700
- Animation Variants: Fade (opacity), Slide (translateX/Y), Zoom (scale), Typewriter (character-by-character reveal using CSS animation)
- Media Container: Object-cover for images, aspect-video for videos, autoplay looping GIFs
- Text Overlay: Absolute positioned, gradient backdrops for readability, support for multi-line with line-clamp
- Timer Bar: Bottom progress indicator showing ad duration (w-full h-1 bg-accent)

**Admin Interface:**
- Visual Ad Builder: Drag-drop zones (border-2 border-dashed), live preview panel (fixed right sidebar on desktop, modal on mobile)
- Animation Selector: Icon-based buttons (Material Icons), active state with accent border
- Media Upload: Dropzone with image/video preview thumbnails (aspect-square, rounded-lg)
- Timing Controls: Range sliders for duration, toggle switches for autoplay, number inputs for delays
- Template Gallery: Grid of pre-configured ad layouts, hover overlay with "Use Template" button

**Navigation:**
- Top Bar: Logo left, primary nav center, user profile/settings right, shadow-sm on scroll
- Side Navigation (Admin): Collapsible on mobile, icons + labels, active state with accent background
- Tabs: Underline indicator (border-b-2 border-accent), smooth transition

**Forms & Controls:**
- Input Fields: Rounded-lg, border-2, focus:ring-2 ring-accent, consistent h-12
- Buttons: Primary (bg-accent text-white), Secondary (border-2 border-current), Ghost (hover:bg-surface)
- Select/Dropdowns: Custom chevron icon, max-h-60 overflow-y-auto
- Toggle Switches: iOS-style, accent color when active

### E. Animations & Interactions

**Micro-interactions (Sparingly):**
- Button hover: scale-105 transition-transform duration-200
- Card hover: shadow-xl transition-shadow duration-300
- Score updates: Pulse animation on change (animate-pulse for 1 second)
- Match status badge: Subtle background pulse for "Live" status

**Ad System Animations (Professional):**
- Fade: opacity-0 to opacity-100, duration-700
- Slide-in: translateX(-100% to 0) or translateY(100% to 0), duration-1000 ease-out
- Zoom: scale-0 to scale-100, duration-800 ease-in-out
- Typewriter: CSS @keyframes typing with steps() function, variable duration based on text length
- Exit Transitions: Reverse of entry, duration-500

---

## Images

**Tournament Dashboard:**
- Hero Section: Large action shot of padel match (16:9 aspect ratio), positioned absolute with overlay gradient (from-black/50 to-transparent), text overlay with tournament name and CTA buttons with backdrop-blur-sm

**Advertising Display:**
- Support for user-uploaded images (landscape 16:9, portrait 9:16, square 1:1)
- Fallback: Gradient backgrounds (linear-gradient combining primary + accent colors)
- GIF handling: No additional processing, display as-is with object-cover

**Admin Interface:**
- Icon-driven (Material Icons CDN): upload, play_arrow, edit, delete, settings
- Preview thumbnails: max-h-48, object-cover, rounded-lg border-2 border-border

---

## Page Structures

**Tournament Dashboard (Public):**
1. Hero with featured tournament + live match count
2. Live Matches section (grid of match cards, auto-refresh)
3. Upcoming Matches (chronological list)
4. Leaderboard/Rankings (table format)
5. Tournament Sponsors (logo grid, subtle grayscale hover:color)

**Ad Display Screen (Fullscreen):**
- Rotating fullscreen ads with configured animations
- Bottom timer bar showing progress
- Skip control (if enabled in admin)

**Admin Panel:**
1. Dashboard: Stats overview (total ads, active ads, impressions)
2. Ad Manager: List view with edit/delete, visual status indicators
3. Create/Edit Ad: Split view - configuration left, live preview right
4. Tournament Management: Matches, brackets, teams in tabbed interface
5. Settings: Timing defaults, display preferences

---

## Accessibility & Performance

- Color contrast: WCAG AA minimum (4.5:1 text, 3:1 UI)
- Dark mode: Consistent across all interfaces, automatic detection
- Focus indicators: 2px ring-accent on all interactive elements
- Reduced motion: Respect prefers-reduced-motion, disable ad animations
- Video ads: Muted autoplay, user control for sound
- Load priority: Lazy load images, preload critical ad assets