# ADR-0003: Config precedence — DB over env for UI settings, env files for secrets

> Status: Proposed
> Date: 2026-09-29
> Related: [CONTEXT.md](../../CONTEXT.md#named-modules-target-architecture), [SRS](../01-requirements/SRS.md)

## Context

Configuration has two sources that different modules read differently:

- `config.get_settings()` — pydantic settings from `.env`, cached with `@lru_cache`, plus
  `*_FILE` env indirection for secrets (`API_TOKEN_FILE`, `AUTH_SESSION_SECRET_FILE`,
  `VAULT_KEY_FILE`).
- `db.AppSettings` (row id=1) — runtime settings the UI edits: `cookies_file`,
  `instagram_session_file`, `instagram_username`, `job_cooldown_seconds`, `default_engine`.

Four modules open a session just to read row 1, each wrapping it in `try/except pass`:
`engines._cookies`, `adapters/instagram._engine`, `adapters/registry.init_default_adapters`,
`routes/settings._get`. Precedence is only partially defined, and the `@lru_cache` on
`get_settings()` means an env-sourced value never reflects a DB change.

## Decision

Define precedence explicitly, and keep the two sources distinct.

- **DB wins** for settings the UI can edit (cooldown, engine, cookies/session paths, username):
  a live user edit is authoritative.
- **Env `*_FILE` wins** for secrets (API token, session secret, vault key): infrastructure-owned,
  never a runtime setting.
- Introduce a **`SettingsStore`** module that applies this precedence once and exposes named
  getters (`cookies_path()`, `instagram_engine()`, `instagram_username()`). It is a facade over
  both sources, **not** a replacement for `config.py`.
- `SettingsStore` reads DB-backed fields live (no `@lru_cache` over mutable settings); it may
  cache secrets. It holds the single defensive fallback; callers drop theirs.

## Consequences

- One place decides precedence; callers stop opening sessions to read config.
- `config.py` remains the env/secret layer and the security boundary is preserved.
- Trigger to implement: when `DownloadJob` (ADR-0001) or `MediaVault` needs config — they should
  call `SettingsStore`, not open their own session. Until then this is **deferred**; the current
  fallbacks work and the friction is small.

## Alternatives considered

- **Merge both sources into one module.** Rejected: mixes secrets with runtime settings and
  erodes the security boundary.
- **Helper returning the raw row.** Rejected: still leaks SQLAlchemy state to callers; getters
  are the smaller interface.
- **Implement now.** Rejected (YAGNI): no bug traced to the split reads yet; adding the module
  before a consumer exists would be a seam without a variant.
