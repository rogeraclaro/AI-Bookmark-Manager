# Technology Stack

**Analysis Date:** 2026-03-12

## Languages

**Primary:**
- TypeScript 5.9.3 - Full application codebase (main webapp and extension)

**Markup:**
- HTML - Chrome extension manifests and build templates
- CSS - Styling with Tailwind (see Build/Dev section)

## Runtime

**Environment:**
- Node.js (implied from npm usage; no explicit version constraint, check .nvmrc if needed)

**Browser Target:**
- Chrome/Chromium (Chrome extension based on manifest v3)
- Modern browsers supporting ES2022 (from tsconfig.app.json)

**Package Manager:**
- npm (version not constrained in package.json)
- Lockfile: Present (package-lock.json exists)

## Frameworks

**Core UI:**
- React 19.2.0 (main webapp) - UI components and state management
- React 18.2.0 (Chrome extension) - Popup UI
- React DOM 19.2.0 (main) / 18.2.0 (extension) - DOM rendering

**AI/ML:**
- Google Generative AI (@google/genai) 1.30.0 - Gemini 2.5 Flash model integration for bookmark processing

**UI Components:**
- Lucide React 0.555.0 - Icon library for React components

**Testing:**
- Not detected in dependencies (no jest, vitest, mocha, etc.)

**Build/Dev:**
- Vite 7.2.4 (main) / 5.0.8 (extension) - Module bundler and dev server
- @vitejs/plugin-react 5.1.1 (main) / 4.2.1 (extension) - React integration for Vite
- PostCSS 8.5.6 (main) / 8.4.32 (extension) - CSS processing
- Tailwind CSS 3.4.17 (main) / 3.4.0 (extension) - Utility-first CSS framework
- Autoprefixer 10.4.22 (main) / 10.4.16 (extension) - CSS vendor prefixing

**Type System:**
- TypeScript 5.9.3 (main) / 5.3.3 (extension)
- TypeScript ESLint 8.46.4 - TypeScript ESLint rules

## Linting & Code Quality

**Formatter/Linter:**
- ESLint 9.39.1 - JavaScript/TypeScript linting
  - @eslint/js 9.39.1 - JavaScript rules
  - typescript-eslint 8.46.4 - TypeScript rules
  - eslint-plugin-react-hooks 7.0.1 - React hooks rules
  - eslint-plugin-react-refresh 0.4.24 - React fast refresh rules

**Config Files:**
- `eslint.config.js` - Flat config format (ESLint v9+)
- `tsconfig.json` - Base TypeScript configuration
- `tsconfig.app.json` - Application TypeScript config with strict mode enabled
- `tsconfig.node.json` - Node utilities TypeScript config

## Type Definitions

**Included:**
- @types/node 24.10.1 - Node.js type definitions
- @types/react 19.2.5 (main) / 18.2.45 (extension) - React type definitions
- @types/react-dom 19.2.3 (main) / 18.2.18 (extension) - React DOM type definitions
- @types/chrome 0.0.258 (extension only) - Chrome API type definitions

## Configuration

**Environment:**
- Environment variables use Vite convention (`VITE_` prefix)
- `.env` file present in root (contents not read per policy)
- Key variables required:
  - `VITE_API_KEY` - Google Gemini API key for AI processing
  - `VITE_STORAGE_API_URL` - Optional: Backend API URL (if using remote storage)
  - `VITE_STORAGE_SECRET` - Optional: API secret for remote storage authentication

**Build:**
- `vite.config.ts` - Main webapp build configuration (React plugin only)
- `extension/vite.config.ts` - Chrome extension build configuration with multi-entry support:
  - Popup: `popup/index.html`
  - Content script: `content/content.ts`
  - Service worker: `background/service-worker.ts`
- `postcss.config.js` - PostCSS configuration for Tailwind and Autoprefixer
- `tailwind.config.js` - Tailwind CSS configuration

## Platform Requirements

**Development:**
- Node.js with npm
- TypeScript compiler (via npm dependencies)
- Modern terminal with bash/zsh

**Production:**
- Chrome/Chromium browser with extension support (manifest v3)
- Backend API server at `https://ailinksdb.masellas.info/api` for bookmark storage
- Google Cloud project with Generative AI API enabled

---

*Stack analysis: 2026-03-12*
