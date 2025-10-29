# Principal Dashboard Pages Implementation Guide

## Quick Start

To implement all principal dashboard pages, follow these steps:

### 1. Students Management Page

**Create**: `web/src/app/dashboard/principal/students/page.tsx`

**Adapt from**: `app/screens/student-management.tsx`

**Key changes needed**:
- Replace React Native components with HTML/Tailwind
- Replace `useTheme()` with inline styles or Tailwind classes
- Replace `router.push()` with Next.js `useRouter()` from `next/navigation`
- Replace `FlashList` with simple `div` mapping
- Use `PrincipalShell` wrapper instead of `RoleBasedHeader`
- Keep Supabase queries as-is
- Replace `TouchableOpacity` with `<button className="...">` 
- Replace `Text` with `<p>`, `<h1>`, etc.
- Replace `View` with `<div>`
- Replace `ScrollView` with `<div className="overflow-auto">`

### 2. Teachers Management Page

**Create**: `web/src/app/dashboard/principal/teachers/page.tsx`

**Adapt from**: `app/screens/teacher-management.tsx`

**Same changes as Students page**

### 3. Financial Dashboard Page

**Create**: `web/src/app/dashboard/principal/financials/page.tsx`

**Adapt from**: `app/screens/financial-dashboard.tsx`

**Additional considerations**:
- Keep ZAR currency formatting
- Chart libraries: Consider using `recharts` for web (already in package.json)
- Financial data queries stay the same

### 4. Reports Page

**Create**: `web/src/app/dashboard/principal/reports/page.tsx`

**Adapt from**: `app/screens/teacher-reports.tsx`

**Additional features**:
- Add export to PDF/CSV buttons
- Keep report generation logic
- Use existing metrics structure

### 5. Messages Page

**Create**: `web/src/app/dashboard/principal/messages/page.tsx`

**Adapt from**: `app/screens/teacher-messages.tsx`

**Features**:
- List all conversations
- Compose new messages
- Filter by recipient type (parents/teachers)
- Real-time updates

### 6. Settings Page

**Create**: `web/src/app/dashboard/principal/settings/page.tsx`

**Adapt from**: `app/screens/admin/school-settings.tsx`

**Configuration options**:
- School information
- Academic calendar
- Class configuration
- User roles and permissions
- WhatsApp integration settings

## Quick Implementation Template

Here's a template for adapting any native screen to web:

```typescript
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useUserProfile } from '@/lib/hooks/useUserProfile';
import { useTenantSlug } from '@/lib/tenant/useTenantSlug';
import { PrincipalShell } from '@/components/dashboard/principal/PrincipalShell';
import { Users, Plus } from 'lucide-react';

export default function YourPage() {
  const router = useRouter();
  const supabase = createClient();
  const [userId, setUserId] = useState<string>();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any[]>([]);

  const { profile } = useUserProfile(userId);
  const { slug: tenantSlug } = useTenantSlug(userId);
  const preschoolId = profile?.preschoolId;

  // Auth check
  useEffect(() => {
    const initAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/sign-in');
        return;
      }
      setUserId(session.user.id);
    };
    initAuth();
  }, []);

  // Load data
  useEffect(() => {
    if (!preschoolId) return;
    
    const loadData = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('your_table')
        .select('*')
        .eq('preschool_id', preschoolId);
      
      if (!error) setData(data || []);
      setLoading(false);
    };
    
    loadData();
  }, [preschoolId]);

  if (loading) {
    return (
      <PrincipalShell {...profile}>
        <div className="flex items-center justify-center min-h-[400px]">
          <p>Loading...</p>
        </div>
      </PrincipalShell>
    );
  }

  return (
    <PrincipalShell {...profile}>
      <h1 className="h1">Page Title</h1>
      
      <div className="section">
        <div className="sectionTitle">Section Title</div>
        
        {/* Your content here */}
        {data.map((item) => (
          <div key={item.id} className="card">
            {/* Item content */}
          </div>
        ))}
      </div>
    </PrincipalShell>
  );
}
```

## Component Mapping Reference

| React Native | Web/HTML |
|--------------|----------|
| `View` | `<div>` |
| `Text` | `<p>`, `<span>`, `<h1>`, etc. |
| `TouchableOpacity` | `<button>` |
| `ScrollView` | `<div className="overflow-auto">` |
| `FlatList` / `FlashList` | `{data.map(item => <div key={item.id}>...)}` |
| `TextInput` | `<input>` |
| `Image` | `<img>` |
| `ActivityIndicator` | Loading spinner component |
| `RefreshControl` | Custom refresh logic |
| `SafeAreaView` | Not needed (handled by layout) |
| `StatusBar` | Not needed (web) |

## Styling Conversion

### From React Native StyleSheet:
```typescript
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: theme.background,
  },
});
```

### To Tailwind / Inline Styles:
```html
<div className="flex-1 p-5" style={{ backgroundColor: 'var(--bg)' }}>
```

### Or use existing CSS classes:
```html
<div className="section">
  <div className="sectionTitle">Title</div>
  <div className="card">Content</div>
</div>
```

## Existing Web CSS Classes

Use these classes (already defined in `/web/src/app/design.css`):

- `.app` - Main app container
- `.section` - Page section with padding
- `.sectionTitle` - Section heading
- `.card` - Card container
- `.tile` - Metric tile
- `.metricValue` - Large metric number
- `.metricLabel` - Metric label text
- `.grid2` - 2-column grid
- `.btn`, `.btnPrimary`, `.btnSecondary` - Buttons
- `.qa` - Quick action button
- `.h1`, `.h2`, `.h3` - Headings

## Priority Order

1. **Students** (High) - Most frequently used
2. **Teachers** (High) - Staff management
3. **Financial** (Medium) - Revenue tracking
4. **Reports** (Medium) - Analytics
5. **Messages** (Low) - Can use existing teacher messages
6. **Settings** (Low) - Less frequently accessed

## Testing Checklist

After implementing each page:
- [ ] Build succeeds (`npm run build` in web/)
- [ ] No TypeScript errors
- [ ] Auth guard works (redirects if not signed in)
- [ ] Data loads from Supabase
- [ ] Navigation works
- [ ] Responsive on different screen sizes
- [ ] No hydration errors

## Commands

```bash
# Build and test
cd web
npm run build

# Dev server
npm run dev

# Type check
npm run type-check
```

## Next Steps

1. Start with Students page (most important)
2. Test thoroughly
3. Move to Teachers page
4. Implement Financial dashboard
5. Add Reports page
6. Create Messages page
7. Build Settings page

All pages should follow the same pattern as the main dashboard page we already created!
