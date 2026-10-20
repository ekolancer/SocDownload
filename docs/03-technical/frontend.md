# Frontend UI — Peta Halaman dan Komponen

> **Document Type:** Frontend Reference
> **Status:** Draft — verified from `frontend/src`
> **Owner:** [TBD — confirm with team]
> **Last Updated:** 2026-10-19
> **Related Documents:** [System Architecture](./system-architecture.md), [API](./api.md), [User Guide](./user-guide.md), [Testing](./testing.md), [Glossary](../glossary.md)

## Runtime and route layout

Frontend is Next.js App Router with React/TypeScript. `next.config.mjs` rewrites `/api/:path*` to `BACKEND_INTERNAL_URL` (default `http://127.0.0.1:8000`). `apiFetch()` uses `credentials: include`; on `401` it navigates to `/login` except while already on login or Instagram-login route. The `media-file` and `media-thumbnail` route handlers separately proxy file requests to backend and forward browser cookies; media file route also forwards HTTP Range and selected response headers. Thumbnail proxy applies private one-day caching. The shared frontend wrapper does not attach an explicit bearer API token; browser UI auth relies on cookie-session flow.

| Browser route / source | Purpose and main interaction |
|---|---|
| `/` — `src/app/page.tsx` | Studio: backend health; recent visual media; job list/stats/progress; submit URLs; cancel/purge/clear jobs; archive/Vidara import; auto-sync; adapter drawer; completion notices. Polls faster (5 seconds) while jobs active, slower (15 seconds) while idle, and pauses refresh while document is hidden. Each endpoint fetch is time-bounded; updates are deduplicated. `DownloadStudio` locally guesses platform from URL text for UI display/selection, while backend validates/detects actual platform. Job pipeline filters/paginates statuses and sources. |
| `/login` — `src/app/login/page.tsx` | Vault password form posts to `/api/auth/login`; shows generic invalid-password message and navigates to Studio after success. |
| `/vault` — `src/app/vault/page.tsx` | Photos, creator Explore, Albums, Favorites; search/platform/media filters; selection; lightbox; imports; album create/edit/delete/add/remove; archive exports; job/storage summary; batch actions. Refresh loads up to 1,500 media rows, count, albums, creators, job stats/20 jobs and storage every 10 seconds. Creator view uses server-side 90-row pages and 10-second refresh. Photo/video filtering in broad gallery is client-side; creator path sends media type filters to API. |
| `/settings` — `src/app/settings/page.tsx` | Read/update Instagram username, cooldown/default engine; Instagram login with two-factor challenge, session-file upload/check/disconnect; cookies upload; transient success/error toast. |
| `/console` — `src/app/console/page.tsx` | Loads up to 500 recent event records and connects SSE stream; local source/level/code/text filters; pause/follow controls; copy event values and download filtered events as JSON Lines. Connection stops on component cleanup or disconnect; no reconnect loop is implemented. `STATS_URL` constant exists, but page does not request it. |
| `/media-file/[id]` | Auth-cookie and Range-forwarding backend proxy for media files. |
| `/media-thumbnail/[id]` | Auth-cookie backend proxy for thumbnails; `Cache-Control: private, max-age=86400`. |

## Component map

| Directory | Contents |
|---|---|
| `src/components/layout/` | `DashboardShell`, header, sidebar, navigation. |
| `src/components/studio/` | `DownloadStudio`, job pipeline/progress, job notifications, `AutoSyncCard`. |
| `src/components/modals/` | Adapter health, albums, archive import, command palette, media lightbox. |
| `src/components/vault/` | Batch action bar, creator hub, media gallery, vault sidebars/top bar. |
| `src/components/ui/` | Icons shared by pages/components. |
| `src/hooks/useCreatorArchive.ts` | Server-paginated creator archive, stale-request guard, scroll-more append, first-page polling. |
| `src/lib/vault-api.ts` | Shared media list/count/creator, favorite, batch delete/ZIP, single delete requests. |
| `src/lib/api.ts` | Cookie-aware `fetch` wrapper, API error message extraction. |
| `src/lib/types.ts` | Frontend response/data types; these are client assumptions, not database constraints. |
| `src/lib/pagination.ts` | Client pagination helpers. |
| `src/lib/useLayoutStore.ts` | UI layout state; remembers only collapsed sidebar preference in `localStorage`, overlays/mobile state stays in memory. |
| `src/lib/useDashboardShortcuts.ts` | Global dashboard shortcuts: `Ctrl/⌘+K` or `/` opens command palette; `Ctrl/⌘+B` toggles sidebar; `Ctrl/⌘+1..4` navigates Studio, Vault, Console, Settings; `Escape` closes overlays. `/` does not trigger while focus is in text input/editable element. |

