# GORGONE V2 - Context

## Overview

GORGONE is a social media monitoring platform for enterprises and government. This V2 represents a complete redesign of the application with a focus on scalability, performance, and user experience.

## 🌍 Language Policy

**IMPORTANT: All text content in the application MUST be in English.**

This includes:

- UI text and labels
- Error messages
- Comments in code
- Documentation
- Types and constants
- Function names and variables (camelCase English)

## Technical Stack

### Frontend

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4
- **UI Components**: Shadcn UI (modern design system)
- **Theme**: Dark/light mode support with next-themes
- **Notifications**: Sonner (toast notifications)
- **Design System**: Professional government-grade CSS variables system

### Backend & Services

- **Database**: Supabase (PostgreSQL)
- **Cache**: Upstash Redis
- **Workers & Schedules**: QStash (Upstash)
- **Deployment**: Vercel (Edge Network)

## Architecture

### Folder Structure

```
/app                      # Next.js pages (App Router)
  /dashboard             # Dashboard pages
    /clients             # Client management module
      /[id]              # Client details page
      /new               # Create client page
      page.tsx           # Clients list page
    /zones               # Zone management module
      /[zoneId]          # Zone-specific pages
        /overview        # Zone overview page
        /feed            # Zone feed page
        /analysis        # Zone analysis page
        /settings        # Zone settings page (hidden from operators)
        layout.tsx       # Zone layout
    layout.tsx           # Dashboard layout (with sidebar)
    page.tsx             # Dashboard home
  /actions               # Server actions
    auth.ts              # Auth actions (logout)
    clients.ts           # Client management actions
    zones.ts             # Zone management actions
  layout.tsx             # Root layout with ThemeProvider
  page.tsx               # Home page
  login/                 # Login page
  globals.css            # Global styles and CSS variables

/components              # Reusable components
  /ui                    # Shadcn UI components
    sonner.tsx           # Toast notifications wrapper
    textarea.tsx         # Textarea component
  /dashboard             # Dashboard-specific components
    /clients             # Client management components
      clients-table.tsx           # Clients list table
      clients-table-skeleton.tsx  # Loading skeleton
      client-details.tsx          # Client details form
      client-details-skeleton.tsx # Details loading skeleton
      client-users-list.tsx       # Users list for a client
      create-client-form.tsx      # Create client form
      create-user-dialog.tsx      # Create user dialog
      edit-user-dialog.tsx        # Edit user dialog
    /zones               # Zone management components
      create-zone-dialog.tsx      # Create zone popup
      zones-sidebar-section.tsx   # Zone list in sidebar
      zone-page-header.tsx        # Zone page header with dynamic tabs
      zone-settings-form.tsx      # Zone settings form
    header.tsx           # Dashboard header
    sidebar.tsx          # Dashboard sidebar (with zones)
    footer.tsx           # Dashboard footer
  /auth                  # Auth components
    login-form.tsx       # Login form

/lib                     # Business logic and utilities
  /auth                  # Authentication
    permissions.ts       # Role hierarchy and permissions (with zone permissions)
    utils.ts             # Auth helper functions
  /supabase              # Supabase clients
    client.ts            # Browser client
    server.ts            # Server Components client
    admin.ts             # Admin client (bypasses RLS)
  /data                  # Data layer - centralized data access
    index.ts             # Exports all data functions
    clients.ts           # Client & user CRUD operations
    zones.ts             # Zone CRUD operations
  /cache                 # Redis helpers
    redis.ts             # Redis client configuration
  /providers             # React providers
    theme-provider.tsx   # Theme provider
  constants.ts           # Centralized constants
  utils.ts               # General utilities (cn, formatDate, etc.)
  metadata.ts            # SEO metadata configuration
  env.ts                 # Type-safe environment variables
  logger.ts              # Centralized logging

/types                   # Centralized TypeScript types
  index.ts               # All interfaces (User, Profile, Client, Zone, etc.)

/middleware.ts           # Route protection and security headers
```

### Architectural Principles

1. **Modularity**: Code organized in reusable modules
2. **Data Layer**: All data goes through `/lib/data` to avoid duplication
3. **Strong Typing**: Types centralized in `/types`
4. **Design System**: Centralized CSS variables, no hardcoded values
5. **Performance**: Redis cache, skeletons (no global loaders), loading optimizations
6. **Mobile-First**: All components optimized for mobile and desktop
7. **Typography**: Use Shadcn typography components for consistency
8. **Error Handling**: Professional error pages (404, error boundary, global-error)
9. **Security**: Middleware with security headers (CSP, HSTS, X-Frame-Options, etc.)
10. **SEO**: Advanced metadata, OpenGraph, Twitter cards, robots.txt, sitemap.xml
11. **Code Quality**: ESLint + Prettier configured for consistency
12. **Logging**: Centralized logger with different levels (info, warn, error, debug)

## Design System

**CRITICAL**: Gorgone uses a professional, government-grade design system. ALL components MUST use CSS variables and utility classes - NEVER hardcode values.

### 🎨 Color System

**Base Colors** (defined in `globals.css` using OKLCH):
- **Primary**: `oklch(0.54 0.22 285)` (purple) - Brand color, CTA buttons
- **Background**: `oklch(1 0 0)` (light) / `oklch(0.145 0 0)` (dark)
- **Foreground**: `oklch(0.145 0 0)` (light) / `oklch(0.985 0 0)` (dark)
- **Muted**: For secondary text and backgrounds
- **Border**: Subtle borders using `oklch` with transparency
- **Destructive**: For error states and destructive actions

