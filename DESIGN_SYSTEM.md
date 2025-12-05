# GORGONE Design System
## Government-Grade Monitoring Platform

**Version**: 2.1  
**Last Updated**: December 5, 2024  
**Status**: ✅ Production Ready  

> **THE definitive guide** for all design decisions in Gorgone.  
> Use this as your single source of truth for styling, components, and patterns.

---

## 🎯 Design Philosophy

Gorgone uses a **military-inspired, professional design system** tailored for government monitoring platforms. The system emphasizes:

- **Clarity**: High contrast, readable text, clear data hierarchy
- **Efficiency**: Compact layouts for dense data displays
- **Professionalism**: Subtle animations, government-grade aesthetics
- **Accessibility**: WCAG 2.1 AA compliant, keyboard navigation
- **Dark Mode First**: Optimized for 24/7 monitoring operations

---

## 🎨 Color System

### Base Colors (OKLCH)

All colors use the OKLCH color space for consistent perceptual brightness:

```css
/* Light Mode */
--background: oklch(1 0 0);              /* Pure white */
--foreground: oklch(0.145 0 0);          /* Near black */
--primary: oklch(0.54 0.22 285);         /* Purple brand */
--muted: oklch(0.97 0 0);                /* Light grey */
--border: oklch(0.922 0 0);              /* Subtle border */

/* Dark Mode */
--background: oklch(0.145 0 0);          /* Near black */
--foreground: oklch(0.985 0 0);          /* Off white */
--primary: oklch(0.62 0.24 285);         /* Brighter purple */
--muted: oklch(0.269 0 0);               /* Dark grey */
--border: oklch(1 0 0 / 10%);            /* Transparent white */
```

### Tactical Colors (Military Accents)

```css
--tactical-green: oklch(0.6 0.15 145);   /* Success/Active */
--tactical-amber: oklch(0.7 0.15 85);    /* Warning/Alert */
--tactical-red: oklch(0.6 0.22 27);      /* Critical/Danger */
--tactical-blue: oklch(0.55 0.18 240);   /* Information */
--tactical-slate: oklch(0.45 0.02 240);  /* Muted grey */
```

**Usage**:
- ✅ Use semantic color names: `bg-background`, `text-primary`
- ✅ Use tactical utilities: `.tactical-success`, `.border-tactical-warning`
- ❌ NEVER hardcode: `#fff`, `rgb(255,255,255)`, or color names

---

## ✍️ Typography

### Font Stack

- **Sans**: Geist Sans (primary)
- **Mono**: Geist Mono (code, data)
- **Features**: Ligatures enabled, optimized rendering

### Type Scale (shadcn-compliant)

Use **semantic HTML + utility classes** (NO wrapper components):

```tsx
/* Headings */
<h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight">
  Main Page Title
</h1>

<h2 className="scroll-m-20 text-3xl font-semibold tracking-tight">
  Section Title
</h2>

<h3 className="scroll-m-20 text-2xl font-semibold tracking-tight">
  Subsection Title
</h3>

<h4 className="scroll-m-20 text-xl font-semibold tracking-tight">
  Card Title
</h4>

/* Body Text */
<p className="leading-7 [&:not(:first-child)]:mt-6">
  Standard paragraph text
</p>

/* Specialized Text */
<p className="text-xl text-muted-foreground">Lead text</p>
<p className="text-sm text-muted-foreground">Muted text</p>
<small className="text-sm font-medium leading-none">Label</small>
<code className="relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm">Code</code>
```

**Rules**:
- ✅ Use utility classes directly on semantic HTML
- ✅ Classes like `.text-h1`, `.text-lead`, `.text-muted` are available
- ❌ NO `<TypographyH1>` components (removed)
- ❌ NO random font sizes like `text-[17px]`

---

## 📐 Spacing System

### Scale (4px based)

```css
--spacing-xs: 0.25rem;        /* 4px - Micro spacing */
--spacing-tight: 0.5rem;      /* 8px - Minimal spacing */
--spacing-compact: 0.75rem;   /* 12px - Compact layouts */
--spacing-element: 1rem;      /* 16px - Between elements */
--spacing-card: 1.5rem;       /* 24px - Card padding */
--spacing-container: 2rem;    /* 32px - Container padding */
--spacing-section: 3rem;      /* 48px - Section spacing */
```

### Utility Classes

```tsx
/* Layout spacing */
<div className="layout-compact">    {/* space-y-3 (12px) */}
<div className="layout-standard">   {/* space-y-6 (24px) */}
<div className="layout-relaxed">    {/* space-y-8 (32px) */}

/* Semantic spacing */
<div className="section-spacing">   {/* mb-12 (48px) */}
<div className="container-padding"> {/* p-8 (32px) */}
<div className="card-padding">      {/* p-6 (24px) */}
```

