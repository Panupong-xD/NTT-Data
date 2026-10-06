# Conservative cleanup — 6 October 2026

This report covers the dead-code cleanup separately from the requested health-home UI and score changes. Existing appointment, navigation and animation work was preserved.

## Audit method

- Searched the whole tracked/source tree, including frontend, Lambda backend, tests, documentation, package/build scripts, hidden configuration, environment variable declarations, infrastructure and public assets. Dependency/vendor directories and generated build outputs were excluded from the source audit.
- Checked TypeScript imports and re-exports, alias and relative paths, dynamic imports, `require`, symbol references and module-path strings. Checked framework route conventions and the SAM handler registration separately; absence of a normal import does not prove these entry points unused.
- Ran TypeScript's unused-local checks as additional evidence. Inspected the currently rendered replacements and event handlers before removing older implementations.

## Deleted files

| File | Confirmation that deletion is safe |
| --- | --- |
| `components/health/charts.tsx` | `TrendChart`, `MultiMetricChart`, `DoctorChartsGrid` and `AdherenceChart` had no external imports, references, render sites or dynamic registration. Patient/caregiver and doctor routes use the live charts through `components/health/lazy-charts.tsx`. Those charts and their metric/period controls remain. |
| `components/health/metric-card.tsx` | Neither `MetricCard` nor `RiskBadge` had any caller or render site. Current home tiles and doctor risk indicators are separate, referenced implementations. |
| `components/ui/badge.tsx` | Its only consumer was the unused `metric-card.tsx` above. No remaining consumer or dynamic reference after that deletion. |
| `components/ui/dialog.tsx` | No imports, render sites or registrations for its exported wrappers. Active `MobileSheet` and doctor dialogs import Radix directly and remain. |
| `components/ui/progress.tsx` | No caller or render site for `Progress`. Current progress displays use their existing inline markup/SVG. |
| `components/ui/skeleton.tsx` | No caller or render site for `Skeleton`. A requirements-document mention of skeleton loading is not a code reference. Active route/chart loading placeholders remain. |
| `components/ui/textarea.tsx` | Neither `Textarea` nor `TextareaProps` was referenced. Current input flows use their existing native textarea elements. |

## Deleted code inside retained files

| Code | Confirmation that deletion is safe |
| --- | --- |
| `CardHeader`, `CardTitle`, `CardDescription` and their display names/exports in `components/ui/card.tsx` | Searches found only their declarations. `Card` and `CardContent`, used by the unauthorized route, remain. |
| `thaiTime` in `lib/utils.ts` | No call, import, exported re-reference, dynamic string reference or configuration registration. Other formatting helpers remain. |
| `registerWithEmail` in `lib/services/auth.ts` and its unused import in `use-auth.tsx` | The only import was itself unused, confirmed by TypeScript. Current registration is the separate `register` implementation in the auth provider and remains. |
| `updateTaskStatus` in `lib/services/mock-store.ts` | No callers or dynamic references. Active task controls call `proposeTaskStatus` and `confirmTaskStatus`; patient proposals and caregiver confirmation remain. |
| `getAvailableModels` in `lib/services/ai/client.ts` | No frontend caller, import, event handler or dynamic reference. This removes only an unused client wrapper; the registered backend `/api/ai/models` endpoint remains. AI chat and approval clients remain. |
| Eight unused Lucide imports in the registration page: `Calendar`, `Activity`, `Smartphone`, `IdCard`, `Briefcase`, `MapPin`, `User`, `KeyRound` | TypeScript confirmed no local references. Used icons and the registration flow remain. |
| `Card`/`CardContent` imports in `AuthCard` | TypeScript confirmed unused bindings. The auth screen's existing markup remains. |
| `deviceNameLog` state and its three setter calls in the health page | The stored filename was never read by rendering, scanning, upload payloads or event handlers. Each handler still performs its existing meaningful state updates. Image preview, camera capture, filename parsing, actual file payload and scan functions remain. |
| Unused catch bindings in registration-cache recovery and chat fallback | The caught values were never read. The catch bodies and fallback behavior remain unchanged. |
| `EarlyWarning` type import in mock data | Became unused when the requested score calculation moved to the shared summary module. |

## Intentionally retained

- Framework pages, layouts, loading files and the SAM-registered Lambda handler: these are discovered by conventions/configuration.
- Backend `/api/ai/models` endpoint and environment/configuration declarations: external consumers and deployment usage cannot be disproved from frontend references alone.
- `resetDb` provider operation and the manual `run-chrome-no-cors.sh` utility: no ordinary UI caller was found, but manual/debug tooling use is not disproved. The script was not run.
- Auth `password` parameters and `confirmTaskStatus`'s `planId` parameter: unused internally, but passed through existing caller contracts. No signature changes were made for cleanup.
- Public assets: all three banner images are referenced by the live carousel. No assets were deleted.
- CSS selectors, dependency declarations and lockfiles: dynamic classes, packaging and external operational use make source-text absence insufficient proof of safe removal. No broad pruning was performed.
- Exported types used within their own modules remain; lack of an external importer alone does not make their declarations dead.
- Hidden clinical details, caregiver confirmation, consent, approval, scanner, chat and loading behavior remain. Being hidden or infrequently used was not treated as evidence of dead code.

## Validation

- `node --test tests/*.test.mjs`: **16/16 passed**, including six new summary tests for consistent scores, meal timing, latest-record ordering, migration, additions/deletions, idempotence and preservation of unrelated data.
- `npm run typecheck -- --incremental false`: **passed**.
- Typecheck with `--noUnusedLocals`: **passed**.
- Backend TypeScript validation with `--noUnusedLocals --noUnusedParameters` and `npm run build --prefix lambda-backend`: **passed**.
- `npm run build`: **passed**, all 26 static pages generated. Existing build settings skip type/lint validation; those were run separately.
- `npm run lint`: **still fails on five existing errors** in working code: three `prefer-const` errors in `app/patient/health/page.tsx`, and two `no-explicit-any` errors in `lib/hooks/use-auth.tsx` and `lib/services/ai/client.ts`. Existing hook-dependency/image warnings also remain. All five error patterns were also verified in the original Git HEAD. No rules were disabled and no unrelated refactor was made to force a pass.
- Browser checks: patient home and the score-info sheet, the live patient trend chart, caregiver home and doctor views. Mobile checks used 320, 390 and 430 pixel widths; desktop check used 1440 pixels. Both homes showed health score **76**, and the doctor report showed risk index **24**, with the same actual BP/glucose values and latest-record date. Patient and doctor graphs rendered two BP series. No horizontal overflow was found at the checked widths; the information icon retained a 44-pixel tap target. Browser console checks found no errors.

## Requested behavior changes, separate from cleanup

The newly added visible statuses beneath home tiles were removed. Status/detail access remains on the tiles and in a small information icon beside the last-recorded date. Patient and caregiver homes share the implementation. Health score now uses the same prototype calculation as the risk summary (`health = 100 − risk`), refreshes cached summaries and changes after additions/deletions. Empty history displays no fabricated score. Actual recorded vitals are preserved. The information sheet explains that this is a prototype index, not a clinically validated diagnostic score.
