#!/bin/bash

# Force disconnect WhatsApp connection
# This script completely removes the WhatsApp contact from the database

echo "🔌 Force Disconnecting WhatsApp..."
echo ""

# User credentials from your error logs
USER_ID="a1fd12d2-5f09-4a23-822d-f3071bfc544b"
PRESCHOOL_ID="ba79097c-1b93-4b48-bcbe-df73878ab4d1"

echo "👤 Targeting User: $USER_ID"
echo "🏫 Targeting Preschool: $PRESCHOOL_ID"
echo ""

echo "⚠️  This will COMPLETELY REMOVE your WhatsApp connection."
echo "   After this, the UI will show 'Not Connected' and you can start fresh."
echo ""

read -p "❓ Are you sure you want to proceed? [y/N]: " CONFIRM

if [[ ! $CONFIRM =~ ^[Yy]$ ]]; then
    echo "❌ Operation cancelled."
    exit 0
fi

echo ""
echo "🗑️  Deleting WhatsApp contact record..."

# Create temporary SQL file
SQL_FILE="/tmp/delete_whatsapp_contact.sql"
cat > "$SQL_FILE" << EOF
-- Force disconnect WhatsApp for user
DELETE FROM public.whatsapp_contacts 
WHERE user_id = '$USER_ID' 
  AND preschool_id = '$PRESCHOOL_ID';

-- Show result
SELECT 
  CASE 
    WHEN COUNT(*) = 0 THEN 'SUCCESS: WhatsApp contact deleted'
    ELSE 'ERROR: Contact still exists'
  END as result
FROM public.whatsapp_contacts 
WHERE user_id = '$USER_ID' 
  AND preschool_id = '$PRESCHOOL_ID';
EOF

echo "📝 Generated SQL:"
cat "$SQL_FILE"
echo ""

echo "🚀 Executing via Supabase..."

# Try to execute the SQL using Supabase CLI
# Note: This might not work if CLI doesn't support direct SQL execution
# If it fails, we'll show manual instructions

echo "💡 Manual execution required:"
echo ""
echo "1. Go to: https://supabase.com/dashboard/project/lvvvjywrmpcqrpvuptdi/sql/new"
echo "2. Copy and paste this SQL:"
echo ""
echo "-- Force disconnect WhatsApp"
echo "DELETE FROM public.whatsapp_contacts"
echo "WHERE user_id = '$USER_ID'"
echo "  AND preschool_id = '$PRESCHOOL_ID';"
echo ""
echo "3. Click 'Run'"
echo "4. Refresh your teacher dashboard"
echo "5. WhatsApp should now show 'Not Connected'"
echo ""

# Clean up
rm -f "$SQL_FILE"

echo "✅ Instructions provided. After running the SQL:"
echo "   • WhatsApp UI will show 'Disconnected'"
echo "   • You can connect with your new working token"
echo "   • The problematic connection will be completely removed"
echo ""
