# Approved multi-page implementation — 18 November 2026

The public pages share GO TOURNAMENT navigation, Prompt typography, blue framed panels,
gold active controls, decorative Go artwork, and a consistent mobile navigation bar.
Existing actual records and role checks remain the source of data; mockup names, scores,
photos and counts are not seeded into production.

## Implemented
- Home and event directory, athlete card/table directory, profile, results, national registry,
  about/contact, login and menus use the shared presentation.
- GO FAN retains its approved hero and functioning follows and adds the complete shared menu.
- News has category/search cards and per-division summary articles with PNG/PDF exports.
  Whole-division standings are distinguished from partial community records. No inferred ranks
  are displayed from incomplete submitted games.
- Event operations check `gt_can_manage_tournament_v1` before fetching operational data.
  Division monitor switches between cards and tables without losing search or round selection.
  Unrelated global platform/financial panels are absent from the event operations screen.
- Event-specific settings edit title/date/venue/poster and division name/capacity/rounds/fees.
  Database guards reject capacities below existing entries and rounds below published pairings.
- Referee/organizer result entry offers the nine requested outcomes without requiring a margin.
- Public photo intake accepts 1–12 JPG/PNG/WebP originals up to 10 MB each without signing in.
  Images are private; capability receipt keys only retrieve the matching status. They do not
  allow downloading photos, modifying approvals or listing other submissions.
- The approved chibi thank-you image displays only after upload completion has been confirmed.
- Platform-only photo review compares signed original photos with editable game drafts. Approval
  requires valid existing athlete IDs and selected games; conflicting or duplicate-round games
  cannot silently replace existing approved records. Audit records and draft history are retained.
- Approved community games appear in both players' profile histories and partial result news.
- Institution owners can add existing registered teachers. Staff can search and select existing
  athletes in bulk. Athletes can choose an institution from their account or claimed profile.

## Limits to communicate
- Automatic image reading is not connected. Review currently starts from the stored image and
  manual draft entry, without fabricated OCR text or any automatic approval.
- The decorative mockups are design references, not whole-page screenshots embedded as UI.
- Public upload/receipt database paths and authorization checks are tested transactionally;
  browser validation of signed-in private operations depends on an authorized session.
- The anonymous intake has bounded files and hourly admission limits; uploaded originals are
  never automatically published.

## Validation
- Next.js production build and TypeScript.
- Referee mapping, GO FAN follow persistence/outcomes, competition completion tests.
- Database transaction tests: receipt isolation, empty upload rejection, unauthorized approval
  rejection, admin draft saving, empty approval rejection; test records rolled back.
