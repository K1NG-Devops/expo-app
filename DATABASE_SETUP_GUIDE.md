# Database Setup Instructions

## Current Status
✅ Remote Supabase database connected (`lvvvjywrmpcqrpvuptdi`)  
✅ TypeScript types generated from remote schema  
✅ **REAL DATA DISCOVERED**: 2 preschools, 7 users, 1 student, 1 class  
✅ Safe RLS policies created for existing data  
⚠️ **CRITICAL**: Database has NO RLS protection currently!  
⏳ **NEXT STEP**: Apply safe RLS policies immediately  

## 🚨 URGENT: Apply RLS Policies (Safe for Your Existing Data)

Your database inspection revealed:
- **2 preschools**: "Fringe" and "Young Eagles"  
- **7 users**: Including principals, teachers, and superadmin  
- **1 student**: Olivia Makunyane in Panda class  
- **Real production data**: Cannot use generic setup script  

### Steps to Apply SAFE RLS Policies

1. **Go to Supabase SQL Editor**:
   ```
   https://supabase.com/dashboard/project/lvvvjywrmpcqrpvuptdi/sql
   ```

2. **Copy the SAFE SQL script** (designed for your existing data):
   ```bash
   # From your project directory, copy the contents of:
   scripts/setup-rls-for-existing-data.sql
   ```

3. **Paste and execute** the script in the SQL Editor

4. **Verify setup** by running our inspection script:
   ```bash
   export SUPABASE_SERVICE_ROLE_KEY="your_service_role_key"
   npx tsx scripts/inspect-with-sql.ts
   ```

## What the RLS Script Does

### 🔒 Security Setup
- Enables RLS on all critical tables (users, students, classes, etc.)
- Creates helper functions for role-based access control
- Establishes comprehensive policies for tenant isolation
- Ensures Super-Admin bypass for platform management

### 🏢 Multi-Tenant Architecture
- **Tenant Isolation**: Each preschool can only access its own data
- **Role-Based Access**: Principal, Teacher, Parent, and Super-Admin permissions
- **Parent Access**: Parents can only see their own children's data
- **Super-Admin Override**: Platform admins can access all data

### 📋 Sample Data Created
- 1 sample preschool (Sunnydale Learning Centre)
- 1 Principal user
- 2 Teacher users  
- 2 Parent users
- 1 Super-Admin user
- Sample classes and students
- AI usage logs
- System announcements

## After Applying RLS

Once you've applied the RLS policies, we can:

1. **Test the security** - Verify role-based access works correctly
2. **Build Principal Hub** - Start the onboarding wizard and daily operations
3. **Create authentication flows** - Login/registration with proper role assignment
4. **Implement AI features** - Lesson generation and homework grading
5. **Build mobile components** - Parent and teacher dashboards

## Troubleshooting

If you encounter any issues:

1. **Check the SQL Editor console** for any error messages
2. **Run the inspection script** to see current database state:
   ```bash
   npm run inspect-db
   ```
3. **Look for RLS policy conflicts** - The script drops existing policies first

---

**🚨 IMPORTANT**: Apply the RLS policies before proceeding with any app development, as the current database has no access control!