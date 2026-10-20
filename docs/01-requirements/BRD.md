# Business Requirement Document (BRD)

> **Document Type:** BRD<br>
> **Status:** Draft — inferred from implementation; business approval pending<br>
> **Owner:** [TBD — confirm with team]<br>
> **Last Updated:** 2026-10-19<br>
> **Related Documents:** [SRS](./SRS.md), [Use Cases](./use-cases.md), [HLD](../02-architecture/HLD.md), [Glossary](../glossary.md)

## 1. Purpose

MediaVault menyediakan aplikasi lokal untuk mengumpulkan media sosial ke dalam vault pribadi yang dapat dicari. Tujuan ini disimpulkan dari fitur yang ada; alasan bisnis formal **[TBD — confirm with team]**.

## 2. Kapabilitas bisnis yang teramati

Kapabilitas berikut ada dalam kode, tetapi belum disahkan sebagai kebutuhan pemangku kepentingan atau target keberhasilan.

- Mengirim URL media dan memproses unduhan secara asinkron.
- Menjelajah, mencari, memfilter, memfavoritkan, mengelompokkan, serta mengekspor media yang sudah diunduh.
- Mengimpor daftar URL dari berkas arsip yang didukung.
- Menyinkronkan posting Instagram tersimpan secara opsional jika sesi akun telah disiapkan.
- Memeriksa job unduhan, kesehatan adapter, dan event aplikasi.

## 3. Pemangku kepentingan

| Peran | Kepentingan | Tanggung jawab |
|---|---|---|
| Pemilik produk/bisnis | Tujuan, prioritas, dan penerimaan produk | [TBD — confirm with team] |
| Operator aplikasi | Setup lokal, secret, storage, dan pemulihan | [TBD — confirm with team] |
| Pengguna akhir | Mengirim unduhan dan mengelola media pribadi | Disimpulkan dari UI; validasi dengan tim |
| Maintainer | Backend, frontend, adapter, dan rilis | [TBD — confirm with team] |

## 4. Scope

**Implemented scope:** URL-based downloads from registered platform adapters; local media catalog and files; job processing; favorites and albums; archive import; optional Instagram session and saved-item sync; settings, diagnostics, and exports.

**Not confirmed / not promised:** multi-tenant service, hosted account system, service-level agreement (SLA), retention guarantee, backup/restore guarantee, legal rights to third-party content, or production hosting topology. Confirm each with the team before treating it as a commitment.

## 5. Business requirements (observed; approval required)

| ID | Requirement represented by current behavior | Priority | Evidence / status |
|---|---|---|---|
| <a id="br-001"></a>BR-001 | Users can submit supported media URLs and see download progress and result. | Must Have — inferred | [FR-001](./SRS.md#fr-001); [UC-001](./use-cases.md#uc-001-submit-media-url) |
| <a id="br-002"></a>BR-002 | Users can browse, search, filter, favorite, organize, and export locally stored media. | Must Have — inferred | [FR-004](./SRS.md#fr-004); [UC-003](./use-cases.md#uc-003-manage-vault-media) |
| <a id="br-003"></a>BR-003 | Users can import supported archives of URLs to create download jobs. | Should Have — inferred | [FR-003](./SRS.md#fr-003); [UC-002](./use-cases.md#uc-002-import-url-archive) |
| <a id="br-004"></a>BR-004 | Users can configure an Instagram session and optionally sync saved posts. | Should Have — inferred | [FR-005](./SRS.md#fr-005); [UC-004](./use-cases.md#uc-004-sync-saved-instagram-posts) |
| <a id="br-005"></a>BR-005 | Operators can inspect job and adapter health and recent application events. | Should Have — inferred | [FR-006](./SRS.md#fr-006) |

## 6. Assumptions and constraints

- The default persistent store is SQLite; media bytes live in filesystem storage. [Database schema](../02-architecture/database-schema.md).
- Downloads depend on external platform availability and configured adapter engines. The code does not establish platform permission or content ownership.
- API authentication is configured by token or password/session settings; the health endpoint is public. See [API reference](../03-technical/api.md).
- Business rules, supported-user population, retention, legal review, recovery objectives, and service targets are **[TBD — confirm with team]**.

## 7. Success metrics

Targets, measurement owner, and reporting period are **[TBD — confirm with team]**. The application currently exposes job counts, request metrics, adapter health, and autosync counts; these are implementation observability, not approved business KPIs.

## 8. Approval

| Approver | Role | Date | Status |
|---|---|---|---|
| [TBD — confirm with team] | Product / business owner | [TBD] | Pending |
