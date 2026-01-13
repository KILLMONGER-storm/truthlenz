# TruthLenz AI Coding Instructions

## Project Overview

**TruthLenz** is a fact-checking and content verification web application built with React, TypeScript, and Vite. It verifies text, URLs, images, and videos for credibility using backend analysis powered by Supabase edge functions. The app includes authentication, real-time verification results, and user feedback mechanisms.

**Tech Stack**: React 18 + TypeScript + Vite + Supabase + shadcn/ui + Tailwind CSS

## Architecture & Data Flow

### Core Verification Pipeline
1. User submits content via `InputSection` component (supports text, URL, file upload)
2. `verifyContent()` from `/lib/verificationApi.ts` calls Supabase edge function `verify-content`
3. Backend returns `VerificationResult` with credibility score, verdict, and multi-part analysis
4. Results display through `ResultsSection` with specialized cards: `TextAnalysisCard`, `FactCheckCard`, `MediaVerificationCard`

### Key Type System
All verification structures defined in `src/types/verification.ts`:
- **VerdictType**: `'reliable' | 'misleading' | 'fake'`
- **VerificationResult**: Contains `credibilityScore` (0-100), verdict, text analysis, claim extraction, media verification
- **MediaVerification**: Handles both image/video with `authenticityScore`, manipulation flags, and detailed `analysisDetails` (pixel, texture, semantic, temporal, audio analysis)

### Authentication & State Management
- **AuthProvider** (`src/hooks/useAuth.tsx`) wraps the app, manages Supabase auth state
- **ProtectedRoute** redirects unauthenticated users to `/auth`
- Session persisted in localStorage; auth state subscription ensures token refresh
- TanStack React Query (`QueryClient`) manages async state in `App.tsx`

### Supabase Integration
- **Endpoint**: `/supabase/functions/verify-content/index.ts` (Deno edge function, 868 lines)
- **Request**: Accepts content, type, mediaDescription, and base64-encoded media
- **Response**: JSON with credibility score, verdicts, multi-level analysis details
- Client created at `src/integrations/supabase/client.ts` (generated; don't edit directly)

## Key Patterns & Conventions

### Component Structure
- **UI Components** use shadcn/ui from `src/components/ui/` (auto-generated from Radix primitives)
- **Page Components** in `src/pages/` handle routing logic
- **Feature Components** (e.g., `VerificationCard`, `Header`) compose UI primitives and business logic
- Example: `CredibilityScore.tsx` uses CSS-in-JS animation (SVG circular progress with stroke-dashoffset)

### Styling & Theming
- **Tailwind CSS** with custom color scheme (e.g., `text-reliable`, `bg-misleading-bg`, `text-fake`)
- **Dark mode support** via `ThemeProvider` (wraps Next.js themes integration)
- Custom theme switcher: `CinematicThemeSwitcher` with smooth transitions
- **Custom UI elements**: `GlowCard`, `SpotlightCard`, `VerdictGlowCard` for visual effects

### File Upload & Media Handling
- Images/videos converted to base64 in browser (`FileReader` API)
- Base64 passed to Supabase function; frontend stores original for feedback workflow
- `currentImageBase64` state in Index page enables feedback submission with original media

### Error Handling
- Verification errors caught in `Index.tsx`, user notified via `sonner` toast
- Auth errors handled in `Auth.tsx` with validation (email format, password length)
- API errors logged to console; user sees generic message

### Feedback Loop
- `submitFeedback()` in verificationApi tracks user corrections
- Used to improve model accuracy; sends to Supabase for storage

## Development Workflow

### Setup & Running
```bash
npm install                    # Install dependencies
npm run dev                    # Start dev server on http://localhost:8080
npm run build                  # Production build
npm run build:dev             # Development build with source maps
npm run lint                  # Run ESLint
npm run preview               # Preview production build locally
```

### Path Aliases
- `@/*` → `src/*` (configured in `tsconfig.json`)
- Always use `@/` imports in components, hooks, types, etc.

### Environment Variables
Required in `.env.local`:
```
VITE_SUPABASE_URL=<your-url>
VITE_SUPABASE_PUBLISHABLE_KEY=<your-key>
```

### TypeScript Configuration
- `noImplicitAny: false` (flexible typing permitted)
- `strictNullChecks: false` (optional chaining not enforced)
- `skipLibCheck: true` (faster compilation)

## Integration Points & External Dependencies

### Supabase
- **Auth**: Email/password sign-up, login, session management
- **Edge Functions**: Server-side verification logic (all media analysis happens here)
- **Database**: Feedback storage (schema in migrations)

### UI Libraries
- **shadcn/ui**: Pre-built accessible components (Button, Card, Input, Dialog, etc.)
- **Radix UI**: Underlying headless component library
- **Lucide React**: Icons (Shield, AlertTriangle, XCircle for verdicts)
- **Framer Motion**: Animation library (imported but check usage)

### Form & Validation
- **react-hook-form**: Form state management
- **Zod**: Schema validation (installed but check usage in forms)
- **HookForm Resolvers**: Bridge between react-hook-form and Zod

### Other
- **Sonner**: Toast notifications
- **recharts**: Data visualization (installed, likely for future analytics)
- **date-fns**: Date formatting
- **next-themes**: Dark mode theme provider

## Important Notes

### Backend Verification Logic
The edge function is the source of truth for verification quality. All analysis (text sentiment, claim extraction, media authenticity, pixel analysis, model consensus) happens server-side in `verify-content/index.ts`. Frontend is thin—mostly presentation and orchestration.

### Media Handling Complexity
Media verification supports both legacy `imageBase64`/`imageVerdict` and new `mediaBase64`/`mediaVerdict` fields. When adding media features, check `MediaVerification` interface for both formats to maintain backward compatibility.

### Custom Styling
Some components use custom class names not in standard Tailwind (e.g., `text-reliable`, `bg-misleading-bg`). These are defined in CSS files (`App.css`, `index.css`) or Tailwind config extensions.

### Component Tagger
In development mode (`lovable-tagger` plugin), components are tagged for Lovable AI integration. Ignore these tags in your code.

## Common Tasks

**Add a new verification input type**: Update `VerificationType` in types, add handler in `InputSection`, ensure edge function supports it.

**Modify verdict logic**: Edit backend analysis in `verify-content/index.ts`; frontend just displays results.

**Add new card type**: Create component in `src/components/`, follow pattern of `TextAnalysisCard` (accept `analysis`, `verdict`, `score` props), import in `ResultsSection`.

**Style a new component**: Use Tailwind classes with custom color tokens (e.g., `text-primary`, `bg-card`) or add to `globals.css`.

**Debug verification results**: Check browser DevTools Network tab for edge function response; verify media base64 encoding in Index component before API call.
