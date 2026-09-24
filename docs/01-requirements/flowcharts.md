# Flowcharts

> Document Type: Flowcharts  
> Status: Draft  
> Owner: [TBD — confirm with team]  
> Last Updated: 2026-09-24  
> Related Documents: [SRS](SRS.md), [LLD](../02-architecture/LLD.md), [Use Cases](use-cases.md)

```mermaid
flowchart TD
 A[POST /api/jobs] --> B{Validate URL}
 B -- invalid --> C[422 response]
 B -- valid --> D[Persist queued Job]
 D --> E[In-process queue]
 E --> F[Worker claims lease]
 F --> G[Resolve adapter]
 G --> H[Download to staging]
 H --> I{Files available?}
 I -- no --> J[Failed status and cleanup]
 I -- yes --> K[Hash and finalize]
 K --> L[Persist MediaItem and MediaFile]
 L --> M[Done status]
```

```mermaid
flowchart TD
 A[Application lifespan] --> B[init_db]
 B --> C[recover_jobs]
 C --> D[Register enabled adapters]
 D --> E[Start scheduler and two workers]
```
