# Athlete portraits — 19 November 2026

70 selected, active public profile photographs from `TGS_MASTER_MEDIA`, sheet
`ATHLETE_PHOTOS`, are linked to existing GO identities by Dan number AND exact
normalized full name. No fuzzy matching, account creation or identity changes.
Only `Selected_Photo_URL` is used; alternate uploads and private sheet notes
are not published. All 70 selected images were readable without authentication.
`data/athlete-portraits.json` records the GO ID, name, local image and source file
ID. Original Drive files and selection settings remain unchanged.

Images are served as local WebP assets, with proportional resizing to at most
800 × 1000 pixels and corrected EXIF orientation. No face synthesis, retouching
or destructive crop is applied. Portrait cards use CSS framing; the zoom modal
shows the complete prepared image. Existing user profile photos take priority
over the imported fallback. Missing photographs use the approved Go avatar.

The shared exact-name fallback serves the athlete directory, public profile,
Dan directory, result reports, history wall tables and existing shared avatar
consumers. Compact avatars retain their existing dimensions; portrait cards use
a separate variant. Directory view/search state and latest history features are
preserved. This change does not alter competition statistics or placings.

Verified: 70 valid image assets, 70 distinct source file IDs, existing photo
fallback tests and production type/build checks. Private preparation inputs are
excluded from publishing.
