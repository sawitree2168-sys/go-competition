# Dan presentation contract

Public page: /dan. Owner editor: /organizer/platform#presentation (existing owner/admin account).

The live source is public.gt_site_presentation_v1, page='dan', Supabase project bqyokjwuxyzyiripijbs. config contains banner {title,subtitle,desktop,mobile} and sponsors [{id,name,logo,href,enabled}]. Array order is display order. Use existing public media paths or https image URLs. Do not use Drive sharing pages as image URLs. Uploaded logos are in public/sponsors; source Drive IDs are preserved as sponsor IDs. Sponsor list was supplied by the owner from the TGS reference; no commercial tier is inferred.

ChatGPT/Codex: read the live row first. Update only requested fields; preserve all other fields and sponsor IDs. Use optimistic concurrency:
UPDATE public.gt_site_presentation_v1 SET config=<merged JSON>, revision=revision+1,updated_at=now() WHERE page='dan' AND revision=<read revision> RETURNING revision;
If no row is returned, read again and merge. Never replace with the repository fallback blindly. Public read, authenticated platform owner/admin update only. No public insert/delete permissions. Do not add credentials to this JSON.

The repository data/site-presentation.json is fallback only, not the live source after initialization. Updating fallback alone will not change the live banner. The page refreshes its server cache at most every 30 seconds; reload after saving.

Recommended sizes: desktop 1800x450, mobile 750x600; use a background with no baked-in title. Logos: transparent PNG or WebP at least 500px wide; rectangular images shown with contain so they are not cut off. Use properly licensed original logos, not generated approximations.

Dan controls: 30/50/100 per page, numbered window with first/last and gaps, direct page select, table/cards. All views share the same sorted and filtered data. Paging and view controls are excluded from PNG/PDF export. Active follows the existing ranking RPC (configured months or staff override); this change does not modify grades, eligibility, scores, matches, or sporting rank.