**Usage Rules**:
- ✅ Use Tailwind classes: `bg-background`, `text-foreground`, `border-border`
- ✅ Use CSS variables: `var(--background)`, `var(--foreground)`
- ❌ NEVER hardcode: `#ffffff`, `rgb(255,255,255)`, or color names

### ✍️ Typography System

**Font Stack**:
- **Sans**: Geist Sans (primary)
- **Mono**: Geist Mono (code)
- Font features: Ligatures enabled, optimized rendering

**Type Scale** (shadcn-compliant, semantic HTML):
```tsx
/* Headings - Use semantic HTML */
<h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight">
<h2 className="scroll-m-20 text-3xl font-semibold tracking-tight">
<h3 className="scroll-m-20 text-2xl font-semibold tracking-tight">
<h4 className="scroll-m-20 text-xl font-semibold tracking-tight">

/* Body Text */
<p className="leading-7 [&:not(:first-child)]:mt-6">
<p className="text-sm text-muted-foreground">

/* Specialized */
<small className="text-sm font-medium leading-none">
<code className="relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm">
```

**Typography Rules**:
- ✅ Use semantic HTML with utility classes directly
- ✅ Available helpers: `.text-h1`, `.text-lead`, `.text-muted`, `.text-large`
- ✅ Shadcn patterns: `scroll-m-20`, `tracking-tight`, `leading-7`
- ❌ NEVER use wrapper components (`<TypographyH1>` - DELETED)
- ❌ NEVER hardcode font sizes: `text-[18px]`

### 📐 Spacing System

**Harmonious Scale** (CSS variables):
```css
--spacing-section:    48px  (between major page sections)
--spacing-container:  32px  (main container padding)
--spacing-card:       24px  (card internal padding)
--spacing-element:    16px  (between elements)
--spacing-compact:    12px  (compact layouts)
--spacing-tight:      8px   (minimal spacing)
```

**Usage**:
- ✅ Use utility classes: `.card-padding`, `.container-padding`
- ✅ Use Tailwind spacing: `space-y-6`, `gap-4`, `mb-8`
- ✅ Consistent: Prefer 4px increments (1, 1.5, 2, 3, 4, 6, 8, 12, 16, 24, 32, 48)
- ❌ NEVER random values: `mt-[13px]` or `gap-[19px]`

### 🎭 Animation & Transitions

**Subtle & Professional** - All animations follow easing curves:

**Transition Speeds**:
```css
--transition-fast:  150ms  (hover, simple state changes)
--transition-base:  250ms  (default, most interactions)
--transition-slow:  350ms  (complex transitions, page loads)
```

**Easing**: `cubic-bezier(0.4, 0, 0.2, 1)` (smooth deceleration)

**Common Patterns**:
```css
/* Hover transitions */
transition-colors duration-[150ms]

/* Focus states */
transition-shadow duration-[150ms] focus-visible:shadow-[var(--shadow-sm)]

/* Card interactions */
transition-all duration-[250ms]

/* Page load */
.animate-in  → fade in + translate up (250ms)
```

**Rules**:
- ✅ Use CSS variables: `duration-[var(--transition-fast)]`
- ✅ Subtle: Micro-interactions only, no flashy animations
- ✅ Performance: Use `transform` and `opacity` when possible
- ❌ NEVER long durations: > 400ms feels sluggish

### 🃏 Card System

**Professional Card Variants**:

```tsx
/* Standard Card */
<Card className="rounded-xl shadow-xs">
  <CardHeader>
    <CardTitle>Title</CardTitle>
    <CardDescription>Description</CardDescription>
  </CardHeader>
  <CardContent>Content</CardContent>
</Card>

/* Interactive Card (hover effects) */
<div className="card-interactive p-6">
  {/* Adds border + shadow on hover */}
</div>

/* Glass Card (Apple-inspired) */
<div className="glass-card p-6">
  {/* Backdrop blur + transparency */}
</div>

/* Compact Card (dense data displays) */
<div className="card-compact">
  {/* Tight spacing for feeds */}
</div>

/* Danger Zone */
<div className="card-danger">
  {/* Destructive actions */}
</div>
```

**Rules**:
- ✅ Use `rounded-xl` for main cards
- ✅ Use `shadow-xs` for subtle elevation
- ✅ Use `.glass-card` for feed cards (Twitter, TikTok, Media)
- ✅ Use `.card-compact` for dense monitoring data
- ❌ NEVER hardcode padding values

### 🔗 Link System

**Consistent Link Behavior**:

```tsx
<Link href="/path" className="link-primary">
  Link Text
</Link>
```

**What it does**:
- Default: foreground color
- Hover: primary color
- Fast 150ms transition
- No underline by default (add if needed)

**Rules**:
- ✅ Use `.link-primary` for all navigation links
- ✅ Add `font-medium` for emphasis
- ✅ Combine with other utilities as needed
- ❌ NEVER hardcode hover colors

### 📦 Component Patterns

**Input Fields**:
```tsx
<Input
  className="h-10 transition-shadow duration-[150ms] focus-visible:shadow-[var(--shadow-sm)]"
/>
```
- Fixed height: `h-10` (40px)
- Focus shadow for depth
- Consistent across all forms

**Empty States**:
```tsx
<div className="py-16 text-center">
  <p className="text-body-sm text-muted-foreground">
    No items found
  </p>
</div>
```
- Generous padding: `py-16`
- Muted text for less importance
- Centered alignment

