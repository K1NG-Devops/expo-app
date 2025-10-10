/**
 * Database Schema Inspector
 * 
 * Connects to your Supabase database using direct credentials and inspects:
 * 1. Existing table structures
 * 2. Foreign key relationships
 * 3. Constraints and indexes
 * 4. What needs to be fixed for PDF system
 * 
 * Usage: Set your database credentials below and run: node inspect-database-schema.js
 */

const { createClient } = require('@supabase/supabase-js');

console.log('🔍 Database Schema Inspector Starting...\n');

// =============================================================================
// DATABASE CREDENTIALS
// =============================================================================
// Please set your database credentials here:

const DB_CONFIG = {
  // From your Supabase Dashboard → Settings → Database
  supabaseUrl: 'https://lvvvjywrmpcqrpvuptdi.supabase.co',
  
  // Use your service_role key (not anon key) for full access
  // Get this from: Supabase Dashboard → Settings → API → service_role secret
  serviceRoleKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx2dnZqeXdybXBjcXJwdnVwdGRpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzAzNzgzOCwiZXhwIjoyMDY4NjEzODM4fQ.p8cRGywZP4qVglovv-T3VCDi9evfeCVZEBQM2LTeCmc', // Replace this
  
  // Or use direct database connection (if you prefer)
  // Database URL from: Settings → Database → Connection string
  connectionString: 'postgresql://postgres:YOUR_PASSWORD@db.lvvvjywrmpcqrpvuptdi.supabase.co:5432/postgres'
};

// =============================================================================
// SCHEMA INSPECTION FUNCTIONS
// =============================================================================

let supabase;

async function initializeConnection() {
  console.log('1️⃣ Initializing Database Connection...');
  
  if (DB_CONFIG.serviceRoleKey && DB_CONFIG.serviceRoleKey !== 'YOUR_SERVICE_ROLE_KEY_HERE') {
    // Use Supabase client with service role
    supabase = createClient(DB_CONFIG.supabaseUrl, DB_CONFIG.serviceRoleKey);
    console.log('✅ Using Supabase service role connection');
    return true;
  } else {
    console.log('⚠️  Service role key not configured');
    console.log('📋 Please set your service role key in the script');
    console.log('   Get it from: Supabase Dashboard → Settings → API → service_role secret');
    return false;
  }
}

async function inspectProfilesTable() {
  console.log('\n2️⃣ Inspecting Profiles Table Structure...');
  
  try {
    // Get table structure
    const { data, error } = await supabase.rpc('get_table_schema', {
      table_name: 'profiles'
    });
    
    if (error) {
      // Fallback: try to get basic structure
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .limit(1);
      
      if (profileError) {
        console.log('❌ Cannot access profiles table:', profileError.message);
        return null;
      }
      
      console.log('✅ Profiles table exists');
      if (profileData && profileData.length > 0) {
        console.log('📋 Sample profile structure:');
        Object.keys(profileData[0]).forEach(column => {
          console.log(`   - ${column}: ${typeof profileData[0][column]}`);
        });
      }
      return profileData[0] || {};
    }
    
    console.log('✅ Got profiles table schema:', data);
    return data;
    
  } catch (error) {
    console.log('❌ Error inspecting profiles table:', error.message);
    return null;
  }
}

async function checkExistingConstraints() {
  console.log('\n3️⃣ Checking Existing Database Constraints...');
  
  try {
    // Check what foreign key constraints exist
    const constraintQuery = `
      SELECT 
        tc.constraint_name,
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM 
        information_schema.table_constraints AS tc 
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY' 
        AND tc.table_schema = 'public'
      ORDER BY tc.table_name, tc.constraint_name;
    `;
    
    const { data, error } = await supabase.rpc('execute_sql', {
      query: constraintQuery
    });
    
    if (error) {
      console.log('⚠️  Cannot check constraints directly:', error.message);
      return [];
    }
    
    console.log('📋 Existing foreign key constraints:');
    data.forEach(constraint => {
      console.log(`   ${constraint.table_name}.${constraint.column_name} → ${constraint.foreign_table_name}.${constraint.foreign_column_name}`);
    });
    
    return data;
    
  } catch (error) {
    console.log('⚠️  Error checking constraints:', error.message);
    return [];
  }
}

