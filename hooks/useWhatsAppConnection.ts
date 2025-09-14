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
        // Get user's WhatsApp contact
        const { data: contact, error: contactError } = await assertSupabase()
          .from('whatsapp_contacts')
          .select('*')
          .eq('user_id', user.id)
          .eq('preschool_id', profile.organization_id)
          .single()

        if (contactError && contactError.code !== 'PGRST116') {
          throw contactError
        }

        // Get school's WhatsApp number (from preschool settings or config)
        const { data: preschool } = await assertSupabase()
          .from('preschools')
          .select('phone, settings')
          .eq('id', profile.organization_id)
          .single()

        const schoolWhatsAppNumber = preschool?.settings?.whatsapp_number || preschool?.phone

        return {
          isConnected: contact?.consent_status === 'opted_in',
          contact: contact || undefined,
          schoolWhatsAppNumber,
          isLoading: false
        }
      } catch (err: any) {
        // Gracefully handle missing table (42P01) or missing schema in dev environments
        const code = err?.code || err?.details || ''
        if (code === '42P01' || String(err?.message || '').includes('relation') || String(err?.message || '').includes('whatsapp_contacts')) {
          return {
            isConnected: false,
            isLoading: false,
            error: undefined,
          }
        }
        // Other errors: log once
        console.error('Error fetching WhatsApp connection status:', err)
        return {
          isConnected: false,
          isLoading: false,
          error: err.message
        }
      }
    },
    enabled: !!user?.id && !!profile?.organization_id,
    staleTime: 5 * 60 * 1000, // 5 minutes
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

      // Create or update WhatsApp contact
      const { data: contact, error } = await assertSupabase()
        .from('whatsapp_contacts')
        .upsert({
          preschool_id: profile.organization_id,
          user_id: user.id,
          phone_e164: phoneE164,
          consent_status: data.consent ? 'opted_in' : 'opted_out',
          last_opt_in_at: data.consent ? new Date().toISOString() : null
        })
        .select()
        .single()

      if (error) throw error

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
      
      console.log('WhatsApp opt-in successful:', contact.consent_status)
    },
    onError: (error) => {
      console.error('WhatsApp opt-in failed:', error)
    }
  })

  // Opt out of WhatsApp
  const optOutMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id || !connectionStatus?.contact?.id) {
        throw new Error('No WhatsApp contact to opt out')
      }

      const { error } = await assertSupabase()
        .from('whatsapp_contacts')
        .update({
          consent_status: 'opted_out',
          last_opt_in_at: null
        })
        .eq('id', connectionStatus.contact.id)

      if (error) throw error

      // Track opt-out event
      track('edudash.whatsapp.opt_out', {
        user_id: user.id,
        preschool_id: profile?.organization_id,
        timestamp: new Date().toISOString()
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.whatsappContacts })
      console.log('WhatsApp opt-out successful')
    },
    onError: (error) => {
      console.error('WhatsApp opt-out failed:', error)
    }
  })

  // Send test message to verify connection
  const sendTestMessageMutation = useMutation({
    mutationFn: async () => {
      if (!connectionStatus?.isConnected || !connectionStatus.contact) {
        throw new Error('WhatsApp not connected')
      }

      // Call WhatsApp send Edge Function
      const { data, error } = await assertSupabase().functions.invoke('whatsapp-send', {
        body: {
          contact_id: connectionStatus.contact.id,
          message_type: 'template',
          template_name: 'welcome_parent', // Assumes we have this template
          template_params: [profile?.first_name || 'Parent']
        }
      })

      if (error) throw error

      // Track test message
      track('edudash.whatsapp.test_message_sent', {
        user_id: user?.id,
        preschool_id: profile?.organization_id,
        timestamp: new Date().toISOString()
      })

      return data
    },
    onError: (error) => {
      console.error('Test message failed:', error)
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
    sendTestMessage: sendTestMessageMutation.mutate,

    // Mutation states
    isOptingIn: isOptingIn || optInMutation.isPending,
    isOptingOut: optOutMutation.isPending,
    isSendingTest: sendTestMessageMutation.isPending,

    // Helper functions
    getWhatsAppDeepLink,
    formatPhoneNumber,
    isWhatsAppEnabled,

    // Error states
    optInError: optInMutation.error,
    optOutError: optOutMutation.error,
    testMessageError: sendTestMessageMutation.error,
  }
}