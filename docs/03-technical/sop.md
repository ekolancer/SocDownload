# SOP: Operasi Lokal dan Pemeriksaan Dasar

> **Document Type:** SOP<br>
> **Status:** Draft — production procedures require team approval<br>
> **Owner:** [TBD — confirm with team]<br>
> **Last Updated:** 2026-10-19<br>
> **Related Documents:** [Deployment Guide](./deployment.md), [HLD](../02-architecture/HLD.md), [API](./api.md), [Glossary](../glossary.md)

## Purpose and scope

Panduan ini membantu operator lokal memulai layanan dan memeriksa status tanpa menyentuh/mengekspos secret atau menghapus data. Prosedur production, backup, restore, incident handling, dan rotasi secret **[TBD — confirm with team]**.

## Roles

| Role | Responsibility |
|---|---|
| Operator | Menjalankan startup/checks dan mengumpulkan status/log tanpa secret. |
| Maintainer | Meninjau konfigurasi, error, storage dan kode. |
| Owner | Menyetujui deployment, pemulihan, dan perubahan destruktif; [TBD — confirm with team]. |

## Prosedur 1 — Startup lokal

1. Verifikasi Python dan Node/npm sesuai [panduan deployment](./deployment.md#2-local-development).
2. Pastikan `.env` lokal berisi konfigurasi autentikasi yang sah dan tidak masuk Git. Jangan tampilkan nilai file.
3. Pastikan data/media/config dirs tersedia dan ruang disk cukup. Jangan hapus atau rename DB/media saat diagnosis.
4. Jalankan `bash run-local.sh` dari project root (butuh Bash; Windows dapat memakai WSL/Git Bash jika sesuai setup tim).
5. Buka frontend `http://127.0.0.1:3000`; periksa health/readiness API pada `http://127.0.0.1:8000/api/health` dan `/api/health/ready`.
6. Login, lihat Studio dan adapter health. Jalankan test download hanya untuk URL yang diizinkan dan tidak sensitif.
7. Untuk berhenti, tekan `Ctrl+C`; verifikasi child service sudah keluar. Tinjau `logs/backend.log` / `logs/frontend.log` tanpa membagikan cookie, token, password, atau URL privat.

## Prosedur 2 — Pemeriksaan masalah dasar

1. Catat waktu lokal, halaman, tindakan, gejala, ID job atau `X-Request-ID` jika tersedia. Redaksi URL privat.
2. Periksa apakah frontend berjalan dan backend health menjawab.
3. Periksa Console untuk error relevan dan Adapter Health untuk engine/status. Jangan membuka, menyalin, atau mengirim isi file session/cookie.
4. Untuk job gagal, baca error/status; pastikan disk cukup dan konfigurasi platform yang dibutuhkan masih berlaku. Jangan mengulang login otomatis atau menghapus data sebagai percobaan.
5. Untuk kesiapan DB, baca `/api/health/ready`. `not_ready` minta maintainer memeriksa DB/local logs sebelum ada write/delete action.
6. Eskalasi dengan informasi yang sudah diredaksi. Rahasia, database, media pribadi, dan session files dilarang dilampirkan.

## Prosedur 3 — Docker Compose verification

1. Ikuti secret, mount dan external network setup di [Deployment Guide](./deployment.md#3-docker-compose).
2. Jalankan `docker compose config` untuk melihat hasil konfigurasi yang dirender. Pastikan tidak mengirim hasil jika terdapat secret values.
3. Jalankan `docker compose up -d`, lalu `docker compose ps` dan `docker compose logs --tail=100 backend frontend`.
4. Pastikan backend `healthy` dan frontend tersedia di host port `3000`; autentikasi dan jalankan smoke test ringan.
5. Saat stop, `docker compose down` menghentikan container/network project, tidak bertujuan menghapus persistent bind-mount data. Jangan gunakan `-v` atau menghapus host directories tanpa review backup/restore.
6. Jika startup gagal, simpan error yang sudah disanitasi, pulihkan image/config sebelumnya sesuai persetujuan, dan eskalasi. Migration rollback spesifik belum ditetapkan.

## Rollback / failure handling

Tidak ada prosedur rollback migration DB atau pemulihan cadangan production yang ditemukan di kode. Hentikan perubahan destruktif, lindungi direktori DB/media, beri tahu maintainer/owner, dan ikuti runbook yang disetujui tim. Tetapkan backup cadence, retention, restore test, deployment owner, serta incident response sebelum production.

## Revision history

| Versi | Tanggal | Perubahan | Owner |
|---|---|---|---|
| 0.1 | 2026-10-19 | Draft berdasarkan script, route, Compose dan konfigurasi repo. | [TBD] |
