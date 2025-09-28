import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0"

// Environment variables
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const DEEPGRAM_API_KEY = Deno.env.get('DEEPGRAM_API_KEY')
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')
const TRANSCRIPTION_PROVIDER = Deno.env.get('TRANSCRIPTION_PROVIDER') || 'deepgram' // 'deepgram' or 'openai'

// Create Supabase client with service role for bypassing RLS
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

interface TranscriptionRequest {
  voice_note_id?: string
  storage_path?: string
  language?: string // 'en', 'af', 'zu', 'st'
  model?: string
  trigger_source?: 'manual' | 'storage_event' | 'database_trigger'
}

interface TranscriptionResponse {
  transcript: string
  language?: string
  confidence?: number
  word_count?: number
  duration?: number
}

/**
 * Get signed URL for audio file from Supabase Storage
 */
async function getAudioFileUrl(storagePath: string): Promise<string> {
  // Determine bucket based on path
  let bucket = 'voice-notes'
  if (storagePath.includes('homework-submissions')) {
    bucket = 'homework-submissions'
  } else if (storagePath.includes('message-media')) {
    bucket = 'message-media'
  }

  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(storagePath, 3600) // 1 hour expiry

  if (error) {
    throw new Error(`Failed to get signed URL: ${error.message}`)
  }

  return data.signedUrl
}

/**
 * Transcribe audio using Deepgram API
 */
