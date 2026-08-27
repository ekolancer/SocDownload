# Flowcharts

> Document Type: Flowcharts  
> Status: Draft  
> Owner: [TBD — confirm with team]  
> Last Updated: 2026-08-27  
> Related: [SRS](SRS.md), [LLD](../02-architecture/LLD.md)

## Download flow

```mermaid
flowchart TD
 A[Submit URL] --> B{Validate URL}
 B -- invalid --> C[Return validation error]
 B -- valid --> D[Persist queued Job]
 D --> E[Queue Job ID]
 E --> F[Claim lease]
 F --> G[Resolve adapter]
 G --> H[Download to staging]
 H --> I{Files available?}
 I -- no --> J[Mark failed]
 I -- yes --> K[Hash and finalize]
 K --> L[Persist MediaItem and MediaFile]
 L --> M[Mark done]
```

## Recovery flow

```mermaid
flowchart TD
 A[Application start] --> B[Run migrations]
 B --> C[Find expired queued/running leases]
 C --> D[Reset retryable jobs]
 D --> E[Enqueue recovered IDs]
```
