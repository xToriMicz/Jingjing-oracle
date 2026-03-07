# shadcn/ui — UI/UX Component Library Reference

> Learned: 2026-03-07 | Source: shadcn-ui/ui

## Philosophy

**Copy, don't install.** Components are copied into your project — you own and modify them freely. Built on Radix UI (accessibility) + Tailwind CSS (styling) + CVA (variants).

## Setup

```bash
npx shadcn-ui@latest init
npx shadcn-ui@latest add button dialog form table command sheet
```

## Core Pattern

```typescript
// Every component follows this pattern:
// 1. Wrap Radix primitive
// 2. Style with Tailwind
// 3. Expose variants via CVA

import { Dialog as DialogPrimitive } from "radix-ui"

function DialogContent({ className, ...props }) {
  return (
    <DialogPrimitive.Content
      data-slot="dialog-content"
      className={cn("fixed inset-0 z-50 ...", className)}
      {...props}
    />
  )
}
```

## Key Utility: cn()

```typescript
import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))  // Merge + deduplicate Tailwind classes
}
```

## Button Variants (CVA)

```typescript
const buttonVariants = cva("base-styles", {
  variants: {
    variant: {
      default: "bg-primary text-primary-foreground",
      destructive: "bg-destructive text-white",
      outline: "border bg-background",
      secondary: "bg-secondary",
      ghost: "hover:bg-accent",
      link: "underline-offset-4 hover:underline",
    },
    size: { sm: "h-8 px-3", default: "h-9 px-4", lg: "h-10 px-6", icon: "size-9" },
  },
})

<Button variant="destructive" size="lg">Delete</Button>
<Button asChild><a href="/page">Link as button</a></Button>
```

## Essential Components

### Dialog (Modal)
```typescript
<Dialog>
  <DialogTrigger>Open</DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Title</DialogTitle>
      <DialogDescription>Description</DialogDescription>
    </DialogHeader>
    {/* content */}
  </DialogContent>
</Dialog>
```

### Form (react-hook-form + Zod)
```typescript
const schema = z.object({ email: z.string().email() })
const form = useForm({ resolver: zodResolver(schema) })

<Form {...form}>
  <FormField control={form.control} name="email" render={({ field }) => (
    <FormItem>
      <FormLabel>Email</FormLabel>
      <FormControl><Input {...field} /></FormControl>
      <FormMessage />
    </FormItem>
  )} />
</Form>
```

### Command Palette (Cmd+K)
```typescript
<CommandDialog open={open} onOpenChange={setOpen}>
  <CommandInput placeholder="Search..." />
  <CommandList>
    <CommandEmpty>No results.</CommandEmpty>
    <CommandGroup heading="Actions">
      <CommandItem>Dashboard</CommandItem>
      <CommandItem>Settings<CommandShortcut>Cmd+S</CommandShortcut></CommandItem>
    </CommandGroup>
  </CommandList>
</CommandDialog>
```

### Sheet (Side Panel)
```typescript
<Sheet>
  <SheetTrigger>Menu</SheetTrigger>
  <SheetContent side="left">  {/* top | right | bottom | left */}
    <SheetHeader><SheetTitle>Navigation</SheetTitle></SheetHeader>
  </SheetContent>
</Sheet>
```

### Table
```typescript
<Table>
  <TableHeader>
    <TableRow><TableHead>Name</TableHead><TableHead>Email</TableHead></TableRow>
  </TableHeader>
  <TableBody>
    <TableRow><TableCell>John</TableCell><TableCell>john@test.com</TableCell></TableRow>
  </TableBody>
</Table>
```

## Theming — CSS Variables (OKLch)

```css
:root {
  --background: oklch(1 0 0);
  --foreground: oklch(0.145 0 0);
  --primary: oklch(0.205 0 0);
  --primary-foreground: oklch(0.985 0 0);
  --destructive: oklch(0.577 0.245 27.325);
  --muted: oklch(0.97 0 0);
  --border: oklch(0.922 0 0);
  --radius: 0.625rem;
}

.dark {
  --background: oklch(0.145 0 0);
  --foreground: oklch(0.985 0 0);
}
```

Customize by overriding CSS variables — all components update automatically.

## Accessibility (Built-in via Radix)

- Keyboard navigation (Tab, Escape, Arrow keys, Enter/Space)
- ARIA attributes auto-applied
- Focus management (`focus-visible:ring`)
- Screen reader support (`sr-only`)
- Error states (`aria-invalid`)
- Color contrast (OKLch)

## UI/UX Best Practices

1. **Semantic tokens** — Use `primary`, `destructive`, `muted` not raw colors
2. **Consistent spacing** — Tailwind scale: `gap-2` (8px), `gap-4` (16px)
3. **Mobile-first** — Sheet for mobile nav, responsive breakpoints
4. **Loading states** — Skeleton placeholders, Spinner, disabled buttons
5. **Empty states** — Helpful messages with action buttons
6. **Error handling** — Inline validation, `FormMessage` near fields
7. **Dark mode** — Add `.dark` class to `<html>`
8. **Focus indicators** — Never remove, use `focus-visible`

## Component Count

50+ components including: Button, Dialog, Form, Table, Command, Sheet, Input, Label, Card, Sidebar, Popover, Tooltip, Tabs, Accordion, Alert, Skeleton, Spinner, Calendar, Chart, Breadcrumb, Pagination, Progress, Dropdown Menu, Context Menu, Toggle, Avatar, Badge, and more.
