import { createClient } from '@supabase/supabase-js'
import pdf from 'pdf-parse'
import 'dotenv/config'

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL || ''
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_TOKEN || ''

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('❌ Missing SUPABASE_URL or service role key (SERVICE_ROLE_KEY)')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

const sleep = (ms) => new Promise(r => setTimeout(r, ms))

function chunkText(text, maxChars = 1400) {
  const paragraphs = String(text).split(/\n\s*\n+/).map(p => p.trim()).filter(Boolean)
  const chunks = []
  let buf = ''
  let idx = 0
  for (const p of paragraphs) {
    if ((buf + '\n\n' + p).length > maxChars && buf) {
      chunks.push({ index: idx++, content: buf.trim() })
      buf = p
    } else {
      buf = buf ? buf + '\n\n' + p : p
    }
  }
  if (buf) chunks.push({ index: idx++, content: buf.trim() })
  return chunks
}

async function fetchPDF(url) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Fetch failed: ${res.status} ${res.statusText}`)
  const ab = await res.arrayBuffer()
  return Buffer.from(ab)
}

async function processOne(doc) {
  const start = Date.now()
  console.log(`\n• Processing: ${doc.title} [${doc.grade} • ${doc.subject}]`)
  const buf = await fetchPDF(doc.file_url)
  console.log(`  - Downloaded ${(buf.length/1024).toFixed(1)} KB`)
  const parsed = await pdf(buf)
  const text = parsed.text || ''
  console.log(`  - Parsed ${parsed.numpages || 0} pages, ${text.split(/\s+/).length} words`)

  const meta = {
    ...(doc.metadata || {}),
    extracted_at: new Date().toISOString(),
    extractor: 'pdf-parse',
    word_count: text.split(/\s+/).filter(Boolean).length,
  }
  const { error: updErr } = await supabase
    .from('caps_documents')
    .update({ content_text: text, page_count: parsed.numpages || null, metadata: meta })
    .eq('id', doc.id)
  if (updErr) throw updErr
  console.log('  - Updated caps_documents')

  await supabase.from('caps_content_chunks').delete().eq('document_id', doc.id)
  const chunks = chunkText(text, 1400)
  if (chunks.length) {
    const payload = chunks.map(c => ({
      document_id: doc.id,
      chunk_index: c.index,
      chunk_type: null,
      heading: null,
      content: c.content,
      word_count: c.content.split(/\s+/).filter(Boolean).length,
    }))
    const batchSize = 50
    for (let i = 0; i < payload.length; i += batchSize) {
      const slice = payload.slice(i, i + batchSize)
      const { error: insErr } = await supabase.from('caps_content_chunks').insert(slice)
      if (insErr) throw insErr
      await sleep(100)
    }
    console.log(`  - Inserted ${payload.length} chunks`)
  } else {
    console.log('  - No chunks generated (text too small)')
  }

  console.log(`  ✓ Done in ${((Date.now()-start)/1000).toFixed(1)}s`)
}

async function main() {
  const arg = process.argv.find(a => a.startsWith('--limit='))
  const limit = arg ? parseInt(arg.split('=')[1], 10) : 2

  const { data, error } = await supabase
    .from('caps_documents')
    .select('id,title,grade,subject,file_url,metadata,content_text,page_count')
    .limit(200)
  if (error) throw error

  const candidates = (data || []).filter(d => !d.content_text || d.content_text.length < 10 || !d.page_count || d.page_count === 0).slice(0, limit)
  if (!candidates.length) {
    console.log('No documents require extraction.')
    return
  }

  console.log(`Found ${candidates.length} documents to extract (showing up to ${limit}).`)
  for (const doc of candidates) {
    try { await processOne(doc) } catch (e) { console.error('  ✗ Failed:', e.message || e) }
  }
}

main().catch(e => { console.error('Fatal:', e); process.exit(1) })