**Rules**:
- ✅ Use Tailwind spacing: `space-y-6`, `gap-4`, `mb-8`
- ✅ Prefer 4px increments: 4, 8, 12, 16, 24, 32, 48
- ❌ NO random values: `mt-[13px]`, `gap-[19px]`

---

## 🎭 Component Heights

### Standard Heights

```css
--height-input: 2.25rem;      /* 36px (h-9) - Default */
--height-input-sm: 2rem;      /* 32px (h-8) - Compact */
--height-input-lg: 2.5rem;    /* 40px (h-10) - Large */
```

**Usage**:
- Buttons: `h-9` (default), `h-8` (sm), `h-10` (lg)
- Inputs: `h-9` (matches buttons)
- Tabs: `h-9` (container), `h-7` (triggers)
- Badges: `py-0.5` (auto height)

---

## 🎯 Border Radius

### Scale

```css
/* Base: --radius = 0.625rem (10px) */
rounded-sm    /* 6px  - calc(var(--radius) - 4px) */
rounded-md    /* 8px  - calc(var(--radius) - 2px) */
rounded-lg    /* 10px - var(--radius) */
rounded-xl    /* 14px - calc(var(--radius) + 4px) */
rounded-2xl   /* 16px - Fixed value */
rounded-full  /* Pills, badges, dots */
```

**When to Use**:
- `rounded-md`: Buttons, Inputs, Small UI elements
- `rounded-lg`: Tabs, Dropdowns, Dialogs
- `rounded-xl`: Main Cards, Sections
- `rounded-2xl`: Hero elements, Featured cards
- `rounded-full`: Badges, Avatar, Status dots

---

## 🌑 Shadows (Elevation)

### Scale

```css
shadow-xs   /* 1px shadow - Subtle lift */
shadow-sm   /* 2px shadow - Cards, buttons */
shadow-md   /* 4px shadow - Dropdowns */
shadow-lg   /* 8px shadow - Dialogs, modals */
shadow-xl   /* 16px shadow - Popovers */
```

**Rules**:
- Light mode: Very subtle (0.05-0.1 opacity)
- Dark mode: More pronounced (0.4-0.7 opacity)
- Interactive elements: Add shadow on hover
- Elevated surfaces: Use shadow-md or shadow-lg

---

## ⚡ Transitions & Animations

### Speeds

```css
--transition-fast: 150ms;     /* Hover, simple changes */
--transition-base: 250ms;     /* Default, most interactions */
--transition-slow: 350ms;     /* Complex transitions */
```

**Easing**: `cubic-bezier(0.4, 0, 0.2, 1)` (smooth deceleration)

### Common Patterns

```tsx
/* Hover transitions */
transition-colors duration-[var(--transition-fast)]

/* Focus states */
transition-[color,box-shadow] duration-[var(--transition-fast)]

/* Page load */
.animate-in  /* Fade in + translate up (250ms) */

/* Live indicators */
.animate-pulse-slow  /* Slow pulse (3s) */
```

**Rules**:
- ✅ Use CSS variables: `duration-[var(--transition-fast)]`
- ✅ Subtle: Micro-interactions only
- ✅ GPU-accelerated: Prefer `transform` and `opacity`
- ❌ NO long durations: > 350ms feels sluggish

---

## 🃏 Card System

### Card Variants

```tsx
/* Standard card */
<Card className="rounded-xl shadow-xs">
  <CardHeader>
    <CardTitle>Title</CardTitle>
    <CardDescription>Description</CardDescription>
  </CardHeader>
  <CardContent>Content</CardContent>
</Card>

/* Interactive card (hover effects) */
<div className="card-interactive p-6">
  {/* Adds hover border + shadow */}
</div>

/* Glass card (Apple-inspired) */
<div className="card-glass p-6">
  {/* Backdrop blur + transparency */}
</div>

/* Compact card (dense data) */
<div className="card-compact">
  {/* Tight spacing for feeds */}
</div>

/* Danger zone */
<div className="card-danger">
  {/* Destructive actions */}
</div>
```

**Spacing**:
- Card component: `gap-6` between sections
- CardHeader/CardContent: `px-6` horizontal padding
- Use `.card-padding` utility for custom cards

**Rules**:
- ✅ Use `rounded-xl` for main cards
- ✅ Add `shadow-xs` for subtle elevation
- ✅ Use `.card-interactive` for hoverable cards
- ❌ NO hardcoded padding values

---

## 🎨 Glassmorphism (Apple-Inspired)

### Glass Utilities

```css
.glass            /* Base glass effect */
.glass-card       /* Glass + card styling */
```