async function transcribeWithDeepgram(audioUrl: string, language?: string): Promise<TranscriptionResponse> {
  if (!DEEPGRAM_API_KEY) {
    throw new Error('Deepgram API key not configured')
  }

  // Map language codes to Deepgram language models
  const languageMap: { [key: string]: string } = {
    'en': 'en-US',
    'af': 'en-US', // Fallback to English for Afrikaans
    'zu': 'en-US', // Fallback to English for isiZulu
    'st': 'en-US'  // Fallback to English for Sesotho
  }

  const deepgramLanguage = language ? (languageMap[language] || 'en-US') : 'en-US'

  console.log('Transcribing with Deepgram:', { audioUrl, language: deepgramLanguage })

  const response = await fetch('https://api.deepgram.com/v1/listen', {
    method: 'POST',
    headers: {
      'Authorization': `Token ${DEEPGRAM_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      url: audioUrl,
      options: {
        model: 'nova-2',
        language: deepgramLanguage,
        smart_format: true,
        punctuate: true,
        paragraphs: false,
        utterances: false,
        diarize: false,
        detect_language: language ? false : true, // Auto-detect if no language specified
        keywords: ['homework', 'school', 'teacher', 'student', 'parent', 'class'],
        profanity_filter: true,
        redact: ['pci', 'numbers', 'ssn'],
      }
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    console.error('Deepgram API error:', error)
    throw new Error(`Deepgram API error: ${response.status} ${error}`)
  }

  const result = await response.json()
  console.log('Deepgram result:', result)

  const transcript = result.results?.channels?.[0]?.alternatives?.[0]?.transcript || ''
  const confidence = result.results?.channels?.[0]?.alternatives?.[0]?.confidence || 0
  const detectedLanguage = result.results?.channels?.[0]?.detected_language
  const wordCount = result.results?.channels?.[0]?.alternatives?.[0]?.words?.length || 0

  return {
    transcript,
    language: detectedLanguage || language,
    confidence,
    word_count: wordCount
  }
}

/**
 * Transcribe audio using OpenAI Whisper API
 */
async function transcribeWithOpenAI(audioUrl: string, language?: string): Promise<TranscriptionResponse> {
  if (!OPENAI_API_KEY) {
    throw new Error('OpenAI API key not configured')
  }

  console.log('Transcribing with OpenAI Whisper:', { audioUrl, language })

  // Download audio file first
  const audioResponse = await fetch(audioUrl)
  if (!audioResponse.ok) {
    throw new Error(`Failed to download audio file: ${audioResponse.status}`)
  }

  const audioBlob = await audioResponse.blob()
  const formData = new FormData()
  
  // Create a file from blob
  formData.append('file', audioBlob, 'audio.m4a')
  formData.append('model', 'whisper-1')
  
  if (language) {
    // Map our language codes to OpenAI language codes
    const languageMap: { [key: string]: string } = {
      'en': 'en',
      'af': 'af', // Whisper supports Afrikaans
      'zu': 'zu', // Whisper has some support for Zulu
      'st': 'en'  // Fallback to English for Sesotho
    }
    formData.append('language', languageMap[language] || 'en')
  }

  formData.append('response_format', 'json')

  const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
    },
    body: formData,
  })

  if (!response.ok) {
    const error = await response.text()
    console.error('OpenAI API error:', error)
    throw new Error(`OpenAI API error: ${response.status} ${error}`)
  }

  const result = await response.json()
  console.log('OpenAI result:', result)

  const transcript = result.text || ''
  const wordCount = transcript.split(/\s+/).filter(word => word.length > 0).length

  return {
    transcript,
    language: language || 'en', // OpenAI doesn't return detected language in basic response
    word_count: wordCount
  }
}

/**
 * Update voice note with transcription results
 */
async function updateVoiceNoteTranscription(voiceNoteId: string, transcription: TranscriptionResponse) {
  console.log('Updating voice note transcription:', { voiceNoteId, transcription })

  const { data, error } = await supabase
    .from('voice_notes')
    .update({
      transcript: transcription.transcript,
      language: transcription.language || 'en',
      // Store additional metadata in a JSONB field if available
      metadata: {
        confidence: transcription.confidence,
        word_count: transcription.word_count,
        transcribed_at: new Date().toISOString(),
        provider: TRANSCRIPTION_PROVIDER
      }
    })
    .eq('id', voiceNoteId)
    .select()
    .single()

  if (error) {
    console.error('Error updating voice note:', error)
    throw new Error(`Failed to update voice note: ${error.message}`)
  }

  console.log('Voice note updated successfully:', data.id)
  return data
}

/**
 * Create engagement event for transcription completion
 */
async function trackTranscriptionEvent(voiceNote: any, transcription: TranscriptionResponse) {
  if (!voiceNote.preschool_id || !voiceNote.created_by) {
    return
  }

  try {
    await supabase
      .from('parent_engagement_events')
      .insert({
        preschool_id: voiceNote.preschool_id,
        parent_id: voiceNote.created_by,
        student_id: voiceNote.created_for_student_id,
        event_type: 'voice_note_transcribed',
        metadata: {
          voice_note_id: voiceNote.id,
          transcript_length: transcription.transcript.length,
          word_count: transcription.word_count,
          language: transcription.language,
          provider: TRANSCRIPTION_PROVIDER
        }
      })
  } catch (error) {
    console.error('Error tracking transcription event:', error)
  }
}

/**
 * Main transcription handler
 */
async function transcribeAudio(request: Request): Promise<Response> {
  try {
    const transcriptionRequest: TranscriptionRequest = await request.json()
    console.log('Processing transcription request:', transcriptionRequest)

    let voiceNote: any
    let audioUrl: string

    // Get voice note information
    if (transcriptionRequest.voice_note_id) {
      const { data, error } = await supabase
        .from('voice_notes')
        .select('*')
        .eq('id', transcriptionRequest.voice_note_id)
        .single()

      if (error) {
        return new Response(JSON.stringify({ error: `Voice note not found: ${error.message}` }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        })
      }

      voiceNote = data
      audioUrl = await getAudioFileUrl(voiceNote.storage_path)
      
    } else if (transcriptionRequest.storage_path) {
      audioUrl = await getAudioFileUrl(transcriptionRequest.storage_path)
      
      // Try to find the voice note by storage path
      const { data } = await supabase
        .from('voice_notes')
        .select('*')
        .eq('storage_path', transcriptionRequest.storage_path)
        .single()
      
      voiceNote = data // May be null if this is just a file transcription
      
    } else {
      return new Response(JSON.stringify({ error: 'voice_note_id or storage_path is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Determine language for transcription
    const language = transcriptionRequest.language || voiceNote?.language

    // Perform transcription based on configured provider
    let transcription: TranscriptionResponse

    if (TRANSCRIPTION_PROVIDER === 'openai' && OPENAI_API_KEY) {
      transcription = await transcribeWithOpenAI(audioUrl, language)
    } else if (TRANSCRIPTION_PROVIDER === 'deepgram' && DEEPGRAM_API_KEY) {
      transcription = await transcribeWithDeepgram(audioUrl, language)
    } else {
      // Fallback: try OpenAI first, then Deepgram
      try {
        if (OPENAI_API_KEY) {
          transcription = await transcribeWithOpenAI(audioUrl, language)
        } else if (DEEPGRAM_API_KEY) {
          transcription = await transcribeWithDeepgram(audioUrl, language)
        } else {
          throw new Error('No transcription provider configured')
        }
      } catch (primaryError) {
        console.error('Primary transcription provider failed:', primaryError)
        
        // Try fallback provider
        try {
          if (TRANSCRIPTION_PROVIDER === 'openai' && DEEPGRAM_API_KEY) {
            transcription = await transcribeWithDeepgram(audioUrl, language)
          } else if (TRANSCRIPTION_PROVIDER === 'deepgram' && OPENAI_API_KEY) {
            transcription = await transcribeWithOpenAI(audioUrl, language)
          } else {
            throw primaryError
          }
        } catch (fallbackError) {
          console.error('Fallback transcription provider also failed:', fallbackError)
          throw primaryError
        }
      }
    }

    // Update voice note if we have one
    if (voiceNote && transcriptionRequest.voice_note_id) {
      voiceNote = await updateVoiceNoteTranscription(transcriptionRequest.voice_note_id, transcription)
      
      // Track engagement event
      await trackTranscriptionEvent(voiceNote, transcription)
    }

    return new Response(JSON.stringify({
      success: true,
      voice_note_id: voiceNote?.id,
      transcript: transcription.transcript,
      language: transcription.language,
      word_count: transcription.word_count,
      confidence: transcription.confidence,
      provider: TRANSCRIPTION_PROVIDER
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Error transcribing audio:', error)
    return new Response(JSON.stringify({ 
      error: 'Failed to transcribe audio',
      details: error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}

/**
 * Handle database trigger for new voice notes
 */
async function handleVoiceNoteTrigger(request: Request): Promise<Response> {
  try {
    const { record, old_record, type } = await request.json()
    
    // Only process INSERT events for new voice notes
    if (type !== 'INSERT' || !record.id || record.transcript) {
      return new Response(JSON.stringify({ success: true, skipped: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    console.log('Processing voice note trigger for:', record.id)

    // Construct transcription request from database record
    const transcriptionRequest: TranscriptionRequest = {
      voice_note_id: record.id,
      language: record.language,
      trigger_source: 'database_trigger'
    }

    // Process the transcription request
    return await transcribeAudio(new Request('http://localhost', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(transcriptionRequest)
    }))

  } catch (error) {
    console.error('Error processing voice note trigger:', error)
    return new Response(JSON.stringify({ 
      error: 'Failed to process trigger',
      details: error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}

/**
 * Handle Supabase Storage webhook for new audio files
 */
async function handleStorageEvent(request: Request): Promise<Response> {
  try {
    const { record, eventType } = await request.json()
    
    // Only process INSERT events for audio files
    if (eventType !== 'INSERT' || !record.name || !record.bucket_id) {
      return new Response(JSON.stringify({ success: true, skipped: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Check if this is an audio file
    const audioExtensions = ['.mp3', '.m4a', '.wav', '.webm', '.ogg', '.aac']
    const isAudioFile = audioExtensions.some(ext => record.name.toLowerCase().endsWith(ext))
    
    if (!isAudioFile) {
      return new Response(JSON.stringify({ success: true, skipped: 'Not an audio file' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    console.log('Processing storage event for audio file:', record.name)

    // Construct transcription request from storage event
    const transcriptionRequest: TranscriptionRequest = {
      storage_path: record.name,
      trigger_source: 'storage_event'
    }

    // Process the transcription request
    return await transcribeAudio(new Request('http://localhost', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(transcriptionRequest)
    }))

  } catch (error) {
    console.error('Error processing storage event:', error)
    return new Response(JSON.stringify({ 
      error: 'Failed to process storage event',
      details: error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}

/**
 * Main request handler
 */
async function handleRequest(request: Request): Promise<Response> {
  const url = new URL(request.url)
  
  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 })
  }

  // Handle different endpoints
  if (url.pathname.includes('trigger')) {
    return await handleVoiceNoteTrigger(request)
  } else if (url.pathname.includes('storage-event')) {
    return await handleStorageEvent(request)
  } else {
    return await transcribeAudio(request)
  }
}

// Serve the function
serve(handleRequest)