# EduDash Pro

> A comprehensive educational management system for schools, empowering teachers, parents, and administrators with modern tools for student success.

## Overview

**EduDash Pro** is a cross-platform mobile application built with React Native and Expo that provides a complete educational management solution. It features role-based dashboards, AI-powered tools, real-time communication, financial management, and comprehensive reporting capabilities.

### Key Features

- 🎓 **Role-Based Dashboards**: Tailored experiences for teachers, principals, parents, students, and super admins
- 🤖 **AI-Powered Assistant**: Dash AI for lesson generation, grading, and progress analysis
- 💬 **Real-Time Communication**: WhatsApp integration, notifications, and messaging
- 📊 **Analytics & Reporting**: Comprehensive student progress tracking and institutional metrics
- 💰 **Financial Management**: Petty cash tracking, invoicing, and payment integration
- 📱 **Cross-Platform**: Native iOS and Android apps with web support
- 🔒 **Security First**: Row-level security, biometric auth, and encrypted storage
- 🌍 **Multi-Language**: i18n support with multiple language options

## Tech Stack

### Frontend
- **React Native** 0.79.5
- **Expo SDK** ~53.0
- **TypeScript** 5.8
- **Expo Router** for navigation
- **React Query** for state management

### Backend
- **Supabase** (PostgreSQL + Real-time + Storage + Auth)
- **Edge Functions** (Deno runtime)
- **RevenueCat** for subscriptions
- **Google Mobile Ads** for monetization

### AI & Services
- **Claude API** via AI gateway
- **WhatsApp Business API**
- **PostHog** analytics
- **Sentry** error tracking

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** >= 18.0.0
- **npm** >= 8.0.0
- **Expo CLI**: `npm install -g expo-cli`
- **EAS CLI**: `npm install -g eas-cli`
- **Supabase CLI**: For database migrations
- **Java JDK** 17+ (for Android builds)
- **Android Studio** with SDK (for Android development)
- **Xcode** 14+ (for iOS development, macOS only)

## Quick Start

### 1. Clone and Install

```bash
git clone <repository-url> edudashpro
cd edudashpro
npm install
```

### 2. Environment Setup

Create a `.env` file in the project root:

```bash
cp .env.example .env
```

Configure the following required variables:

```env
# Supabase
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key

# AI Gateway
EXPO_PUBLIC_AI_GATEWAY_URL=your_ai_gateway_url
EXPO_PUBLIC_AI_GATEWAY_KEY=your_gateway_key

# RevenueCat (Optional for subscription features)
EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID=your_rc_android_key
EXPO_PUBLIC_REVENUECAT_API_KEY_IOS=your_rc_ios_key

# Google Ads (Optional for ad features)
EXPO_PUBLIC_ADMOB_ANDROID_APP_ID=ca-app-pub-xxx
EXPO_PUBLIC_ADMOB_IOS_APP_ID=ca-app-pub-xxx
```

See `docs/deployment/BACKEND_ENVIRONMENT_VARIABLES.md` for complete configuration guide.

### 3. Database Setup

```bash
# Link your Supabase project
supabase link --project-ref your-project-ref

# Apply migrations
supabase db push

# Verify migration status
supabase migration list
```

### 4. Run Development Server

```bash
# Start Expo development server
npm start

# Or with dev client
npm run start

# For Android
npm run android

# For iOS
npm run ios
```

## Project Structure

```
edudashpro/
├── app/                    # Expo Router pages and screens
├── components/             # Reusable React components
├── lib/                    # Core libraries and utilities
│   ├── ai/                # AI integration (Claude, usage tracking)
│   ├── auth/              # Authentication services
│   ├── db/                # Database utilities
│   └── services/          # Business logic services
├── services/              # External service integrations
├── hooks/                 # Custom React hooks
├── contexts/              # React Context providers
├── types/                 # TypeScript type definitions
├── assets/                # Static assets (images, fonts)
├── locales/               # i18n translation files
├── supabase/              # Supabase migrations and functions
│   ├── migrations/        # Database schema migrations
│   └── functions/         # Edge Functions
├── scripts/               # Build and maintenance scripts
├── docs/                  # Project documentation
│   ├── deployment/        # Deployment guides
│   ├── features/          # Feature documentation
│   ├── governance/        # Development rules and standards
│   └── security/          # Security policies
└── sql/                   # SQL scripts and archives
```

## Development

### Code Quality

```bash
# Type checking
npm run typecheck

# Linting
npm run lint
npm run lint:fix

# Testing
npm test
npm run test:coverage
```

### Database Migrations

**Always use Supabase migrations - never modify the database directly!**

```bash
# Create new migration
supabase migration new descriptive_name

# Apply migrations
supabase db push

# Verify no drift
supabase db diff
```

See `docs/governance/rules.md` for detailed migration policies.

### Logging Standards

Use the centralized logger for all logging:

```typescript
import { logger } from '@/lib/logger';

logger.debug('Detailed information for debugging');
logger.info('General information');
logger.warn('Warning messages');
logger.error('Error messages');
```

**Never use `console.log`, `console.warn`, or `console.debug` in production code.** All non-error logs are automatically stripped from production builds.

## Building for Production

### Android

```bash
# Build APK (for testing)
npm run build:android:apk

# Build AAB (for Play Store)
npm run build:android:aab
```

### iOS

```bash
# Build for TestFlight/App Store
eas build --platform ios --profile production
```

See `docs/deployment/` for comprehensive build and deployment guides.

## Documentation

- **[WARP.md](./WARP.md)** - Master development rules and project guidelines
- **[Governance Rules](./docs/governance/rules.md)** - Code standards, logging, and file organization
- **[Operations Guide](./docs/deployment/OPERATIONS.md)** - Day-to-day operational procedures
- **[Feature Documentation](./docs/features/)** - Individual feature guides
- **[Security Policies](./docs/security/)** - Security standards and compliance

## Contributing

1. Review [WARP.md](./WARP.md) and [docs/governance/rules.md](./docs/governance/rules.md)
2. Create a feature branch: `git checkout -b feature/your-feature-name`
3. Follow code standards and logging policies
4. Create database migrations for schema changes
5. Write tests for new features
6. Submit a pull request with clear description

## License

Proprietary - All rights reserved.

## Support

For issues, questions, or feature requests, contact the development team or create an issue in the project repository.

---

**Version:** 1.0.2  
**Last Updated:** October 2025
