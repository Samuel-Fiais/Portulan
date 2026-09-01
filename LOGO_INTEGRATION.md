# Portulan Logo Integration Guide

The rebrand to Portulan is complete except for the final logo integration, which requires a manual step.

## Problem

The official Portulan logo PNG (compass rose + script wordmark) cannot be added to the repository by the Cloud Agent because attached image files are not accessible in the filesystem.

## Current State

- ✅ All text branding updated to "Portulan"
- ✅ Database path fixed for Vercel production
- ✅ All "Festpay" references removed from code
- ⚠️ `public/portulan-logo.svg` is a 1KB placeholder
- ❌ Real PNG logo not yet in repo

## Manual Steps Required

### 1. Add the Logo File

Save the official Portulan logo PNG to:
```
public/portulan-logo.png
```

### 2. Update BrandMark Component

Replace `components/brand-mark.tsx` with:

```typescript
import Image from "next/image";
import { cn } from "@/lib/utils";

export function BrandMark({ compact = false, className }: { compact?: boolean; className?: string }) {
  return (
    <div className={cn("flex items-center", className)} aria-label="Portulan">
      {compact ? (
        <Image 
          src="/portulan-logo.png" 
          alt="Portulan" 
          width={120} 
          height={48} 
          className="h-8 w-auto" 
          priority 
        />
      ) : (
        <Image 
          src="/portulan-logo.png" 
          alt="Portulan" 
          width={250} 
          height={100} 
          className="h-10 w-auto" 
          priority 
        />
      )}
    </div>
  );
}
```

### 3. Add Favicon

Update `app/layout.tsx` to include in the `<head>`:

```tsx
<link rel="icon" href="/portulan-logo.png" />
<link rel="apple-touch-icon" href="/portulan-logo.png" />
```

### 4. Remove Placeholder

Delete the temporary SVG:
```bash
rm public/portulan-logo.svg
```

### 5. Remove Old Brand Assets (Optional)

The old Festpay logo system can be removed:
- `festpaydocs-3.html` (contains base64 Festpay logos)
- `app/api/brand/[tone]/route.ts` (serves old logos)
- `lib/brand-assets.ts` (reads from festpaydocs-3.html)

The `PortulanLogo` component can be updated to use the new PNG instead of `/api/brand/...`.

## Verification

After adding the PNG:
1. Header should show the compass + "Portulan" wordmark
2. Favicon should use the logo
3. Print headers should use the logo
4. No more CSS three-bar `.brand-symbol` as primary identity

## Why This Happened

Cloud Agents cannot access binary files attached to messages despite system indicators. The PNG must be committed through Git/GitHub directly by a human with filesystem access.
