# Context

> Document Type: Context / Glossary
> Status: Living
> Related: [Glossary](docs/glossary.md), [LLD](docs/02-architecture/LLD.md), [ADRs](docs/adr/)

MediaVault archives social-media media into a local vault. This file names the domain
concepts and the architectural vocabulary used by architecture reviews. Keep it current:
when a deepened module is named after a concept not listed here, add it.

## Domain terms

| Term | Meaning |
|---|---|
| **Vault** | The local store of archived media: SQLite records plus the filesystem tree under `MEDIA_ROOT`. |
| **Media item** | One archived post (`MediaItem`): a source URL, a creator, a caption, one or more media files. |
| **Media file** | One physical file belonging to a media item (`MediaFile`): image, video, or audio. |
| **Creator** | The `username` that authored a media item; aggregation key for the Creators Hub. |
| **Job** | One unit of download work (`Job`): a source URL moving through queued → running → done/dup/failed. |
| **Platform** | The source the URL belongs to (instagram, tiktok, threads, x, youtube, reddit, pinterest, vidara). |
| **Adapter** | The module that knows how to resolve and download one platform's URLs. |
| **Engine** | The underlying tool an adapter drives: `gallery-dl`, `yt-dlp`, `instaloader`, or native HTTP. |
| **Album** | A user-defined collection of media items; purely local, never a platform concept. |
| **Auto-sync** | Scheduled discovery of a platform account's saved items, which are enqueued as jobs. |
| **Archive import** | Ingesting URLs from an exported file (Instagram/X/TikTok JSON/HTML, or Vidara TXT). |
| **Matrix console** | In-process observability: a bounded event store, SSE stream, and redaction of secrets. |
| **Export** | Producing a downloadable artefact (CSV, JSON, or ZIP) from media items. |

## Architecture terms

Vocabulary for the `/codebase-design` discipline. Use these exact words in reviews;
do not drift to "component", "service", "API", or "boundary".

| Term | Meaning |
|---|---|
| **Module** | Anything with an interface and an implementation: function, class, package, or tier-spanning slice. |
| **Interface** | Everything a caller must know: signature, invariants, ordering, error modes, config, performance. |
| **Implementation** | The body of code inside a module; distinct from its adapters. |
| **Depth** | Leverage at the interface: much behaviour behind a small interface. Shallow is the opposite. |
| **Deep module** | Small interface, large implementation. Prefer these. |
| **Shallow module** | Interface nearly as complex as the implementation. Avoid. |
| **Seam** | The location where a module's interface lives; where behaviour can change without editing in place. |
| **Adapter** | A concrete thing that satisfies an interface at a seam. Role, not substance. |
| **Leverage** | What callers get from depth: more capability per unit of interface learned. |
| **Locality** | What maintainers get from depth: change, bugs, and knowledge concentrate in one place. |
| **Deletion test** | Delete the module. If complexity vanishes it was a pass-through; if it reappears across callers it earned its keep. |
| **The interface is the test surface** | Callers and tests cross the same seam. |

## Named modules (target architecture)

These names originated in the architecture review and ADRs. Status describes implementation,
not whether an interface needs more layers.

| Module | Responsibility | Status |
|---|---|---|
| **DownloadJob** | Owns one job's lifecycle: claim → download → dedup → organize → persist; retryable errors wait 30/60 seconds across restarts (three attempts total). | implemented |
| **GalleryDlAdapter** | Shared gallery-dl adapter parameterised by per-platform `PlatformSpec`. | implemented |
| **PlatformSpec** | Platform hosts, username keys, URL fallback, and metadata mappings. | implemented |
| **MediaVault** | Query, serialization, and deletion of media items behind one interface. | implemented |
| **MediaExporter** | Consumes MediaVault's selected items to produce CSV/JSON/ZIP artefacts. | implemented |
| **MediaQuery** | Shared filters for list, count, creators, and export; pagination applies to list and export. | implemented |
| **SettingsStore** | Resolves config precedence (env vs DB) once; exposes named getters. | deferred |