```tsx
/* Glass card example */
<div className="glass-card p-6">
  <h3 className="text-h3">Glassmorphism</h3>
  <p className="text-muted">Apple-inspired backdrop blur</p>
</div>
```

**Variables**:
```css
--glass-bg: oklch(from var(--background) l c h / 0.8);
--glass-border: oklch(from var(--border) l c h / 0.3);
--glass-blur: 12px;
```

---

## 🚦 Status & Badges

### Badge Variants

```tsx
/* Standard variants */
<Badge variant="default">Default</Badge>
<Badge variant="secondary">Secondary</Badge>
<Badge variant="outline">Outline</Badge>
<Badge variant="destructive">Destructive</Badge>

/* Tactical variants (NEW) */
<Badge variant="success">Active</Badge>
<Badge variant="warning">Alert</Badge>
<Badge variant="info">Info</Badge>
```

### Status Indicators

```tsx
/* Status badge with animated dot */
<span className="status-badge status-active">
  Active
</span>

<span className="status-badge status-warning">
  Warning
</span>

<span className="status-badge status-inactive">
  Inactive
</span>
```

---

## 📊 Data Display Components

### Stats Cards

```tsx
<div className="stats-card">
  <div className="stats-label">Total Users</div>
  <div className="stats-value">12,459</div>
  <div className="stats-change positive">+12.5%</div>
</div>
```

### Alert Banners

```tsx
<div className="alert-banner alert-info">
  <AlertCircle className="size-5" />
  <div>
    <h4 className="font-semibold">Information</h4>
    <p className="text-sm">This is an informational message.</p>
  </div>
</div>

/* Variants: alert-info, alert-success, alert-warning, alert-danger */
```

---

## 🎬 Page Load Pattern

### Fade-in Animation

All page content should fade in on load:

```tsx
<div className="animate-in">
  {/* Page content */}
</div>
```

**Effect**: Subtle fade + 4px translate up, 250ms duration

---

## ♿ Accessibility

### Focus States

```tsx
/* Default focus ring */
<button className="focus-ring">Button</button>

/* Inset focus ring */
<input className="focus-ring-inset" />
```

**Rules**:
- ✅ All interactive elements have visible focus states
- ✅ Focus rings use `ring-[3px]` for visibility
- ✅ Color contrast ≥ 4.5:1 (WCAG AA)
- ✅ Keyboard navigation fully supported

---

## 📱 Responsive Design

### Breakpoints (Tailwind defaults)

```
sm: 640px   /* Small devices */
md: 768px   /* Tablets */
lg: 1024px  /* Laptops */
xl: 1280px  /* Desktops */
2xl: 1536px /* Large screens */
```

### Mobile Patterns

```tsx
/* Responsive spacing */
<div className="p-4 md:p-6 lg:p-8">

/* Responsive text */
<h1 className="text-3xl md:text-4xl lg:text-5xl">

/* Responsive layout */
<div className="flex flex-col md:flex-row gap-4">
```

---

## 🎯 Component Checklist

When creating new components:

- [ ] Use CSS variable-based colors (no hardcoded colors)
- [ ] Use semantic HTML + utility classes for typography
- [ ] Use spacing system (`.card-padding`, consistent `space-y-*`)
- [ ] Add transitions (`duration-[var(--transition-fast)]`)
- [ ] Use `.card-interactive` for hoverable cards
- [ ] Add `.animate-in` to page containers
- [ ] Input fields: `h-9` + focus ring
- [ ] Buttons: Consistent heights with inputs
- [ ] Test in both light and dark mode
- [ ] Verify responsive behavior (mobile-first)
- [ ] Check keyboard navigation
- [ ] Verify color contrast (WCAG AA)

---

## 🚫 Anti-Patterns (DO NOT DO)

❌ Hardcoded colors: `bg-white`, `text-black`, `#7550ff`  
❌ Typography components: `<TypographyH1>`, `<TypographyP>`  
❌ Random font sizes: `text-[17px]`, `text-lg` for headings  
❌ Inconsistent spacing: `mt-[13px]`, `gap-[19px]`  
❌ Long animations: `duration-500`, `duration-1000`  
❌ Manual theme checks: `{theme === 'dark' ? ... : ...}`  
❌ No hover states on interactive elements  
❌ Missing focus states  
❌ Poor color contrast  

---

## 📚 Shadcn Components Reference

### UI Components (23)

✅ Avatar, Badge, Button, Card, Chart, Checkbox, Dialog, Dropdown Menu, Input, Label, Progress, Scroll Area, Select, Separator, Sheet, Sidebar, Skeleton, Sonner (Toast), Switch, Tabs, Textarea, Tooltip

### AI Components (7) ✨ NEW

