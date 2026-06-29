/**
 * SEO Generator — Backend Server v3
 * Lisensi: Kode Lisensi berbasis Redis (Upstash)
 * Flow   : License validate → Tavily RAG → Groq LLM → return JSON
 */

import express   from 'express';
import cors      from 'cors';
import dotenv    from 'dotenv';
import rateLimit from 'express-rate-limit';
import { Redis } from '@upstash/redis';

dotenv.config();

/* ─────────────────────────────────────────
   CONFIG
───────────────────────────────────────── */
const PORT            = process.env.PORT            || 3001;
const TAVILY_KEY      = process.env.TAVILY_API_KEY;
const GROQ_KEY        = process.env.GROQ_API_KEY;
const GROQ_MODEL      = process.env.GROQ_MODEL      || 'llama-3.3-70b-versatile';
const GROQ_ENDPOINT   = 'https://api.groq.com/openai/v1/chat/completions';
const TAVILY_ENDPOINT = 'https://api.tavily.com/search';
const LICENSE_PREFIX  = 'license:';   // Redis key prefix

/* ─────────────────────────────────────────
   UPSTASH REDIS
───────────────────────────────────────── */
if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
  console.error('❌  UPSTASH_REDIS_REST_URL atau UPSTASH_REDIS_REST_TOKEN belum diset di .env');
  process.exit(1);
}

const redis = new Redis({
  url:   process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

/* ─────────────────────────────────────────
   EXPRESS SETUP
───────────────────────────────────────── */
const app = express();

app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000',
           'http://localhost:5500', 'http://127.0.0.1:5500',
           'null'],       // izinkan file:// saat dev lokal
  methods: ['POST', 'GET', 'OPTIONS'],
}));
app.use(express.json({ limit: '1mb' }));

/* Rate limiter global: 60 req / menit per IP */
app.use('/api/', rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Terlalu banyak request. Coba lagi dalam 1 menit.' },
}));

/* ─────────────────────────────────────────
   HELPERS — LICENSE
───────────────────────────────────────── */
function redisKey(code) {
  return LICENSE_PREFIX + code.trim().toUpperCase();
}

/**
 * Cek apakah kode lisensi valid dan punya saldo.
 * Return: { valid, remaining }
 */
async function checkLicense(code) {
  if (!code || typeof code !== 'string') return { valid: false, remaining: 0 };
  const remaining = await redis.get(redisKey(code));
  if (remaining === null) return { valid: false, remaining: 0 };   // kode tidak ada
  const quota = parseInt(remaining, 10);
  return { valid: quota > 0, remaining: quota };
}

/**
 * Kurangi saldo kode lisensi sebanyak 1 secara atomik.
 * Return: saldo setelah dikurangi.
 */
async function consumeLicense(code) {
  const after = await redis.decr(redisKey(code));
  if (after < 0) {
    // Safety: kembalikan ke 0 jika negatif (race condition)
    await redis.set(redisKey(code), 0);
    return 0;
  }
  return after;
}

