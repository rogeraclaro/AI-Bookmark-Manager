# Coding Conventions

**Analysis Date:** 2026-03-12

## Naming Patterns

**Files:**
- React components: PascalCase (e.g., `TrialCountdown.tsx`, `ScrollToTop.tsx`)
- Services: camelCase (e.g., `geminiService.ts`, `storage.ts`)
- Configuration/data: camelCase (e.g., `vite.config.ts`)
- Type/interface files: camelCase (e.g., `types.ts`)

**Functions:**
- React components: PascalCase (e.g., `BookmarkCard`, `TrialCountdown`)
- Regular functions: camelCase (e.g., `processBookmarksWithGemini`, `toggleCategory`, `sanitizeText`)
- Helper functions: camelCase with descriptive intent (e.g., `cleanContaminatedTitle`, `apiRequest`, `delay`)
- Event handlers: prefix with `handle` (e.g., `handleCategoryDelete`, `handleSearch`, `handleCategoryDragStart`)
- Toggle/accessor functions: prefix with `is` for booleans (e.g., `isTrialActive`, `isDismissed`)

**Variables:**
- State variables: camelCase (e.g., `bookmarks`, `categories`, `deletedIds`, `isLoading`)
- DOM references: camelCase with `Ref` suffix (e.g., `abortControllerRef`, `logsEndRef`)
- Constants: UPPER_SNAKE_CASE (e.g., `TRIAL_START_DATE`, `KEYS`, `RATE_LIMITS`)
- Modal state: descriptive camelCase prefixed with `is` (e.g., `isEditModalOpen`, `isCarouselModalOpen`)
- Nested object destructuring: consistent with parent naming (e.g., `titleMatch`, `descriptionMatch`)

**Types:**
- Interface definitions: PascalCase with descriptive purpose (e.g., `ButtonProps`, `Bookmark`, `TweetRaw`, `ProcessedTweetResult`, `LogEntry`)
- Type aliases: PascalCase (e.g., `Category`)
- Generic type parameters: single uppercase letter convention (e.g., `<T>`)
- Enums-like unions: string literals in lowercase (e.g., `'primary' | 'secondary' | 'danger' | 'ghost'`)

## Code Style

**Formatting:**
- ESLint with Flat Config (eslint.config.js)
- 2-space indentation (inferred from package.json and tsconfig settings)
- Semicolons: explicit (present throughout codebase)
- Trailing commas: allowed in multiline structures
- Line length: no hard limit observed, but generally readable

**Linting:**
- Tool: ESLint 9.39.1 with TypeScript support
- Config: `eslint.config.js` (Flat Config format)
- Extends: `@eslint/js`, `typescript-eslint`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`
- Key rules enforced:
  - React Hooks rules of hooks: `react-hooks/rules-of-hooks`
  - React Refresh rules: `react-refresh/only-export-components`
  - TypeScript strict mode rules from typescript-eslint
  - No unused variables (enforced in tsconfig with `noUnusedLocals` and `noUnusedParameters`)

**Prettier/Formatting Config:**
- Not explicitly configured; likely using ESLint only
- Consistent use of double quotes in JSX and strings
- Template literals for dynamic strings

## Import Organization

**Order:**
1. React and standard library imports (`import React`, `import type`)
2. Third-party library imports (lucide-react, @google/genai)
3. Local type imports (`import type { ... }`)
4. Local service/utility imports
5. Local component imports
6. Local translation/config imports

**Pattern observed in `App.tsx`:**
```typescript
import React, { useState, useMemo, useEffect, useRef } from 'react'
import { Upload, X, Edit2, ... } from 'lucide-react'
import type { Bookmark, Category, TweetRaw, LogEntry } from './types'
import { processBookmarksWithGemini } from './services/geminiService'
import { storage } from './services/storage'
import { Button, Input, Label, TextArea, Badge, Modal } from './components/UI'
import { TrialCountdown } from './components/TrialCountdown'
import { ScrollToTop } from './components/ScrollToTop'
import { strings } from './translations'
```

**Path Aliases:**
- Relative paths only: `./`, `../`
- No path aliases configured (TypeScript moduleResolution: bundler)
- Imports remain explicit and relative

## Error Handling

**Patterns:**
- Try-catch blocks for async operations (see `storage.ts` and `geminiService.ts`)
- Console.error for logging errors (e.g., `console.error('JSON Parse Error:', parseError)`)
- Error messages include context (e.g., `'Failed to load data'`, `'API Error: ${response.statusText}'`)
- Graceful fallbacks: return empty arrays on error (e.g., `return []` in `apiRequest`)
- User-facing errors: communicated via modal dialogs (`resultModal`, `confirmModal`)
- Network errors: caught and logged, then propagated with context
- Type assertions with `any` cast when necessary for migration compatibility (see bookmark migration in `App.tsx` line 231)

**Example pattern from `geminiService.ts`:**
```typescript
try {
  const parsed = JSON.parse(jsonText) as ProcessedTweetResult[];
  return parsed.map(item => ({
    ...item,
    title: cleanContaminatedTitle(item.title)
  }));
} catch (parseError: any) {
  console.error('JSON Parse Error:', parseError);
  console.error('Problematic JSON:', jsonText.substring(0, 500));
  throw new Error('Failed to parse Gemini response: ' + parseError.message);
}
```

## Logging

**Framework:** `console` (browser console API)

**Patterns:**
- `console.error()` for errors and failures: `console.error('JSON Parse Error:', parseError)`
- Context provided in all log statements (endpoint, error type, partial data for debugging)
- Timestamps not used in console (browser dev tools provide them)
- Error logs include object dumps for debugging: `console.error('Problematic JSON:', jsonText.substring(0, 500))`
- User-facing logs: displayed in custom log UI component with `LogEntry` type (timestamp, message, type)
- Log types: `'info' | 'success' | 'warning' | 'error'`

**Application logs (in-app console):**
- Rendered in collapsible modal during import
- Auto-scrolls to latest entry (see `logsEndRef` useEffect in App.tsx line 217)
- Categorized by severity and operation

## Comments

**When to Comment:**
- Complex algorithms or non-obvious logic (e.g., `// 90 second timeout`, `// Remove contamination patterns`)
- Workarounds and hacks with context (e.g., `// CRITICAL FIX: Truncate long titles WITHIN the JSON string before parsing`)
- Configuration rationale (e.g., `// Strategy: Use API if Secret is configured, otherwise LocalStorage`)
- Data format explanations (e.g., `// Format: "Real Name@username·date"`)
- Business logic clarifications (e.g., `// Migrate old bookmarks: category (string) → categories (array)`)

