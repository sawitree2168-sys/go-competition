# GO Tournament media and file storage

## Storage responsibilities

### Supabase Storage — website runtime

User-generated files must not be committed to GitHub or served directly from Google Drive.

Buckets to provision:

- `athlete-photo-submissions` — private; authenticated athlete uploads a replacement photo to `<auth.uid()>/pending-profile`.
- `athlete-profile-public` — public read; only an organizer moderation service may publish an approved derivative.
- `tournament-public-media` — public event covers, sponsor images, news images and published documents.
- `organizer-private-files` — private registration evidence and organizer-only documents.
- `referee-private-files` — private referee credentials and assignment documents.
- `generated-reports` — private by default; use time-limited signed URLs for exports.

Bucket restrictions should define allowed MIME types and maximum file sizes. Every exposed table and private bucket requires RLS.

### Athlete photo workflow

1. Athlete signs in.
2. Client resolves identity from Supabase Auth. It never accepts a user ID typed by the browser.
3. Athlete uploads to their own folder in the private submissions bucket.
4. Current approved profile photo remains visible.
5. Organizer reviews the replacement.
6. Approved image is cropped/normalized to 4:5 and published to the public profile bucket.
7. Replaced file is archived and an audit event is recorded.

Required upload permissions for upsert are SELECT, INSERT and UPDATE. The Storage policy must compare the first folder name with the authenticated user ID.

### Google Drive — source and backup

Drive stores originals, reviewed exports, working documents and backups. It is not the runtime upload API.

Created under `1GO TOURNAMENT`:

- `5go WEBSITE ASSETS & FILES/01 BRAND & LOGOS`
- `5go WEBSITE ASSETS & FILES/02 TOURNAMENT COVERS`
- `5go WEBSITE ASSETS & FILES/03 NEWS & ARTICLES`
- `5go WEBSITE ASSETS & FILES/04 PUBLIC DOCUMENTS`
- `5go WEBSITE ASSETS & FILES/05 ORGANIZER UPLOADS - PRIVATE`
- `5go WEBSITE ASSETS & FILES/06 REFEREE DOCUMENTS - PRIVATE`
- `5go WEBSITE ASSETS & FILES/07 EXPORTS & REPORTS`
- `5go WEBSITE ASSETS & FILES/08 ARCHIVE`

Created under the existing `รูปนักกีฬา` folder:

- `01 ORIGINAL - PRIVATE`
- `02 APPROVED PROFILE - WEB`
- `03 MODERATION REVIEW`
- `04 REPLACED ARCHIVE - PRIVATE`

## Static GitHub assets

Only version-controlled brand assets and generic placeholders belong in `public/assets`. Never commit athlete photos, payment evidence, identity documents or event-private uploads.