**Page Headers**:
```tsx
<div className="mb-8 space-y-1.5">
  <h1 className="text-heading-1">Page Title</h1>
  <p className="text-body-sm text-muted-foreground">
    Description text
  </p>
</div>
```
- Consistent spacing: `mb-8` after header
- Title + description pattern
- Reduced opacity for descriptions

### 🎬 Page Load Pattern

**Fade-in Animation** (all pages):
```tsx
<div className="animate-in" style={{ animationDelay: "50ms" }}>
  {/* Page content */}
</div>
```

**Effect**: Subtle fade + 4px translate up, 250ms duration

### 🌓 Dark Mode

**Automatic Theme Support**:
- All CSS variables have light + dark variants
- Shadows adapt (darker in dark mode)
- Border opacity changes automatically
- No manual theme checking needed in components

**Rules**:
- ✅ Use semantic color names: `bg-background`, `text-foreground`
- ✅ CSS variables handle theme switching automatically
- ❌ NEVER check theme manually in components

### ✅ Design System Checklist

When creating new components:

- [ ] Use CSS variable-based colors (no hardcoded colors)
- [ ] Use semantic HTML with shadcn utility classes (`h1`, `p`, `small`)
- [ ] Use spacing system (consistent `space-y-6` for pages)
- [ ] Add transitions with CSS variables (`duration-[var(--transition-fast)]`)
- [ ] Use `.glass-card` for feed/data cards
- [ ] Use `.card-interactive` for hoverable elements
- [ ] Use SVG sizing: `size-4`, `size-5` (not `h-* w-*`)
- [ ] Add `.animate-in` to page containers
- [ ] Input/Button heights: `h-9` (default), `h-8` (sm), `h-10` (lg)
- [ ] Test in both light and dark mode
- [ ] Verify responsive behavior (mobile-first)
- [ ] Check keyboard navigation and focus states

### 🚫 Anti-Patterns (DO NOT DO)

❌ Hardcoded colors: `bg-white`, `text-black`, `#7550ff`, `green-600`  
❌ Typography components: `<TypographyH1>` (DELETED - use semantic HTML)  
❌ Custom utility classes: `.text-heading-1`, `.text-body-sm` (DELETED)  
❌ Random font sizes: `text-[17px]`  
❌ Inconsistent spacing: `mt-[13px]`, `gap-[19px]`, `space-y-8` mixte  
❌ Hardcoded transitions: `duration-150ms`, `duration-[250ms]` (use CSS vars)  
❌ SVG sizing: `h-4 w-4` (use `size-4`)  
❌ Long animations: `duration-500`, `duration-1000`  
❌ Manual theme checks: `{theme === 'dark' ? ... : ...}`  
❌ No hover/focus states on interactive elements  
❌ Missing glassmorphism on feed cards  

### 🎯 Quality Standards

This design system ensures:
- **Consistency**: Same patterns everywhere
- **Accessibility**: Proper contrast, focus states
- **Performance**: GPU-accelerated animations
- **Maintainability**: Change once, applies everywhere
- **Professionalism**: Government/enterprise-grade quality

## Main Features

### Pages

1. **Home page** (`/`): GORGONE logo + Login button
2. **Login page** (`/login`): Authentication form
3. **Dashboard** (`/dashboard`): Main dashboard interface
4. **Client Management** (`/dashboard/clients`): Complete client management module

### Client Management Module

**Features**:
- ✅ **List Clients**: Table with search, status badges, user count
- ✅ **Create Client**: Form with auto-save and validation
- ✅ **Edit Client**: Update name, description, active status
- ✅ **Delete Client**: Soft delete with confirmation
- ✅ **User Management**: Create/edit/delete users per client
- ✅ **Role Assignment**: Assign roles to client users (admin, operator, manager)
- ✅ **Loading States**: Professional skeletons for all views
- ✅ **Toast Notifications**: Real-time feedback on all actions
- ✅ **Responsive**: Optimized for mobile and desktop

**Access Control**:
- Only **super_admin** users can access client management
- Client users are isolated per client (via `client_id`)
- Row Level Security (RLS) enforced at database level

**Pages**:
- `/dashboard/clients` - List all clients
- `/dashboard/clients/new` - Create new client
- `/dashboard/clients/[id]` - View/edit client details + manage users

### Zone Management Module

**Overview**:
Zones are monitoring spaces within each client account. Each zone has its own data sources (X/Twitter, TikTok, Media) and can be configured independently. Zones are shared across all users of the same client, with different access rights based on user roles.

**Features**:
- ✅ **Create Zone**: Dialog with zone name input and auto-save
- ✅ **List Zones**: Displayed in sidebar with collapsible sub-navigation
- ✅ **Zone Pages**: Overview, Feed, Analysis, Settings for each zone
- ✅ **Data Sources**: Toggle X/Twitter, TikTok, Media sources per zone
- ✅ **Dynamic Tabs**: Conditional tabs based on enabled data sources
- ✅ **Zone Settings**: Edit name, operational context, active status, data sources
- ✅ **Professional Icons**: X and TikTok logos in UI elements
- ✅ **Delete Zone**: Soft delete with confirmation in danger zone
- ✅ **Role-Based Access**: Settings page hidden from operators
- ✅ **Toast Notifications**: Real-time feedback on all actions
- ✅ **Responsive**: Optimized for mobile and desktop
- ✅ **Loading States**: Professional skeletons with elegant shimmer animation

**Database Schema**:

