# Integrasi API untuk Konsumen

> **Document Type:** API Integration Guide<br>
> **Status:** Draft — endpoint routes verified from source<br>
> **Owner:** [TBD — confirm with team]<br>
> **Last Updated:** 2026-10-19<br>
> **Related Documents:** [API reference](./api.md), [User guide](./user-guide.md), [Architecture integration design](../02-architecture/api-integration.md), [Glossary](../glossary.md)

## Ringkasan

Halaman ini membantu aplikasi internal menautkan request ke MediaVault. Batas protokol, proses download, dan integrasi platform eksternal dijelaskan pada [API Integration Architecture](../02-architecture/api-integration.md). Kontrak endpoint per resource terdapat pada [API Reference](./api.md).

## Base URL

- Development backend langsung: `http://127.0.0.1:8000`.
- Development UI proxy: origin frontend, lalu path `/api/...`.
- Compose frontend memanggil `http://backend:8000` dari network internal; frontend dipublikasikan pada port `3000`.
- Domain publik bergantung ingress deployment. Repository tidak menentukan domain atau route publik production.

## Autentikasi

Untuk endpoint API yang dilindungi, kirim token terkonfigurasi pada HTTP header `Authorization` menggunakan bearer scheme. Ambil token hanya dari environment deployment berwenang; jangan taruh credential dalam URL, query string, contoh dokumentasi, atau log.

Sebagai alternatif, login via `/api/auth/login` menghasilkan session cookie untuk browser. API middleware mengecualikan GET `/api/health`, path `/api/auth*`, `OPTIONS`, dan URL non-API. Endpoint `/api/auth/me` tetap memvalidasi session secara langsung.

Gunakan token/session milik environment yang berwenang; jangan commit, tempelkan ke tiket, atau taruh di URL/query string. Lihat [Deployment Guide](./deployment.md#secrets-and-access).

## Request job unduhan

Kirim JSON ke `POST /api/jobs`; field `platform` opsional di frontend, backend menentukan platform dari URL.

```json
{"url":"https://platform.example/post/123"}
```

Contoh response route untuk job baru:

```json
{"id":42,"status":"queued"}
```

Response ini hanya mengakui job dalam antrean; bukan jaminan sumber media akan berhasil merespons atau media dapat diunduh. Poll `GET /api/jobs/{job_id}` untuk status, dan baca koleksi lewat `GET /api/media` setelah sukses. Status terminal, retry, dan adapter detail: [LLD](../02-architecture/LLD.md).

## Upload multipart

Untuk `POST /api/import/json` dan `POST /api/import/vidara`, gunakan `multipart/form-data` dengan field `file`. API membatasi ukuran file melalui konfigurasi. Archive import menerima file `.json`, `.html`, `.htm`, `.txt`; Vidara list menerima `.txt`. API mengembalikan hasil counts dan job IDs. Lihat [API Reference — import](./api.md#import).

## Respons dan diagnosis

- Untuk protected endpoint, `401 Unauthorized` berarti token atau session tidak valid.
- `422` biasanya menunjukkan URL/request tidak lolos validasi.
- `413` menunjukkan batas ukuran/ekspor terlampaui.
- `404` menunjukkan resource yang diminta tidak ditemukan.
- Handler menyediakan error envelope dan middleware dapat mengembalikan `X-Request-ID`; simpan ID itu ketika melaporkan kegagalan.
- Jangan mengulang request bersifat mutasi tanpa memahami apakah request sebelumnya diproses. Gunakan job ID sebelum membuat ulang download.

## Integrasi event

Console menyediakan `GET /api/console/events` untuk query riwayat dan `GET /api/console/stream` untuk server-sent events. Gunakan filter source/severity/code/query sesuai route. Event availability/retention bukan janji persistence jangka panjang.

## Batas platform

Adapter bergantung pada akses host eksternal, versi engine, session/cookies, dan limit platform. Hanya adapter yang didaftarkan oleh aplikasi yang menerima URL. Facebook adapter ada di source tetapi nonaktif pada startup saat ini. Baca [platform integration design](../02-architecture/api-integration.md) untuk mekanisme yang teramati; akses yang berhasil tidak dijamin.
