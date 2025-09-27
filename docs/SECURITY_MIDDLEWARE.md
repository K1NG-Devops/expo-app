# Security Middleware Documentation

This document provides comprehensive examples of how to use the security middleware system in EduDash Pro.

## Overview

The security middleware system provides:

- **CORS and Security Headers**: Proper cross-origin handling and security headers
- **Request Validation**: Zod-based schema validation for requests
- **Rate Limiting**: Configurable rate limits with brute force protection
- **Authentication**: Token-based authentication verification
- **Authorization**: Role-based access control (RBAC)
- **Request Size Validation**: Protection against large payload attacks

## Quick Start

### Basic Protected Endpoint

```typescript
import { createSecureEndpoint, SecurityMiddlewares } from '../lib/security';

export const protectedHandler = createSecureEndpoint(
  async (request, { data }) => {
    const { user, profile } = data;
    
    return new Response(JSON.stringify({
      message: `Hello ${profile.first_name}!`,
      role: profile.role,
    }));
  },
  SecurityMiddlewares.protectedAPI
);
```

### Authentication Endpoint with Validation

```typescript
import { 
  applySecurityMiddleware, 
  ValidationSchemas,
  validateLoginAttempt,
  recordSuccessfulLogin 
} from '../lib/security';
import { authService } from '../lib/auth';

export async function loginHandler(request: Request): Promise<Response> {
  // Apply security middleware with validation
  const security = await applySecurityMiddleware(request, {
    cors: true,
    rateLimit: 'auth',
    validation: {
      body: ValidationSchemas.login,
    },
  });

  if (!security.success) {
    return security.response!;
  }

  const { email, password } = security.data!.body;

  // Check for brute force attempts
  const loginAttempt = await validateLoginAttempt(request, { email, password });
  if (!loginAttempt.success) {
    return loginAttempt.response!;
  }

  // Attempt login
  const loginResult = await authService.login({ email, password });
  
  if (loginResult.success) {
    recordSuccessfulLogin(request, email);
    return new Response(JSON.stringify({
      success: true,
      user: loginResult.data?.user,
      session: loginResult.data?.session,
    }));
  } else {
    return new Response(JSON.stringify({
      error: loginResult.error,
    }), { status: 401 });
  }
}
```

## Security Configurations

### Predefined Configurations

```typescript
import { SecurityMiddlewares } from '../lib/security';

// For authentication endpoints (login, register)
SecurityMiddlewares.auth

// For public API endpoints (no auth required)
SecurityMiddlewares.publicAPI

// For protected API endpoints (auth required)
SecurityMiddlewares.protectedAPI

// For admin-only endpoints
SecurityMiddlewares.adminOnly

// For instructor endpoints
SecurityMiddlewares.instructorOnly

// For AI-powered endpoints
SecurityMiddlewares.aiEndpoint

// For file upload endpoints
SecurityMiddlewares.fileUpload
```

### Custom Configuration

```typescript
import { applySecurityMiddleware } from '../lib/security';

const customConfig = {
  cors: true,
  rateLimit: 'api' as const,
  maxRequestSize: 512 * 1024, // 512KB
  validation: {
    body: myCustomSchema,
    query: paginationSchema,
  },
  authentication: true,
  authorization: {
    roles: ['admin', 'instructor'],
    permissions: ['manage_courses'],
    requireAll: false, // User needs ANY of the permissions
  },
};

const result = await applySecurityMiddleware(request, customConfig);
```

## Validation Schemas

### Using Built-in Schemas

```typescript
import { ValidationSchemas } from '../lib/security';

// Login validation
ValidationSchemas.login

// Registration validation (strong password requirements)
ValidationSchemas.register

// Pagination parameters
ValidationSchemas.pagination

// Course creation
ValidationSchemas.courseCreate

// Course enrollment
ValidationSchemas.courseEnroll

// URL parameter validation
ValidationSchemas.courseId
ValidationSchemas.assignmentId
```

### Custom Validation Schemas

```typescript
import { z } from 'zod';
import { createValidation } from '../lib/security';

const customSchema = z.object({
  title: z.string().min(3).max(100),
  description: z.string().max(500),
  priority: z.enum(['low', 'medium', 'high']),
  tags: z.array(z.string()).optional(),
});

const validator = createValidation(customSchema);

// Use in middleware
const security = await applySecurityMiddleware(request, {
  validation: { body: customSchema }
});
```

## Rate Limiting

### Built-in Rate Limiters

```typescript
import { RateLimiters } from '../lib/security';

// Authentication endpoints: 10 requests per 15 minutes
RateLimiters.auth

// AI endpoints: 20 requests per minute
RateLimiters.ai

// General API: 100 requests per minute
RateLimiters.api

// File uploads: 10 requests per 5 minutes
RateLimiters.upload

// Password reset: 3 requests per hour
RateLimiters.passwordReset
```

### Custom Rate Limiting

```typescript
import { createRateLimitMiddleware } from '../lib/security';

const customRateLimit = createRateLimitMiddleware({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 50,
  message: 'Custom rate limit exceeded',
  progressivePenalty: true, // Increase penalty on repeated violations
}, 'custom-endpoint');

const result = customRateLimit(request, origin, environment);
```

## Authentication Integration

### Checking Authentication

