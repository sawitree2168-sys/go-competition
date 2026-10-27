# GO TOURNAMENT — UI → ROUTE → DATA CROSSWALK (2026-10-27)

Status: implementation inventory, not deploy proof. All links below describe repository source. Current hosting cannot be assumed to contain these commits.

## Feature by approved reference
| Mockup | User purpose | Current source | API / database | Current stage |
| --- | --- | --- | --- | --- |
| 16 / 70 / 71 / 76 | Admin tournament summary | `app/admin/tournaments/page.tsx` | `/api/admin/tournaments`, summary; `gt_tournaments`, `gt_divisions` | Code connected; **not web E2E tested** |
| 17 / 67 / 91–95 | Search/applicant review | `app/admin/tournaments/[id]/registrations/page.tsx` | `/api/admin/tournament-registrations` → `gt_registrations`, `gt_divisions`, `gt_athletes` | **NEW: read-only searchable/filterable CSV page**; no approvals/payment verification yet; **not deployed** |
| 18 / 72 / 77 | Swiss pairing | Not implemented in GT backend | Need `gt_matches`, constraints and audit | Pending |
| 19 / 73 / 79 | Match results | Not implemented in GT backend | Need `gt_matches`, result verification and referee roles | Pending |
| 20 / 74 / 80 | Standings SOS/SOSOS | Not implemented in GT backend | Need verified matches algorithm | Pending |
| 21 / 28 / 56–57 | News | Draft creation panel in `app/admin/tournaments/page.tsx` | `/api/admin/tournament-news`, `gt_tournament_news` | Draft only; no public publish |
| 25 / 27 / 58 / 85 | Photo gallery | `app/admin/tournaments/[id]/media/page.tsx` | `/api/admin/tournament-media`; private `gt-event-featured` | Draft only; no public publish |
| 26 / 55 / 59 | Documents | No complete approved document service | Storage bucket planned; private certificates bucket exists | Pending |
| 31–33 | Desktop/mobile home, menu | `app/page.tsx` basic navigation | Public event API present | Needs match with artwork |
| 45 / 51–53 / 82–84 | Athlete profile and statistics | Existing GO ID/claim flows; not full approved design | `gt_athletes`, verified history pending | Partial |
| 61–66 | Registration, proof upload | No end-to-end approved production flow | Payment/private storage staged | Pending |
| 91–95 + extra academy group board | Academy multi-registration | No batch registration UI linked to GT backend | Academy relationship/permissions not yet modeled | Pending |
| 96–100 (selected inventory row Set 20) | Academy live tracking (all members, person, rounds, reports) | **No academy-linked real data yet** | Existing athlete table lacks academy_id; registration and match tables exist | Requirement acknowledged; **do not show fake academy stats** |
| 101–105 | Sign in / lookup / role selector | Existing OTP admin and profile claims, not all approved screen flows | Supabase Auth, global staff role | Partial, requires role/ownership gates |
| Extra H2H mobile/desktop | Athlete head-to-head and pairing check | No H2H API implemented | Query verified `gt_matches` only, stable IDs | Pending |

## Implementation in this work session
- Created `app/admin/tournaments/[id]/registrations/page.tsx` as a read-only screen patterned after approved applicant list. Search by name/GO ID/rank, filter by division/registration/payment statuses, per-division counts, export filtered CSV with Excel formula-injection neutralization, and clear empty states.
- Added navigation from `app/admin/tournaments/page.tsx` to the new page.
- Requires existing Supabase OTP and authenticated staff endpoint. Does **not** edit a registration, confirm money, or change results.
- Existing endpoint `/api/admin/tournament-registrations` supplies the real data; database schema was read directly and confirmed relevant columns.
- No real academy_id or academy-to-athlete membership in current confirmed schema; institution registration/tracking 91–100 depends on explicit permissioned academy relationship and data reconciliation. Do not infer from design screenshots.
- No Vercel deploy attempted in this session. Typecheck and authenticated browser E2E pending.

## Design ingestion priority
1. Source images 1–105 and extras mapped in `docs/GO_TOURNAMENT_UI_MASTER_INVENTORY.md`, no redesign.
2. Missing full-board source ranges 34–44 and 86–90 must be reconciled; do not infer a 105 count of deployed screens.
3. Store user-approved images durably in repository/approved asset store and verify exact bytes or checksum before claiming imported.
4. Mobile size, Thai font, large high-contrast controls and clear completion signals on busy competition day.

## Acceptance checks before marking live
- Anonymous GET /api/admin/tournament-registrations returns 401; authorized read 200 and correct event isolation.
- Admin roster page loads only selected event data, exact athlete GO ID and division; 0 records shows honest empty message.
- Text search, combined filters, CSV escaping of user values, no double-count of a multi-division athlete as unique person.
- Unauthorized users cannot inspect/export athlete list; actual payment verification not inferred from `payment_status` alone.
- Desktop/mobile screenshot comparison against approved screen 17 and academy 97 once school data is modeled.
