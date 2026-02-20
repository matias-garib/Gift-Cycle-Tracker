# GiftCycle

## Overview

GiftCycle is a mobile-first gift coordination app built with Expo (React Native) and an Express backend. It helps friend groups organize birthday gifts by managing wishlists, coordinating purchases, and splitting costs. Users create or join groups, track upcoming birthdays, suggest gift ideas, and handle payment settlements. The app uses a tab-based navigation structure with screens for Home, Groups, Stats, and Profile.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend (Expo / React Native)

- **Framework**: Expo SDK 54 with React Native 0.81, targeting iOS, Android, and Web
- **Routing**: expo-router with file-based routing (app directory). Uses typed routes via `experiments.typedRoutes`
- **Navigation structure**:
  - Tab layout at `app/(tabs)/` with 4 tabs: Home (index), Groups, Stats, Profile
  - Stack screens for auth, group detail (`group/[id]`), gift detail (`gift/[id]`), and join flow (`join/[code]`)
  - Auth screen presented as a modal
- **State management**: React Context (`AppContext`) holds all app state (user, groups, gifts). No Redux or Zustand.
- **Data fetching**: TanStack React Query is set up (`lib/query-client.ts`) with API helpers, but the current implementation primarily uses local AsyncStorage via `lib/storage.ts`. The query client infrastructure is ready for when the backend API is built out.
- **Local storage**: AsyncStorage stores users, groups, gifts, and current user session with keys prefixed `giftcycle_`
- **Fonts**: Inter font family (400, 500, 600, 700 weights) loaded via `@expo-google-fonts/inter`
- **UI libraries**: expo-haptics for feedback, expo-image-picker for profile/group photos, expo-blur and expo-glass-effect for visual effects, react-native-reanimated for animations, react-native-gesture-handler
- **Color scheme**: Warm, earthy palette defined in `constants/colors.ts` with green primary (#2D5A3D) and cream background (#F5F0E8)

### Backend (Express)

- **Framework**: Express 5 running on Node.js
- **Location**: `server/` directory with `index.ts` (entry), `routes.ts` (route registration), `storage.ts` (data layer)
- **Current state**: Minimal — routes file creates an HTTP server but has no API endpoints defined yet. Storage uses in-memory `MemStorage` class. The server is scaffolded and ready for API development.
- **CORS**: Configured to allow Replit domains and localhost origins for Expo web development
- **Dev server**: Run with `tsx` via `npm run server:dev`
- **Production build**: Uses esbuild to bundle server to `server_dist/`, run with `npm run server:prod`
- **Static serving**: In production, serves Expo web build from `dist/` directory

### Database Schema (Drizzle + PostgreSQL)

- **ORM**: Drizzle ORM with PostgreSQL dialect
- **Schema location**: `shared/schema.ts` — currently defines only a `users` table with `id` (UUID), `username`, and `password`
- **Schema is minimal**: The current schema doesn't match the app's data model (which has groups, gifts, wishlists, payments). The app currently works entirely with AsyncStorage on the client side. The database schema needs to be expanded to support the full data model defined in `lib/types.ts`.
- **Migrations**: Output to `./migrations` directory, managed by `drizzle-kit push`
- **Validation**: Uses `drizzle-zod` to generate Zod schemas from Drizzle tables
- **Connection**: Requires `DATABASE_URL` environment variable

### Key Data Models (from `lib/types.ts`)

- **User**: id, name, email, birthday, payment method/handle, avatar color, profile image
- **Group**: id, name, invite code, members (User[]), organizer ID, group image
- **Gift**: id, group ID, birthday person ID, phase (ideation → payment → settlement), wishlist items, purchased item, buyer, total cost, payments array
- **WishlistItem**: id, title, optional URL, added by user ID
- **Payment**: user ID, amount, paid status, paid timestamp

### Build & Deployment

- **Development**: Two processes needed — `npm run expo:dev` for Expo and `npm run server:dev` for Express
- **Production build**: `npm run expo:static:build` creates web bundle, `npm run server:build` bundles server
- **Deployment domain**: Configured through Replit environment variables (`REPLIT_DEV_DOMAIN`, `REPLIT_INTERNAL_APP_DOMAIN`)
- **Proxy setup**: In dev, the Expo dev server proxies API requests to the Express server using `http-proxy-middleware`

## External Dependencies

- **Database**: PostgreSQL (connected via `DATABASE_URL` environment variable, required by Drizzle config)
- **Expo services**: Expo build and development toolchain
- **No external APIs currently integrated**: Auth is simple email/name login stored locally. No OAuth, no payment processing, no push notifications yet.
- **Key npm packages**:
  - `drizzle-orm` + `drizzle-kit` for database ORM and migrations
  - `pg` for PostgreSQL client
  - `@tanstack/react-query` for server state management (infrastructure ready, not fully wired)
  - `zod` + `drizzle-zod` for validation
  - `express` v5 for backend API
  - `patch-package` for patching dependencies (runs on postinstall)