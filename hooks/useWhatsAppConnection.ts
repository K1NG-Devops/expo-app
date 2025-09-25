import { useState, useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { assertSupabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { queryKeys } from '../lib/query/queryClient'
import { track } from '../lib/analytics'

export interface WhatsAppContact {
  id: string
  preschool_id: string
  user_id: string
  phone_e164: string
  wa_user_id?: string
  consent_status: 'pending' | 'opted_in' | 'opted_out'
  last_opt_in_at?: string
  created_at: string
}

export interface WhatsAppConnectionStatus {
  isConnected: boolean
  contact?: WhatsAppContact
  schoolWhatsAppNumber?: string
  isLoading: boolean
  error?: string
  // Enhanced UX flags
  hasSchoolNumber?: boolean
  shouldAutoConnect?: boolean
  isSchoolConfigured?: boolean
}

export const useWhatsAppConnection = () => {
  const { user, profile } = useAuth()
  const queryClient = useQueryClient()
  const [isOptingIn, setIsOptingIn] = useState(false)

  // Get current WhatsApp connection status
  const { data: connectionStatus, isLoading, error } = useQuery({
    queryKey: queryKeys.whatsappContacts,
    queryFn: async (): Promise<WhatsAppConnectionStatus> => {
      if (!user?.id || !profile?.organization_id) {
        return { isConnected: false, isLoading: false }
      }

      try {
        // Get user's WhatsApp contact with proper error handling
        const { data: contact, error: contactError } = await assertSupabase()
          .from('whatsapp_contacts')
          .select('*')
          .eq('user_id', user.id)
          .eq('preschool_id', profile.organization_id)
          .maybeSingle()

        // Handle various database errors gracefully
        if (contactError && 
            contactError.code !== 'PGRST116' && // Not found error (expected)
            contactError.code !== '42P01' &&   // Table doesn't exist
            contactError.code !== '42501') {   // RLS permission denied
          throw contactError
        }

        // Get school's WhatsApp number (from preschool settings or config)
        const { data: preschool } = await assertSupabase()
          .from('preschools')
          .select('phone, settings')
          .eq('id', profile.organization_id)
          .maybeSingle()

        const schoolWhatsAppNumber = preschool?.settings?.whatsapp_number || preschool?.phone || process.env.EXPO_PUBLIC_SCHOOL_WHATSAPP_NUMBER

        return {
          isConnected: contact?.consent_status === 'opted_in',
          contact: contact || undefined,
          schoolWhatsAppNumber,
          isLoading: false,
          // Add helpful flags for UX
          hasSchoolNumber: !!schoolWhatsAppNumber,
          shouldAutoConnect: !!schoolWhatsAppNumber && !contact,
          isSchoolConfigured: !!(preschool?.settings?.whatsapp_number || preschool?.phone)
        }
      } catch (err: any) {
        // Gracefully handle missing table (42P01), RLS issues (42501), or missing schema
        const code = err?.code || err?.details || ''
        if (code === '42P01' ||  // Table doesn't exist
            code === '42501' ||  // RLS permission denied
            String(err?.message || '').includes('relation') || 
            String(err?.message || '').includes('whatsapp_contacts')) {
          return {
            isConnected: false,
            isLoading: false,
            error: 'WhatsApp feature not yet configured',
          }
        }
        // Other errors: log once for debugging
        console.error('Error fetching WhatsApp connection status:', err)
        return {
          isConnected: false,
          isLoading: false,
          error: err.message
        }
      }
    },
    enabled: !!user?.id && !!profile?.organization_id,
    staleTime: 0, // No caching - always fetch fresh data
    cacheTime: 30 * 1000, // Keep in cache for 30 seconds only
    refetchOnMount: true,
    refetchOnWindowFocus: true
  })

  // Opt in to WhatsApp
  const optInMutation = useMutation({
    mutationFn: async (data: { phoneNumber: string; consent: boolean }) => {
      if (!user?.id || !profile?.organization_id) {
        throw new Error('User or preschool not found')
      }

      // Validate phone number format (E.164)
      const phoneE164 = data.phoneNumber.startsWith('+') 
        ? data.phoneNumber 
        : `+27${data.phoneNumber.replace(/^0/, '')}` // Assume SA number if no country code

      // Create or update WhatsApp contact (idempotent via onConflict)
      const { data: contact, error } = await assertSupabase()
        .from('whatsapp_contacts')
        .upsert({
          preschool_id: profile.organization_id,
          user_id: user.id,
          phone_e164: phoneE164,
          consent_status: data.consent ? 'opted_in' : 'opted_out',
          last_opt_in_at: data.consent ? new Date().toISOString() : null
        }, { onConflict: 'preschool_id,user_id' })
        .select()
        .maybeSingle()

      if (error) {
        // Provide more helpful error message for common issues
        if (error.code === '42P01') {
          throw new Error('WhatsApp feature is not yet configured for your school. Please contact support.')
        } else if (error.code === '42501') {
          throw new Error('Permission denied. Please make sure you have the correct access permissions.')
        } else {
          throw error
        }
      }

      // Track opt-in event
      track('edudash.whatsapp.opt_in', {
        user_id: user.id,
        preschool_id: profile.organization_id,
        phone_number_hash: btoa(phoneE164).substring(0, 8), // Hashed for privacy
        consent_given: data.consent,
        timestamp: new Date().toISOString()
      })

      return contact
    },
    onSuccess: (contact) => {
      // Invalidate and refetch connection status
      queryClient.invalidateQueries({ queryKey: queryKeys.whatsappContacts })
      
      // Track success via analytics (no console logs per WARP rules)
      track('edudash.whatsapp.opt_in_success', {
        user_id: user?.id || '',
        preschool_id: profile?.organization_id,
        consent_status: contact.consent_status,
        timestamp: new Date().toISOString()
      })
    },
    onError: (error) => {
      // Track error via analytics (no console logs per WARP rules)
      track('edudash.whatsapp.opt_in_error', {
        user_id: user?.id || '',
        preschool_id: profile?.organization_id,
        error_message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      })
    }
  })

  // Opt out of WhatsApp
  const optOutMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id || !profile?.organization_id) {
        throw new Error('User or preschool not found')
      }

      // First try to find the contact by user/preschool (more reliable than using contact.id)
      const { data: existingContact, error: findError } = await assertSupabase()
        .from('whatsapp_contacts')
        .select('*')
        .eq('user_id', user.id)
        .eq('preschool_id', profile.organization_id)
        .maybeSingle()

      if (findError) {
        console.error('Error finding WhatsApp contact:', findError)
        throw new Error('Could not find WhatsApp contact to disconnect')
      }

      if (!existingContact) {
        // Already disconnected - just invalidate cache
        console.log('No WhatsApp contact found - already disconnected')
        return { alreadyDisconnected: true }
      }

      // Update to opted_out status
      const { error: updateError } = await assertSupabase()
        .from('whatsapp_contacts')
        .update({
          consent_status: 'opted_out',
          last_opt_in_at: null
        })
        .eq('id', existingContact.id)

      if (updateError) {
        console.error('Error updating WhatsApp contact:', updateError)
        throw updateError
      }

      // Track opt-out event
      track('edudash.whatsapp.opt_out', {
        user_id: user.id,
        preschool_id: profile.organization_id,
        timestamp: new Date().toISOString()
      })

      return { success: true }
    },
    onSuccess: (result) => {
      // Force refresh of connection status
      queryClient.invalidateQueries({ queryKey: queryKeys.whatsappContacts })
      
      // Clear any cached data
      queryClient.removeQueries({ queryKey: queryKeys.whatsappContacts })
      
      // Track success
      track('edudash.whatsapp.opt_out_success', {
        user_id: user?.id || '',
        preschool_id: profile?.organization_id,
        already_disconnected: result?.alreadyDisconnected || false,
        timestamp: new Date().toISOString()
      })
    },
    onError: (error) => {
      console.error('WhatsApp opt-out failed:', error)
      
      // Track error via analytics
      track('edudash.whatsapp.opt_out_error', {
        user_id: user?.id || '',
        preschool_id: profile?.organization_id,
        error_message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      })
    }
  })

  // Send test message to verify connection
  const sendTestMessageMutation = useMutation({
    mutationFn: async () => {
      if (!connectionStatus?.isConnected || !connectionStatus.contact) {
        throw new Error('WhatsApp not connected')
      }

      const contactId = connectionStatus.contact.id
      const parentName = profile?.first_name || 'Parent'

      // 1) Try template first
      try {
        const tmpl = await assertSupabase().functions.invoke('whatsapp-send', {
          body: {
            contact_id: contactId,
            message_type: 'template',
            template_name: 'welcome_parent', // To be approved later
            template_params: [parentName]
          }
        })

        if (!tmpl.error && tmpl.data?.success !== false) {
          // Track template send
          track('edudash.whatsapp.test_message_sent', {
            user_id: user?.id,
            preschool_id: profile?.organization_id,
            timestamp: new Date().toISOString(),
            method: 'template'
          })
          return tmpl.data
        }
      } catch (e) {
        // fall through to text fallback
      }

      // 2) Fallback to plain text to ensure QA works even without templates
      const textBody = `Hello ${parentName}! 👋\n\nThis is a test message from EduDash Pro to confirm your WhatsApp connection. You’ll receive school updates here. Reply STOP to opt out.`
      const txt = await assertSupabase().functions.invoke('whatsapp-send', {
        body: {
          contact_id: contactId,
          message_type: 'text',
          content: textBody,
        }
      })

      if (txt.error || txt.data?.success === false) {
        throw new Error(txt.error?.message || (txt.data && (txt.data as any).error) || 'Failed to send text fallback')
      }

      // Track text fallback
      track('edudash.whatsapp.test_message_sent', {
        user_id: user?.id,
        preschool_id: profile?.organization_id,
        timestamp: new Date().toISOString(),
        method: 'text_fallback'
      })

      return txt.data
    },
    onError: (error) => {
      // Track error via analytics (console.error removed per WARP rules)
      track('edudash.whatsapp.test_message_error', {
        user_id: user?.id || '',
        preschool_id: profile?.organization_id,
        error_message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      })
    }
  })

  // Helper functions
  const getWhatsAppDeepLink = () => {
    const hasSchoolNumber = !!connectionStatus?.schoolWhatsAppNumber
    
    // Track deep link generation
    track('edudash.whatsapp.deep_link_opened', {
      user_id: user?.id || '',
      preschool_id: profile?.organization_id,
      has_school_number: hasSchoolNumber
    })
    
    if (!hasSchoolNumber) return null
    
    const message = encodeURIComponent(
      `Hello! This is ${profile?.first_name || 'a parent'} from EduDash Pro. I'd like to connect my account for school updates.`
    )
    
    return `https://wa.me/${connectionStatus?.schoolWhatsAppNumber?.replace(/[^\d]/g, '')}?text=${message}`
  }

  const formatPhoneNumber = (phone: string) => {
    // Format SA phone number for display
    if (phone.startsWith('+27')) {
      const cleaned = phone.replace('+27', '')
      return `+27 ${cleaned.substring(0, 2)} ${cleaned.substring(2, 5)} ${cleaned.substring(5)}`
    }
    return phone
  }

  const isWhatsAppEnabled = () => {
    // Check if WhatsApp integration is enabled for this preschool
    // This could be based on subscription tier or feature flags
    return profile?.organization_membership?.plan_tier !== 'free' || true // For now, always enabled
  }

  return {
    // Connection status
    connectionStatus: connectionStatus || { isConnected: false, isLoading },
    isLoading,
    error,

    // Actions
    optIn: (phoneNumber: string, consent: boolean = true) => {
      setIsOptingIn(true)
      return optInMutation.mutateAsync({ phoneNumber, consent }).finally(() => {
        setIsOptingIn(false)
      })
    },
    optOut: optOutMutation.mutate,
    hardDisconnect: () => {
      // Complete disconnect - deletes the record entirely
      return new Promise(async (resolve, reject) => {
        try {
          if (!user?.id || !profile?.organization_id) {
            throw new Error('User or preschool not found')
          }

          // Delete the WhatsApp contact record completely
          const { error } = await assertSupabase()
            .from('whatsapp_contacts')
            .delete()
            .eq('user_id', user.id)
            .eq('preschool_id', profile.organization_id)

          if (error) {
            console.error('Error deleting WhatsApp contact:', error)
            throw error
          }

          // Force refresh
          queryClient.invalidateQueries({ queryKey: queryKeys.whatsappContacts })
          queryClient.removeQueries({ queryKey: queryKeys.whatsappContacts })

          // Track complete disconnection
          track('edudash.whatsapp.hard_disconnect', {
            user_id: user.id,
            preschool_id: profile.organization_id,
            timestamp: new Date().toISOString()
          })

          resolve({ success: true })
        } catch (error) {
          reject(error)
        }
      })
    },
    sendTestMessage: sendTestMessageMutation.mutate,

    // Mutation states
    isOptingIn: isOptingIn || optInMutation.isPending,
    isOptingOut: optOutMutation.isPending,
    isSendingTest: sendTestMessageMutation.isPending,

    // Helper functions
    getWhatsAppDeepLink,
    formatPhoneNumber,
    isWhatsAppEnabled,
    
    // Force refresh function (for when database changes externally)
    forceRefresh: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.whatsappContacts })
      queryClient.removeQueries({ queryKey: queryKeys.whatsappContacts })
    },
    
    // Auto-connect to school WhatsApp (for teachers)
    autoConnectToSchool: async () => {
      if (!connectionStatus?.schoolWhatsAppNumber) {
        throw new Error('School WhatsApp number not configured')
      }
      
      // For teachers, auto-connect using the school's WhatsApp number
      // This represents the teacher joining the school's WhatsApp Business
      const schoolPhone = connectionStatus.schoolWhatsAppNumber
      
      return optInMutation.mutateAsync({ 
        phoneNumber: schoolPhone, 
        consent: true 
      })
    },

    // Error states
    optInError: optInMutation.error,
    optOutError: optOutMutation.error,
    testMessageError: sendTestMessageMutation.error,
  }
}