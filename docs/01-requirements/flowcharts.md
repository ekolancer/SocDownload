# Flowcharts

> **Document Type:** Flowcharts<br>
> **Status:** Draft — derived from implementation<br>
> **Owner:** [TBD — confirm with team]<br>
> **Last Updated:** 2026-10-19<br>
> **Related Documents:** [SRS](./SRS.md), [Use Cases](./use-cases.md), [LLD](../02-architecture/LLD.md), [Glossary](../glossary.md)

## 1. Download job

```mermaid
flowchart TD
    A([User submits URL]) --> B{Valid supported URL?}
    B -- No --> E[Return validation error]
    B -- Yes --> C{Matching queued or running job?}
    C -- Yes --> D[Return existing job]
    C -- No --> F[Create queued job]
    F --> G[Worker claims job: running]
    G --> H{Download and persist succeeded?}
    H -- Yes --> I{Duplicate media?}
    I -- Yes --> J[Mark dup]
    I -- No --> K[Persist media and files]
    K --> L[Mark done]
    H -- No --> M{Retryable and attempts remain?}
    M -- Yes --> N[Schedule retry; queued]
    M -- No --> O[Mark failed]
    N --> G
```

Retry count/backoff and recovery behavior are implementation details in [LLD](../02-architecture/LLD.md#download-worker). This diagram abstracts internal rollback and lease handling.

## 2. Archive import

```mermaid
flowchart TD
    A([User uploads file]) --> B{Supported type and within byte limit?}
    B -- No --> C[Reject request]
    B -- Yes --> D[Parse URLs]
    D --> E{Parse succeeded and URLs found?}
    E -- No --> F[Return validation error]
    E -- Yes --> G[Validate, deduplicate, apply import cap]
    G --> H[Bulk enqueue eligible URLs]
    H --> I[Return queued and skipped counts]
```

Input types and limits are configurable. See [UC-002](./use-cases.md#uc-002-import-url-archive) and [API reference](../03-technical/api.md#import).

## 3. Saved Instagram synchronization

```mermaid
flowchart TD
    A([Scheduler tick or manual trigger]) --> B{Enabled or forced?}
    B -- No --> C[Return disabled]
    B -- Yes --> D{Interval elapsed or forced?}
    D -- No --> E[Return skipped interval]
    D -- Yes --> F{Adapter and session usable?}
    F -- No --> G[Record status/error]
    F -- Yes --> H[Fetch saved URLs]
    H --> I[Deduplicate and bulk enqueue]
    I --> J[Record counts and last-run status]
```

Implementation currently registers Instagram saved-post sync; it fetches up to 100 URLs per run, enqueues no more than 500, and forces liked-item sync off. See [UC-004](./use-cases.md#uc-004-sync-saved-instagram-posts).
