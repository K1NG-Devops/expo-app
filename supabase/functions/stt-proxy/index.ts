import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

// Env
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const AZURE_SPEECH_KEY = Deno.env.get('AZURE_SPEECH_KEY');
const AZURE_SPEECH_REGION = Deno.env.get('AZURE_SPEECH_REGION') || 'southafricanorth';
const DEEPGRAM_API_KEY = Deno.env.get('DEEPGRAM_API_KEY');

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

interface STTRequest {
  storage_path?: string;      // Supabase storage path (preferred)
  audio_url?: string;         // External URL (optional)
  candidate_languages?: string[]; // e.g., ["af-ZA","zu-ZA","xh-ZA","nso-ZA","en-ZA","en-US"]
}

interface STTResponse {
  text: string;
  language: string;   // BCP-47, e.g. "zu-ZA"
  confidence?: number;
  provider: 'azure' | 'deepgram';
}

function mapToAzureLocale(code: string | undefined): string {
  const b = String(code || '').toLowerCase();
  if (b.startsWith('af')) return 'af-ZA';
  if (b.startsWith('zu')) return 'zu-ZA';
  if (b.startsWith('xh')) return 'xh-ZA';
  if (b.startsWith('nso') || b.startsWith('st')) return 'en-ZA'; // fallback; Azure Sepedi limited in REST
  if (b.startsWith('en-us')) return 'en-US';
  if (b.startsWith('en')) return 'en-ZA';
  return 'en-ZA';
}

async function signedUrlFor(storagePath: string): Promise<string> {
  // Infer bucket by prefix or default 'voice-notes'
  let bucket = 'voice-notes';
  if (storagePath.includes('homework-submissions')) bucket = 'homework-submissions';
  if (storagePath.includes('message-media')) bucket = 'message-media';
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(storagePath, 3600);
  if (error || !data?.signedUrl) throw new Error(`Signed URL error for ${storagePath}: ${error?.message}`);
  return data.signedUrl;
}

async function detectWithDeepgram(url: string): Promise<{ language?: string; }> {
  if (!DEEPGRAM_API_KEY) return {};
  const res = await fetch('https://api.deepgram.com/v1/listen', {
    method: 'POST',
    headers: {
      'Authorization': `Token ${DEEPGRAM_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ url, options: { model: 'nova-2', smart_format: true, detect_language: true } }),
  });
  if (!res.ok) return {};
  const json = await res.json().catch(() => ({}));
  const detected = json?.results?.channels?.[0]?.detected_language as string | undefined;
  return { language: detected };
}

async function azureTranscribe(url: string, locale: string): Promise<STTResponse> {
  if (!AZURE_SPEECH_KEY) throw new Error('Azure Speech not configured');
  const audio = await fetch(url);
  if (!audio.ok) throw new Error(`Audio fetch failed: ${audio.status}`);
  const buf = await audio.arrayBuffer();
  const res = await fetch(`https://${AZURE_SPEECH_REGION}.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1?language=${encodeURIComponent(locale)}`, {
    method: 'POST',
    headers: {
      'Ocp-Apim-Subscription-Key': AZURE_SPEECH_KEY,
      'Content-Type': 'audio/wav', // Accepts multiple formats; wav works broadly
    },
    body: buf,
  });
  if (!res.ok) {
    const t = await res.text().catch(() => '');
    throw new Error(`Azure STT error: ${res.status} ${t}`);
  }
  const j = await res.json().catch(() => ({}));
  const text = j?.DisplayText || '';
  const conf = j?.NBest?.[0]?.Confidence as number | undefined;
  return { text, language: locale, confidence: conf, provider: 'azure' };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'authorization, content-type' } });
  }
  try {
    const auth = req.headers.get('authorization');
    if (!auth) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    const { data: { user }, error: authError } = await supabase.auth.getUser(auth.replace('Bearer ', ''));
    if (authError || !user) return new Response(JSON.stringify({ error: 'Invalid token' }), { status: 401, headers: { 'Content-Type': 'application/json' } });

    const body: STTRequest = await req.json();
    if (!body.storage_path && !body.audio_url) {
      return new Response(JSON.stringify({ error: 'storage_path or audio_url required' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }
    const audioUrl = body.audio_url || await signedUrlFor(body.storage_path!);

    // Step 1: Detect language quickly (Deepgram). If unavailable, default to en-ZA.
    const detectionResult = await detectWithDeepgram(audioUrl);
    let detected = detectionResult.language || 'en-US';
    console.log(`[STT] Deepgram detected language: ${detected}, candidates: ${JSON.stringify(body.candidate_languages || [])}`);
    
    // If candidates provided, prefer the closest candidate; else map to Azure locale
    if (Array.isArray(body.candidate_languages) && body.candidate_languages.length) {
      const lower = detected.toLowerCase();
      const match = body.candidate_languages.find(c => lower.startsWith(c.toLowerCase().slice(0, 2)) || lower === c.toLowerCase());
      const beforeMatch = detected;
      detected = match || detected;
      console.log(`[STT] Language match: ${beforeMatch} → ${detected}`);
    }
    const azureLocale = mapToAzureLocale(detected);
    console.log(`[STT] Final Azure locale: ${azureLocale}`);

    // Step 2: Transcribe with Azure for quality on SA locales; fallback to Deepgram result text if Azure not configured
    if (AZURE_SPEECH_KEY) {
      try {
        const out = await azureTranscribe(audioUrl, azureLocale);
        return new Response(JSON.stringify(out), { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
      } catch (e) {
        // fallback to Deepgram’s raw transcript if available
      }
    }

    // Final fallback: return Deepgram transcript (re-run for text if needed)
    if (!DEEPGRAM_API_KEY) throw new Error('No STT provider configured');
    const dg = await fetch('https://api.deepgram.com/v1/listen', {
      method: 'POST',
      headers: { 'Authorization': `Token ${DEEPGRAM_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: audioUrl, options: { model: 'nova-2', smart_format: true, detect_language: true } }),
    });
    if (!dg.ok) throw new Error(`Deepgram STT error: ${dg.status}`);
    const j = await dg.json();
    const text = j?.results?.channels?.[0]?.alternatives?.[0]?.transcript || '';
    const lang = j?.results?.channels?.[0]?.detected_language || azureLocale;
    const conf = j?.results?.channels?.[0]?.alternatives?.[0]?.confidence as number | undefined;
    return new Response(JSON.stringify({ text, language: mapToAzureLocale(lang), confidence: conf, provider: 'deepgram' }), { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to transcribe', details: error instanceof Error ? error.message : String(error) }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
});
