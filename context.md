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
- **Typography**: Shadcn typography components for consistency

### Backend & Services

- **Database**: Supabase (PostgreSQL)
- **Cache**: Upstash Redis
- **Workers & Schedules**: QStash (Upstash)
- **Deployment**: Vercel (Edge Network)

## Architecture

### Folder Structure

```
/app                    # Next.js pages (App Router)
  /dashboard           # Admin dashboard pages
  layout.tsx           # Root layout with ThemeProvider
  page.tsx             # Home page
  globals.css          # Global styles and CSS variables

/components            # Reusable components
  /ui                  # Shadcn UI components + Typography
  /dashboard           # Dashboard-specific components

/lib                   # Business logic and utilities
  /providers           # React providers (theme, etc.)
  /data                # Data layer - data access
  /cache               # Redis helpers
  /hooks               # Custom React hooks
  constants.ts         # Centralized constants
  utils.ts             # General utilities
  metadata.ts          # SEO metadata configuration
  env.ts               # Type-safe environment variables
  logger.ts            # Centralized logging

/types                 # Centralized TypeScript types

/middleware.ts         # Security headers and middleware
/components/theme-toggle.tsx  # Standalone theme toggle component
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

**Type Scale** (use utility classes):
```css
.text-display     → 36px / 700 / -0.02em (hero headings)
.text-heading-1   → 30px / 700 / -0.01em (page titles)
.text-heading-2   → 24px / 600 / -0.01em (section titles)
.text-heading-3   → 20px / 600 (subsections)
.text-body        → 16px / 400 (normal text)
.text-body-sm     → 14px / 400 (compact text)
.text-caption     → 12px / 400 (meta info, reduced opacity)
```

**Typography Rules**:
- ✅ Use custom utility classes: `text-heading-1`, `text-body-sm`, `text-caption`
- ✅ Pair with semantic HTML: `<h1 className="text-heading-1">`, `<p className="text-body">`
- ❌ NEVER hardcode font sizes: `text-[18px]` or `text-lg` for headings
- ❌ NEVER use old Shadcn typography components (`TypographyH1`, `TypographyP`)

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

**Professional Interactive Cards**:

**Base Style**:
```tsx
<div className="card-interactive">
  {/* Content */}
</div>
```

**What it does**:
- Subtle border color change on hover
- Soft shadow on hover (depth without distraction)
- Smooth 250ms transition
- Theme-aware (different shadows for dark mode)

**Card Variations**:
```tsx
// Standard content card
<Card className="card-padding">  → 24px internal padding

// Interactive list item
<div className="card-interactive flex p-4"> → hover effects + flex

// Form container
<Card className="card-padding space-y-6"> → form field spacing
```

**Rules**:
- ✅ Use `.card-interactive` for hoverable cards
- ✅ Use `.card-padding` for consistent internal spacing
- ✅ Combine with layout classes: `flex`, `grid`, `space-y-*`
- ❌ NEVER hardcode padding in cards: Use `.card-padding`

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
- [ ] Use typography utility classes (`.text-heading-*`, `.text-body*`)
- [ ] Use spacing system (`.card-padding`, consistent `space-y-*`)
- [ ] Add subtle transitions (`duration-[150ms]` or `duration-[250ms]`)
- [ ] Use `.card-interactive` for hoverable cards
- [ ] Use `.link-primary` for links
- [ ] Add `.animate-in` to page containers
- [ ] Input fields: `h-10` + focus shadow
- [ ] Test in both light and dark mode
- [ ] Verify responsive behavior (mobile-first)

### 🚫 Anti-Patterns (DO NOT DO)

❌ Hardcoded colors: `bg-white`, `text-black`, `#7550ff`  
❌ Random font sizes: `text-[17px]`, `text-lg` for headings  
❌ Inconsistent spacing: `mt-[13px]`, `gap-[19px]`  
❌ Old components: `<TypographyH1>`, `<TypographyP>`  
❌ Long animations: `duration-500`, `duration-1000`  
❌ Hardcoded transitions: `hover:bg-gray-100`  
❌ Manual theme checks: `{theme === 'dark' ? ... : ...}`  
❌ No hover states on interactive elements  

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
2. **Admin Dashboard** (`/dashboard`): Interface with header, sidebar, footer

### Dashboard Components

- **Header**: Logo, theme toggle, mobile menu button (responsive)
- **Sidebar**: Main navigation (collapsible, mobile-friendly with drawer)
- **Footer**: Copyright and information

### Mobile Optimization

- **Sidebar**: Collapsible on mobile with hamburger menu in header
- **Responsive spacing**: Adaptive padding (p-4 sm:p-6 lg:p-8)
- **Touch-friendly**: All interactive elements have proper touch targets
- **Responsive typography**: Text scales appropriately across breakpoints

## Configuration

### Environment Variables

See `env.template` for the complete list of required variables:

- Supabase: database connection
- Upstash Redis: cache
- QStash: workers and schedules

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
- `role` (user role)
- `organization` (company name)
- `created_at`, `created_by`, `updated_at`

**RLS Policies**:

- Users can view their own profile
- Super admins can manage all profiles
- RLS is **enabled** on `public.profiles`
- RLS is **disabled** on `auth.*` tables (managed by Supabase)

**Important**: Server-side auth uses admin client to bypass RLS when reading profiles to avoid circular dependencies (RLS policies that check roles from the same table).

### Auth Implementation

**Files**:

- `lib/supabase/client.ts`: Browser client
- `lib/supabase/server.ts`: Server Components client
- `lib/supabase/admin.ts`: Admin client (bypasses RLS)
- `lib/auth/permissions.ts`: Role hierarchy and permissions
- `lib/auth/utils.ts`: Auth helper functions
- `components/auth/login-form.tsx`: Login form component
- `app/login/page.tsx`: Login page
- `app/actions/auth.ts`: Server actions (logout)
- `middleware.ts`: Route protection and redirects

**Protected Routes**:

- `/dashboard/*` → Requires authentication
- `/login`, `/` → Redirects to dashboard if authenticated

### User Creation

Users are created manually by Super Admins via the Admin API:

- No email confirmation required initially
- Username/password provided directly to clients
- User creation triggers automatic profile creation (via DB trigger)

## Next Steps

1. ✅ Authentication implemented with Supabase Auth
2. ✅ Database schema created with RLS
3. **Create admin page to manage users** (add/edit/delete clients)
4. Implement QStash workers for monitoring
5. Create monitoring and analytics pages
6. Implement Redis cache
7. Testing and performance optimizations

## Important Notes

- **Performance**: App must handle large volumes of data
- **Security**: Designed for enterprises and government - security headers via middleware
- **UX**: Fluid, professional, minimalist interface
- **Mobile**: Optimized for mobile and desktop
- **Scalability**: Production-ready architecture
- **Language**: All text MUST be in English (UI, code, comments)
- **Code Quality**: Use `npm run format` before commits, `npm run lint:fix` for errors
- **Error Handling**: All errors logged via centralized logger
- **SEO**: Comprehensive metadata, sitemap, robots.txt, PWA manifest
- **Type Safety**: Environment variables validated via `lib/env.ts`
