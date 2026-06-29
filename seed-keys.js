/**
 * seed-keys.js
 * Jalankan SEKALI untuk memasukkan 100 kode lisensi ke Upstash Redis.
 * Setiap kode mendapat saldo awal 500 generate.
 *
 * Cara pakai:
 *   node seed-keys.js           → generate + insert 100 kode baru
 *   node seed-keys.js --print   → tampilkan kode tanpa insert ke Redis
 */

import { Redis } from '@upstash/redis';
import { randomBytes } from 'crypto';
import dotenv from 'dotenv';
import { writeFileSync } from 'fs';

dotenv.config();

/* ── Config ── */
const TOTAL_CODES     = 100;      // jumlah kode lisensi
const INITIAL_QUOTA   = 500;      // saldo awal per kode
const LICENSE_PREFIX  = 'license:';
const OUTPUT_FILE     = 'license-keys.txt';  // simpan ke file teks

/* ── Redis ── */
const redis = new Redis({
  url:   process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

/* ── Generate kode: format SEO-XXXX-XXXX-XXXX (uppercase alphanumeric) ── */
function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';  // hapus I,O,0,1 agar tidak ambigu
  const segment = (len) =>
    Array.from({ length: len }, () => chars[randomBytes(1)[0] % chars.length]).join('');
  return `SEO-${segment(4)}-${segment(4)}-${segment(4)}`;
}

async function main() {
  const printOnly = process.argv.includes('--print');

  console.log(`\n${'═'.repeat(55)}`);
  console.log(`  SEO Generator — License Key Seeder`);
  console.log(`  Generating ${TOTAL_CODES} codes × ${INITIAL_QUOTA} quota each`);
  if (printOnly) console.log('  Mode: --print (tidak insert ke Redis)');
  console.log(`${'═'.repeat(55)}\n`);

  const codes = new Set();
  while (codes.size < TOTAL_CODES) {
    codes.add(generateCode());
  }

  const codeList = [...codes];

  if (!printOnly) {
    /* Insert ke Redis secara pipeline (batch) */
    const pipeline = redis.pipeline();
    for (const code of codeList) {
      pipeline.set(`${LICENSE_PREFIX}${code}`, INITIAL_QUOTA);
    }
    await pipeline.exec();
    console.log(`✅  ${TOTAL_CODES} kode berhasil dimasukkan ke Upstash Redis.\n`);
  }

  /* Simpan ke file teks */
  const lines = [
    `# SEO Generator — License Keys`,
    `# Generated: ${new Date().toISOString()}`,
    `# Total: ${TOTAL_CODES} | Quota per key: ${INITIAL_QUOTA}`,
    `# Format: SEO-XXXX-XXXX-XXXX`,
    '',
    ...codeList,
  ].join('\n');

  writeFileSync(OUTPUT_FILE, lines, 'utf8');
  console.log(`📄  Kode tersimpan di: ${OUTPUT_FILE}\n`);

  /* Tampilkan ke terminal */
  console.log('Daftar Kode Lisensi:');
  console.log('─'.repeat(28));
  codeList.forEach((c, i) => console.log(`  ${String(i + 1).padStart(3, '0')}. ${c}`));
  console.log('─'.repeat(28));
  console.log(`\nSelesai! Bagikan kode-kode ini ke user Anda.\n`);
}

main().catch((err) => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
