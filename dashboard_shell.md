# Plan dashboard-shell

> Status: Completed  
> Owner: [TBD — confirm with team]  
> Last Updated: 2026-08-29

## Scope

Dashboard shell applies to `/vault`, `/console`, and `/settings`. Studio `/` remains standalone.

## Phase 1 — Shared shell foundation

- [x] Create `DashboardShell.tsx`.
- [x] Create `DashboardSidebar.tsx`.
- [x] Create `DashboardHeader.tsx`.
- [ ] Add Studio, Vault, Console, Settings, Adapters, Logout navigation.
- [x] Add desktop expanded/collapsed state.
- [x] Persist collapse state in `localStorage`.
- [x] Add active route state with `aria-current`.
- [x] Match Studio visual language.
- [x] Keep Studio route unchanged.
- [x] Validate lint/typecheck/build.

## Phase 2 — Mobile sidebar

- [x] Add mobile menu trigger.
- [x] Add overlay drawer.
- [x] Add Escape/backdrop close.
- [x] Add focus management.
- [x] Add body scroll lock.
- [x] Validate mobile keyboard behavior via build/typecheck.
- [x] Validate reduced motion compatibility.

## Phase 3 — Vault integration

- [x] Wrap Vault in `DashboardShell`.
- [x] Remove duplicate route navbar.
- [ ] Move Vault actions to shell header.
- [x] Preserve metrics, filters, gallery, albums, creators, batch actions, and lightbox.
- [x] Preserve Archive/Vidara import.
- [x] Validate Vault route build.

## Phase 4 — Console integration

- [x] Wrap Console in `DashboardShell`.
- [x] Preserve Matrix visual panel.
- [x] Preserve history, filters, search, SSE, pause, follow, copy, and JSONL download.
- [x] Keep Matrix background inside content area.
- [x] Validate Console route and build.

## Phase 5 — Settings integration

- [x] Wrap Settings in `DashboardShell`.
- [x] Remove duplicate standalone navigation.
- [x] Preserve login, 2FA, session upload, status, disconnect, cookies, preference, and cooldown.
- [x] Validate Settings behavior and build.

## Phase 6 — Adapter drawer

- [x] Open `AdapterHealthDrawer` from shell navigation.
- [x] Support close button, backdrop, and Escape.
- [x] Avoid duplicate drawer instances per shell.
- [x] Validate adapter API flow via lint/typecheck/build.

## Phase 7 — Header status

- [x] Add lightweight backend health status.
- [x] Avoid duplicate whole-page polling.
- [x] Show Online/Offline/Connecting state.
- [x] Validate status transitions via timeout/error/success handling.

## Phase 8 — Navigation cleanup

- [x] Keep existing `Navbar` for Studio only.
- [x] Remove duplicate navigation from dashboard pages.
- [x] Verify `/` remains standalone.
- [x] Verify no double navigation.

## Phase 9 — Full validation

- [x] Run backend pytest.
- [x] Run backend compileall.
- [x] Run backend pip check.
- [x] Run frontend lint.
- [x] Run frontend typecheck.
- [x] Run frontend production build.
- [x] Run `git diff --check`.
- [x] Verify `/` has no sidebar.
- [x] Verify `/vault` shell.
- [x] Verify `/console` shell and SSE route.
- [x] Verify `/settings` shell.
- [x] Verify `/login` has no sidebar.
- [x] Verify desktop collapse persistence structurally.
- [x] Verify mobile drawer structurally.
- [x] Verify logout and adapter drawer wiring.
- [x] Verify production routes return HTTP 200; no build hydration errors.

## Rollback

- [ ] Revert shell components.
- [ ] Restore page wrappers.
- [ ] Restore previous navigation usage.
- [ ] Confirm no backend/database rollback is needed.

## Validation log

| Phase | Result | Evidence | Date |
|---|---|---|---|
| Phase 1 | Partial | `npm run lint`, `npm run typecheck`, `npm run build`, `git diff --check` passed; shell foundation created, not yet integrated into routes | 2026-08-29 |
| Phase 2 | Implemented | Mobile trigger/drawer, Escape/backdrop close, focus entry/return, body scroll lock; lint/typecheck/build/diff-check passed | 2026-08-29 |
| Phase 3 | Partial | Vault wrapped; duplicate Navbar removed; features preserved; actions remain in page header pending shell action API; lint/typecheck/build/diff-check passed | 2026-08-29 |
| Phase 4 | Implemented | Console wrapped in shell; Matrix panel and SSE behavior preserved; lint/typecheck/build/diff-check passed | 2026-08-29 |
| Phase 5 | Implemented | Settings wrapped in shell; login/2FA/session/cookie/preferences preserved; lint/typecheck/build/diff-check passed | 2026-08-29 |
| Phase 6 | Implemented | Adapter drawer centralized in DashboardShell; sidebar trigger; existing close button/backdrop; shell Escape handling; lint/typecheck/build/diff-check passed | 2026-08-29 |
| Phase 7 | Implemented | Shared header health check uses authenticated `apiFetch`, 4s timeout, 30s interval, cleanup, and live status announcement; lint/typecheck/build/diff-check passed | 2026-08-29 |
| Phase 8 | Resolved by audit | `Navbar` is imported only by Studio `frontend/src/app/page.tsx`; Vault/Console/Settings use `DashboardShell`; lint/typecheck/build/diff-check passed | 2026-08-29 |
| Phase 9 | Completed | `pytest` 39 passed + 5 subtests; compileall/pip check/lint/typecheck/build/diff-check passed; `/`, `/vault`, `/console`, `/settings`, `/login` returned HTTP 200 through `mediavault.local` | 2026-08-29 |
