# Gorgone Design System

**Version**: 2.1  
**Last Updated**: November 13, 2025  
**Status**: ✅ Production Ready

**Latest**: Elegant shimmer skeleton animation (v2.1)

---

## 🎯 Overview

Gorgone uses a **professional, government-grade design system** built on:
- **Tailwind CSS 4** with custom CSS variables
- **Shadcn UI** components
- **OKLCH color space** for perceptual uniformity
- **Mobile-first** responsive design

**Core Principle**: NO hardcoded values. Everything uses CSS variables and utility classes.

---

## 🎨 Color System

### Base Colors (OKLCH)

```css
/* Light Mode */
--primary: oklch(0.54 0.22 285)        /* Brand purple */
--background: oklch(1 0 0)              /* Pure white */
--foreground: oklch(0.145 0 0)          /* Near black */
--muted: oklch(0.97 0 0)                /* Subtle gray */
--border: oklch(0.922 0 0)              /* Light border */

/* Dark Mode */
--primary: oklch(0.62 0.24 285)        /* Lighter purple */
--background: oklch(0.145 0 0)          /* Near black */
--foreground: oklch(0.985 0 0)          /* Off white */
--muted: oklch(0.269 0 0)               /* Dark gray */
--border: oklch(1 0 0 / 10%)            /* Transparent border */
```

### Usage

✅ **DO**:
```tsx
<div className="bg-background text-foreground border-border">
<div style={{ color: 'var(--foreground)' }}>
```

❌ **DON'T**:
```tsx
<div className="bg-white text-black border-gray-200">
<div style={{ color: '#000000' }}>
```

---

## ✍️ Typography

### Font Stack

- **Primary**: Geist Sans (system-ui fallback)
- **Mono**: Geist Mono (monospace fallback)
- **Features**: Ligatures (`rlig`, `calt`), Optimized rendering

### Type Scale

| Class | Size | Weight | Letter Spacing | Usage |
|-------|------|--------|----------------|-------|
| `.text-display` | 36px | 700 | -0.02em | Hero sections |
| `.text-heading-1` | 30px | 700 | -0.01em | Page titles |
| `.text-heading-2` | 24px | 600 | -0.01em | Section titles |
| `.text-heading-3` | 20px | 600 | 0 | Subsections |
| `.text-body` | 16px | 400 | 0 | Body text |
| `.text-body-sm` | 14px | 400 | 0 | Compact text |
| `.text-caption` | 12px | 400 | 0 | Meta info |

### Examples

```tsx
// Page title
<h1 className="text-heading-1">Clients</h1>

// Section title
<h2 className="text-heading-2">User Management</h2>

// Body text
<p className="text-body-sm text-muted-foreground">
  Manage your team members
</p>

// Meta info
<span className="text-caption">Created 2 days ago</span>
```

---

## 📐 Spacing System

### Scale

```css
--spacing-section:    48px   /* Between major sections */
--spacing-container:  32px   /* Main container padding */
--spacing-card:       24px   /* Card internal padding */
--spacing-element:    16px   /* Between elements */
--spacing-compact:    12px   /* Compact layouts */
--spacing-tight:      8px    /* Minimal spacing */
```

### Utility Classes

```css
.card-padding        → padding: var(--spacing-card)
.container-padding   → padding: var(--spacing-container)
.section-spacing     → margin-bottom: var(--spacing-section)
```

### Usage Guidelines

✅ **Prefer**: `space-y-6`, `gap-4`, `mb-8`, `p-4`  
✅ **Use**: 4px increments (1, 1.5, 2, 3, 4, 6, 8, 12, 16, 24, 32, 48)  
❌ **Avoid**: `mt-[13px]`, `gap-[19px]`, random values

---

## 🎭 Animations & Transitions

### Speeds

```css
--transition-fast:  150ms   /* Hover, simple changes */
--transition-base:  250ms   /* Default interactions */
--transition-slow:  350ms   /* Complex transitions */
```

### Easing

All animations use: `cubic-bezier(0.4, 0, 0.2, 1)` (smooth deceleration)

