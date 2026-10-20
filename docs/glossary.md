# Glosarium

> **Document Type:** Glossary<br>
> **Status:** Draft<br>
> **Owner:** [TBD — confirm with team]<br>
> **Last Updated:** 2026-10-19<br>
> **Related Documents:** [Kebutuhan](./01-requirements/README.md), [Arsitektur](./02-architecture/README.md), [Teknis](./03-technical/README.md)

| Istilah | Arti |
|---|---|
| API | Application Programming Interface — cara program lain meminta fungsi/data dari aplikasi. |
| Adapter | Modul yang menerjemahkan operasi umum aplikasi ke perilaku spesifik platform/engine. |
| Album | Kumpulan referensi item media; bukan salinan file. |
| APScheduler | Pustaka Python untuk menjalankan pekerjaan terjadwal di proses aplikasi. |
| Auto-sync | Pengambilan URL item tersimpan secara otomatis lalu memasukkannya ke antrean pekerjaan. |
| Token API | Credential bernilai yang dikirim pada header autentikasi; jangan dicatat atau dibagikan. |
| BRD | Business Requirement Document — ringkasan kebutuhan bisnis; dokumen di repo ini hasil inferensi dan menunggu persetujuan. |
| CORS | Cross-Origin Resource Sharing — aturan browser untuk request lintas origin. |
| ERD | Entity Relationship Diagram — model entitas data dan hubungan antar entitas. |
| FastAPI | Framework Python untuk membangun endpoint HTTP. |
| HLD | High-Level Design — rancangan arsitektur tingkat komponen. |
| HTTP | Hypertext Transfer Protocol — protokol komunikasi aplikasi web. |
| HMAC | Hash-based Message Authentication Code — tanda tangan kunci untuk memverifikasi integritas data sesi. |
| PII | Personally Identifiable Information — informasi yang dapat mengidentifikasi seseorang. |
| HLS | HTTP Live Streaming — format/protokol streaming media berbasis segmen. |
| LLD | Low-Level Design — rancangan detail perilaku modul. |
| Media root | Direktori file unduhan yang ditetapkan oleh `MEDIA_ROOT`. |
| ORM | Object-Relational Mapper — pemetaan antara objek kode dengan tabel database; proyek memakai SQLAlchemy. |
| SQLite | Database relasional berbasis file yang menjadi default project. |
| SRS | System Requirement Specification — spesifikasi perilaku dan batas sistem. |
| SSE | Server-Sent Events — aliran event dari server ke browser lewat koneksi HTTP. |
| Status `queued` | Job tercatat menunggu diproses. |
| Status `running` | Worker sedang memproses job. |
| Status `done` | Job berhasil dan media telah disimpan. |
| Status `dup` | Job ditandai duplikat menurut pemeriksaan URL/hash. |
| Status `failed` | Job gagal dan tidak akan dicoba ulang otomatis pada percobaan tersebut. |
| Worker | Tugas proses latar belakang yang mengambil job dari antrean. |
| X-Request-ID | Header korelasi request untuk menautkan respons dengan log. |