```typescript
import { authService } from '../lib/auth';

export async function protectedEndpoint(request: Request) {
  const security = await applySecurityMiddleware(request, {
    authentication: true,
  });

  if (!security.success) {
    return security.response!;
  }

  const { user, profile } = security.data!;
  
  // User is authenticated, proceed with logic
  return new Response(JSON.stringify({
    userId: user.id,
    role: profile.role,
  }));
}
```

### Role-Based Authorization

```typescript
// Admin only endpoint
export const adminEndpoint = createSecureEndpoint(
  async (request, { data }) => {
    // Only admins can reach this code
    return new Response(JSON.stringify({ admin: true }));
  },
  {
    authentication: true,
    authorization: { roles: ['admin'] }
  }
);

// Instructor or Admin endpoint
export const instructorEndpoint = createSecureEndpoint(
  async (request, { data }) => {
    return new Response(JSON.stringify({ authorized: true }));
  },
  {
    authentication: true,
    authorization: { roles: ['admin', 'instructor'] }
  }
);

// Permission-based authorization
export const aiEndpoint = createSecureEndpoint(
  async (request, { data }) => {
    return new Response(JSON.stringify({ ai_enabled: true }));
  },
  {
    authentication: true,
    authorization: { 
      permissions: ['use_ai_features'] 
    }
  }
);
```

## Error Handling

### Validation Errors

```typescript
// Invalid request returns structured error:
{
  "message": "Validation failed",
  "errors": {
    "email": ["Invalid email format"],
    "password": ["Password must be at least 12 characters"]
  }
}
```

### Rate Limit Errors

```typescript
// Rate limit exceeded returns:
{
  "message": "Too many requests, please try again later",
  "retryAfter": 300, // seconds
  "resetTime": "2024-01-01T12:00:00Z"
}
```

### Authorization Errors

```typescript
// Insufficient permissions returns:
{
  "error": "Insufficient permissions",
  "required": ["role:admin"],
  "missing": ["role:student (required: admin)"]
}
```

## CORS Configuration

### Environment-based CORS

```typescript
// Development
allowedOrigins: [
  'http://localhost:8081',
  'http://localhost:19006',
  'exp://192.168.1.*:8081'
]

// Production
allowedOrigins: [
  'https://edudashpro.org.za',
  'https://app.edudashpro.org.za'
]
```

### Custom CORS Headers

```typescript
import { createCORSHeaders } from '../lib/security';

const corsHeaders = createCORSHeaders(origin, environment);
```

## Security Headers

All responses automatically include:

```typescript
{
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'Access-Control-Allow-Origin': /* validated origin */,
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With'
}
```

## Testing

### Unit Tests

```typescript
import { applySecurityMiddleware, ValidationSchemas } from '../lib/security';

test('should validate registration data', async () => {
  const request = new Request('http://localhost/test', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      email: 'test@example.com',
      password: 'StrongPass123!',
      firstName: 'John',
      lastName: 'Doe',
    }),
  });

  const result = await applySecurityMiddleware(request, {
    validation: { body: ValidationSchemas.register }
  });

  expect(result.success).toBe(true);
  expect(result.data?.body.email).toBe('test@example.com');
});
```

### Integration Testing

```typescript
test('should handle complete auth flow', async () => {
  // Test registration
  const registerResponse = await fetch('/auth/register', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      email: 'newuser@test.com',
      password: 'SecurePass123!',
      firstName: 'New',
      lastName: 'User',
    }),
  });

  expect(registerResponse.status).toBe(200);

  // Test login
  const loginResponse = await fetch('/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      email: 'newuser@test.com',
      password: 'SecurePass123!',
    }),
  });

  expect(loginResponse.status).toBe(200);
});
```

## Best Practices

### 1. Always Use Middleware

```typescript
// ✅ Good - Use security middleware
export const handler = createSecureEndpoint(
  async (request, { data }) => {
    // Your logic here
  },
  SecurityMiddlewares.protectedAPI
);

// ❌ Bad - Raw endpoint without security
export const handler = async (request) => {
  // No security validation
};
```

### 2. Validate All Inputs

```typescript
// ✅ Good - Validate with schema
const security = await applySecurityMiddleware(request, {
  validation: { body: ValidationSchemas.courseCreate }
});

// ❌ Bad - Use raw request data
const data = await request.json(); // No validation
```

### 3. Use Appropriate Rate Limits

```typescript
// ✅ Good - Match rate limit to endpoint type
SecurityMiddlewares.auth // For login/register
SecurityMiddlewares.ai   // For AI endpoints
SecurityMiddlewares.api  // For general API

// ❌ Bad - One size fits all
{ rateLimit: 'api' } // For everything
```

### 4. Handle Errors Gracefully

```typescript
// ✅ Good - Check security result
const security = await applySecurityMiddleware(request, config);
if (!security.success) {
  return security.response!; // Return proper error response
}

// ❌ Bad - Ignore security checks
const security = await applySecurityMiddleware(request, config);
// Continue without checking result
```

## Troubleshooting

### Common Issues

1. **CORS Errors**: Check origin in CORS_CONFIG
2. **Rate Limit False Positives**: Check IP extraction logic
3. **Validation Failures**: Review Zod schema requirements
4. **Auth Token Issues**: Verify Supabase JWT configuration

### Debug Mode

Enable debug logging in development:

```typescript
// In your .env file
EXPO_PUBLIC_DEBUG_MODE=true
EXPO_PUBLIC_DEBUG_SUPABASE=true
```

This provides detailed logs for:
- Rate limiting decisions
- CORS origin validation
- Authentication token verification
- Validation failures