async function inspectAllTables() {
  console.log('\n4️⃣ Inspecting All Tables...');
  
  const tablesToCheck = [
    'profiles', 
    'classes', 
    'students', 
    'lessons', 
    'assignments',
    'announcements',
    'activity_logs',
    'petty_cash_transactions'
  ];
  
  const tableInfo = {};
  
  for (const tableName of tablesToCheck) {
    try {
      console.log(`\n🔍 Checking ${tableName}...`);
      
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .limit(1);
      
      if (error) {
        console.log(`❌ ${tableName}: ${error.message}`);
        tableInfo[tableName] = { exists: false, error: error.message };
      } else {
        console.log(`✅ ${tableName}: EXISTS`);
        
        if (data && data.length > 0) {
          const columns = Object.keys(data[0]);
          console.log(`   Columns (${columns.length}): ${columns.join(', ')}`);
          tableInfo[tableName] = { 
            exists: true, 
            columns,
            sampleData: data[0]
          };
        } else {
          tableInfo[tableName] = { 
            exists: true, 
            columns: [],
            sampleData: null
          };
        }
      }
      
    } catch (error) {
      console.log(`❌ ${tableName}: ${error.message}`);
      tableInfo[tableName] = { exists: false, error: error.message };
    }
  }
  
  return tableInfo;
}

async function generateCorrectPDFMigration(tableInfo) {
  console.log('\n5️⃣ Generating Corrected PDF Migration...');
  
  const profilesInfo = tableInfo.profiles;
  
  if (!profilesInfo || !profilesInfo.exists) {
    console.log('❌ Cannot generate PDF migration - profiles table not accessible');
    return null;
  }
  
  const columns = profilesInfo.columns || [];
  console.log(`📋 Profiles table has columns: ${columns.join(', ')}`);
  
  // Determine correct foreign key reference
  let orgReference = '';
  if (columns.includes('preschool_id')) {
    orgReference = 'public.profiles(preschool_id)';
  } else if (columns.includes('id')) {
    orgReference = 'public.profiles(id)';
  } else if (columns.includes('organization_id')) {
    orgReference = 'public.profiles(organization_id)';
  } else {
    console.log('⚠️  No suitable organization reference found in profiles table');
    orgReference = null;
  }
  
  const migration = `-- ====================================================================
-- CORRECTED PDF SYSTEM MIGRATION
-- Based on actual database schema inspection
-- ====================================================================

-- PDF User Preferences Table
CREATE TABLE IF NOT EXISTS public.pdf_user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ${orgReference ? `organization_id UUID REFERENCES ${orgReference} ON DELETE CASCADE,` : '-- organization_id UUID, -- No suitable reference found'}
  default_theme TEXT CHECK (default_theme IN ('professional', 'colorful', 'minimalist')),
  default_font TEXT,
  default_layout JSONB DEFAULT '{}'::jsonb,
  default_branding JSONB DEFAULT '{}'::jsonb,
  header_html_safe TEXT,
  footer_html_safe TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT pdf_user_preferences_user_id_key UNIQUE (user_id)
);

-- PDF Custom Templates Table
CREATE TABLE IF NOT EXISTS public.pdf_custom_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ${orgReference ? `organization_id UUID REFERENCES ${orgReference} ON DELETE CASCADE,` : '-- organization_id UUID, -- No suitable reference found'}
  name TEXT NOT NULL,
  description TEXT,
  document_type TEXT NOT NULL CHECK (document_type IN (
    'report', 'letter', 'invoice', 'study_guide', 'lesson_plan',
    'progress_report', 'assessment', 'certificate', 'newsletter',
    'worksheet', 'general'
  )),
  template_html TEXT NOT NULL,
  input_schema JSONB DEFAULT '{}'::jsonb,
  thumbnail_url TEXT,
  is_org_shared BOOLEAN DEFAULT false,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- PDF Documents Table
CREATE TABLE IF NOT EXISTS public.pdf_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ${orgReference ? `organization_id UUID REFERENCES ${orgReference} ON DELETE CASCADE,` : '-- organization_id UUID, -- No suitable reference found'}
  title TEXT NOT NULL,
  document_type TEXT NOT NULL CHECK (document_type IN (
    'report', 'letter', 'invoice', 'study_guide', 'lesson_plan',
    'progress_report', 'assessment', 'certificate', 'newsletter',
    'worksheet', 'general'
  )),
  storage_path TEXT NOT NULL,
  filename TEXT NOT NULL,
  file_size_bytes BIGINT,
  page_count INTEGER,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS pdf_user_preferences_user_id_idx ON public.pdf_user_preferences(user_id);
CREATE INDEX IF NOT EXISTS pdf_custom_templates_owner_user_id_idx ON public.pdf_custom_templates(owner_user_id);
CREATE INDEX IF NOT EXISTS pdf_documents_user_id_idx ON public.pdf_documents(user_id);

-- Storage bucket for PDFs
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'generated-pdfs',
  'generated-pdfs',
  false,
  10485760,
  ARRAY['application/pdf']::text[]
)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS
ALTER TABLE public.pdf_user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pdf_custom_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pdf_documents ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies (users can only access their own data)
CREATE POLICY pdf_user_preferences_user_policy ON public.pdf_user_preferences
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY pdf_custom_templates_owner_policy ON public.pdf_custom_templates
  FOR ALL USING (auth.uid() = owner_user_id);

CREATE POLICY pdf_documents_user_policy ON public.pdf_documents
  FOR ALL USING (auth.uid() = user_id);

-- Storage policies
CREATE POLICY generated_pdfs_policy ON storage.objects
  FOR ALL USING (
    bucket_id = 'generated-pdfs'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Grants
GRANT ALL ON public.pdf_user_preferences TO authenticated;
GRANT ALL ON public.pdf_custom_templates TO authenticated;
GRANT ALL ON public.pdf_documents TO authenticated;

-- Verification query
SELECT 
  'PDF Migration Status' as check_type,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pdf_user_preferences')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pdf_custom_templates')  
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pdf_documents')
     AND EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'generated-pdfs')
    THEN '✅ COMPLETE - PDF system ready'
    ELSE '❌ INCOMPLETE - Check errors above'
  END as status;
`;
  
  return migration;
}