## Request and response notes

Frontend paths identify calls initiated by the browser; [API Reference](./api.md) describes backend route contracts. Some page calls rely on response types but do not validate every field at runtime. A `401` redirects to login; fetch errors in Studio/Vault may preserve prior state and show offline/inline status. Do not assume the UI response types alone define the server schema.

| UI workflow | API calls evidenced in source |
|---|---|
| Studio refresh | `GET /api/health`; `GET /api/media?limit=5&available_visual=true`; `GET /api/jobs/stats`; `GET /api/jobs?limit=100`. |
| Queue and manage jobs | `POST /api/jobs` with `{url, platform?}`; `POST /api/jobs/cancel-all`; `DELETE /api/jobs/{id}`; `DELETE /api/jobs`. |
| Vault media | `GET /api/media`, `/api/media/count`, `/api/media/creators`; `POST /api/media/batch-delete` and `/api/media/batch-zip`; `PATCH /api/media/{id}/favorite`; `DELETE /api/media/{id}`. |
| Albums | `GET/POST /api/albums`, `GET/PUT/DELETE /api/albums/{id}`, `POST/DELETE /api/albums/{id}/items`. |
| Import / auto-sync | `POST /api/import/json`, `/api/import/vidara`, `/api/autosync/trigger`; `GET/PUT /api/autosync/config`; `GET /api/adapters`. |
| Settings and login | `/api/auth/login`; `/api/settings` GET/PUT; Instagram login/session/status/check/disconnect; `/api/settings/upload/cookies`. |
| Console | `GET /api/console/events?limit=500`, `GET /api/console/stream`. The page does not currently use its `/api/console/stats` constant. |
| Creator ZIP | Browser navigates to `/api/media/export/zip?username=…`; download occurs via direct link. |
| Adapter drawer | `GET /api/adapters` yields `{platform, adapter_name, engine, health_ok, last_health_at}` rows; drawer displays health/engine state. |
| Creator browse/filter | Creator cards locally filter aggregate response by username/platform; selecting one changes Vault view and loads matching paginated media. `CreatorsHub` can navigate to creator ZIP export link. |

## Layout and navigation

Dashboard uses shared shell/header/sidebar/navbar. After five minutes without observed mouse/keyboard/click/scroll/touch input, `DashboardShell` posts `/api/auth/logout` and redirects to `/login`; this client idle timer is separate from backend session expiry. The timer resets on browser events and does not inspect the backend request activity clock. Sidebar collapse preference is persisted in `localStorage`, while mobile sidebar, command palette and adapter drawer are in-memory state. Keyboard shortcuts: `Ctrl/⌘+K` or `/` opens command palette; `Ctrl/⌘+B` toggles sidebar; `Ctrl/⌘+1..4` navigates Studio, Vault, Console and Settings; `Escape` closes open overlays. `/` shortcut is ignored when a text field/content-editable element has focus.

## Metadata and locale

Root metadata declares English document language and product metadata names supported platforms, with viewport theme color and `maximumScale: 1`. Runtime UI is mixed Indonesian/English. This observation is not an accessibility or localization-compliance assertion.

## Styling and accessibility evidence

Global styles/tokens live in `src/app/globals.css`; dedicated CSS for Settings and Vault. Pages use responsive Tailwind classes, explicit labels/ARIA names in important controls, error `role="alert"` for login, reduced-motion handling in animations where used, and semantic buttons/navigation. This is a source inventory, not an accessibility audit or WCAG compliance claim.

## Test coverage

Frontend scripts in `package.json`: `npm test` (`vitest run`), `npm run typecheck`, `npm run lint`, `npm run build`. Vitest configuration/setup uses jsdom. Existing tests cover Studio page, job pipeline, creator archive hook, and shared vault API. They do not prove full browser accessibility, every page state, network backend integration, or contract conformance.