### Common Patterns

```tsx
// Hover state
<button className="transition-colors duration-[150ms] hover:text-primary">

// Focus state
<input className="transition-shadow duration-[150ms] focus-visible:shadow-[var(--shadow-sm)]">

// Card hover
<div className="card-interactive">  {/* 250ms transition built-in */}

// Page load
<div className="animate-in" style={{ animationDelay: "50ms" }}>
```

### Page Load Animation

All pages should fade in:

```tsx
export default function Page() {
  return (
    <div className="animate-in" style={{ animationDelay: "50ms" }}>
      {/* Content */}
    </div>
  );
}
```

**Effect**: Fade in + 4px translate up, 250ms duration

### Skeleton Loading Animation

**Elegant Shimmer Effect**:

Gorgone uses a sophisticated shimmer wave animation for loading states, not the harsh `animate-pulse`:

```tsx
<Skeleton className="h-10 w-full" />
```

**Design Characteristics**:
- **Wave animation**: Smooth gradient sweep left-to-right (2s loop)
- **Ultra-subtle**: Low opacity for minimal distraction
- **Theme-aware**: Automatically adapts to light/dark mode
- **GPU-accelerated**: Uses `transform` for performance

**Technical Details**:

```css
/* Light Mode */
.skeleton-shimmer {
  background: oklch(from var(--muted) l c h / 0.4);  /* 40% base */
  /* Shimmer gradient: 0% → 15% → 0% opacity */
  animation: shimmer 2s ease-in-out infinite;
}

/* Dark Mode (softer) */
.dark .skeleton-shimmer {
  background: oklch(from var(--muted) l c h / 0.2);  /* 20% base */
  /* Shimmer gradient: 0% → 8% → 0% opacity */
}
```

**Visual Effect**:
```
Light: ████░░░░░░░  →  ░░░░████░░░  →  ░░░░░░░░████
Dark:  ███░░░░░░░░  →  ░░░░███░░░  →  ░░░░░░░░███
       (40% base)     (15% wave)     (smooth sweep)
```

**Benefits**:
- ✅ Professional, minimal visual noise
- ✅ Better than pulse (not distracting)
- ✅ Modern "premium app" feel
- ✅ Works perfectly in light and dark mode

**Usage**:
```tsx
// Always show skeleton during loading
if (loading) {
  return <MySkeleton />;  // ✅ NOT null
}

// Skeleton component structure
export function MySkeleton() {
  return (
    <Card className="card-padding">
      <Skeleton className="h-10 w-full max-w-sm" />  {/* Search */}
      <div className="space-y-2.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    </Card>
  );
}
```

---

## 🃏 Card System

### Interactive Cards

```tsx
// Hoverable card (list items, clickable cards)
<div className="card-interactive flex p-4">
  {/* Content */}
</div>
```

**Includes**:
- Border color change on hover
- Subtle shadow on hover
- 250ms transition
- Dark mode support

### Content Cards

```tsx
// Standard content card
<Card className="card-padding">
  {/* 24px padding, no hover effects */}
</Card>

// Form container
<Card className="card-padding space-y-6">
  {/* Form fields with 24px spacing */}
</Card>
```

### Elegant Card Patterns

**Subtle Dashed Borders with Muted Backgrounds**:

For grouped content or sections that need visual separation without being too prominent:

```tsx
// Subtle container with dashed border
<div className="rounded-lg border border-dashed border-border/60 bg-muted/30 p-6">
  {/* Content */}
</div>

// Settings section (toggle group)
<div className="rounded-lg border border-border bg-muted/30 p-4 transition-colors duration-[150ms] hover:bg-muted/40">
  <div className="flex items-center justify-between">
    <div className="space-y-0.5">
      <Label className="text-body-sm font-medium">Feature Name</Label>
      <p className="text-caption text-muted-foreground">Feature description</p>
    </div>
    <Switch />
  </div>
</div>

// Data source card (with icon and hover)
<div className="group rounded-lg border border-border bg-card p-6 transition-all duration-[150ms] hover:border-primary/50 hover:shadow-sm">
  <div className="flex items-start gap-4">
    <div className="flex-shrink-0 rounded-lg bg-primary/10 p-3 transition-colors duration-[150ms] group-hover:bg-primary/20">
      {/* Icon */}
    </div>
    <div className="flex-1 space-y-2">
      <h3 className="text-body font-semibold">Source Name</h3>
      <p className="text-body-sm text-muted-foreground">Description</p>
    </div>
  </div>
</div>
```