// =============================================================================
// MAIN EXECUTION
// =============================================================================

async function main() {
  console.log('🔍 Database Schema Inspector');
  console.log('============================\n');
  
  // Check if credentials are configured
  const connected = await initializeConnection();
  if (!connected) {
    console.log('\n❌ Please configure your database credentials and try again');
    console.log('\n📋 To get your service role key:');
    console.log('1. Go to Supabase Dashboard');
    console.log('2. Settings → API');
    console.log('3. Copy the "service_role" secret key');
    console.log('4. Replace "YOUR_SERVICE_ROLE_KEY_HERE" in this script');
    return;
  }
  
  // Test connection
  try {
    const { data, error } = await supabase.from('profiles').select('count').limit(1);
    if (error) {
      console.log('❌ Connection test failed:', error.message);
      return;
    }
    console.log('✅ Database connection successful');
  } catch (error) {
    console.log('❌ Connection error:', error.message);
    return;
  }
  
  // Inspect current schema
  const profilesStructure = await inspectProfilesTable();
  const constraints = await checkExistingConstraints();
  const allTables = await inspectAllTables();
  
  // Generate corrected migration
  const correctedMigration = await generateCorrectPDFMigration(allTables);
  
  if (correctedMigration) {
    // Save the corrected migration
    require('fs').writeFileSync('./CORRECTED_PDF_MIGRATION.sql', correctedMigration);
    console.log('✅ Created corrected migration: CORRECTED_PDF_MIGRATION.sql');
  }
  
  // Final summary
  console.log('\n📊 Database Schema Summary:');
  console.log('=============================');
  
  const existingTables = Object.values(allTables).filter(t => t.exists).length;
  const totalTables = Object.keys(allTables).length;
  
  console.log(`📋 Core Tables: ${existingTables}/${totalTables} exist`);
  console.log(`🔐 PDF System: Not yet created`);
  console.log(`🏗️  Schema Analysis: Complete`);
  
  console.log('\n🎯 Next Steps:');
  console.log('1. Review the generated CORRECTED_PDF_MIGRATION.sql file');
  console.log('2. Copy and run it in Supabase SQL Editor');
  console.log('3. Test PDF generation after migration');
  
  console.log('\n✅ Schema inspection complete!');
}

// =============================================================================
// RUN THE INSPECTOR
// =============================================================================

console.log('⚠️  IMPORTANT: Configure your database credentials in this script first!');
console.log('   Set your service_role key from Supabase Dashboard → Settings → API\n');

if (process.argv.includes('--help')) {
  console.log('Usage: node inspect-database-schema.js');
  console.log('Make sure to set your database credentials in the script first.');
  process.exit(0);
}

main().catch(error => {
  console.error('❌ Schema inspection failed:', error);
  process.exit(1);
});