**Comment style:**
- Single-line comments: `//` prefix
- Block comments: `/* */` used sparingly
- Inline comments preserve readability
- No TODO/FIXME comments observed in production code

**JSDoc/TSDoc:**
- Minimal usage observed
- React component types defined via `React.FC<Props>` interface
- Function signatures self-documenting through TypeScript types
- Service functions type-annotated inline (return types explicit)

**Example patterns:**
```typescript
// Extract original ID for blacklist purposes
const originalId = bookmark.originalLink.split('/').pop() || ''

// Helper to toggle category and ensure at least one category exists
const toggleCategory = (cat: string, isChecked: boolean, currentCategories: string[]): string[] => {
```

## Function Design

**Size:**
- Majority are small, focused functions (10-40 lines)
- Largest function: `App` component (~1845 lines total, but structured with helper components)
- Helper components extracted to separate functions within same file (e.g., `BookmarkCard`)
- Services kept to essential methods (30-130 lines each)

**Parameters:**
- Use object destructuring for multiple props (e.g., `BookmarkCard: React.FC<{ bookmark: Bookmark; onEdit: ...; onDelete: ... }>`)
- Typed parameters with TypeScript interfaces
- Optional parameters use `?` in interfaces
- Generic function types: e.g., `async function apiRequest<T>(endpoint: string, method: 'GET' | 'POST', data?: any): Promise<T | null>`

**Return Values:**
- Explicit return type annotations (e.g., `Promise<Bookmark[]>`, `string`, `JSX.Element`)
- Async functions return Promises consistently
- Early returns for validation/guards (e.g., `if (!API_SECRET) return null`)
- Null safety: functions return `null` or empty arrays on error, never undefined

**React component returns:**
- Return `null` for conditional rendering (e.g., `if (!isVisible) return null`)
- JSX elements properly typed as `React.ReactNode` where needed
- Props spread with `{...props}` for passthrough components (UI primitives)

## Module Design

**Exports:**
- Named exports for services and utilities (e.g., `export const storage = { ... }`)
- Default exports for React components (e.g., `export default function App()`)
- Type exports explicit: `export interface`, `export type`
- Services exported as const objects with methods (e.g., `storage.getBookmarks()`)

**Barrel Files:**
- Not used; imports are direct from component files
- UI components imported as: `import { Button, Input, ... } from './components/UI'`
- All exports from `UI.tsx` are named exports

**File organization:**
- One main component per file (App.tsx is exception due to size)
- Helper components co-located in same file as main component (BookmarkCard in App.tsx)
- Services in `src/services/` directory
- Components in `src/components/` directory
- Types in `src/types.ts` (centralized)
- Translations in `src/translations.ts` (centralized)

---

*Convention analysis: 2026-03-12*
