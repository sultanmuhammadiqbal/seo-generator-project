# Auto-Pilot SEO RAG Generator

Aplikasi web untuk membuat deskripsi produk SEO secara massal dari CSV. Backend memakai Tavily untuk riset, Groq untuk generasi konten, dan Upstash Redis untuk validasi lisensi serta kuota.

## Stack

- Frontend: HTML, CSS, dan JavaScript vanilla
- Backend: Node.js dan Express
- AI/search: Groq dan Tavily
- Penyimpanan kuota: Upstash Redis

## Menjalankan Secara Lokal

1. Instal dependensi dengan `npm install`.
2. Buat file `.env` di root project:

   ```env
   GROQ_API_KEY=your_groq_key
   TAVILY_API_KEY=your_tavily_key
   UPSTASH_REDIS_REST_URL=your_upstash_url
   UPSTASH_REDIS_REST_TOKEN=your_upstash_token
   ```

3. Jalankan `npm start`, lalu buka `http://localhost:3001`.

Untuk membuat kode lisensi awal, jalankan `npm run seed`. File `license-keys.txt` yang dihasilkan bersifat sensitif dan sudah diabaikan oleh Git.

## Deploy ke Vercel

1. Import repository ini ke Vercel dengan branch produksi `main`.
2. Biarkan Framework Preset, Build Command, dan Output Directory pada deteksi otomatis.
3. Tambahkan environment variables berikut untuk Production dan Preview:
   - `GROQ_API_KEY`
   - `TAVILY_API_KEY`
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`
4. Redeploy setelah environment variables disimpan.
5. Periksa `/api/health`. Nilai `groq`, `tavily`, dan `redis` harus `true`.

Frontend berada di `public/index.html` agar disajikan oleh CDN Vercel. Semua request frontend memakai jalur same-origin `/api/*`, sehingga tidak bergantung pada `localhost`.

## Pemeriksaan

```bash
npm test
```
