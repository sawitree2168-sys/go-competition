# GO TOURNAMENT — Responsive Banner System (HOME first)
**Updated:** 2026-10-27 Asia/Bangkok
**Status:** THREE responsive homepage background assets staged in GitHub + page integration written. **NOT deployed, NOT browser QA or production build verified.**

## Approved style direction
Following user's GO FAN preference: bright contemporary competitive Go (หมากล้อม), navy/royal blue/white/gold with white/black stones, trophy, airy modern backdrop. Avoid dark old-fashioned imagery. Asset images are decorative; title, description and actual link buttons remain accessible React/HTML.

## HOME assets committed and read back from repo
| Target | GitHub path | Source design size | Format |
|---|---|---:|---|
| desktop | `public/banners/home/home_desktop.svg` | 1920×600 | scalable SVG |
| tablet | `public/banners/home/home_tablet.svg` | 1280×800 | scalable SVG |
| mobile | `public/banners/home/home_mobile.svg` | 800×1000 | scalable SVG |

The image generation contact sheet delivered in conversation is a DESIGN MOCKUP, not the same binary as the production-ready vector background assets. Production vector SVG files have stylized Go board, stones, trophy, gradients and confetti but no baked-in Thai copy, buttons, or links.

## Integrated route
- `app/page.tsx` renders HOME hero first, then UI overview images (preserved).
- `<picture>`: mobile max-width 639px, tablet max-width 1023px, desktop fallback. Uses banner backgrounds via public static paths.
- Foreground Thai main heading, subtitle, status, primary CTA /schedule, secondary CTA /athletes/search are real HTML so responsive and clickable.
- Existing site modules and Admin links preserved.
- Do not add a GO FAN public CTA pointing to an unimplemented route until GO FAN is actually built.

## Future banner workflow
- Repeat 3 assets for distinct PUBLIC sections: competition, result, news, rankings, athlete, FAN, FAQ. Admin dashboards use simpler UI headers to prioritize legibility rather than large hero artwork.
- Keep source variants in `public/banners/<module>/` as `<module>_desktop.svg`, `<module>_tablet.svg`, `<module>_mobile.svg`.
- For any generated photographic raster version, prepare optimized WEBP exports plus originals, preserve consent and license; prefer SVG where decoration is illustrated and reflows cleanly.
- Asset entry must include design approval, checksum, route and staged/deployed/verified statuses.
- Image text is decorative only; never turn fake mockup buttons into unclickable bitmap-only controls.

## Acceptance to clear before deploy
- [x] Source assets committed to GitHub and retrieved; paths exist.
- [x] Next.js homepage code committed; links preserved.
- [ ] Production build `npm run build` / TypeScript + visual preview on 360/390, 768, 1024, 1440px widths.
- [ ] User reviews rendered screenshot and approves exact appearance as distinct from the generated collage.
- [ ] Vercel single consolidated deployment after quota permits.
- [ ] Website page loads 3 correct responsive sources; no layout shift/broken images; actions work.
