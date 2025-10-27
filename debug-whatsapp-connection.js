#!/usr/bin/env node

/**
 * Debug WhatsApp Connection Issues
 * 
 * This script helps diagnose WhatsApp connection problems by checking:
 * 1. Database connection and table existence
 * 2. User's WhatsApp contact records
 * 3. School's WhatsApp configuration
 * 4. Edge function accessibility
 */

const { createClient } = require('@supabase/supabase-js')

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://lvvvjywrmpcqrpvuptdi.supabase.co'
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_SERVICE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY environment variable is required')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

async function checkWhatsAppSetup(userId = null, preschoolId = null) {
  console.log('🔍 Debugging WhatsApp Connection Setup...\n')

  try {
    // 1. Check if whatsapp_contacts table exists
    console.log('1. Checking whatsapp_contacts table...')
    const { data: tableCheck, error: tableError } = await supabase
      .from('whatsapp_contacts')
      .select('count', { count: 'exact', head: true })

    if (tableError) {
      if (tableError.code === '42P01') {
        console.log('❌ whatsapp_contacts table does not exist')
        console.log('   Run the migration to create the table first')
        return
      } else {
        console.log('❌ Table check failed:', tableError.message)
        return
      }
    }
    console.log('✅ whatsapp_contacts table exists')

    // 2. Check user's WhatsApp contacts
    if (userId && preschoolId) {
      console.log(`\n2. Checking WhatsApp contacts for user ${userId}...`)
      const { data: contacts, error: contactsError } = await supabase
        .from('whatsapp_contacts')
        .select('*')
        .eq('user_id', userId)
        .eq('preschool_id', preschoolId)

      if (contactsError) {
        console.log('❌ Failed to fetch contacts:', contactsError.message)
      } else {
        console.log(`✅ Found ${contacts.length} WhatsApp contact(s)`)
        contacts.forEach(contact => {
          console.log(`   Contact ID: ${contact.id}`)
          console.log(`   Phone: ${contact.phone_e164}`)
          console.log(`   Status: ${contact.consent_status}`)
          console.log(`   Created: ${contact.created_at}`)
          console.log(`   Last Opt-in: ${contact.last_opt_in_at || 'Never'}`)
          console.log('   ---')
        })
      }
    }

    // 3. Check school configuration
    if (preschoolId) {
      console.log(`\n3. Checking school WhatsApp configuration...`)
      const { data: school, error: schoolError } = await supabase
        .from('preschools')
        .select('id, name, phone, settings')
        .eq('id', preschoolId)
        .single()

      if (schoolError) {
        console.log('❌ Failed to fetch school:', schoolError.message)
      } else {
        console.log('✅ School found:', school.name)
        console.log(`   Phone: ${school.phone || 'Not set'}`)
        console.log(`   WhatsApp in settings: ${school.settings?.whatsapp_number || 'Not configured'}`)
        
        const whatsappNumber = school.settings?.whatsapp_number || school.phone
        if (whatsappNumber) {
          console.log(`   ✅ School WhatsApp available: ${whatsappNumber}`)
        } else {
          console.log('   ⚠️  No WhatsApp number configured for school')
        }
      }
    }

    // 4. Test edge function accessibility
    console.log('\n4. Testing WhatsApp edge function...')
    try {
      const { data, error } = await supabase.functions.invoke('whatsapp-send', {
        body: { test: true }
      })
      
      if (error) {
        console.log('❌ Edge function error:', error.message)
      } else {
        console.log('✅ Edge function is accessible')
        console.log('   Response:', data)
      }
    } catch (err) {
      console.log('❌ Edge function test failed:', err.message)
    }

    console.log('\n✅ WhatsApp debugging complete!')

  } catch (error) {
    console.error('❌ Debug script failed:', error.message)
  }
}

// Allow command line usage
const userId = process.argv[2]
const preschoolId = process.argv[3]

if (userId && preschoolId) {
  checkWhatsAppSetup(userId, preschoolId)
} else {
  console.log('Usage: node debug-whatsapp-connection.js [userId] [preschoolId]')
  console.log('Or set environment variables and run without parameters for general check')
  checkWhatsAppSetup()
}

module.exports = { checkWhatsAppSetup }
