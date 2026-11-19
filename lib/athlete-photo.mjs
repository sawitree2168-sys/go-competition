/** Keep all historic placeholders on the scalable, approved avatar. */
export const DEFAULT_ATHLETE_PHOTO = "/avatars/go-approved-square.svg";
export function athletePhotoSource(src) {
  return !src || /\/avatars\/(?:go-approved-original\.webp|default-athlete\.png|athlete-avatar\.webp|go-approved(?:-square)?\.svg)(?:[?#]|$)/.test(src)
    ? DEFAULT_ATHLETE_PHOTO : src;
}
/** One source pixel per device pixel at most; never stretch a small photograph. */
export function sharpPhotoWidth(width, devicePixelRatio = 1) {
  return Math.max(1, Math.floor(width / Math.max(1, devicePixelRatio || 1)));
}