**`public.zones` table**:
- `id` (UUID, PK)
- `name` (text) - Zone name
- `client_id` (UUID, FK to clients) - Client association
- `operational_context` (text, nullable) - Zone description/context
- `data_sources` (JSONB) - Enabled sources: `{ twitter, tiktok, media }`
- `settings` (JSONB) - Future custom settings
- `is_active` (boolean) - Active status
- `created_at`, `created_by`, `updated_at`

**Relationships**:
- `zones.client_id` → `clients.id` (many-to-one)
- Each zone belongs to exactly one client
- Multiple zones per client allowed

**RLS Policies**:
- Super admins can view/manage all zones
- Client users can view/manage zones from their own client only
- Operators can view zones but not edit settings
- Managers can view and edit zones
- RLS is **enabled**

**Access Control**:
- **super_admin**: Full access to all zones, can manage all settings
- **admin**: View-only access to all zones across all clients
- **operator**: Can view zones and data, but NOT settings pages
- **manager**: Can view and manage zones, including settings

**Architecture**:

**Data Layer** (`/lib/data/zones.ts`):
- `getZonesByClient()` - Get all zones for a client
- `getActiveZonesByClient()` - Get only active zones
- `getZoneById()` - Get single zone with client info
- `createZone()` - Create new zone
- `updateZone()` - Update zone details
- `deleteZone()` - Soft delete zone
- `toggleZoneActive()` - Toggle zone active status
- `updateZoneDataSources()` - Update enabled data sources

**Server Actions** (`/app/actions/zones.ts`):
- `getZonesAction()` - Fetch zones with permission checks
- `getZoneAction()` - Fetch single zone with permission checks
- `createZoneAction()` - Create zone with validation
- `updateZoneAction()` - Update zone with permission checks
- `deleteZoneAction()` - Delete zone with permission checks
- `toggleZoneActiveAction()` - Toggle active status
- `updateZoneDataSourcesAction()` - Update data sources
- All actions include cache revalidation and toast feedback

**Components** (`/components/dashboard/zones/`):
- `create-zone-dialog.tsx` - Zone creation popup (bottom of sidebar)
- `zones-sidebar-section.tsx` - Sidebar zone list with collapsible sub-pages
- `zone-page-header.tsx` - Zone title, description, and dynamic data source tabs
- `zone-settings-form.tsx` - Comprehensive settings form with auto-save

**Pages**:
- `/dashboard/zones/[zoneId]/overview` - Zone overview with metrics
- `/dashboard/zones/[zoneId]/feed` - Zone content feed
- `/dashboard/zones/[zoneId]/analysis` - Zone data analysis
- `/dashboard/zones/[zoneId]/settings` - Zone settings (hidden from operators)

**UI Design Patterns**:
- **Elegant Cards**: Subtle dashed borders (`border-dashed border-border/60`)
- **Muted Backgrounds**: Low opacity for subtle contrast (`bg-muted/30`)
- **Professional Icons**: X and TikTok logos instead of emojis
- **Smooth Transitions**: `duration-[150ms]` for responsive feel
- **Group Hover Effects**: Cards with icon color transitions
- **Danger Zone**: Distinct section with red accent for destructive actions

**Dynamic Tabs**:
- Tabs automatically rendered based on enabled data sources
- Each data source (X, TikTok, Media) appears as a tab with its logo
- Empty state displayed when no data sources are enabled
- Tabs persist across Overview, Feed, and Analysis pages
- URL parameter `source` controls active tab

**Future Development**:
- Each data source tab will load source-specific content
- Overview page: Metrics and KPIs per data source
- Feed page: Real-time posts and content from each source
- Analysis page: Analytics and insights per data source
- Settings: Source-specific configuration options

**Performance Considerations**:
- Zones cached for fast loading
- Data sources conditionally loaded based on enabled status
- Skeleton loading states for smooth UX
- Cache revalidation on all mutations
- Optimized for high-volume data monitoring

### Twitter Integration Module

**Overview**:
Complete real-time Twitter monitoring integration using twitterapi.io webhooks. Designed to handle 10,000+ tweets per hour with sub-50ms query performance.

**Features**:
- ✅ **Data Source Configuration**: Query Builder (visual) + Simple Mode (raw query)
- ✅ **Real-time Webhooks**: Automatic tweet reception from twitterapi.io
- ✅ **Profile Tracking**: Tag profiles with 7 label types (Attila, Ally, Adversary, etc.)
- ✅ **Deduplication**: Multi-level deduplication (tweets + profiles)
- ✅ **Entity Extraction**: Automatic hashtags, mentions, URLs extraction
- ✅ **Engagement Tracking**: Trigger-based with smart stopping (6h window, 50-70% API savings)
- ✅ **Dynamic Thresholds**: P25 per zone with Redis cache
- ✅ **Performance**: 58 database indexes, 5 materialized views, batch API optimization
- ✅ **Scalability**: Auto-proportional (2 tweets/day or 10k/hour works the same)

**Database Tables** (8):
1. `twitter_profiles` - Normalized user profiles (deduplication)
2. `twitter_tweets` - Tweets with engagement snapshots
3. `twitter_engagement_history` - Time-series engagement tracking
4. `twitter_profile_snapshots` - Profile evolution over time
5. `twitter_entities` - Hashtags, mentions, URLs (indexed for trending)
6. `twitter_rules` - Webhook rules configuration
7. `twitter_profile_zone_tags` - Profile categorization (7 types)
8. `twitter_engagement_tracking` - Tiered update scheduling

**Materialized Views** (5):
1. `twitter_zone_stats_hourly` - Hourly volume/engagement aggregates
2. `twitter_zone_stats_daily` - Daily aggregates for long-term trends
3. `twitter_top_profiles_by_zone` - Top influencers by engagement
4. `twitter_trending_hashtags` - Trending hashtag analysis
5. `twitter_share_of_voice` - Profile tag volume percentages