**Visual Characteristics**:
- **Borders**: `border-border/60` (60% opacity) for subtle, non-intrusive lines
- **Backgrounds**: `bg-muted/30` or `bg-muted/40` (30-40% opacity) for subtle gray tones
- **Dashed borders**: `border-dashed` for visual differentiation from solid borders
- **Hover states**: Increase opacity (`hover:bg-muted/40`) or add border color (`hover:border-primary/50`)
- **Smooth transitions**: Always `duration-[150ms]` for instant responsiveness

**Benefits**:
- ✅ **Excellent readability** in both light and dark themes
- ✅ **Subtle contrast** that doesn't overwhelm
- ✅ **Professional look** suitable for government/enterprise apps
- ✅ **Clear hierarchy** through varied opacity levels
- ✅ **Responsive feel** with smooth hover states

**Usage Examples**:
```tsx
// Information panel (low emphasis)
<div className="rounded-lg border border-dashed border-border/60 bg-muted/30 p-6">
  <p className="text-body-sm text-muted-foreground">
    No data sources enabled yet.
  </p>
</div>

// Section group (medium emphasis)
<div className="space-y-3 rounded-lg border border-border bg-muted/30 p-4">
  {items.map((item) => (
    <div key={item.id} className="rounded-lg border border-border bg-card p-4">
      {/* Item content */}
    </div>
  ))}
</div>

// Danger zone (high emphasis)
<div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6">
  <h3 className="text-heading-3 text-destructive">Danger Zone</h3>
  <p className="text-body-sm text-muted-foreground">
    Irreversible actions
  </p>
</div>
```

---

## 🔗 Links

### Standard Link

```tsx
<Link href="/dashboard" className="link-primary font-medium">
  Dashboard
</Link>
```

**Includes**:
- Default: foreground color
- Hover: primary color
- 150ms transition
- No underline (add `.underline` if needed)

---

## 📦 Component Patterns

### Input Fields

```tsx
<Label htmlFor="name">Name</Label>
<Input
  id="name"
  placeholder="Enter name"
  className="h-10 transition-shadow duration-[150ms] focus-visible:shadow-[var(--shadow-sm)]"
/>
<p className="text-caption">Helper text</p>
```

### Page Header

```tsx
<div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
  <div className="space-y-1.5">
    <h1 className="text-heading-1">Page Title</h1>
    <p className="text-body-sm text-muted-foreground">
      Page description
    </p>
  </div>
  <Button>Action</Button>
</div>
```

### Empty State

```tsx
<div className="py-16 text-center">
  <p className="text-body-sm text-muted-foreground">
    No items found
  </p>
</div>
```

### Loading State (Skeletons)

**Always visible, never null**:

```tsx
import { Skeleton } from "@/components/ui/skeleton";

// ✅ Show skeleton during loading
if (loading) {
  return <MySkeleton />;
}

// ❌ DON'T return null
// if (loading) return null;

// Skeleton structure (matches loaded content)
export function MySkeleton() {
  return (
    <Card className="card-padding">
      <div className="space-y-5">
        {/* Search bar */}
        <Skeleton className="h-10 w-full max-w-sm" />
        
        {/* List items */}
        <div className="space-y-2.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex gap-3 rounded-lg border p-4">
              <Skeleton className="h-10 w-10 rounded-full" />  {/* Avatar */}
              <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-[160px]" />  {/* Title */}
                <Skeleton className="h-3 w-[120px]" />  {/* Subtitle */}
              </div>
              <Skeleton className="h-6 w-[60px] rounded-full" />  {/* Badge */}
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
```

