# Panduan Pengguna MediaVault

> **Document Type:** User Guide — how-to / reference<br>
> **Status:** Draft — steps based on current UI<br>
> **Owner:** [TBD — confirm with team]<br>
> **Last Updated:** 2026-10-19<br>
> **Related Documents:** [Use cases](../01-requirements/use-cases.md), [API reference](./api.md), [Deployment](./deployment.md), [SOP](./sop.md), [Glossary](../glossary.md)

## 1. Mulai menggunakan aplikasi

### Prasyarat

- Aplikasi sudah dijalankan oleh operator; alamat frontend dan akses telah diberikan.
- Operator sudah menyiapkan autentikasi dan media storage.
- Unduhan membutuhkan jaringan dan akses yang valid pada platform sumber. Aplikasi tidak menjamin setiap konten dapat diambil.

### Login

1. Buka halaman aplikasi.
2. Masukkan kata sandi vault yang diberikan/dikonfigurasi operator.
3. Setelah autentikasi berhasil, buka Studio.

Tampilan login memakai password authentication. Token API adalah mekanisme akses integrasi/operasi, bukan pengganti petunjuk UI. Jangan bagikan kata sandi atau token.

## 2. Antrekan unduhan

1. Di Studio, tempel URL postingan atau media yang didukung.
2. Kirim URL. Aplikasi akan memeriksa URL dan menambah job ke antrean, atau memakai job aktif yang cocok.
3. Pantau status job dan progress di bagian antrean.
4. Buka Vault setelah status selesai.

URL invalid/platform tidak dikenal dapat ditolak. Job gagal tertentu dicoba ulang otomatis; gangguan layanan sumber, login atau rate limit dapat menghentikan unduhan. Periksa Console/Adapter Health bila tersedia.

## 3. Impor arsip URL

1. Buka kontrol import di Studio.
2. Unggah file ekspor arsip berformat JSON/HTML/TXT yang didukung, atau daftar URL Vidara dalam TXT.
3. Tunggu hasil parsing. Dialog menunjukkan jumlah yang diterima, duplikat, invalid atau melampaui batas.
4. Pantau job baru pada antrean.

Batas ukuran dan jumlah ditentukan konfigurasi operator. Impor bukan jaminan setiap URL dapat diunduh.

## 4. Temukan dan atur media

1. Buka **Vault**.
2. Pilih Photos, Explore, Albums, atau Favorites.
3. Gunakan pencarian/filter yang tersedia untuk platform, kreator, jenis media, dan koleksi.
4. Tandai item sebagai favorit untuk menampilkannya di Favorites.
5. Buat album, lalu tambahkan/pindahkan pilihan media. Album mengatur item dalam vault; tidak menggandakan file media.
6. Gunakan aksi export/download untuk menyimpan media atau metadata. Ekspor tunduk pada batas konfigurasi.

Menghapus media adalah tindakan destruktif. Pastikan item dipilih benar sebelum mengonfirmasi penghapusan.

## 5. Hubungkan Instagram dan atur sync (opsional)

1. Buka **Settings**.
2. Sambungkan akun Instagram melalui login dan selesaikan tantangan verifikasi bila diminta; atau gunakan alur upload session jika disiapkan operator.
3. Periksa status koneksi. Putuskan koneksi bila tidak lagi digunakan.
4. Aktifkan Auto-Sync dan atur interval saved-item sync.
5. Pantau hasil terakhir di Studio. Manual trigger meminta sync segera.

Sync mengambil URL saved posts dan memasukkannya ke antrean unduhan. Ketersediaan bergantung pada sesi serta layanan Instagram. Implementasi saat ini tidak menjalankan liked-post sync.

## 6. Troubleshooting

| Gejala | Tindakan |
|---|---|
| Browser tidak meminta login ulang setelah `401` | `apiFetch` membawa session cookie dan mengarahkan ke halaman login pada `401`; koneksi langsung memakai API token tidak otomatis membuat session cookie UI. Login melalui form UI. |
| Tidak dapat masuk | Pastikan password benar; bila percobaan gagal berulang, tunggu lockout berakhir atau minta operator memeriksa konfigurasi autentikasi. |
| URL ditolak | Pastikan URL penuh dan domain/platform didukung; cek Adapter Health. |
| Job failed atau tertunda | Buka detail job/Console; verifikasi akses jaringan, session/cookies platform, engine, kapasitas disk, dan batas layanan sumber. |
| Tidak melihat media | Refresh Vault; cek filter/creator/favorite/album dan status job. |
| Instagram sync bermasalah | Periksa Settings session/status, login kembali jika kedaluwarsa, dan cek rate-limit/error status. |
| Ekspor ditolak | Kurangi pilihan item atau minta operator meninjau export limits. |

Jangan kirim file session, cookie, media pribadi, database, token, password, atau data sensitif pada laporan masalah. Gunakan [SOP operator](./sop.md) untuk pemeriksaan sistem.