**Regular Views** (2):
1. `twitter_threads_with_context` - Recursive thread reconstruction
2. `twitter_orphaned_replies` - Missing parent tweet detection

**Data Layer** (`lib/data/twitter/`):
- `profiles.ts` - Profile CRUD + tagging + growth tracking
- `tweets.ts` - Tweet CRUD + search + filtering
- `engagement.ts` - Engagement tracking + snapshot creation
- `zone-stats.ts` - Dynamic thresholds (P25) + Redis cache
- `predictions.ts` - Engagement predictions (velocity-based, 5 metrics)
- `entities.ts` - Entity extraction + trending analysis
- `analytics.ts` - Aggregated stats + top profiles/tweets
- `threads.ts` - Thread reconstruction + orphan resolution
- `rules.ts` - Rule management + validation
- `query-builder.ts` - Query generation from UI config

**API Integration** (`lib/api/twitter/`):
- `client.ts` - TwitterAPI.io client (search, webhooks, rules CRUD)

**API Routes**:
- `POST /api/twitter/rules` - Create monitoring rule + activate
- `GET /api/twitter/rules` - List rules for zone
- `PATCH /api/twitter/rules/[id]` - Update rule
- `DELETE /api/twitter/rules/[id]` - Delete rule + webhook
- `POST /api/twitter/rules/[id]/toggle` - Activate/deactivate rule
- `POST /api/twitter/profiles/tags` - Tag profile
- `GET /api/twitter/profiles/tags` - List tagged profiles
- `DELETE /api/twitter/profiles/tags` - Remove tag
- `POST /api/webhooks/twitter` - Receive tweets + trigger engagement tracking
- `POST /api/twitter/engagement/track-lot` - Process engagement updates for tweet lot
- `GET /api/twitter/feed` - Fetch tweets with filters (including active tracking filter)
- `GET /api/twitter/engagement/[tweetId]` - Get engagement history + predictions + status
- `POST /api/twitter/engagement/snapshot` - Create manual engagement snapshot

**UI Components** (`components/dashboard/zones/twitter/`):
- `twitter-settings-tab.tsx` - Container with sub-tabs
- `twitter-data-source-tab.tsx` - Rules management interface
- `twitter-rules-list.tsx` - Active rules display with actions
- `twitter-rule-dialog.tsx` - Create/edit rule modal
- `twitter-query-builder.tsx` - Visual query builder with tags
- `twitter-tracked-profiles-tab.tsx` - Profile tagging interface (7 labels)
- `twitter-feed-tabs.tsx` - Feed/Profiles navigation with URL-based routing
- `twitter-feed-card.tsx` - Tweet display with engagement chart integration
- `twitter-feed-content.tsx` - Feed container with infinite scroll
- `twitter-feed-filters.tsx` - Advanced filtering system
- `twitter-engagement-chart.tsx` - Engagement evolution visualization with predictions
- `twitter-profiles-content.tsx` - Profiles container with infinite scroll
- `twitter-profiles-filters.tsx` - Profile search and filtering system
- `twitter-profile-card.tsx` - Profile display with stats tabs (50/50 layout)
- `twitter-profiles-skeleton.tsx` - Loading state for profiles

**Worker** (`lib/workers/twitter/`):
- `deduplicator.ts` - Process incoming tweets, normalize profiles, extract entities

**Configuration**:
- Environment: `TWITTER_API_KEY` (twitterapi.io API key)
- Webhook URL: `https://gorgone.vercel.app/api/webhooks/twitter`
- Auto-activation: Rules are created active by default
- Security: X-API-Key verification on webhook requests

**Performance Guarantees**:
- 10,000+ tweets/hour capacity (auto-scaling)
- All queries < 50ms (most < 10ms)
- Profile normalization: 70% storage savings
- Engagement tracking: 50-70% fewer API calls with smart stopping
- Batch API optimization: 10x fewer calls (20 tweets per call)
- Materialized views: 10-100x faster aggregations

**Label Types** (Share of Voice):
- 🔴 Attila - High-priority targets
- 🟠 Adversary - Opposition profiles
- 🟡 Surveillance - Under active monitoring
- 🔵 Target - Strategic interest
- 🟢 Ally - Friendly/supportive
- 🟣 Asset - Information sources
- 🔷 Local Team - Internal contacts

**Completed Features**:
- ✅ Feed UI with tweet cards + engagement evolution charts
- ✅ Advanced filters (date, engagement, verified, tracking status, post type, profile tags)
- ✅ **Language & Location filters** (21 languages, 210+ locations) - NEW
- ✅ Real-time engagement tracking with manual refresh
- ✅ Tracking status display (Active/Paused badges)
- ✅ Prediction visualization (3-hour forecasts)
- ✅ Profiles tab with complete stats + ratios
- ✅ Bidirectional navigation Feed ↔ Profiles
- ✅ Profile analytics with RPC SQL aggregation
- ✅ Government/Business badges + censorship alerts

**Future Features** (prepared):
- Thread Mapping with diagram view
- 3D Opinion Mapping (UMAP vectorization - embedding column ready)
- Real-time alerts (acceleration, peaks)

**Documentation**:
- See `TWITTER_INTEGRATION.md` for complete technical documentation
- See `DATABASE_SCHEMA.md` for full database architecture

### Dashboard Components