/* ─────────────────────────────────────────
   HELPER — TAVILY SEARCH (RAG)
───────────────────────────────────────── */
async function tavilySearch(namaProduk) {
  if (!TAVILY_KEY) {
    console.warn('[Tavily] API key tidak diset — skip web search.');
    return null;
  }

  const query = `Spesifikasi, material, dan teknologi sepatu ${namaProduk}`;
  console.log(`[Tavily] Searching: "${query}"`);

  const res = await fetch(TAVILY_ENDPOINT, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${TAVILY_KEY}` },
    body: JSON.stringify({
      query,
      search_depth:        'advanced',
      include_answer:      true,
      include_raw_content: false,
      max_results:         5,
      topic:               'general',
    }),
  });

  if (!res.ok) {
    console.error('[Tavily] Error:', res.status);
    return null;
  }

  const data  = await res.json();
  const parts = [];
  if (data.answer)  parts.push(`Ringkasan: ${data.answer}`);
  (data.results || []).slice(0, 3).forEach((r, i) => {
    if (r.content) parts.push(`Sumber ${i + 1} (${r.url}):\n${r.content.slice(0, 500)}`);
  });

  const context = parts.join('\n\n').trim();
  console.log(`[Tavily] Context: ${context.length} chars`);
  return context || null;
}

/* ─────────────────────────────────────────
   HELPER — BUILD ENRICHED PROMPT
───────────────────────────────────────── */
function buildPrompt(namaProduk, targetKeyword, ragContext) {
  const keywordLine = targetKeyword
    ? `Keyword: ${targetKeyword}`
    : 'Keyword: (tidak dispesifikasikan — gunakan keyword paling relevan dan natural)';

  const contextBlock = ragContext
    ? `=== DATA RISET DARI INTERNET ===\n${ragContext}\n=== AKHIR DATA RISET ===\n\n`
    : '(Data riset internet tidak tersedia — gunakan knowledge base internalmu)\n\n';

  return [
    'Lu adalah Expert Sneaker Copywriter dan spesialis SEO. User hanya akan memberikan:',
    `Nama Produk: ${namaProduk}`,
    keywordLine,
    '',
    contextBlock,
    'Tugasmu: Berdasarkan data riset di atas (jika ada) DAN knowledge base internalmu,',
    'buat artikel SEO / Deskripsi Produk komprehensif yang langsung siap tayang.',
    '',
    '=== STRUKTUR WAJIB untuk isi deskripsi_lengkap ===',
    '1. Paragraf Pembuka: nama produk di awal, esensi dan daya tarik utama.',
    '2. Penjelasan Fitur Lengkap (2 Sub-heading ###): bantalan, traksi, material, dll.',
    '3. Fitur Utama dan Spesifikasi: bullet points (- **Nama Fitur**: deskripsi).',
    '4. Inspirasi Gaya: 3 ide mix & match (Casual, Sporty, Street Style) bernomor.',
    '5. FAQ: 3 pertanyaan relevan, format **Q: ...?** **A: ...**',
    '',
    '=== SYARAT TEKNIS ===',
    '- Bahasa Indonesia editorial ala sneakerhead.',
    '- Gunakan Markdown (### sub-heading, ** bold) di dalam teks.',
    '- Gunakan \\n untuk line break. Total minimal 600 kata.',
    '',
    '=== OUTPUT ===',
    'KEMBALIKAN HANYA JSON MURNI VALID, tepat 3 kunci:',
    '{"title":"Max 60 char","meta_desc":"Max 155 char","deskripsi_lengkap":"600+ kata"}',
  ].join('\n');
}

/* ─────────────────────────────────────────
   HELPER — GROQ LLM
───────────────────────────────────────── */
async function callGroq(prompt) {
  if (!GROQ_KEY) throw new Error('GROQ_API_KEY belum diset di .env');

  const res = await fetch(GROQ_ENDPOINT, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${GROQ_KEY}` },
    body: JSON.stringify({
      model:           GROQ_MODEL,
      temperature:     0.8,
      max_tokens:      2048,
      response_format: { type: 'json_object' },
      messages: [
        {
          role:    'system',
          content: 'Kamu adalah Expert Sneaker Copywriter dan spesialis SEO Indonesia. ' +
                   'Balas HANYA dengan JSON murni valid, 3 kunci: title, meta_desc, deskripsi_lengkap. ' +
                   'Escape semua karakter khusus dengan benar. Tidak ada teks di luar JSON.',
        },
        { role: 'user', content: prompt },
      ],
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Groq HTTP ${res.status}`);
  }

  const data    = await res.json();
  const rawText = data?.choices?.[0]?.message?.content || '';
  if (!rawText.trim()) throw new Error('Respons Groq kosong.');

  let parsed;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    const match = rawText.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('Format JSON tidak ditemukan dalam respons Groq.');
    parsed = JSON.parse(match[0]);
  }

  const { title, meta_desc, deskripsi_lengkap } = parsed;
  if (!title || !meta_desc || !deskripsi_lengkap) {
    throw new Error('Kunci JSON tidak lengkap dari Groq.');
  }

  console.log(`[Groq] OK — "${title.slice(0, 40)}..."`);
  return { title, meta_desc, deskripsi_lengkap };
}

/* ═════════════════════════════════════════
   ENDPOINTS
═════════════════════════════════════════ */

/* Health check */
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', model: GROQ_MODEL, tavily: !!TAVILY_KEY, groq: !!GROQ_KEY });
});

/* ── POST /api/validate-license ─────────
   Cek apakah kode lisensi valid & tampilkan sisa kuota.
   Body: { licenseCode: string }
──────────────────────────────────────── */
app.post('/api/validate-license', async (req, res) => {
  const { licenseCode } = req.body;

  if (!licenseCode || typeof licenseCode !== 'string') {
    return res.status(400).json({ valid: false, error: 'licenseCode wajib diisi.' });
  }

  try {
    const { valid, remaining } = await checkLicense(licenseCode);
    if (!valid && remaining === 0) {
      const exists = await redis.exists(redisKey(licenseCode));
      if (!exists) {
        return res.json({ valid: false, remaining: 0, error: 'Kode lisensi tidak ditemukan.' });
      }
      return res.json({ valid: false, remaining: 0, error: 'Kuota habis. Hubungi admin untuk top-up.' });
    }
    return res.json({ valid: true, remaining });
  } catch (err) {
    console.error('[validate-license]', err.message);
    return res.status(500).json({ valid: false, error: 'Gagal menghubungi database lisensi.' });
  }
});

/* ── POST /api/generate-seo ─────────────
   Main endpoint: validate license → RAG → LLM → return JSON
   Body: { licenseCode, namaProduk, targetKeyword }
──────────────────────────────────────── */
app.post('/api/generate-seo', async (req, res) => {
  const { licenseCode, namaProduk, targetKeyword } = req.body;

  /* ── Validasi input ── */
  if (!licenseCode) {
    return res.status(401).json({ success: false, error: 'Kode lisensi wajib disertakan.' });
  }
  if (!namaProduk || !namaProduk.trim()) {
    return res.status(400).json({ success: false, error: 'namaProduk wajib diisi.' });
  }

  const name    = namaProduk.trim().slice(0, 200);
  const keyword = (targetKeyword || '').trim().slice(0, 200);

  console.log(`\n${'─'.repeat(55)}`);
  console.log(`[Request] Produk: "${name}" | License: ${licenseCode.slice(0, 8)}...`);

  /* ── Cek lisensi (atomic) ── */
  const { valid, remaining } = await checkLicense(licenseCode);
  if (!valid) {
    const msg = remaining === 0 && (await redis.exists(redisKey(licenseCode)))
      ? 'Kuota habis. Hubungi admin untuk top-up.'
      : 'Kode lisensi tidak valid.';
    return res.status(403).json({ success: false, error: msg });
  }

  try {
    /* ── Step 1: Web search (RAG) ── */
    const ragContext = await tavilySearch(name);

    /* ── Step 2: Build enriched prompt ── */
    const prompt = buildPrompt(name, keyword, ragContext);

    /* ── Step 3: Groq LLM ── */
    const result = await callGroq(prompt);

    /* ── Step 4: Potong saldo lisensi (HANYA jika generate sukses) ── */
    const newRemaining = await consumeLicense(licenseCode);
    console.log(`[License] ${licenseCode.slice(0, 8)}... → sisa kuota: ${newRemaining}`);

    /* ── Step 5: Return ── */
    return res.json({
      success:   true,
      rag:       !!ragContext,
      remaining: newRemaining,
      ...result,
    });

  } catch (err) {
    console.error('[generate-seo]', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

/* ─────────────────────────────────────────
   START
───────────────────────────────────────── */
app.listen(PORT, () => {
  console.log(`\n🚀 SEO Generator Server  →  http://localhost:${PORT}`);
  console.log(`   Health : http://localhost:${PORT}/api/health`);
  console.log(`   Model  : ${GROQ_MODEL}`);
  console.log(`   Tavily : ${TAVILY_KEY ? '✓ Aktif' : '✗ Tidak diset'}`);
  console.log(`   Redis  : ✓ Upstash terhubung`);
  console.log(`${'─'.repeat(55)}\n`);
});