**Key Points**:
- Uses elegant shimmer animation (not pulse)
- Matches exact layout of loaded content
- Responsive (hide/show elements like real content)
- Always visible during loading states

### Status Toggle

```tsx
<div className="flex items-center justify-between rounded-lg border p-4 transition-colors duration-[150ms] hover:bg-muted/30">
  <div className="space-y-0.5">
    <Label className="text-body-sm font-medium">Feature Name</Label>
    <p className="text-caption">Feature description</p>
  </div>
  <Switch checked={enabled} onCheckedChange={setEnabled} />
</div>
```

---

## 🌓 Dark Mode

### Automatic Support

All components automatically support dark mode through CSS variables:

```tsx
// This works in both light and dark mode
<div className="bg-background text-foreground border-border">
```

### Testing

Always test new components in both modes:
1. Light mode (default)
2. Dark mode (theme toggle in header)

❌ **NEVER** manually check theme:
```tsx
// DON'T DO THIS
{theme === 'dark' ? <DarkComponent /> : <LightComponent />}
```

---

## 📋 Component Checklist

When creating new components:

- [ ] Uses CSS variable colors (no hardcoded)
- [ ] Typography utility classes (`.text-heading-*`, `.text-body-*`)
- [ ] Spacing system (`.card-padding`, consistent `space-y-*`)
- [ ] Subtle transitions (`duration-[150ms]` or `duration-[250ms]`)
- [ ] `.card-interactive` for hoverable cards
- [ ] `.link-primary` for navigation links
- [ ] `.animate-in` for page containers
- [ ] Input fields: `h-10` + focus shadow
- [ ] Tested in light and dark mode
- [ ] Mobile responsive (test on small screens)

---

## 🚫 Anti-Patterns

### Colors
❌ `bg-white`, `text-black`, `border-gray-200`  
✅ `bg-background`, `text-foreground`, `border-border`

### Typography
❌ `text-[18px]`, `text-lg`, `<TypographyH1>`  
✅ `text-heading-2`, `<h2 className="text-heading-2">`

### Spacing
❌ `mt-[13px]`, `gap-[19px]`  
✅ `mt-4`, `gap-6` (4px increments)

### Animations
❌ `duration-500`, `duration-1000`, no transitions  
✅ `duration-[150ms]`, `duration-[250ms]`

### Skeletons
❌ `animate-pulse`, returning `null` during loading  
✅ `.skeleton-shimmer`, always show skeleton component

❌ Generic skeleton that doesn't match content:
```tsx
<Skeleton className="h-64 w-full" />
```

✅ Detailed skeleton matching exact layout:
```tsx
<MySkeleton />  {/* Structured with proper spacing */}
```

### Cards
❌ `p-6`, `hover:bg-gray-50`  
✅ `.card-padding`, `.card-interactive`

### Links
❌ `hover:text-blue-500`, manual hover styles  
✅ `.link-primary`

### Theme
❌ `{theme === 'dark' ? ... : ...}`  
✅ CSS variables handle this automatically

---

## 🎯 Quality Standards

This design system ensures:

✅ **Consistency**: Same patterns everywhere  
✅ **Accessibility**: Proper contrast, focus states  
✅ **Performance**: GPU-accelerated animations  
✅ **Maintainability**: Change once, applies everywhere  
✅ **Professionalism**: Government/enterprise-grade quality  
✅ **Scalability**: Easy to extend and maintain  
✅ **Dark mode**: Automatic support everywhere  

---

## 📚 Resources

- **Full docs**: See `context.md` → Design System section
- **Global styles**: `app/globals.css`
- **Components**: `components/ui/` (Shadcn)
- **Examples**: All pages in `app/dashboard/clients/`

---

## 🔄 Updates

To update this design system:

1. **Add CSS variables** in `app/globals.css`
2. **Create utility classes** in `@layer utilities`
3. **Document patterns** in this file + `context.md`
4. **Update existing components** to use new patterns
5. **Test** in light + dark mode

---

**Remember**: The design system is the foundation of quality. Follow it religiously, and the app will maintain its professional, polished look at scale.