- **Header**: Logo, user menu, theme toggle, mobile menu button
- **Sidebar**: Navigation with role-based visibility
  - Dashboard (all users)
  - Clients (super_admin only)
- **Footer**: Copyright and information
- **Skeletons**: Loading states for all data-heavy components

### Mobile Optimization

- **Sidebar**: Collapsible drawer on mobile with hamburger menu
- **Responsive tables**: Card-style layout on mobile, table on desktop
- **Touch-friendly**: Proper touch targets (min 44x44px)
- **Adaptive spacing**: Uses design system spacing scale
- **Responsive forms**: Full-width inputs on mobile, optimized on desktop

## Configuration

### Environment Variables

See `env.template` for the complete list of required variables:

- **Supabase**: Database connection
- **Upstash Redis**: Cache layer
- **QStash**: Workers and schedules
- **Twitter API**: twitterapi.io integration (`TWITTER_API_KEY`)

## Deployment

### Vercel

The project is optimized for Vercel deployment with zero configuration.

**Automatic Deployment:**

1. Connect your GitHub repo to Vercel: https://vercel.com/new
2. Vercel auto-detects Next.js and configures everything
3. Configure environment variables (see below)
4. Every push to `main` triggers automatic deployment

**Deployment Features:**

- ⚡ **Edge Network**: Global CDN for ultra-low latency
- 🔄 **Zero downtime**: Atomic deployments
- 🎯 **Preview deployments**: Every branch gets a unique URL
- 📊 **Analytics**: Built-in Web Vitals and performance monitoring
- 🚀 **Instant rollbacks**: One-click rollback to any previous deployment

### Service Configuration

**1. Supabase**

- Create a project on https://supabase.com
- Get the URL and API keys from Settings > API
- Configure in Vercel:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`

**2. Upstash Redis**

- Create a Redis database on https://upstash.com
- Get the REST credentials
- Configure in Vercel:
  - `UPSTASH_REDIS_REST_URL`
  - `UPSTASH_REDIS_REST_TOKEN`

**3. QStash (Upstash)**

- Enable QStash in your Upstash account
- Get the token and signing keys
- Configure in Vercel:
  - `QSTASH_TOKEN`
  - `QSTASH_CURRENT_SIGNING_KEY`
  - `QSTASH_NEXT_SIGNING_KEY`
  - `QSTASH_URL` (usually `https://qstash.upstash.io`)

**4. Application URL**

- Vercel provides: `https://gorgone.vercel.app`
- Configure `NEXT_PUBLIC_APP_URL` with this URL
- Custom domains can be added in Vercel dashboard

## Authentication & Authorization

### Supabase Auth Integration

The application uses **Supabase Auth** with the new API keys system (not legacy JWT keys):

- **Publishable key**: `NEXT_PUBLIC_SUPABASE_ANON_KEY` (client-side)
- **Secret key**: `SUPABASE_SERVICE_ROLE_KEY` (server-side)

### User Roles

Four hierarchical roles are supported:

1. **Super Admin**: Full access, can create/delete clients and their data
2. **Admin**: Can access all client spaces as a visitor
3. **Operator**: Can view client spaces and all zones (except settings)
4. **Manager**: Can view client spaces and all zones (except settings)

### Database Schema

**`public.profiles` table**:

- `id` (UUID, FK to auth.users)
- `email` (unique)
- `role` (user role: super_admin, admin, operator, manager)
- `organization` (company name)
- `client_id` (UUID, FK to clients - NULL for super_admin)
- `created_at`, `created_by`, `updated_at`

**`public.clients` table**:

- `id` (UUID, PK)
- `name` (text, unique) - Client operation name
- `description` (text, nullable)
- `is_active` (boolean) - Active status
- `created_at`, `created_by`, `updated_at`

**Relationships**:

- `profiles.client_id` → `clients.id` (many-to-one)
- Super admins have `client_id = NULL`
- Client users have `client_id` set to their client

**RLS Policies**:

**profiles table**:
- Users can view their own profile
- Super admins can view/manage all profiles
- Users can view profiles from their own client
- RLS is **enabled**

**clients table**:
- Super admins can view/manage all clients
- Client users can view their own client only
- RLS is **enabled**

**Data Isolation**:

All client-specific data (future: alerts, analytics, etc.) will use `client_id` for:
- **Compartmentalization**: Each client sees only their data
- **Shared tables**: Common tables filtered by `client_id`
- **RLS enforcement**: Database-level security

**Important**: Server-side auth uses admin client to bypass RLS when reading profiles to avoid circular dependencies.

### Auth Implementation

**Files**:

- `lib/supabase/client.ts`: Browser client
- `lib/supabase/server.ts`: Server Components client
- `lib/supabase/admin.ts`: Admin client (bypasses RLS)
- `lib/auth/permissions.ts`: Role hierarchy and permissions
- `lib/auth/utils.ts`: Auth helper functions (`getCurrentUser`, `getUserProfile`, etc.)
- `components/auth/login-form.tsx`: Login form component
- `app/login/page.tsx`: Login page
- `app/actions/auth.ts`: Server actions (logout)
- `app/actions/clients.ts`: Server actions for client management
- `middleware.ts`: Route protection and redirects

**Protected Routes**:

- `/dashboard/*` → Requires authentication
- `/login`, `/` → Redirects to dashboard if authenticated

### User Creation

Users are created manually by Super Admins via the Admin API:

- No email confirmation required initially
- Username/password provided directly to clients
- User creation triggers automatic profile creation (via DB trigger)

## Completed Features

