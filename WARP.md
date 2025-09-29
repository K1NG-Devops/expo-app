# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Development Commands

### Development Server
```bash
npm start                    # Start Expo dev server with dev client (localhost)
npm run start:clear         # Start with cache cleared
npm run dev:android         # Start server and launch Android automatically
```

### Building & Platforms
```bash
npm run android             # Build and run on Android
npm run ios                 # Build and run on iOS
npm run web                 # Start web development server
```

### Code Quality
```bash
npm run typecheck           # Run TypeScript type checking (tsc --noEmit)
npm run lint                # Run ESLint on TS/TSX files (max 200 warnings)
npm run lint:fix            # Auto-fix ESLint issues
```

### Database & Infrastructure
```bash
npm run inspect-db          # Inspect remote database with tsx scripts/inspect-remote-db.ts
npm run inspect-db-full     # Full inspection with service role
npm run setup-rls           # Apply RLS setup via scripts/apply-rls-setup.ts
npm run reset-migrations    # Reset migration history
```

### EAS Builds
```bash
eas build --platform android --profile development   # Dev build
eas build --platform android --profile preview       # Preview APK
eas build --platform android --profile production    # Production build
```

## Architecture Overview

### Tech Stack
- **Framework**: React Native with Expo SDK 53
- **Navigation**: Expo Router v5 with file-based routing
- **Database**: Supabase (PostgreSQL with RLS, Edge Functions)
- **State Management**: TanStack Query v5 for server state, Context API for app state
- **Authentication**: Supabase Auth with biometric support
- **Styling**: React Native StyleSheet with LinearGradient
- **Revenue**: RevenueCat for subscriptions, Google AdMob for ads
- **AI Integration**: Custom AI gateway with Claude service
- **Monitoring**: Sentry, PostHog analytics

### Project Structure
```
├── app/                    # Expo Router screens (file-based routing)
│   ├── (auth)/            # Authentication screens (sign-in, sign-up)
│   ├── screens/           # Main app screens by role
│   └── _layout.tsx        # Root layout with providers
├── components/            # Reusable UI components
│   ├── ui/               # Base UI components
│   ├── dashboard/        # Dashboard components by role
│   ├── auth/             # Authentication components
│   └── ai/               # AI-related components
├── lib/                  # Core business logic and utilities
│   ├── auth/             # Authentication services
│   ├── ai/               # AI integration and management
│   ├── services/         # Business logic services
│   ├── rbac/             # Role-based access control
│   └── supabase.ts       # Supabase client configuration
├── contexts/             # React Context providers
├── constants/            # App constants and design system
└── types/                # TypeScript type definitions
```

### Multi-Tenant Architecture
The app supports multiple tenants with role-based access:
- **Super Admin**: Platform-wide management and analytics
- **Principal**: School administration and financial management
- **Teacher**: Classroom management and lesson planning
- **Parent**: Child monitoring and communication

Each role has dedicated screens in `app/screens/` and components in `components/dashboard/`.

### Key Services & Integrations

#### Authentication Flow
- Supabase Auth with RLS (Row Level Security)
- Biometric authentication support via `lib/biometrics.ts`
- Role-based routing after login via `lib/routeAfterLogin.ts`

#### AI Features
- AI allocation management in `lib/ai/allocation.ts`
- Lesson generation, homework grading, progress analysis
- Usage limits and subscription gating via `lib/ai/limits.ts`

#### Revenue Model
- RevenueCat for subscription management
- Google AdMob with subscription-based ad removal
- Seat-based pricing for institutional features

#### Data Layer
- Supabase real-time subscriptions
- TanStack Query for caching and sync
- Offline support via `lib/sync/SyncEngine.ts`

### Environment Configuration
Three build profiles in `eas.json`:
- **development**: Local development with test tools
- **preview**: Internal testing with WhatsApp integration
- **production**: Live app with OTA updates enabled

### Development Notes
- Uses Expo Router with typed routes disabled (`typedRoutes: false`)
- ESLint configured for React Native with TypeScript
- Path aliases configured: `@/*` maps to project root
- Database inspection scripts in `scripts/` for debugging
- Web platform supported with SEO optimization

### Critical Dependencies
- Expo SDK 53 with new architecture enabled
- React 19 and React Native 0.79.5
- Supabase client v2.57.3
- TanStack Query v5.87.4
- TypeScript 5.8.3 with strict mode

### Security Considerations
- RLS policies for multi-tenant data isolation
- RBAC implementation in `lib/rbac/`
- Security middleware and rate limiting
- Biometric authentication with secure storage
- WhatsApp integration with business API security