✅ **Message** - Chat message containers with role-based styling  
✅ **Response** - Streaming-optimized markdown renderer with copy  
✅ **Conversation** - Auto-scrolling chat container  
✅ **PromptInput** - Auto-resizing textarea with submit  
✅ **Tool** - Collapsible tool execution display with status  
✅ **Loader** - Loading states for AI operations  
✅ **Suggestion** - Quick action pills

**Location**: `components/ai/`  
**Usage**: For AL-IA chatbot and all conversational interfaces  
**Docs**: https://www.shadcn.io/ai

### Future Additions

Consider adding these for enhanced functionality:

- **Alert** / **AlertDialog** - Error messages, confirmations
- **Form** - React Hook Form integration
- **Pagination** - For feeds (Twitter, TikTok, Media)
- **Table** - Structured data display
- **Calendar** - Date range pickers
- **Command** - Command palette (⌘K)

---

## 🎯 Summary

**This design system ensures**:
- **Consistency**: Same patterns everywhere
- **Accessibility**: Proper contrast, focus states, keyboard nav
- **Performance**: GPU-accelerated animations, optimized shadows
- **Maintainability**: Change once, applies everywhere
- **Professionalism**: Government/enterprise-grade quality
- **Modern**: Shadcn best practices, OKLCH colors, glassmorphism

**Key Changes from V1**:
- ❌ Removed `typography.tsx` components
- ✅ Added semantic HTML + utility classes
- ✅ Added tactical military colors
- ✅ Added glassmorphism utilities
- ✅ Standardized all component heights
- ✅ Added status indicators and alert banners
- ✅ Enhanced badge variants
- ✅ Improved shadow system
- ✅ Better spacing utilities

---

---

## 🤖 AI Components Architecture

### Chat Interface Pattern

```tsx
import { Conversation, ConversationContent, ConversationEmpty } from "@/components/ai/conversation";
import { Message, MessageContent } from "@/components/ai/message";
import { Response } from "@/components/ai/response";
import { Tool } from "@/components/ai/tool";
import { PromptInput } from "@/components/ai/prompt-input";
import { Suggestions, Suggestion } from "@/components/ai/suggestion";

// Usage in AL-IA chatbot
<Conversation>
  <ConversationContent>
    {messages.map((message) => (
      <Message key={message.id} from={message.role}>
        <MessageContent>
          {/* Tool Calls */}
          {message.toolInvocations?.map((tool) => (
            <Tool name={tool.toolName} status={tool.state} />
          ))}
          
          {/* Message Response */}
          <Response>{message.content}</Response>
        </MessageContent>
      </Message>
    ))}
  </ConversationContent>
  
  <PromptInput
    value={input}
    onChange={setInput}
    onSubmit={handleSubmit}
    isLoading={isLoading}
  />
</Conversation>
```

### AI Component Features

- ✅ **Auto-scroll** to bottom on new messages
- ✅ **Streaming support** with proper markdown rendering
- ✅ **Copy button** on assistant responses
- ✅ **Tool execution** display with status (pending/complete/error)
- ✅ **Auto-resize** textarea (40-200px)
- ✅ **Keyboard shortcuts** (Enter to send, Shift+Enter for newline)
- ✅ **Loading states** with elegant spinners
- ✅ **Quick actions** as suggestion pills

---

## 📖 Resources

**Official Documentation**:
- [shadcn UI](https://ui.shadcn.com) - Core components
- [shadcn AI Elements](https://www.shadcn.io/ai) - AI chat components
- [Tailwind CSS](https://tailwindcss.com) - Utility classes
- [OKLCH Color Tool](https://oklch.com) - Color picker

**Internal Docs**:
- `context.md` - Project architecture overview
- `DATABASE_SCHEMA.md` - Database structure
- `TWITTER_INTEGRATION.md` - Twitter module
- `TIKTOK_INTEGRATION.md` - TikTok module

---

## 🔄 Changelog

### Version 2.1 (December 5, 2024)
- ✅ Added AI Elements components (Message, Response, Conversation, etc.)
- ✅ Migrated AL-IA chatbot to AI Elements architecture
- ✅ Applied glassmorphism to all feed cards
- ✅ Standardized all transitions to CSS variables
- ✅ Removed typography.tsx components (obsolete)
- ✅ Enhanced sidebar footer with proper shadcn patterns
- ✅ Created EmptyState reusable component
- ✅ Added tactical military color palette
- ✅ Improved shadow system (5 levels)
- ✅ Enhanced card contrast (+33% opacity)
- ✅ Optimized spacing (space-y-6 uniform)

### Version 2.0 (November 2024)
- Initial professional design system
- OKLCH color palette
- Typography scale
- Spacing system
- Animation framework