1. ✅ **Authentication**: Supabase Auth with role-based access
2. ✅ **Database Schema**: Profiles, clients, zones, Twitter + TikTok + Media tables with RLS policies
3. ✅ **Client Management**: Complete CRUD for clients and users
4. ✅ **Zone Management**: Complete CRUD for zones with data sources and dynamic tabs
5. ✅ **Twitter Integration**: Complete real-time monitoring with webhooks
   - Data Source configuration (Query Builder + Simple Mode)
   - Profile tracking (7 label types)
   - Real-time webhook reception
   - Deduplication + entity extraction
   - Engagement tracking (tiered strategy)
   - Engagement evolution charts with predictions
   - Feed with advanced filters and tracking status
   - 8 tables, 5 materialized views, 2 regular views
   - 9 data layer modules + API client + worker
   - 7 UI components (including engagement chart)
   - 7 API routes (including engagement endpoints)
6. ✅ **TikTok Integration**: Complete polling-based monitoring
   - Data Source configuration (4 rule types: keyword, hashtag, user, combined)
   - Profile tracking (7 label types - same as Twitter)
   - Polling-based collection (1h, 3h, 6h intervals)
   - Deduplication + entity extraction
   - Engagement tracking (5 metrics: views, likes, comments, shares, saves)
   - Engagement evolution charts with predictions
   - Feed with autocomplete and advanced filters
   - **Language & Location filters** (18 languages, POI-based locations)
   - Infinite scroll with Intersection Observer
   - 8 tables (profiles, rules, videos, entities, tags, history, tracking, snapshots)
   - 7 data layer modules + API client + worker + predictions
   - 14 UI components (feed, cards, charts, filters, settings, skeletons)
   - 13 API routes (10 prod + 3 test)
7. ✅ **Design System**: Professional government-grade CSS variables with elegant card patterns
8. ✅ **UI Components**: Toast notifications, elegant shimmer skeletons, responsive layouts
9. ✅ **Data Layer**: Centralized data access with type safety
10. ✅ **Documentation**: Complete design system, architecture, and integration docs
11. ✅ **Language & Location Filtering**: Multi-source filtering system (NEW)
   - Dynamic language filters (ISO 639-1 and ISO 639-3 support)
   - Dynamic location filters (Twitter: free-text, TikTok: POI, Media: normalized countries)
   - Redis cache with 5-minute TTL for optimal performance
   - Reusable UI components across all sources
   - Real-time updates with auto-save
   - 16 files modified, production-ready architecture
12. ✅ **Chat Intelligence (AL-IA)**: AI-powered chatbot for data analysis and reporting
   - 14 AI tools covering 100% of monitoring use cases
   - Multi-platform analysis (Twitter + TikTok + Media simultaneously)
   - Interactive visualizations (Line/Bar/Area charts with Recharts)
   - Markdown rendering with syntax highlighting
   - Integrated sidebar (desktop) / Sheet overlay (mobile)
   - Auto-context detection (follows zone navigation)
   - Quick actions (12 predefined questions)
   - Copy to clipboard functionality
   - Real-time streaming responses (Vercel AI SDK + GPT-4o)
   - 4 database tables (conversations, messages, usage, reports)
   - Cross-platform search and comparison
   - Opinion map integration (UMAP clustering insights)
   - Share of voice analysis (profile tag distribution)
   - Sentiment analysis (media + engagement-based)
   - Anomaly detection (volume spikes, viral content)
   - Comprehensive report generation
13. ✅ **Report Builder**: Rich text reports with embedded visualizations
   - Tiptap 3.x editor with custom node extensions
   - 7 custom nodes (Charts, Stats, Tweets, TikTok, Articles, Accounts, Opinion Reports)
   - AI tool integration ("Add to Report" from chatbot responses)
   - Auto-save with debounce (2s delay)
   - Library panel for quick content insertion
   - Content picker for embedding zone data
   - PDF export functionality
   - JSON serialization for Server Actions (best practice for complex nested objects)

### Report Builder Module

**Overview**:
Rich text report creation with embedded visualizations from monitoring data. Uses Tiptap 3.x as the WYSIWYG editor with custom node extensions for interactive content.

**Features**:
- ✅ **Tiptap 3.x Integration**: Modern rich text editor with React NodeViews
- ✅ **7 Custom Node Extensions**: Charts, Stats Cards, Tweets, TikTok Videos, Articles, Accounts, Opinion Reports
- ✅ **AI Integration**: "Add to Report" button on chatbot responses
- ✅ **Auto-Save**: Debounced auto-save (2s delay) with visual feedback
- ✅ **Library Panel**: Quick insertion of charts and stats
- ✅ **Content Picker**: Embed tweets, videos, articles from zone monitoring
- ✅ **PDF Export**: Export reports to PDF format
- ✅ **Mobile Responsive**: Optimized for desktop and mobile

**Architecture**:

**Data Layer** (`lib/data/reports.ts`):
- `getReportsByClient()` - List reports for a client
- `getReportById()` - Get single report with zone info
- `createReport()` - Create new report
- `updateReport()` - Update report content/metadata
- `updateReportStatus()` - Publish/unpublish report
- `deleteReport()` - Soft delete report
- `duplicateReport()` - Clone existing report

**Server Actions** (`app/actions/reports.ts`):
- `createReportAction()` - Create with zone assignment
- `updateReportAction()` - Auto-save with JSON serialization
- `updateReportStatusAction()` - Publish/draft toggle
- `deleteReportAction()` - Delete with permission checks
- `duplicateReportAction()` - Clone report

