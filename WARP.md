# EduDash Pro Database Schema Reference

**CRITICAL: Always use this schema as the definitive reference for database queries**

## Core Table Structure

Based on `/migrations_drafts/20250910_fix_core_schema_relationships.sql`:

### 1. Teachers
- **Location**: `users` table with `role = 'teacher'` (ACTUAL STRUCTURE)
- **Structure**:
  ```sql
  SELECT id, auth_user_id, email, name, phone, role, preschool_id, is_active, created_at
  FROM users 
  WHERE role = 'teacher' AND preschool_id = ? AND is_active = true;
  ```
- **Key fields**: `name` (single field, not first_name/last_name), `role`, `preschool_id`
  ```

### 2. Students
- **Location**: `public.students` table
- **Structure**:
  ```sql
  CREATE TABLE public.students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    preschool_id UUID NOT NULL REFERENCES public.preschools(id) ON DELETE CASCADE,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    date_of_birth DATE,
    parent_id UUID REFERENCES auth.users(id),
    guardian_id UUID REFERENCES auth.users(id),
    parent_email TEXT,
    class_id UUID,
    is_active BOOLEAN NOT NULL DEFAULT true
  );
  ```

### 3. Classes
- **Location**: `public.classes` table
- **Structure**:
  ```sql
  CREATE TABLE public.classes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    preschool_id UUID NOT NULL REFERENCES public.preschools(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    teacher_id UUID REFERENCES auth.users(id),
    grade_level TEXT,
    max_students INTEGER DEFAULT 25,
    is_active BOOLEAN NOT NULL DEFAULT true
  );
  ```

### 4. Preschools
- **Location**: `public.preschools` table
- **Structure**:
  ```sql
  CREATE TABLE public.preschools (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    country TEXT,
    address TEXT,
    phone TEXT,
    email TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true
  );
  ```

### 5. Profiles
- **Location**: `public.profiles` table
- **Structure**:
  ```sql
  CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    first_name TEXT,
    last_name TEXT,
    avatar_url TEXT,
    role TEXT NOT NULL DEFAULT 'parent' CHECK (role IN ('super_admin', 'principal_admin', 'teacher', 'parent')),
    preschool_id UUID REFERENCES public.preschools(id),
    phone TEXT,
    address TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true
  );
  ```

## Key Relationships

1. **Teachers** → linked to preschools via `preschool_id`
2. **Students** → linked to preschools via `preschool_id` and classes via `class_id`
3. **Classes** → linked to preschools via `preschool_id` and teachers via `teacher_id` 
4. **Profiles** → linked to preschools via `preschool_id` (for role-based access)

## Query Guidelines

### To get teachers for a preschool:
```sql
SELECT id, auth_user_id, email, name, phone, role, preschool_id, is_active, created_at
FROM users 
WHERE preschool_id = ? AND role = 'teacher' AND is_active = true;
```

### To get students for a preschool:
```sql
SELECT * FROM public.students 
WHERE preschool_id = ? AND is_active = true;
```

### To get classes for a preschool:
```sql
SELECT * FROM public.classes 
WHERE preschool_id = ? AND is_active = true;
```

### To get school/preschool info:
```sql
SELECT * FROM public.preschools 
WHERE id = ?;
```

**ALWAYS query the `users` table with `role = 'teacher'` for teacher information - there is NO separate `teachers` table.**
