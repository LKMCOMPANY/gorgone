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

### Color Palette

- **Background**: White (light) / Black (#0A0A0A in dark)
- **Foreground**: Black (light) / White (dark)
- **Accent**: #7550ff (purple) - main brand color

### Theme

- Full dark/light mode support
- CSS variables in `globals.css` using OKLCH
- Mobile-first responsive system

### Typography

- **Sans**: Geist Sans
- **Mono**: Geist Mono
- **Components**: Use Shadcn typography components (`TypographyH1`, `TypographyH2`, `TypographyP`, etc.)
- **Consistency**: Never hardcode text styles, always use typography components

### Loading States

- **No global loaders**: Avoid duplicate loading states
- **Component-level skeletons**: Use Shadcn skeleton component on specific sections
- **Graceful degradation**: Show skeletons while data loads

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
