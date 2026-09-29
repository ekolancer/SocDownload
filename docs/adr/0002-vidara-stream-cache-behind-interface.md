# ADR-0002: Vidara stream cache lives inside the adapter

> Status: Accepted
> Date: 2026-09-29
> Related: [CONTEXT.md](../../CONTEXT.md#named-modules-target-architecture), [LLD](../02-architecture/LLD.md)

## Context

The Vidara adapter must fetch a "stream data" payload (the embed page plus a stream API call)
before it can download, and it reuses that payload across resolve and download. Because
`BaseAdapter.download(url, dest_dir)` has no channel to pass the payload, the caller
`service._sync_process_job` branches on `adapter.platform == "vidara"` in three places:

```python
resolved_data = adapter.resolve_data(job.url)          # 1
downloaded = adapter.download(..., resolved_data=resolved_data)  # 2
res = adapter.resolve_from_data(job.url, resolved_data or {})    # 3
```

The registry holds a single shared `VidaraAdapter` instance (`main.py` lifespan,
`registry.init_default_adapters`) driven by two worker threads, so the natural place to cache the
payload — on the instance — is read and written concurrently with no lock today.

## Decision

Move the stream-data cache **behind the `BaseAdapter` interface**, into the Vidara adapter.

- The adapter caches the stream payload per URL internally.
- `resolve(url)` and `download(url, dest_dir)` reuse the cache; the public protocol needs no
  `resolved_data` parameter.
- The three `platform == "vidara"` branches are deleted from `service.py`.
- The cache has a short TTL (~5 minutes), is discarded after a successful download, and is
  guarded by a lock because the adapter instance is shared across workers.

## Consequences

- The seam stops leaking platform identity: callers are platform-blind.
- This **removes** a leak rather than adding a hypothetical seam.
- The shared-instance race is closed (a latent bug, not only a refactor).
- `on_progress` stays out of scope here (see ADR-0004 partner work); it belongs to `DownloadJob`.

## Alternatives considered

- **Push `resolved_data` through `ResolvedMedia` for all platforms.** Rejected: widens the
  interface for every adapter to serve one. Blasted interface.
- **Return to direct numbering (resolve twice, no cache).** Rejected: doubles Vidara HTTP
  requests on the hot path.

## Note

Giving each job its own adapter instance is the alternative to the lock and remains open if the
shared registry is later revisited. The lock is the smaller change today.
