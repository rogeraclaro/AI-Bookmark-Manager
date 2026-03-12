# Testing

## Current State

**No tests exist in this codebase.** No testing framework is configured.

## What's Missing

- No test runner (Jest, Vitest, etc.)
- No test files (`*.test.ts`, `*.spec.ts`)
- No testing libraries (React Testing Library, etc.)
- No CI test step

## Recommended Setup

Given the stack (React + Vite + TypeScript), the natural fit is:

```
vitest          # Test runner (Vite-native, fast)
@testing-library/react    # Component testing
@testing-library/jest-dom # DOM matchers
```

### Suggested Structure

Co-locate tests with source files:

```
src/
  services/
    storage.ts
    storage.test.ts       # Unit tests for storage service
    geminiService.ts
    geminiService.test.ts
  components/
    UI.tsx
    UI.test.tsx
```

### Key Areas to Test First

1. `src/services/storage.ts` — Supabase CRUD (mock Supabase client)
2. `src/services/geminiService.ts` — AI response parsing (mock fetch)
3. `src/App.tsx` — Routing and auth guard behavior
4. `extension/shared/api.ts` — Extension API helpers

## Notes

- Extension service worker logic is hard to unit test; prefer integration/E2E
- Gemini service should be tested with mocked responses to avoid API costs
- Supabase calls should be mocked at the client level
