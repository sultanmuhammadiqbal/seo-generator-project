# Auto-Pilot SEO RAG Generator

Aplikasi web untuk membuat deskripsi produk SEO secara massal dari CSV. Tersedia Demo Mode tanpa API key dan AI Mode menggunakan Groq API key pengguna sendiri (BYOK). Tavily opsional untuk riset web. Sistem lisensi Upstash tetap ada sebagai fitur legacy, tetapi bukan prasyarat mode publik.

## Stack

- Frontend: HTML, CSS, dan JavaScript vanilla
- Backend: Node.js dan Express
- AI/search: Groq dan Tavily
- Penyimpanan kuota: Upstash Redis

## Mode publik (disarankan untuk Vercel)

- **Demo Mode (default):** tidak perlu API key, Upstash, atau pembayaran; hasil dibuat menggunakan template lokal, bukan output AI asli.
- **AI Mode (Bring Your Own Key):** pengguna mengisi Groq API key di form. Tavily API key bersifat opsional jika ingin riset web.
- API key pengguna hanya disimpan sementara dalam memori halaman, diteruskan via HTTPS ke endpoint `/api/generate-with-keys`, dan dipakai untuk request penyedia masing-masing. Aplikasi tidak menyimpan key ke database atau localStorage. Backend/hosting tetap dapat melihat key di request; hanya gunakan deployment yang dipercaya.
- Pemilik deployment tidak perlu memasang `GROQ_API_KEY`, `TAVILY_API_KEY`, maupun Upstash untuk kedua mode publik. Pengaturan lama di bawah hanya berlaku untuk fitur lisensi legacy.
- Input Manual dan Bulk CSV mendukung kedua mode. Hasil demo diberi label jelas, tidak menjanjikan riset AI atau fakta produk valid.
- Penggunaan key pengguna tunduk pada kuota, biaya, dan persyaratan penyedia API.

## Menjalankan Secara Lokal

1. Instal dependensi dengan `npm install`.
2. **Opsional (hanya untuk endpoint legacy berlisensi):** buat file `.env` di root project:

   ```env
   GROQ_API_KEY=your_groq_key
   TAVILY_API_KEY=your_tavily_key
   UPSTASH_REDIS_REST_URL=your_upstash_url
   UPSTASH_REDIS_REST_TOKEN=your_upstash_token
   ```

3. Jalankan `npm start`, lalu buka `http://localhost:3001` untuk API (atau host folder `public/` secara lokal). Di Vercel, frontend disajikan langsung dari `public/`.

Untuk membuat kode lisensi awal, jalankan `npm run seed`. File `license-keys.txt` yang dihasilkan bersifat sensitif dan sudah diabaikan oleh Git.

## Deploy ke Vercel

1. Import repository ini ke Vercel dengan branch produksi `main`.
2. Biarkan Framework Preset, Build Command, dan Output Directory pada deteksi otomatis.
3. Environment variables berikut **opsional, hanya untuk fitur legacy**; Demo Mode dan BYOK tidak membutuhkannya:
   - `GROQ_API_KEY`
   - `TAVILY_API_KEY`
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`
4. Redeploy setelah environment variables disimpan.
5. Periksa `/api/health` dan homepage. Nilai `groq`, `tavily`, dan `redis` boleh `false` jika hanya menggunakan mode publik.

Frontend berada di `public/index.html` agar disajikan oleh CDN Vercel. Semua request frontend memakai jalur same-origin `/api/*`, sehingga tidak bergantung pada `localhost`.

## Pemeriksaan

```bash
npm test
```
