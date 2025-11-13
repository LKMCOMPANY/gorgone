# Loading States & Skeletons - Best Practices

**Status**: ✅ Implemented  
**Last Updated**: November 2025

---

## 🎯 Philosophy

Gorgone follows **Shadcn UI best practices** for loading states:

1. **Always visible**: Loading states should never be "invisible" (no `null` returns)
2. **Mirror structure**: Skeletons should match the exact layout of loaded content
3. **Smooth transitions**: Use the design system's animation utilities
4. **User feedback**: Users should always know something is happening

---

## 🏗️ Implementation Pattern

### Client Components with Data Fetching

For client components that fetch data with `useState` and `useEffect`:

```tsx
"use client";

import { useState, useEffect } from "react";
import { MySkeleton } from "./my-skeleton";

export function MyComponent() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const result = await fetchData();
        setData(result);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // ✅ SHOW SKELETON during loading
  if (loading) {
    return <MySkeleton />;
  }

  // ❌ DON'T return null
  // if (loading) return null;

  return (
    <div>
      {/* Actual content */}
    </div>
  );
}
```

### Server Components with Suspense

For server components that are async:

```tsx
// page.tsx (Server Component)
import { Suspense } from "react";
import { MyAsyncComponent } from "./my-async-component";
import { MySkeleton } from "./my-skeleton";

export default function Page() {
  return (
    <div>
      <Suspense fallback={<MySkeleton />}>
        <MyAsyncComponent />
      </Suspense>
    </div>
  );
}
```

---

## 🎨 Skeleton Design Principles

### 1. Match Exact Layout

Skeletons should replicate the structure of loaded content:

```tsx
// ✅ GOOD: Matches loaded content
export function CardSkeleton() {
  return (
    <Card className="card-padding">
      <div className="space-y-5">
        <Skeleton className="h-10 w-full max-w-sm" /> {/* Search bar */}
        <div className="space-y-2.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex gap-3 p-4">
              <Skeleton className="h-5 w-[160px]" /> {/* Title */}
              <Skeleton className="h-6 w-[60px] rounded-full" /> {/* Badge */}
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

// ❌ BAD: Generic skeleton that doesn't match
export function CardSkeleton() {
  return <Skeleton className="h-64 w-full" />;
}
```

### 2. Use Design System Classes

All skeletons must use the design system:

```tsx
// ✅ Use design system spacing
<div className="space-y-2.5">  {/* Not random values */}
  <Skeleton className="h-10 w-full" />  {/* h-10 matches Input height */}
</div>

// ✅ Use card-padding
<Card className="card-padding">  {/* Not p-6 */}

// ✅ Consistent spacing
<div className="flex gap-3 p-4">  {/* Match actual component */}
```

### 3. Responsive Behavior

Skeletons should be responsive like the real content:

```tsx
export function TableSkeleton() {
  return (
    <div>
      {/* Desktop-only elements */}
      <div className="hidden md:flex">
        <Skeleton className="h-4 w-[100px]" />
      </div>

      {/* Mobile & Desktop */}
      <div className="flex flex-col gap-3 md:flex-row">
        <Skeleton className="h-5 w-[160px]" />
        
        {/* Mobile-only */}
        <Skeleton className="h-3 w-[120px] md:hidden" />
      </div>
    </div>
  );
}
```

### 4. Mimic Visual Elements

Common patterns to replicate:

```tsx
// Avatar (circular)
<Skeleton className="h-10 w-10 rounded-full" />

// Badge (pill shape)
<Skeleton className="h-6 w-[60px] rounded-full" />

// Button
<Skeleton className="h-10 w-[120px]" />

// Input
<Skeleton className="h-10 w-full" />

// Icon button
<Skeleton className="h-8 w-8" />

// Text line
<Skeleton className="h-4 w-[200px]" />

// Caption (smaller)
<Skeleton className="h-3 w-[120px]" />
```

---

## 📦 Examples from Gorgone

### ClientsTable

**Loading State**: Shows skeleton while fetching clients list

```tsx
if (loading) {
  return <ClientsTableSkeleton />;
}
```

**Skeleton Structure**:
- Search bar (h-10, max-w-sm)
- Table header (hidden on mobile)
- 5 table rows with:
  - Client name + description (mobile only)
  - User count
  - Status badge (rounded-full)
  - Created date (desktop only)
  - Actions menu

### ClientDetails

**Loading State**: Shows skeleton while fetching users

```tsx
{loadingUsers ? (
  <div className="space-y-2.5">
    {Array.from({ length: 3 }).map((_, i) => (
      <Skeleton key={i} className="h-24 w-full" />
    ))}
  </div>
) : (
  <ClientUsersList users={users} ... />
)}
```

**Skeleton Structure**:
- Client info card with form fields
- Users card with:
  - Section header + button
  - 3 user rows with avatars, info, badge, actions

---

## 🚫 Anti-Patterns

### DON'T: Return null during loading

```tsx
❌ if (loading) return null;
✅ if (loading) return <Skeleton />;
```

### DON'T: Use generic skeletons

```tsx
❌ <Skeleton className="h-96 w-full" />
✅ <MySkeleton /> {/* Detailed, structured skeleton */}
```

### DON'T: Hardcode sizes that don't match

```tsx
❌ <Skeleton className="h-12 w-[250px]" /> {/* Random values */}
✅ <Skeleton className="h-10 w-full max-w-sm" /> {/* Matches Input */}
```

### DON'T: Forget responsive behavior

```tsx
❌ <Skeleton className="h-4 w-[200px]" /> {/* Same on all screens */}
✅ <Skeleton className="h-4 w-[200px] md:hidden" /> {/* Mobile-only */}
```

---

## ✅ Checklist for New Skeletons

When creating a new skeleton component:

- [ ] Matches exact layout of loaded content
- [ ] Uses design system classes (`.card-padding`, `space-y-*`)
- [ ] Includes responsive behavior (`hidden md:flex`, etc.)
- [ ] Mimics visual elements (avatars, badges, buttons)
- [ ] Has correct number of items (match typical data)
- [ ] Consistent with existing skeletons
- [ ] Includes comments for clarity
- [ ] Tested in light and dark mode
- [ ] Tested on mobile and desktop

---

## 🎯 Benefits

Following these patterns ensures:

✅ **Better UX**: Users see structure immediately, not blank screens  
✅ **Consistency**: All loading states look professional  
✅ **Maintainability**: Easy to update when components change  
✅ **Accessibility**: Screen readers can announce loading state  
✅ **Performance perception**: Users feel app is responsive  

---

## 📚 Resources

- **Shadcn Skeleton**: https://ui.shadcn.com/docs/components/skeleton
- **React Suspense**: https://react.dev/reference/react/Suspense
- **Design System**: See `DESIGN_SYSTEM.md`
- **Examples**: All components in `components/dashboard/clients/`