**Tiptap Extensions** (`components/dashboard/reports/extensions/`):
- `chart-node.tsx` - Line/Bar/Area charts (Recharts)
- `stats-node.tsx` - Stats cards with trends
- `tweet-node.tsx` - Twitter post embeds
- `tiktok-node.tsx` - TikTok video embeds
- `article-node.tsx` - Media article embeds
- `account-node.tsx` - Profile/account cards
- `opinion-report-node.tsx` - Opinion analysis embeds
- `types.ts` - Shared type definitions

**Extension Pattern** (Tiptap 3.x Best Practices):
```typescript
// All extensions follow this pattern:
addAttributes() {
  return {
    dataAttr: {
      default: null,  // null allows serialization of non-default values
      parseHTML: (el) => el.getAttribute('data-attr'),
      renderHTML: (attrs) => ({ 'data-attr': attrs.dataAttr }),
    },
  };
}
```

**Server Action Serialization**:
Complex nested objects (like Tiptap document with custom node attrs) must be serialized as JSON strings before Server Action transmission to prevent data loss:
```typescript
// Client: Serialize before sending
const serializedContent = JSON.stringify(updatedContent);
await updateReportAction(id, { contentJson: serializedContent });

// Server: Parse after receiving
const parsedContent = JSON.parse(updates.contentJson);
```

**UI Components** (`components/dashboard/reports/`):
- `report-editor.tsx` - Main Tiptap editor wrapper
- `report-editor-page.tsx` - Full page with toolbar and panels
- `report-toolbar.tsx` - Formatting toolbar
- `report-library-panel.tsx` - Quick insertion panel
- `report-content-picker.tsx` - Zone content selection dialog
- `report-pdf-export.ts` - PDF generation utility

**Context** (`lib/contexts/report-editor-context.tsx`):
- Provides global editor instance access
- Enables "Add to Report" from AI chatbot
- Manages editor registration/unregistration

**Database Schema**:
- `chat_reports` table in Supabase
- JSONB `content` field stores:
  - `tiptap_document`: Full editor JSON
  - `config`: Report period and data sources
  - `metadata`: Word count, last edited, etc.
  - `embedded_items`: Cached embedded content

**Performance Considerations**:
- Auto-save uses debounce to prevent excessive API calls
- Content serialized as JSON for reliable Server Action transmission
- Skeleton loading for smooth UX
- Editor state managed via refs to avoid stale closures

## Next Steps

1. **Twitter Feed UI**:
   - Tweet cards with engagement evolution curves
   - Profiles tab with stats and ratios
   - Thread Mapping with diagram view
   - Advanced filters (date picker, engagement, verified status)
   - Search with autocomplete

2. **Twitter Analytics**:
   - Volume charts (3h, 6h, 12h, 24h, 7d, 30d periods)
   - Top profiles/tweets by engagement
   - Share of Voice visualization
   - Trending hashtags dashboard
   - Real-time alerts (acceleration detection, peaks)

3. **QStash Workers**:
   - Engagement update cron (tiered strategy)
   - Materialized view refresh (hourly/daily)
   - Orphaned tweet resolution (on-demand)
   - Old data cleanup (weekly)

4. **Redis Cache Layer**:
   - Cache materialized view results (2-min TTL)
   - Cache top profiles/tweets
   - Real-time stats caching

5. **Advanced Twitter Features**:
   - 3D Opinion Mapping (UMAP + OpenAI embeddings)
   - Sentiment analysis
   - Custom alert rules
   - Thread conversation mapping UI

6. **Multi-Platform Monitoring**:
   - TikTok integration
   - Media monitoring
   - Cross-platform analytics

7. **Performance & Testing**:
   - Load testing with 10K tweets/hour
   - E2E tests (Playwright)
   - Engagement update worker deployment
   - Security audits

## Important Notes

- **Performance**: App must handle large volumes of data (millions of alerts)
- **Security**: Government-grade security with RLS, security headers, role-based access
- **UX**: Fluid, professional, minimalist, elegant interface
- **Design System**: All components use CSS variables - NO hardcoded values
- **Mobile**: Fully responsive, mobile-first approach
- **Scalability**: Production-ready architecture with data layer separation
- **Language**: All text MUST be in English (UI, code, comments, variables)
- **Code Quality**: ESLint + Prettier, run `npm run format` before commits
- **Error Handling**: Centralized logger, user-friendly error messages, toast notifications
- **SEO**: Comprehensive metadata, sitemap, robots.txt, PWA manifest
- **Type Safety**: Full TypeScript coverage, validated environment variables
- **Data Isolation**: All client data compartmentalized via `client_id`
- **Animations**: Subtle and professional (150-250ms, smooth easing)
- **Documentation**: Keep `DESIGN_SYSTEM.md` and `context.md` updated for all changes

## Documentation Files

### Core Documentation
- **`README.md`**: Project overview and getting started
- **`context.md`**: This file - complete project context and architecture
- **`DESIGN_SYSTEM.md`**: Complete design system guide with patterns and examples
- **`DATABASE_SCHEMA.md`**: Complete database architecture and schema
- **`env.template`**: Environment variables template

### Module Documentation
- **`TWITTER_INTEGRATION.md`**: Twitter integration technical documentation
- **`TIKTOK_INTEGRATION.md`**: TikTok integration technical documentation
- **`ENGAGEMENT_EVOLUTION_FEATURE.md`**: Engagement charts and tracking status feature
- **`LOADING_STATES.md`**: Loading states and skeleton patterns
- **`CHATBOT_INTEGRATION.md`**: AI chatbot tools and integration
- **Report Builder**: See "Report Builder Module" section in this file
